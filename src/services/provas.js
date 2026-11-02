// =====================================================================
// Ciclo de vida das provas da base compartilhada
//   envio → [barreiras de segurança] → CHECKING (OCR de amostra, classificação por IA, duplicatas)
//   → IN_REVIEW (revisão humana) ou aprovação automática (admin / usuário de confiança)
//   → QUEUED → PROCESSING ou BATCH_PENDING (treino) → READY
//   Saídas: DUPLICATE, REJECTED, FAILED (pode reprocessar)
// =====================================================================
import { one, many, query } from '../db.js';
import { materiaId, topicoId, normNome } from './taxonomia.js';
import { config } from '../config.js';
import { BANCA, validarUrlOficial } from '../lib/bancas.js';
import { baixarDaFonteOficial } from '../lib/fonte-oficial.js';
import { HttpError } from '../lib/http.js';
import { putFile, getFile, makeKey, deleteFile } from '../lib/storage.js';
import { secureUpload, scanExtracted, logSecurityEvent, scanText, SEV } from '../security/index.js';
import { decide } from '../security/policy.js';
import { fingerprint, similarity } from '../security/fingerprint.js';
import { ocrPdf } from './ocr.js';
import { runJSON, batchSupported, submitBatch, pollBatch, extractJSON } from '../ai/index.js';
import { provaCheckSchema, provaAnalysisSchema, provaExtractSchema } from '../ai/schemas.js';
import { promptProvaCheck, promptProvaAnalysis, promptProvaExtract } from '../lib/prompts.js';
import { enqueue, registerJob } from '../jobs/queue.js';
import { sendProvaStatusEmail } from '../lib/mailer.js';
import { award } from './stars.js';

const ACTIVE = ['CHECKING', 'IN_REVIEW', 'QUEUED', 'PROCESSING', 'BATCH_PENDING', 'READY'];
const CHUNK = 24000, MAX_CHUNKS = 6;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

export const publicStatus = {
  CHECKING: 'Verificando', IN_REVIEW: 'Em revisão', QUEUED: 'Aprovada — na fila de treino', PROCESSING: 'Treinando a IA',
  BATCH_PENDING: 'Treinando a IA (lote)', READY: 'Na base', DUPLICATE: 'Já estava na base', REJECTED: 'Recusada', FAILED: 'Erro técnico',
};

async function setStatus(id, status, extra = {}) {
  const cols = Object.keys(extra), vals = Object.values(extra);
  const sets = cols.map((c, i) => `${c}=$${i + 3}`).join(', ');
  return one(`UPDATE provas SET status=$2${sets ? ', ' + sets : ''}, updated_at=now() WHERE id=$1 RETURNING *`, [id, status, ...vals]);
}
const isTrusted = (u) => u && (u.role === 'ADMIN' || (u.approved_contribs >= config.security.trustAutoApproveMin && u.rejected_contribs === 0));

// ---------------------------------------------------------------------
// 1) Envio
// ---------------------------------------------------------------------
export async function submitProva({ user, banca, orgao, cargo, ano, editalId, file, gabarito, ip, officialUrl = null, oficialConfirmado = false, officialUrlTipo = null }) {
  if (!BANCA[banca]) throw new HttpError(400, 'Escolha a banca.');
  if (user.role !== 'ADMIN') {
    const n = await one("SELECT count(*)::int AS n FROM provas WHERE uploaded_by=$1 AND created_at > now() - interval '24 hours'", [user.id]);
    if (n.n >= config.quota.provasPerDay) throw new HttpError(429, `Limite de ${config.quota.provasPerDay} provas por dia atingido. Tente amanhã.`);
  }
  // Barreiras de segurança (OCR fica para a checagem em segundo plano)
  const sec = await secureUpload(file.buffer, file.name, 'prova', { ocr: 'none', userId: user.id, ip });
  let gab = null;
  if (gabarito) gab = await secureUpload(gabarito.buffer, gabarito.name, 'gabarito', { ocr: 'none', userId: user.id, ip });

  // Duplicata exata (mesmo arquivo)
  const same = await one('SELECT id, status, review_note, banca FROM provas WHERE sha256=$1 ORDER BY created_at DESC LIMIT 1', [sec.sha256]);
  if (same && ACTIVE.includes(same.status)) return { duplicate: true, message: `Essa prova já está na nossa base (${publicStatus[same.status].toLowerCase()}). Obrigado!`, provaId: same.id };
  if (same && same.status === 'REJECTED') throw new HttpError(422, `Este arquivo já foi analisado e recusado${same.review_note ? `: ${same.review_note}` : '.'}`);

  const fileKey = await putFile(makeKey(`provas/${banca}`, file.name), file.buffer, file.mime);
  const gabKey = gabarito ? await putFile(makeKey(`provas/${banca}`, gabarito.name), gabarito.buffer, gabarito.mime) : null;
  const security = { findings: [...sec.findings, ...(gab ? gab.findings.map((f) => ({ ...f, where: 'gabarito:' + f.where })) : [])], decision: sec.decision, gabaritoDecision: gab?.decision || null, antivirus: sec.antivirus };
  // Só vincula a um edital do próprio aluno
  const validEditalId = /^[0-9a-f-]{36}$/i.test(String(editalId || ''))
    ? (await one('SELECT id FROM editais WHERE id=$1 AND user_id=$2', [editalId, user.id]))?.id || null
    : null;
  let p;
  try {
    p = await one(`INSERT INTO provas(banca, banca_informada, orgao, cargo, ano, titulo, file_name, file_key, gabarito_name, gabarito_key, sha256, gabarito_sha256,
                     text, gabarito_text, needs_ocr, page_count, security, source, uploaded_by, edital_id, status, official_url, oficial_confirmado, official_url_tipo)
                   VALUES ($1,$1,NULLIF($2,''),NULLIF($3,''),NULLIF($4,''),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'CHECKING',$20,$21,$22) RETURNING *`,
      [banca, orgao, cargo, ano, [orgao, cargo, ano].filter(Boolean).join(' · ') || file.name, file.name, fileKey, gabarito?.name || null, gabKey, sec.sha256, gab?.sha256 || null,
       sec.needsOcr ? null : sec.text, gab?.text || null, sec.needsOcr, sec.pages, JSON.stringify(security), user.role === 'ADMIN' ? 'admin' : 'user', user.id, validEditalId,
       officialUrl, oficialConfirmado, officialUrlTipo]);
  } catch (e) {
    await deleteFile(fileKey); await deleteFile(gabKey);
    if (e.code === '23505') return { duplicate: true, message: 'Essa prova acabou de ser enviada por outra pessoa e já está na nossa base.' };
    throw e;
  }
  await enqueue('prova.check', { provaId: p.id });
  return { prova: p };
}

// ---------------------------------------------------------------------
// 2) Checagem automática
// ---------------------------------------------------------------------
async function checkProva({ provaId }) {
  let p = await one('SELECT * FROM provas WHERE id=$1', [provaId]);
  if (!p || p.status !== 'CHECKING') return;
  const findings = [...(p.security?.findings || [])];

  // Amostra de texto (OCR das 3 primeiras páginas se for escaneada)
  let sample = p.text || '';
  if (p.needs_ocr) {
    const { buffer } = await getFile(p.file_key);
    const o = await ocrPdf(buffer, { maxPages: 3, userId: p.uploaded_by });
    const s = scanExtracted({ text: o.text });
    sample = s.text;
    findings.push(...s.findings.map((f) => ({ ...f, where: 'ocr_amostra' })));
  }
  if (sample.replace(/\s/g, '').length < 200) {
    await setStatus(p.id, 'REJECTED', { review_note: 'Não encontramos texto suficiente no arquivo para identificar uma prova.' });
    return notify(p.id);
  }
  const pre = decide('prova', findings);
  if (pre.verdict === 'block') {
    await logSecurityEvent({ userId: p.uploaded_by, kind: 'prova_bloqueada', severity: 'critical', fileName: p.file_name, sha256: p.sha256, details: { reasons: pre.reasons, stage: 'ocr' } });
    await setStatus(p.id, 'REJECTED', { review_note: 'O conteúdo das páginas contém instruções que tentam manipular a IA.', security: JSON.stringify({ ...p.security, findings }) });
    return notify(p.id);
  }

  // Classificação por IA (é prova? qual banca? há instruções escondidas?)
  const { data: c } = await runJSON('prova_check', { ...promptProvaCheck({ bancaInformada: BANCA[p.banca].nome, sample, fileName: p.file_name }), maxTokens: 1200, userId: p.uploaded_by }, provaCheckSchema);
  if (c.tentativa_de_instrucao) findings.push({ code: 'ia_detectou_instrucao', severity: 'high', where: 'classificacao', message: 'A checagem por IA encontrou instruções dirigidas a uma IA', sample: c.trechos_suspeitos.join(' | ') });

  const extra = { classification: JSON.stringify(c) };
  if (!p.orgao && c.orgao) extra.orgao = c.orgao.slice(0, 120);
  if (!p.cargo && c.cargo) extra.cargo = c.cargo.slice(0, 120);
  if (!p.ano && /^\d{4}$/.test(c.ano)) extra.ano = c.ano;
  const notes = [];

  if (p.oficial_confirmado) {
    findings.push({ code: 'fonte_oficial_confirmada', severity: 'low', where: 'veracidade', message: `Arquivo baixado da fonte oficial (${p.official_url_tipo}): ${p.official_url}` });
    notes.push(`Fonte oficial confirmada (${p.official_url}).`);
  } else if (p.official_url) {
    notes.push(`Link oficial informado pelo usuário (${p.official_url_tipo}), ainda não verificado: ${p.official_url}`);
  }

  // S6: só recusa automaticamente com 90% ou mais de certeza; abaixo disso, vai para revisão humana (IN_REVIEW)
  if (!c.e_prova && c.confianca >= 0.90) {
    await setStatus(p.id, 'REJECTED', { ...extra, review_note: 'O arquivo não parece ser uma prova de concurso (pode ser resumo, apostila, edital ou gabarito isolado).' });
    return notify(p.id);
  }
  if (!c.e_prova) {
    findings.push({ code: 'ia_duvida_se_e_prova', severity: 'medium', where: 'classificacao', message: `A IA suspeita que o arquivo pode não ser prova (${Math.round(c.confianca * 100)}% de certeza). Requer validação humana.` });
    notes.push(`A IA suspeitou que o arquivo pode não ser prova (${Math.round(c.confianca * 100)}% de certeza), mas a certeza foi inferior a 90%: encaminhada para revisão humana.`);
  }
  let banca = p.banca;
  const det = norm(c.banca);
  if (BANCA[det] && det !== p.banca && c.banca_confianca >= 0.75) { banca = det; notes.push(`Banca corrigida de ${BANCA[p.banca].nome} para ${BANCA[det].nome} pelo conteúdo do documento.`); }
  else if (!BANCA[det] && det && det !== 'desconhecida' && c.banca_confianca >= 0.90) {
    await setStatus(p.id, 'REJECTED', { ...extra, review_note: `A prova parece ser da banca "${c.banca}", que ainda não está entre as suportadas.` });
    return notify(p.id);
  }
  else if (!BANCA[det] && det && det !== 'desconhecida') {
    findings.push({ code: 'ia_duvida_banca_desconhecida', severity: 'medium', where: 'classificacao', message: `A IA sugeriu a banca não suportada "${c.banca}" (${Math.round(c.banca_confianca * 100)}% de certeza). Requer validação humana.` });
    notes.push(`A IA sugeriu a banca não suportada "${c.banca}" com confiança inferior a 90%: encaminhada para revisão humana.`);
  }
  extra.banca = banca;

  // Duplicatas por conteúdo (mesmo que o arquivo seja diferente)
  const fp = fingerprint(sample);
  if (fp) {
    extra.fingerprint = JSON.stringify(fp);
    const others = await many(`SELECT id, status, fingerprint, orgao, ano, cargo FROM provas WHERE banca=$1 AND id<>$2 AND fingerprint IS NOT NULL AND status = ANY($3)`, [banca, p.id, ACTIVE]);
    let best = { sim: 0 };
    for (const o of others) { const sim = similarity(fp, o.fingerprint); if (sim > best.sim) best = { sim, o }; }
    const meta = (x) => [norm(x.orgao), norm(x.ano), norm(x.cargo)].join('|');
    const sameMeta = best.o && norm(extra.orgao || p.orgao) && meta({ orgao: extra.orgao || p.orgao, ano: extra.ano || p.ano, cargo: extra.cargo || p.cargo }) === meta(best.o);
    if (best.sim >= 0.75 || (sameMeta && best.sim >= 0.4)) {
      await setStatus(p.id, 'DUPLICATE', { ...extra, duplicate_of: best.o.id, review_note: 'Essa prova já estava na nossa base.' });
      return notify(p.id);
    }
    if (best.sim >= 0.45) findings.push({ code: 'possivel_duplicata', severity: 'medium', where: 'duplicatas', message: `Parecida com outra prova da base (${Math.round(best.sim * 100)}%)` });
  }

  // Decisão: aprovação automática só para quem é de confiança e sem nenhum alerta
  const decision = decide('prova', findings);
  extra.security = JSON.stringify({ ...p.security, findings, decision });
  if (notes.length) extra.review_note = notes.join(' ');
  const uploader = p.uploaded_by ? await one('SELECT * FROM users WHERE id=$1', [p.uploaded_by]) : null;
  const legacy = findings.some((f) => f.code === 'doc_legado');
  if (decision.verdict === 'ok' && !legacy && isTrusted(uploader)) {
    await setStatus(p.id, 'QUEUED', { ...extra, auto_approved: true, reviewed_at: new Date() });
    await creditUploader(p);
    await enqueue('prova.train', { provaId: p.id });
  } else {
    await setStatus(p.id, 'IN_REVIEW', extra);
  }
}

// ---------------------------------------------------------------------
// 3) Revisão humana
// ---------------------------------------------------------------------
async function creditUploader(p) {
  if (p.source !== 'user' || !p.uploaded_by) return;
  await query('UPDATE users SET approved_contribs=approved_contribs+1, bonus_credits=bonus_credits+$2 WHERE id=$1', [p.uploaded_by, config.quota.bonusPerApprovedProva]);
  await award(p.uploaded_by, 'prova_aprovada', config.stars.provaAprovada, p.id, `Prova aprovada: ${String(p.titulo || p.file_name).slice(0, 80)}`);
}

export async function approveProva(id, reviewer, { banca } = {}) {
  const p = await one('SELECT * FROM provas WHERE id=$1', [id]);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (!['IN_REVIEW', 'REJECTED', 'FAILED', 'DUPLICATE'].includes(p.status)) throw new HttpError(409, `Não é possível aprovar uma prova com status "${publicStatus[p.status]}".`);
  if (banca && !BANCA[banca]) throw new HttpError(400, 'Banca inválida.');
  const hadFindings = (p.security?.findings || []).some((f) => SEV[f.severity] >= SEV.medium);
  const wasPending = p.status === 'IN_REVIEW';
  await setStatus(id, 'QUEUED', { banca: banca || p.banca, reviewed_by: reviewer.id, reviewed_at: new Date(), security_override: hadFindings, auto_approved: false, error: null, duplicate_of: null });
  if (wasPending) await creditUploader(p);
  await enqueue('prova.train', { provaId: id });
  await notify(id, 'approved');
  return one('SELECT * FROM provas WHERE id=$1', [id]);
}

export async function rejectProva(id, reviewer, motivo) {
  const p = await one('SELECT * FROM provas WHERE id=$1', [id]);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (['REJECTED'].includes(p.status)) return p;
  if (['PROCESSING', 'BATCH_PENDING'].includes(p.status)) throw new HttpError(409, 'A prova está em treino; aguarde terminar ou remova-a.');
  await setStatus(id, 'REJECTED', { review_note: String(motivo || 'Recusada na revisão.').slice(0, 500), reviewed_by: reviewer.id, reviewed_at: new Date() });
  if (p.status === 'IN_REVIEW' && p.source === 'user') await query('UPDATE users SET rejected_contribs=rejected_contribs+1 WHERE id=$1', [p.uploaded_by]);
  if (p.status === 'READY') await query('DELETE FROM prova_questoes WHERE prova_id=$1', [id]);
  await notify(id);
  return one('SELECT * FROM provas WHERE id=$1', [id]);
}

// ---------------------------------------------------------------------
// 4) Treino (direto ou em lote)
// ---------------------------------------------------------------------
function chunks(text) {
  const out = []; let i = 0;
  while (i < text.length && out.length < MAX_CHUNKS) {
    let end = Math.min(text.length, i + CHUNK);
    if (end < text.length) { const nl = text.lastIndexOf('\n', end); if (nl > i + CHUNK * 0.6) end = nl; }
    out.push(text.slice(i, end)); i = end;
  }
  return out;
}

const chaveQuestao = (enun) => normNome(enun).slice(0, 80);

async function trainProva({ provaId }) {
  let p = await one('SELECT * FROM provas WHERE id=$1', [provaId]);
  if (!p || !['QUEUED', 'PROCESSING'].includes(p.status)) return;
  p = await setStatus(p.id, 'PROCESSING', { attempts: p.attempts + 1, error: null });

  // Texto completo (OCR de todas as páginas, se escaneada) + nova varredura
  let text = p.text;
  if (p.needs_ocr && !p.ocr_done) {
    const { buffer } = await getFile(p.file_key);
    const o = await ocrPdf(buffer, { maxPages: config.security.maxOcrPagesProva, userId: p.uploaded_by });
    const s = scanExtracted({ text: o.text });
    const d = decide('prova', s.findings);
    if (d.verdict === 'block' || (d.verdict === 'review' && !p.security_override)) {
      await setStatus(p.id, 'IN_REVIEW', { text: s.text, ocr_done: true, security_override: false, review_note: 'Novos alertas de segurança surgiram ao ler todas as páginas escaneadas.', security: JSON.stringify({ ...p.security, findings: [...(p.security?.findings || []), ...s.findings.map((f) => ({ ...f, where: 'ocr_completo' }))] }) });
      return;
    }
    text = s.text;
    p = await setStatus(p.id, 'PROCESSING', { text, ocr_done: true });
  }
  if (!text || text.replace(/\s/g, '').length < 200) throw Object.assign(new Error('A prova não tem texto suficiente para treinar.'), { permanent: true });

  const parts = chunks(text);
  const analysisReq = { ...promptProvaAnalysis({ banca: p.banca, text, gabarito: p.gabarito_text, fileName: p.file_name }), maxTokens: 3000 };
  const extractReqs = parts.map((chunk, i) => ({ ...promptProvaExtract({ banca: p.banca, chunk, gabarito: p.gabarito_text, part: i + 1, total: parts.length }), maxTokens: 16000 }));

  if (batchSupported('prova_analysis') && batchSupported('prova_extract')) {
    const refA = await submitBatch('prova_analysis', [{ id: 'analysis', ...analysisReq }]);
    const refE = await submitBatch('prova_extract', extractReqs.map((r, i) => ({ id: `extract-${i}`, ...r })));
    await setStatus(p.id, 'BATCH_PENDING', { ai_batch_id: JSON.stringify({ analysis: refA, extract: refE, since: Date.now() }) });
    await enqueue('prova.batch_poll', { provaId: p.id }, { delaySec: 30, maxAttempts: 6 });
    return;
  }
  const { data: analysis } = await runJSON('prova_analysis', { ...analysisReq, userId: p.uploaded_by }, provaAnalysisSchema);
  const questions = [];
  for (const r of extractReqs) {
    try {
      const { data: ext1, meta: meta1 } = await runJSON('prova_extract', { ...r, userId: p.uploaded_by }, provaExtractSchema);
      let ext2 = null, meta2 = null;
      // F6: Dupla extração com consenso de gabarito entre modelos gratuitos
      if (config.ai.consensoGabarito !== false) {
        try {
          const res2 = await runJSON('prova_extract', { ...r, userId: p.uploaded_by, avoid: { provider: meta1?.provider, model: meta1?.model } }, provaExtractSchema);
          ext2 = res2.data;
          meta2 = res2.meta;
        } catch (e2) {
          console.warn(`[consenso] segunda extração indisponível para parte da prova ${p.id}: ${e2.message}`);
        }
      }

      const q2Map = new Map();
      if (ext2?.questoes) {
        for (const q of ext2.questoes) {
          if (q.numero != null) q2Map.set(q.numero, q);
          else q2Map.set(chaveQuestao(q.enunciado), q);
        }
      }

      for (const q1 of ext1.questoes) {
        const q2 = q2Map.get(q1.numero != null ? q1.numero : chaveQuestao(q1.enunciado));
        let consenso = true;
        let divergencia = null;

        if (q2 && q1.gabarito && q2.gabarito && q1.gabarito.trim() && q2.gabarito.trim()) {
          const g1 = q1.gabarito.trim().toUpperCase();
          const g2 = q2.gabarito.trim().toUpperCase();
          if (g1 !== g2) {
            consenso = false;
            divergencia = {
              modelo1: { provider: meta1?.provider || 'modelo1', model: meta1?.model || 'padrao', gabarito: g1 },
              modelo2: { provider: meta2?.provider || 'modelo2', model: meta2?.model || 'reserva', gabarito: g2 },
            };
          }
        }
        q1.consenso_gabarito = consenso;
        q1.divergencia_gabarito = divergencia;
        questions.push(q1);
      }
    } catch (e) {
      if (e?.code === 'budget') throw e;
      console.warn(`[treino] parte da prova ${p.id} falhou: ${e.message}`);
    }
  }
  await finalize(p, analysis, questions);
}

async function pollProvaBatch({ provaId }) {
  const p = await one('SELECT * FROM provas WHERE id=$1', [provaId]);
  if (!p || p.status !== 'BATCH_PENDING') return;
  const refs = JSON.parse(p.ai_batch_id || '{}');
  // Lotes podem levar até 24h; depois de 26h desistimos e treinamos direto
  if (Date.now() - refs.since > 26 * 3600 * 1000) { await setStatus(p.id, 'QUEUED', { ai_batch_id: null }); await enqueue('prova.train', { provaId: p.id }); return; }
  const [ra, re] = await Promise.all([pollBatch('prova_analysis', refs.analysis), pollBatch('prova_extract', refs.extract)]);
  if (ra.state !== 'ended' || re.state !== 'ended') return { retryInSec: 120 };

  const parse = (res, schema) => { if (!res || res.error) return null; try { const v = schema.safeParse(extractJSON(res.text)); return v.success ? v.data : null; } catch { return null; } };
  let analysis = parse(ra.results.get('analysis'), provaAnalysisSchema);
  if (!analysis) { // análise do lote falhou → faz direto
    const text = p.text || '';
    analysis = (await runJSON('prova_analysis', { ...promptProvaAnalysis({ banca: p.banca, text, gabarito: p.gabarito_text, fileName: p.file_name }), maxTokens: 3000, userId: p.uploaded_by }, provaAnalysisSchema)).data;
  }
  const questions = [];
  for (const [k, v] of re.results) if (k.startsWith('extract-')) { const d = parse(v, provaExtractSchema); if (d) questions.push(...d.questoes); }
  await finalize(p, analysis, questions);
}

// Grava o aprendizado — depois de varrer de novo TUDO que veio da IA (vai virar prompt de outros alunos)
async function finalize(p, analysis, questions) {
  const clean = (arr) => arr.filter((s) => SEV[scanText(s).severity] < SEV.medium);
  const safeAnalysis = { caracteristicas: clean(analysis.caracteristicas), padroes_enunciado: clean(analysis.padroes_enunciado), pegadinhas: clean(analysis.pegadinhas), dificuldade: analysis.dificuldade, alertas: analysis.alertas };
  await query('DELETE FROM prova_questoes WHERE prova_id=$1', [p.id]);
  let saved = 0, flagged = 0;
  const seen = new Set();
  let teveDivergencia = false;
  for (const q of questions.slice(0, 200)) {
    const enun = q.enunciado.trim();
    if (enun.length < 15) continue;
    const key = enun.slice(0, 120); if (seen.has(key)) continue; seen.add(key);
    const isBad = SEV[scanText([enun, ...q.alternativas].join('\n')).severity] >= SEV.medium;
    if (isBad) flagged++;
    if (q.consenso_gabarito === false) teveDivergencia = true;
    // Rótulos de "como a banca cobra" + vínculo com a taxonomia própria (Fase 1 da base de conhecimento)
    const topico = clean([q.topico || ''])[0] || null;
    const matId = await materiaId(q.materia);
    const topId = topico && !isBad ? await topicoId(matId, topico) : null;
    await query(`INSERT INTO prova_questoes(prova_id,banca,materia,numero,enunciado,alternativas,gabarito,flagged,topico,materia_id,topico_id,comando,pegadinha_tipo,habilidade,dispositivos,consenso_gabarito,divergencia_gabarito)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [p.id, p.banca, q.materia || null, q.numero, enun, JSON.stringify(q.alternativas), q.gabarito || null, isBad,
        topico, matId, topId, q.comando || null, q.pegadinha || null, q.habilidade || null, JSON.stringify(clean(q.dispositivos || [])),
        q.consenso_gabarito !== false, q.divergencia_gabarito ? JSON.stringify(q.divergencia_gabarito) : null]);
    saved++;
  }
  if (saved - flagged === 0) throw Object.assign(new Error('Nenhuma questão válida foi extraída da prova.'), { permanent: true });
  const alerts = analysis.alertas?.length ? analysis.alertas : [];
  if (alerts.length) await logSecurityEvent({ userId: p.uploaded_by, kind: 'ia_relatou_instrucao', severity: 'medium', fileName: p.file_name, sha256: p.sha256, details: { alertas: alerts } });
  await setStatus(p.id, 'READY', {
    titulo: analysis.titulo || p.titulo, ano: p.ano || (/^\d{4}$/.test(analysis.ano) ? analysis.ano : null), orgao: p.orgao || analysis.orgao || null, cargo: p.cargo || analysis.cargo || null,
    materias: JSON.stringify(analysis.materias), analysis: JSON.stringify(safeAnalysis), num_questoes: saved - flagged, ai_batch_id: null, error: null,
    consenso_concluido: !teveDivergencia,
  });
  console.log(`[treino] prova ${p.id} pronta: ${saved - flagged} questões (${flagged} descartadas pela segurança, consenso=${!teveDivergencia})`);
  await notify(p.id);
}

// ---------------------------------------------------------------------
// Notificações por e-mail para quem enviou
// ---------------------------------------------------------------------
async function notify(id, event) {
  try {
    const p = await one('SELECT p.*, u.email, u.name FROM provas p JOIN users u ON u.id=p.uploaded_by WHERE p.id=$1', [id]);
    if (!p || p.source !== 'user') return;
    const st = event === 'approved' ? 'APPROVED' : p.status;
    if (!['APPROVED', 'READY', 'REJECTED', 'DUPLICATE'].includes(st)) return;
    await sendProvaStatusEmail({ email: p.email, name: p.name }, { titulo: p.titulo || p.file_name, banca: BANCA[p.banca]?.nome, status: st, note: p.review_note, bonus: config.quota.bonusPerApprovedProva });
  } catch (e) { console.warn('[provas] falha ao notificar:', e.message); }
}

// ---------------------------------------------------------------------
// Tarefas da fila
// ---------------------------------------------------------------------
const failTo = (status) => async ({ provaId }, err) => {
  const msg = err?.name === 'AiError' || err?.code ? (await import('../ai/errors.js')).userMessage(err) : String(err?.message || err);
  await query('UPDATE provas SET status=$2, error=$3, updated_at=now() WHERE id=$1', [provaId, status, msg.slice(0, 500)]);
};
registerJob('prova.check', { run: checkProva, onDead: failTo('FAILED'), maxAttempts: 4 });
registerJob('prova.train', { run: trainProva, onDead: failTo('FAILED'), maxAttempts: 4 });
registerJob('prova.batch_poll', { run: pollProvaBatch, onDead: failTo('FAILED'), maxAttempts: 6 });

// ---------------------------------------------------------------------
// F5) Rotular provas antigas (tópico, comando, pegadinha, habilidade, leis) — feitas antes do prova_extract v2.
// Só completa os rótulos das questões já gravadas: não mexe em enunciado, gabarito nem alertas, e não refaz a análise.
// Prova é documento público → roda na cascata grátis (dados='publico'); o Claude só entra como reserva.
// ---------------------------------------------------------------------
async function relabelProva({ provaId }) {
  const p = await one("SELECT * FROM provas WHERE id=$1 AND status='READY'", [provaId]);
  if (!p?.text) return;
  const pendentes = await many('SELECT id, numero, enunciado FROM prova_questoes WHERE prova_id=$1 AND comando IS NULL AND NOT flagged', [p.id]);
  if (!pendentes.length) return;
  const porChave = new Map(pendentes.map((r) => [chaveQuestao(r.enunciado), r]));
  const porNumero = new Map(pendentes.filter((r) => r.numero != null).map((r) => [r.numero, r]));
  const clean = (arr) => arr.filter((s) => SEV[scanText(s).severity] < SEV.medium);
  const parts = chunks(p.text);
  let rotuladas = 0;
  for (let i = 0; i < parts.length; i++) {
    let data;
    try { ({ data } = await runJSON('prova_extract', { ...promptProvaExtract({ banca: p.banca, chunk: parts[i], gabarito: p.gabarito_text, part: i + 1, total: parts.length }), maxTokens: 16000 }, provaExtractSchema)); }
    catch (e) { if (e?.code === 'budget') throw e; console.warn(`[rotular] parte ${i + 1} da prova ${p.id} falhou: ${e.message}`); continue; }
    for (const q of data.questoes) {
      const alvo = porChave.get(chaveQuestao(q.enunciado)) || (q.numero != null ? porNumero.get(q.numero) : null);
      if (!alvo || alvo.feito) continue;
      const topico = clean([q.topico || ''])[0] || null;
      const matId = await materiaId(q.materia);
      const topId = topico ? await topicoId(matId, topico) : null;
      await query(`UPDATE prova_questoes SET topico=$2, materia_id=$3, topico_id=$4, comando=$5, pegadinha_tipo=$6, habilidade=$7, dispositivos=$8
                   WHERE id=$1 AND comando IS NULL`,
        [alvo.id, topico, matId, topId, q.comando || null, q.pegadinha || null, q.habilidade || null, JSON.stringify(clean(q.dispositivos || []))]);
      alvo.feito = true; rotuladas++;
    }
  }
  console.log(`[rotular] prova ${p.id}: ${rotuladas}/${pendentes.length} questões rotuladas`);
}
registerJob('prova.relabel', { run: relabelProva, maxAttempts: 3 });

/** Enfileira a rotulagem de todas as provas prontas que ainda têm questões sem rótulo. Devolve quantas provas entraram na fila. */
export async function enqueueRelabel() {
  const rows = await many(`SELECT DISTINCT q.prova_id AS id FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
                           WHERE p.status='READY' AND q.comando IS NULL AND NOT q.flagged`);
  for (const r of rows) await enqueue('prova.relabel', { provaId: r.id });
  return rows.length;
}

export async function reprocessProva(id) {
  const p = await one('SELECT * FROM provas WHERE id=$1', [id]);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (['CHECKING', 'PROCESSING', 'BATCH_PENDING'].includes(p.status)) throw new HttpError(409, 'A prova já está sendo processada.');
  if (p.status === 'READY' || p.status === 'QUEUED' || (p.status === 'FAILED' && p.reviewed_at)) {
    await setStatus(id, 'QUEUED', { error: null }); await enqueue('prova.train', { provaId: id });
  } else {
    await setStatus(id, 'CHECKING', { error: null }); await enqueue('prova.check', { provaId: id });
  }
  return one('SELECT * FROM provas WHERE id=$1', [id]);
}

// ---------------------------------------------------------------------
// F7) Gabarito definitivo oficial: parsing determinístico e anulações
// ---------------------------------------------------------------------
export function parseGabaritoTexto(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const regex = /(?:quest[aã]o|item)?\s*(\d{1,3})\s*[-:.)]?\s*(?:gabarito\s*[:=]?\s*)?(?:alterad[ao]\s*(?:de\s*([a-e]|certo|errado|[ce])\s*)?para\s*([a-e]|certo|errado|[ce])|([a-e]|certo|errado|[ce])\s*\((?:alterad[ao]|retificad[ao])\)|(anulad[ao]s?|nul[ao]s?|cancelad[ao]s?|revogad[ao]|sem\s+resposta|[x#])|([a-e]|certo|errado|[ce]))(?:\b|[^\w]|$)/gi;

  const map = new Map();
  let m;
  while ((m = regex.exec(rawText)) !== null) {
    const numero = Number(m[1]);
    if (numero < 1 || numero > 300) continue;
    const normLetra = (s) => {
      if (!s) return null;
      const u = s.trim().toUpperCase();
      if (u === 'CERTO') return 'C';
      if (u === 'ERRADO') return 'E';
      return u[0];
    };
    const altOrig = normLetra(m[2]);
    const altNova = normLetra(m[3] || m[4]);
    const isAnulada = !!m[5];
    const simples = normLetra(m[6]);

    const gabarito = isAnulada ? null : (altNova || simples || null);
    const alterado = !!altNova || !!altOrig;
    const motivo = isAnulada
      ? 'Questão anulada no gabarito oficial.'
      : alterado
        ? (altOrig ? `Gabarito alterado de ${altOrig} para ${altNova}.` : `Gabarito alterado para ${altNova}.`)
        : null;

    const entry = {
      numero,
      gabarito,
      anulada: isAnulada,
      alterado,
      original: altOrig,
      motivo,
    };

    const prev = map.get(numero);
    if (!prev) {
      map.set(numero, entry);
    } else {
      if (entry.anulada || entry.alterado || !prev.gabarito) {
        map.set(numero, {
          ...entry,
          original: entry.original || prev.gabarito || null,
        });
      } else if (!prev.anulada && !prev.alterado) {
        map.set(numero, entry);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.numero - b.numero);
}

export async function aplicarGabaritoDefinitivo({ provaId, user, url, file, text }) {
  const p = await one('SELECT * FROM provas WHERE id=$1', [provaId]);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');

  let rawText = text || '';
  let oficialConfirmado = false;
  let officialUrl = p.gabarito_definitivo_url || null;

  if (url) {
    const d = await baixarDaFonteOficial(p.banca, url);
    const sec = await secureUpload(d.buffer, d.name, 'gabarito', { ocr: 'full', userId: user.id });
    rawText = sec.text || '';
    oficialConfirmado = true;
    officialUrl = d.url;
  } else if (file) {
    const sec = await secureUpload(file.buffer, file.name, 'gabarito', { ocr: 'full', userId: user.id });
    rawText = sec.text || '';
  }

  if (!rawText.trim()) throw new HttpError(400, 'Não foi possível extrair o texto do gabarito definitivo.');

  const itens = parseGabaritoTexto(rawText);
  if (!itens.length) throw new HttpError(422, 'Nenhuma questão ou gabarito foi identificado no texto fornecido.');

  const questoes = await many('SELECT id, numero, gabarito, anulada, gabarito_alterado FROM prova_questoes WHERE prova_id=$1', [provaId]);
  const porNumero = new Map(questoes.filter((q) => q.numero != null).map((q) => [q.numero, q]));

  let atualizadas = 0, anuladasCount = 0, alteradasCount = 0;
  const relatorio = [];

  for (const item of itens) {
    const alvo = porNumero.get(item.numero);
    if (!alvo) continue;

    let alterado = item.alterado;
    let original = item.original || alvo.gabarito;
    let motivo = item.motivo;

    if (!item.anulada && item.gabarito && alvo.gabarito && item.gabarito !== alvo.gabarito && !alterado) {
      alterado = true;
      motivo = `Gabarito alterado de ${alvo.gabarito} para ${item.gabarito}.`;
    }

    if (item.anulada) {
      await query(
        `UPDATE prova_questoes
         SET anulada = true, motivo_anulacao = $2, gabarito_definitivo = true
         WHERE id = $1`,
        [alvo.id, motivo || 'Anulada no gabarito oficial definitivo.']
      );
      anuladasCount++;
      atualizadas++;
      relatorio.push({ numero: item.numero, status: 'anulada', motivo });
    } else {
      await query(
        `UPDATE prova_questoes
         SET gabarito = $2,
             gabarito_alterado = $3,
             gabarito_original = CASE WHEN $3 THEN coalesce(gabarito_original, $4) ELSE gabarito_original END,
             motivo_anulacao = $5,
             gabarito_definitivo = true
         WHERE id = $1`,
        [alvo.id, item.gabarito, alterado, original, motivo]
      );
      if (alterado) alteradasCount++;
      atualizadas++;
      relatorio.push({ numero: item.numero, status: alterado ? 'alterada' : 'confirmada', gabarito: item.gabarito, motivo });
    }
  }

  await query(
    `UPDATE provas
     SET gabarito_definitivo = true,
         gabarito_definitivo_url = $2,
         gabarito_definitivo_confirmado = $3,
         gabarito_text = coalesce($4, gabarito_text),
         updated_at = now()
     WHERE id = $1`,
    [provaId, officialUrl, oficialConfirmado, rawText]
  );

  const updatedProva = await one('SELECT * FROM provas WHERE id=$1', [provaId]);
  return {
    prova: updatedProva,
    resumo: {
      totalLidas: itens.length,
      totalQuestoesProva: questoes.length,
      atualizadas,
      anuladas: anuladasCount,
      alteradas: alteradasCount,
      detalhes: relatorio,
    },
  };
}

// ---------------------------------------------------------------------
// B1) Importação de provas em lote pelo admin
// ---------------------------------------------------------------------
export async function importarProvasEmLote({ user, defaultBanca, itens = [], texto = '' }) {
  if (user.role !== 'ADMIN') throw new HttpError(403, 'Acesso negado.');

  let lista = Array.isArray(itens) ? [...itens] : [];
  if (texto && typeof texto === 'string') {
    const linhas = texto.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'));
    for (const linha of linhas) {
      const partes = linha.split(/\s*\|\s*/);
      if (partes.length >= 2) {
        const [provaUrl, gabaritoUrl, orgao, cargo, ano, bnc] = partes;
        lista.push({
          provaUrl,
          gabaritoUrl: gabaritoUrl && /^https?:\/\//i.test(gabaritoUrl) ? gabaritoUrl : undefined,
          orgao: orgao || undefined,
          cargo: cargo || undefined,
          ano: ano || undefined,
          banca: bnc || undefined,
        });
      } else {
        const urls = linha.split(/\s+/).filter((p) => /^https?:\/\//i.test(p));
        if (urls.length >= 1) {
          lista.push({
            provaUrl: urls[0],
            gabaritoUrl: urls[1] || undefined,
          });
        }
      }
    }
  }

  if (!lista.length) throw new HttpError(400, 'Nenhuma URL de prova fornecida para importação em lote.');

  const resultados = [];
  let importadas = 0, duplicatas = 0, erros = 0;

  for (let i = 0; i < lista.length; i++) {
    const it = lista[i];
    const banca = it.banca || defaultBanca;
    if (!banca || !BANCA[banca]) {
      erros++;
      resultados.push({ item: i + 1, url: it.provaUrl, status: 'erro', erro: `Banca "${banca || ''}" não informada ou não suportada.` });
      continue;
    }

    try {
      const dProva = await baixarDaFonteOficial(banca, it.provaUrl);
      const file = { buffer: dProva.buffer, name: dProva.name, mime: dProva.mime };

      let gabarito = null;
      if (it.gabaritoUrl) {
        const dGab = await baixarDaFonteOficial(banca, it.gabaritoUrl);
        gabarito = { buffer: dGab.buffer, name: dGab.name, mime: dGab.mime };
      }

      const res = await submitProva({
        user,
        banca,
        orgao: it.orgao || '',
        cargo: it.cargo || '',
        ano: it.ano || '',
        file,
        gabarito,
        officialUrl: dProva.url,
        oficialConfirmado: true,
        officialUrlTipo: dProva.tipo,
        ip: '127.0.0.1',
      });

      if (res.duplicate) {
        duplicatas++;
        resultados.push({ item: i + 1, url: dProva.url, status: 'duplicata', provaId: res.provaId, mensagem: res.message });
      } else {
        importadas++;
        resultados.push({ item: i + 1, url: dProva.url, status: 'importada', provaId: res.prova?.id, titulo: res.prova?.titulo });
      }
    } catch (err) {
      erros++;
      resultados.push({ item: i + 1, url: it.provaUrl, status: 'erro', erro: err.message });
    }
  }

  return {
    total: lista.length,
    importadas,
    duplicatas,
    erros,
    resultados,
  };
}
