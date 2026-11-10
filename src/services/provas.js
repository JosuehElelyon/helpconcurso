// =====================================================================
// Ciclo de vida das provas da base compartilhada
//   envio → [barreiras de segurança] → CHECKING (OCR de amostra, classificação por IA, duplicatas)
//   → IN_REVIEW (revisão humana) ou aprovação automática (admin / usuário de confiança)
//   → QUEUED → PROCESSING ou BATCH_PENDING (treino) → READY
//   Saídas: DUPLICATE, REJECTED, FAILED (pode reprocessar)
// =====================================================================
import * as provasRepo from '../repositories/provas.js';
import * as editaisRepo from '../repositories/editais.js';
import * as usuariosRepo from '../repositories/usuarios.js';
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

const setStatus = (id, status, extra = {}) => provasRepo.definirStatus(id, status, extra);
const isTrusted = (u) => u && (u.role === 'ADMIN' || (u.approved_contribs >= config.security.trustAutoApproveMin && u.rejected_contribs === 0));

// ---------------------------------------------------------------------
// 1) Envio
// ---------------------------------------------------------------------
export async function submitProva({ user, banca, orgao, cargo, ano, editalId, file, gabarito, ip, officialUrl = null, oficialConfirmado = false, officialUrlTipo = null }) {
  if (!BANCA[banca]) throw new HttpError(400, 'Escolha a banca.');
  if (user.role !== 'ADMIN') {
    if ((await provasRepo.enviadasNas24h(user.id)) >= config.quota.provasPerDay) throw new HttpError(429, `Limite de ${config.quota.provasPerDay} provas por dia atingido. Tente amanhã.`);
  }
  // Barreiras de segurança (OCR fica para a checagem em segundo plano)
  const sec = await secureUpload(file.buffer, file.name, 'prova', { ocr: 'none', userId: user.id, ip });
  let gab = null;
  if (gabarito) gab = await secureUpload(gabarito.buffer, gabarito.name, 'gabarito', { ocr: 'none', userId: user.id, ip });

  // Duplicata exata (mesmo arquivo)
  const same = await provasRepo.porSha256(sec.sha256);
  if (same && ACTIVE.includes(same.status)) return { duplicate: true, message: `Essa prova já está na nossa base (${publicStatus[same.status].toLowerCase()}). Obrigado!`, provaId: same.id };
  if (same && same.status === 'REJECTED') throw new HttpError(422, `Este arquivo já foi analisado e recusado${same.review_note ? `: ${same.review_note}` : '.'}`);

  const fileKey = await putFile(makeKey(`provas/${banca}`, file.name), file.buffer, file.mime);
  const gabKey = gabarito ? await putFile(makeKey(`provas/${banca}`, gabarito.name), gabarito.buffer, gabarito.mime) : null;
  const security = { findings: [...sec.findings, ...(gab ? gab.findings.map((f) => ({ ...f, where: 'gabarito:' + f.where })) : [])], decision: sec.decision, gabaritoDecision: gab?.decision || null, antivirus: sec.antivirus };
  // Só vincula a um edital do próprio aluno
  const validEditalId = /^[0-9a-f-]{36}$/i.test(String(editalId || '')) && (await editaisRepo.existe(editalId, user.id)) ? editalId : null;
  let p;
  try {
    p = await provasRepo.inserir({
      banca, orgao, cargo, ano, titulo: [orgao, cargo, ano].filter(Boolean).join(' · ') || file.name, fileName: file.name, fileKey,
      gabaritoName: gabarito?.name || null, gabaritoKey: gabKey, sha256: sec.sha256, gabaritoSha256: gab?.sha256 || null,
      text: sec.needsOcr ? null : sec.text, gabaritoText: gab?.text || null, needsOcr: sec.needsOcr, pages: sec.pages, security,
      source: user.role === 'ADMIN' ? 'admin' : 'user', uploadedBy: user.id, editalId: validEditalId, officialUrl, oficialConfirmado, officialUrlTipo,
    });
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
  let p = await provasRepo.buscar(provaId);
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
    const others = await provasRepo.comImpressaoDigital(banca, p.id, ACTIVE);
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
  const uploader = p.uploaded_by ? await usuariosRepo.buscar(p.uploaded_by) : null;
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
  await usuariosRepo.creditarContribuicao(p.uploaded_by, config.quota.bonusPerApprovedProva);
  await award(p.uploaded_by, 'prova_aprovada', config.stars.provaAprovada, p.id, `Prova aprovada: ${String(p.titulo || p.file_name).slice(0, 80)}`);
}

export async function approveProva(id, reviewer, { banca } = {}) {
  const p = await provasRepo.buscar(id);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (!['IN_REVIEW', 'REJECTED', 'FAILED', 'DUPLICATE'].includes(p.status)) throw new HttpError(409, `Não é possível aprovar uma prova com status "${publicStatus[p.status]}".`);
  if (banca && !BANCA[banca]) throw new HttpError(400, 'Banca inválida.');
  const hadFindings = (p.security?.findings || []).some((f) => SEV[f.severity] >= SEV.medium);
  const wasPending = p.status === 'IN_REVIEW';
  await setStatus(id, 'QUEUED', { banca: banca || p.banca, reviewed_by: reviewer.id, reviewed_at: new Date(), security_override: hadFindings, auto_approved: false, error: null, duplicate_of: null });
  if (wasPending) await creditUploader(p);
  await enqueue('prova.train', { provaId: id });
  await notify(id, 'approved');
  return provasRepo.buscar(id);
}

export async function rejectProva(id, reviewer, motivo) {
  const p = await provasRepo.buscar(id);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (['REJECTED'].includes(p.status)) return p;
  if (['PROCESSING', 'BATCH_PENDING'].includes(p.status)) throw new HttpError(409, 'A prova está em treino; aguarde terminar ou remova-a.');
  await setStatus(id, 'REJECTED', { review_note: String(motivo || 'Recusada na revisão.').slice(0, 500), reviewed_by: reviewer.id, reviewed_at: new Date() });
  if (p.status === 'IN_REVIEW' && p.source === 'user') await usuariosRepo.registrarRecusa(p.uploaded_by);
  if (p.status === 'READY') await provasRepo.excluirQuestoes(id);
  await notify(id);
  return provasRepo.buscar(id);
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
  let p = await provasRepo.buscar(provaId);
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
      // F6: Dupla extração com consenso de gabarito — SÓ com modelo grátis (G2): sem grátis disponível, o consenso fica
      // "não verificado" (null) em vez de pagar uma 2ª extração inteira no Claude
      let consensoVerificado = false;
      if (config.ai.consensoGabarito !== false) {
        try {
          const res2 = await runJSON('prova_extract', { ...r, userId: p.uploaded_by, avoid: { provider: meta1?.provider, model: meta1?.model }, somenteGratis: true }, provaExtractSchema);
          consensoVerificado = !(res2.meta?.provider === meta1?.provider && res2.meta?.model === meta1?.model); // mesmo modelo não é consenso
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
        let consenso = consensoVerificado ? true : null;
        let divergencia = null;

        if (consensoVerificado && q2 && q1.gabarito && q2.gabarito && q1.gabarito.trim() && q2.gabarito.trim()) {
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
  const p = await provasRepo.buscar(provaId);
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
  await provasRepo.excluirQuestoes(p.id);
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
    await provasRepo.inserirQuestao({
      provaId: p.id, banca: p.banca, materia: q.materia, numero: q.numero, enunciado: enun, alternativas: q.alternativas, gabarito: q.gabarito,
      flagged: isBad, topico, materiaId: matId, topicoId: topId, comando: q.comando, pegadinha: q.pegadinha, habilidade: q.habilidade,
      dispositivos: clean(q.dispositivos || []), consenso: q.consenso_gabarito, divergencia: q.divergencia_gabarito,
    });
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
    const p = await provasRepo.comAutor(id);
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
  await provasRepo.definirErro(provaId, status, msg);
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
  const p = await provasRepo.buscarPronta(provaId);
  if (!p?.text) return;
  const pendentes = await provasRepo.questoesSemRotulo(p.id);
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
      await provasRepo.rotularQuestao(alvo.id, { topico, materiaId: matId, topicoId: topId, comando: q.comando, pegadinha: q.pegadinha, habilidade: q.habilidade, dispositivos: clean(q.dispositivos || []) });
      alvo.feito = true; rotuladas++;
    }
  }
  console.log(`[rotular] prova ${p.id}: ${rotuladas}/${pendentes.length} questões rotuladas`);
}
registerJob('prova.relabel', { run: relabelProva, maxAttempts: 3, prioridade: -10 }); // fundo: não atrasa o aluno

/** Enfileira a rotulagem de todas as provas prontas que ainda têm questões sem rótulo. Devolve quantas provas entraram na fila. */
export async function enqueueRelabel({ provaId = null } = {}) {
  // Só provas com texto suficiente (mesma regra do treino) e sem rotulagem já pendente (clique duplo não duplica)
  const ids = await provasRepo.idsParaRotular(provaId);
  for (const id of ids) await enqueue('prova.relabel', { provaId: id });
  return ids.length;
}

export async function reprocessProva(id) {
  const p = await provasRepo.buscar(id);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (['CHECKING', 'PROCESSING', 'BATCH_PENDING'].includes(p.status)) throw new HttpError(409, 'A prova já está sendo processada.');
  if (p.status === 'READY' || p.status === 'QUEUED' || (p.status === 'FAILED' && p.reviewed_at)) {
    await setStatus(id, 'QUEUED', { error: null }); await enqueue('prova.train', { provaId: id });
  } else {
    await setStatus(id, 'CHECKING', { error: null }); await enqueue('prova.check', { provaId: id });
  }
  return provasRepo.buscar(id);
}

// ---------------------------------------------------------------------
// F7) Gabarito definitivo oficial: leitura determinística (custo zero de IA), com travas contra leitura errada (G1):
// - letra solta só vale MAIÚSCULA e numa linha com "cara de gabarito" (pares número→resposta, não texto corrido):
//   "questões 1 e 2", "Questões 10 a 20", "Página 1 de 3" não viram resposta;
// - cabeçalho de cargo / tipo de prova / caderno abre um bloco novo; o mesmo número em mais de um bloco (ou com respostas
//   diferentes) é CONFLITO — quem aplica precisa colar só o bloco da prova;
// - na aplicação: letra precisa servir ao formato da questão (C/E ou A–E dentro das alternativas), cobertura mínima de 60%,
//   e prévia antes de gravar.
// ---------------------------------------------------------------------
const CABECALHO_BLOCO = /^\s*((?:CARGO|TIPO|PROVA|CADERNO|COR|VERS[AÃ]O|TURNO|N[IÍ]VEL|[AÁ]REA|ESPECIALIDADE|GABARITO\s+(?:DO\s+|DA\s+)?(?:TIPO|CARGO|CADERNO|PROVA))\b[^:\n]*?)(?::|$)/i;
const PALAVRAS_DE_GABARITO = /\b(QUEST[AÃ]O|QUEST[OÕ]ES|ITENS|ITEM|GABARITO|OFICIAL|DEFINITIVO|PRELIMINAR|RESPOSTAS?|N[ºO°]\.?)\b/g;
const PAR = new RegExp(String.raw`(?<![\w,./º°-])(?<num>\d{1,3})(?!\d)\s*(?:[-–—:.)]\s*)?`
  + String.raw`(?:(?<anul>ANULAD[AO]S?|NUL[AO]S?|CANCELAD[AO]S?|REVOGAD[AO]S?|SEM\s+RESPOSTA)`
  + String.raw`|(?<marca>[X#])`
  + String.raw`|ALTERAD[AO]\s+(?:DE\s+(?<de>[A-E]|CERTO|ERRADO)\s+)?PARA\s+(?<para>[A-E]|CERTO|ERRADO)`
  + String.raw`|(?<ret>[A-E]|CERTO|ERRADO)\s*\(\s*(?:ALTERAD[AO]|RETIFICAD[AO])\s*\)`
  + String.raw`|(?<ce>CERTO|ERRADO)`
  + String.raw`|(?<letra>[A-E]))(?![A-Za-zÀ-ú0-9])`, 'g');
const letraDe = (s) => (!s ? null : s === 'CERTO' ? 'C' : s === 'ERRADO' ? 'E' : s[0]);
// Palavras viram maiúsculas; letra isolada fica como veio ("e", "a" minúsculos são conectivos, não respostas)
const normalizarLinha = (l) => l.replace(/[A-Za-zÀ-ú]{2,}/g, (w) => w.toUpperCase());

/** Lê o gabarito. Devolve { itens, blocos, conflitos } — conflitos = números com respostas diferentes ou em mais de um bloco. */
export function analisarGabarito(rawText) {
  const vazio = { itens: [], blocos: [], conflitos: [] };
  if (!rawText || typeof rawText !== 'string') return vazio;
  const porNumero = new Map(); // numero -> [{ entry, bloco }]
  const blocos = [];
  let bloco = null;
  for (const bruta of rawText.split(/\r?\n/)) {
    let linha = normalizarLinha(bruta);
    const cab = linha.match(CABECALHO_BLOCO);
    if (cab) { bloco = cab[1].trim().replace(/\s+/g, ' ').slice(0, 80); blocos.push(bloco); linha = linha.slice(cab[0].length); }
    const achados = [...linha.matchAll(PAR)];
    if (!achados.length) continue;
    // "Cara de gabarito": o que sobra da linha (tirando pares e palavras como QUESTÃO/GABARITO) é pouco
    const total = linha.replace(/\s/g, '').length;
    const sobra = achados.reduce((s, m) => s.replace(m[0], ' '), linha).replace(PALAVRAS_DE_GABARITO, ' ').replace(/[\s|;,.:\-–—()]/g, '').length;
    const soLetras = achados.every((m) => m.groups.letra);
    if (soLetras && sobra > total * 0.4) continue; // texto corrido com número e letra solta → ignora a linha
    for (const m of achados) {
      const g = m.groups;
      const numero = Number(g.num);
      if (numero < 1 || numero > 300) continue;
      const anulada = !!(g.anul || g.marca);
      const de = letraDe(g.de);
      const para = letraDe(g.para || g.ret);
      const gabarito = anulada ? null : (para || letraDe(g.ce) || g.letra || null);
      const alterado = !!para;
      const entry = {
        numero, gabarito, anulada, alterado, original: de,
        motivo: anulada ? 'Questão anulada no gabarito oficial.' : alterado ? (de ? `Gabarito alterado pela banca de ${de} para ${para}.` : `Gabarito alterado pela banca para ${para}.`) : null,
      };
      if (!porNumero.has(numero)) porNumero.set(numero, []);
      porNumero.get(numero).push({ entry, bloco });
    }
  }
  const itens = [], conflitos = [];
  for (const [numero, lista] of porNumero) {
    const respostas = new Set(lista.map((x) => (x.entry.anulada ? 'X' : x.entry.gabarito)));
    const blocosDoNumero = new Set(lista.map((x) => x.bloco));
    if (respostas.size > 1 || blocosDoNumero.size > 1) conflitos.push(numero);
    // Dentro da mesma resposta, a marcação mais informativa (alterada/anulada) prevalece
    itens.push(lista.map((x) => x.entry).sort((a, b) => Number(b.alterado || b.anulada) - Number(a.alterado || a.anulada))[0]);
  }
  itens.sort((a, b) => a.numero - b.numero);
  return { itens, blocos: [...new Set(blocos)], conflitos: conflitos.sort((a, b) => a - b) };
}

/** Compatível com o uso anterior: só os itens. */
export function parseGabaritoTexto(rawText) {
  return analisarGabarito(rawText).itens;
}

const formatoDaQuestaoProva = (q) => (Array.isArray(q.alternativas) && q.alternativas.length ? 'me' : 'ce');
const letraValida = (q, letra) => (formatoDaQuestaoProva(q) === 'ce' ? /^[CE]$/.test(letra) : /^[A-E]$/.test(letra) && 'ABCDE'.indexOf(letra) < q.alternativas.length);

/**
 * Aplica o gabarito definitivo. confirmar=false → só a PRÉVIA (nada é gravado); confirmar=true → grava.
 * Recusa (422): conflito entre blocos/cargos, letra que não serve ao formato da questão, cobertura < 60%.
 */
export async function aplicarGabaritoDefinitivo({ provaId, user, url, file, text, confirmar = false }) {
  const p = await provasRepo.buscar(provaId);
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

  const { itens, blocos, conflitos } = analisarGabarito(rawText);
  if (!itens.length) throw new HttpError(422, 'Nenhuma questão ou gabarito foi identificado no texto fornecido.');
  if (conflitos.length) {
    throw new HttpError(422, blocos.length > 1
      ? `O gabarito tem mais de um bloco (${blocos.slice(0, 4).join('; ')}${blocos.length > 4 ? '…' : ''}). Cole só o bloco do cargo/tipo desta prova.`
      : `As questões ${conflitos.slice(0, 10).join(', ')} aparecem com respostas diferentes. Cole só o bloco do cargo/tipo desta prova.`);
  }

  const questoes = await provasRepo.questoesParaGabarito(provaId);
  const porNumero = new Map(questoes.filter((q) => q.numero != null).map((q) => [q.numero, q]));
  const casados = itens.filter((it) => porNumero.has(it.numero));
  const invalidas = casados.filter((it) => !it.anulada && !letraValida(porNumero.get(it.numero), it.gabarito));
  if (invalidas.length) {
    throw new HttpError(422, `Respostas que não servem ao formato das questões: ${invalidas.slice(0, 8).map((it) => `${it.numero}=${it.gabarito}`).join(', ')}. Confira se é o gabarito desta prova (cargo/tipo).`);
  }
  const comNumero = porNumero.size;
  if (!comNumero || casados.length / comNumero < 0.6) {
    throw new HttpError(422, `O gabarito cobre só ${casados.length} de ${comNumero} questões desta prova (mínimo 60%). Confira se é o gabarito certo.`);
  }

  const detalhes = casados.map((it) => {
    const alvo = porNumero.get(it.numero);
    if (it.anulada) return { numero: it.numero, status: 'anulada', motivo: it.motivo, antes: alvo.gabarito };
    if (it.alterado) return { numero: it.numero, status: 'alterada', gabarito: it.gabarito, antes: alvo.gabarito, motivo: it.motivo };
    // Diferente do que a IA extraiu, sem a banca dizer "alterada": é correção da extração, não alteração da banca
    if (alvo.gabarito && alvo.gabarito !== it.gabarito) return { numero: it.numero, status: 'corrigida', gabarito: it.gabarito, antes: alvo.gabarito, motivo: `Gabarito extraído (${alvo.gabarito}) corrigido pelo definitivo.` };
    return { numero: it.numero, status: 'confirmada', gabarito: it.gabarito, antes: alvo.gabarito };
  });
  const resumo = {
    previa: !confirmar,
    totalLidas: itens.length,
    totalQuestoesProva: questoes.length,
    atualizadas: detalhes.length,
    anuladas: detalhes.filter((d) => d.status === 'anulada').length,
    alteradas: detalhes.filter((d) => d.status === 'alterada').length,
    corrigidas: detalhes.filter((d) => d.status === 'corrigida').length,
    semCorrespondencia: itens.length - casados.length,
    fonteOficial: oficialConfirmado,
    detalhes,
  };
  if (!confirmar) return { prova: p, resumo };

  for (const d of detalhes) {
    const alvo = porNumero.get(d.numero);
    if (d.status === 'anulada') {
      await provasRepo.anularQuestao(alvo.id, d.motivo || 'Anulada no gabarito oficial definitivo.');
    } else {
      await provasRepo.definirGabaritoDefinitivo(alvo.id, {
        gabarito: d.gabarito, alteradaPelaBanca: d.status === 'alterada', mudou: d.status === 'alterada' || d.status === 'corrigida', antes: d.antes, motivo: d.motivo,
      });
    }
  }
  await provasRepo.marcarGabaritoDefinitivo(provaId, { url: officialUrl, confirmado: oficialConfirmado, texto: rawText });
  return { prova: await provasRepo.buscar(provaId), resumo };
}

// ---------------------------------------------------------------------
// B1) Importação de provas em lote pelo admin (máx. LOTE_MAX links; download e treino na fila)
// ---------------------------------------------------------------------
const LOTE_MAX = 50;
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
  if (lista.length > LOTE_MAX) throw new HttpError(422, `Envie no máximo ${LOTE_MAX} links por vez (recebidos ${lista.length}).`);

  // Validação rápida aqui (fonte oficial, banca); download e treino em segundo plano, um item por tarefa na fila (G4)
  const resultados = [];
  let enfileiradas = 0, erros = 0;
  for (let i = 0; i < lista.length; i++) {
    const it = lista[i];
    const banca = it.banca || defaultBanca;
    const falha = (erro) => { erros++; resultados.push({ item: i + 1, url: it.provaUrl, status: 'erro', erro }); };
    if (!banca || !BANCA[banca]) { falha(`Banca "${banca || ''}" não informada ou não suportada.`); continue; }
    const vp = validarUrlOficial(banca, it.provaUrl);
    if (!vp.valida) { falha(vp.motivo); continue; }
    if (it.gabaritoUrl) { const vg = validarUrlOficial(banca, it.gabaritoUrl); if (!vg.valida) { falha(`Gabarito: ${vg.motivo}`); continue; } }
    await enqueue('prova.importar', { userId: user.id, banca, provaUrl: it.provaUrl, gabaritoUrl: it.gabaritoUrl || null,
      orgao: String(it.orgao || '').slice(0, 120), cargo: String(it.cargo || '').slice(0, 120), ano: /^\d{4}$/.test(it.ano || '') ? it.ano : '' });
    enfileiradas++;
    resultados.push({ item: i + 1, url: vp.urlNormalizada, status: 'na_fila' });
  }
  return { total: lista.length, enfileiradas, erros, resultados };
}

async function importarItemDoLote({ userId, banca, provaUrl, gabaritoUrl, orgao, cargo, ano }) {
  const user = await usuariosRepo.buscar(userId);
  if (!user || user.role !== 'ADMIN') return;
  const dProva = await baixarDaFonteOficial(banca, provaUrl);
  const dGab = gabaritoUrl ? await baixarDaFonteOficial(banca, gabaritoUrl) : null;
  const res = await submitProva({
    user, banca, orgao, cargo, ano,
    file: { buffer: dProva.buffer, name: dProva.name, mime: dProva.mime },
    gabarito: dGab ? { buffer: dGab.buffer, name: dGab.name, mime: dGab.mime } : null,
    officialUrl: dProva.url, oficialConfirmado: true, officialUrlTipo: dProva.tipo, ip: '127.0.0.1',
  });
  console.log(`[lote] ${provaUrl} → ${res.duplicate ? 'duplicata' : 'importada ' + (res.prova?.id || '')}`);
}
registerJob('prova.importar', { run: importarItemDoLote, maxAttempts: 3, prioridade: -10 }); // fundo: não atrasa o aluno
