import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { one, many } from '../db.js';
import { ah, HttpError, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import { putFile, makeKey, deleteFile } from '../lib/storage.js';
import { secureUpload, scanText, SEV, logSecurityEvent } from '../security/index.js';
import { sanitizeText } from '../security/text-scan.js';
import { decide } from '../security/policy.js';
import { runJSON } from '../ai/index.js';
import { detectSchema } from '../ai/schemas.js';
import { promptDetect } from '../lib/prompts.js';
import { MATERIAS, keywordGuess } from '../lib/bancas.js';
import { assertCanUpload } from '../services/quota.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);
const perUser = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitos envios em pouco tempo. Aguarde alguns minutos.' } });
const words = (t) => (String(t).match(/\S+/g) || []).length;

async function detect(text, userId) {
  try {
    const { data: d } = await runJSON('detect', { ...promptDetect(text), maxTokens: 600, userId }, detectSchema);
    const found = MATERIAS.find((m) => m.toLowerCase() === d.materia.toLowerCase());
    return { materia: found || d.materia, confianca: d.confianca, temas: d.temas, resumo: d.resumo, outras: d.outras, origem: 'ia' };
  } catch (e) {
    console.warn('[detect] usando palavras-chave:', e.message);
    return keywordGuess(text); // fallback sem IA
  }
}

const view = (m) => ({ id: m.id, fileName: m.file_name, pages: m.pages, wordCount: m.word_count, preview: m.text.slice(0, 1400), materia: m.materia, detect: m.detect, ocr: m.ocr, createdAt: m.created_at });

// Envia um arquivo (multipart "file") ou texto colado (campo "text")
r.post('/', perUser, uploader([{ name: 'file', maxCount: 1 }]), ah(async (req, res) => {
  await assertCanUpload(req.user, 'material');
  const f = fileOf(req, 'file');
  let text, pages = null, sha = null, ocr = false, warnings = [], security;
  if (f) {
    const ctrl = new AbortController();
    res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
    const s = await secureUpload(f.buffer, f.name, 'material', { ocr: 'full', userId: req.user.id, ip: req.ip, signal: ctrl.signal });
    ({ text, pages } = s); sha = s.sha256; ocr = s.ocrDone;
    if (s.removed.length) warnings.push(`Removemos ${s.removed.length} trecho(s) que pareciam instruções para a IA.`);
    if (s.findings.some((x) => x.code.includes('oculto'))) warnings.push('O arquivo tinha texto oculto (invisível, branco ou coberto). Usamos só o texto visível.');
    if (s.findings.some((x) => x.code === 'ocr_parcial')) warnings.push('O PDF escaneado é longo: lemos só as primeiras páginas.');
    if (ocr) warnings.push('PDF escaneado: o texto foi lido das imagens das páginas.');
    security = { findings: s.findings, decision: s.decision };
  } else {
    const raw = String(req.body?.text || '').slice(0, 300000);
    const scan = scanText(raw, { where: 'texto_colado' });
    const d = decide('material', scan.findings);
    if (d.verdict === 'block') {
      await logSecurityEvent({ userId: req.user.id, kind: 'material_bloqueado', severity: d.severity, fileName: 'texto colado', details: { findings: scan.findings }, ip: req.ip });
      throw new HttpError(422, 'Não aceitamos este texto: ele contém instruções que tentam manipular o sistema.');
    }
    text = scan.text;
    if (d.verdict === 'sanitize') { const s2 = sanitizeText(text); text = s2.text; if (s2.removed.length) warnings.push(`Removemos ${s2.removed.length} trecho(s) que pareciam instruções para a IA.`); }
    security = { findings: scan.findings, decision: d };
  }
  if (words(text) < 60) throw new HttpError(422, ocr ? 'Não conseguimos ler texto suficiente nas páginas escaneadas.' : 'O material tem pouco texto para gerar questões (mínimo de 60 palavras).');
  const fileKey = f ? await putFile(makeKey(`materiais/${req.user.id}`, f.name), f.buffer, f.mime) : null;
  try {
    const d = await detect(text, req.user.id);
    const m = await one(`INSERT INTO materials(user_id,file_name,file_key,mime_type,size,pages,text,word_count,materia,detect,sha256,security,ocr)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, f?.name || null, fileKey, f?.mime || null, f?.buffer.length || null, pages, text, words(text), d?.materia || null, d ? JSON.stringify(d) : null, sha, JSON.stringify(security), ocr]);
    res.status(201).json({ material: view(m), warnings });
  } catch (e) { await deleteFile(fileKey); throw e; }
}));

r.get('/', ah(async (req, res) => {
  const rows = await many('SELECT * FROM materials WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.user.id]);
  res.json({ materials: rows.map(view) });
}));

r.delete('/:id', ah(async (req, res) => {
  const m = await one('DELETE FROM materials WHERE id=$1 AND user_id=$2 RETURNING file_key', [req.params.id, req.user.id]);
  if (m) await deleteFile(m.file_key);
  res.json({ ok: true });
}));

export default r;
