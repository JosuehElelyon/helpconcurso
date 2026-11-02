// =====================================================================
// Ciclo de vida das provas da base compartilhada
//   envio → [barreiras de segurança] → CHECKING (OCR de amostra, classificação por IA, duplicatas)
//   → IN_REVIEW (revisão humana) ou aprovação automática (admin / usuário de confiança)
//   → QUEUED → PROCESSING ou BATCH_PENDING (treino) → READY
//   Saídas: DUPLICATE, REJECTED, FAILED (pode reprocessar)
// =====================================================================
import { one, many, query } from '../db.js';
import { materiaId, topicoId } from './taxonomia.js';
import { config } from '../config.js';
import { BANCA } from '../lib/bancas.js';
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
    try { const { data } = await runJSON('prova_extract', { ...r, userId: p.uploaded_by }, provaExtractSchema); questions.push(...data.questoes); }
    catch (e) { if (e?.code === 'budget') throw e; console.warn(`[treino] parte da prova ${p.id} falhou: ${e.message}`); }
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
  for (const q of questions.slice(0, 200)) {
    const enun = q.enunciado.trim();
    if (enun.length < 15) continue;
    const key = enun.slice(0, 120); if (seen.has(key)) continue; seen.add(key);
    const isBad = SEV[scanText([enun, ...q.alternativas].join('\n')).severity] >= SEV.medium;
    if (isBad) flagged++;
    // Rótulos de "como a banca cobra" + vínculo com a taxonomia própria (Fase 1 da base de conhecimento)
    const topico = clean([q.topico || ''])[0] || null;
    const matId = await materiaId(q.materia);
    const topId = topico && !isBad ? await topicoId(matId, topico) : null;
    await query(`INSERT INTO prova_questoes(prova_id,banca,materia,numero,enunciado,alternativas,gabarito,flagged,topico,materia_id,topico_id,comando,pegadinha_tipo,habilidade,dispositivos)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [p.id, p.banca, q.materia || null, q.numero, enun, JSON.stringify(q.alternativas), q.gabarito || null, isBad,
        topico, matId, topId, q.comando || null, q.pegadinha || null, q.habilidade || null, JSON.stringify(clean(q.dispositivos || []))]);
    saved++;
  }
  if (saved - flagged === 0) throw Object.assign(new Error('Nenhuma questão válida foi extraída da prova.'), { permanent: true });
  const alerts = analysis.alertas?.length ? analysis.alertas : [];
  if (alerts.length) await logSecurityEvent({ userId: p.uploaded_by, kind: 'ia_relatou_instrucao', severity: 'medium', fileName: p.file_name, sha256: p.sha256, details: { alertas: alerts } });
  await setStatus(p.id, 'READY', {
    titulo: analysis.titulo || p.titulo, ano: p.ano || (/^\d{4}$/.test(analysis.ano) ? analysis.ano : null), orgao: p.orgao || analysis.orgao || null, cargo: p.cargo || analysis.cargo || null,
    materias: JSON.stringify(analysis.materias), analysis: JSON.stringify(safeAnalysis), num_questoes: saved - flagged, ai_batch_id: null, error: null,
  });
  console.log(`[treino] prova ${p.id} pronta: ${saved - flagged} questões (${flagged} descartadas pela segurança)`);
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
