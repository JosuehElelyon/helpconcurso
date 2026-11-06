import { Router } from 'express';
import { z } from 'zod';
import { one, many, query } from '../db.js';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { runJSON } from '../ai/index.js';
import { userMessage } from '../ai/errors.js';
import { generateSchema } from '../ai/schemas.js';
import { promptGenerate, promptRevanche } from '../lib/prompts.js';
import { BANCA, NIVEIS } from '../lib/bancas.js';
import { getKnowledge } from '../services/knowledge.js';
import { consumeGeneration, refundGeneration, generationQuota } from '../services/quota.js';
import { scanText, SEV, logSecurityEvent } from '../security/index.js';
import { reviewQuestions } from '../services/review.js';
import { rate, report, listFeedback } from '../services/feedback.js';
import { registrarRespostasNaRevisao } from '../services/revisao.js';
import { aplicarSituacaoOficial, carregarSituacaoOficial } from '../services/situacao-oficial.js';
import { registrarAtividade, contarNovas } from '../services/atividade.js';
import { obterOuGerarExplicacao } from '../services/explicacao.js';
import { config } from '../config.js';
import { explainLimit, geracaoLimit, feedbackLimit } from '../middleware/limites.js';
import { pontuarSimulado } from '../services/pontuacao.js';
import { coletarQuestoesErradas, aplicarVitoriaRevanche, MAX_BASE } from '../services/revanche.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);
const LET = ['A', 'B', 'C', 'D', 'E'];
const clean = (s, max) => String(s || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const normWords = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// O trecho citado existe mesmo no material? (evita "alucinação" e citação inventada)
export function isAnchored(trecho, materialNorm) {
  const w = normWords(trecho).split(' ').filter(Boolean);
  if (w.length < 4) return false;
  if (w.length <= 8) return materialNorm.includes(w.join(' '));
  let hit = 0, tot = 0;
  for (let i = 0; i + 6 <= w.length; i += 3) { tot++; if (materialNorm.includes(w.slice(i, i + 6).join(' '))) hit++; }
  return tot > 0 && hit / tot >= 0.5;
}

export function normalizeQ(q, formato) {
  const out = { tema: clean(q.tema, 120), topico_edital: clean(q.topico_edital, 180), nivel: clean(q.nivel, 20), enunciado: clean(q.enunciado, 6000), comentario: clean(q.comentario, 3000), trecho: clean(q.trecho_base, 1200), pegadinha: clean(q.pegadinha, 600) };
  if (out.enunciado.length < 10) return null;
  if (formato === 'ce') {
    out.alternativas = [];
    const g = clean(q.gabarito, 3).toUpperCase();
    if (!/^[CE]/.test(g)) return null;
    out.gabarito = g[0];
  } else {
    const alts = q.alternativas.map((a) => clean(a, 1500).replace(/^\(?[A-Ea-e][).\-–]\s+/, '')).filter(Boolean).slice(0, 5);
    if (alts.length !== 5 || new Set(alts.map((a) => a.toLowerCase())).size < 5) return null;
    const g = clean(q.gabarito, 3).toUpperCase().replace(/[^A-E]/g, '').charAt(0);
    if (!g) return null;
    out.alternativas = alts; out.gabarito = g;
  }
  return out;
}

const view = (s) => ({
  id: s.id,
  banca: s.banca,
  materia: s.materia,
  assunto: s.assunto,
  nivel: s.nivel,
  formato: s.formato,
  arquivo: s.arquivo,
  editalId: s.edital_id || null,
  cadernoId: s.caderno_id || null,
  questoes: s.questoes,
  respostas: s.respostas,
  finalizado: s.finalizado,
  modoProva: s.modo_prova || false,
  tempoLimiteMinutos: s.tempo_limite_minutos || null,
  tempoGastoSegundos: s.tempo_gasto_segundos || 0,
  duvidas: Array.isArray(s.duvidas) ? s.duvidas : [],
  estatisticas: s.estatisticas || {},
  origem: s.origem || 'ia',
  revisao: s.review_stats ? { ...s.review_stats, motivos: undefined } : null,
  createdAt: s.created_at,
});

r.get('/cota', ah(async (req, res) => res.json({ quota: await generationQuota(req.user) })));

// Gera um simulado. Resposta em NDJSON: {"type":"progress","count":3} ... {"type":"done","set":{...}} | {"type":"error","message":"..."}
r.post('/', geracaoLimit, ah(async (req, res) => {
  const b = parseBody(z.object({
    materialId: z.string().uuid('Material inválido.'),
    materia: z.string().trim().min(2, 'Informe a matéria.').max(80),
    assunto: z.string().trim().max(120).optional().default(''),
    banca: z.enum(Object.keys(BANCA), { errorMap: () => ({ message: 'Escolha uma banca.' }) }),
    qtd: z.coerce.number().int().min(1).max(20),
    nivel: z.enum(NIVEIS),
    cadernoId: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => v || null),
  }), req.body);
  // Matéria e assunto também são texto do usuário que entra no prompt
  for (const v of [b.materia, b.assunto]) if (SEV[scanText(v).severity] >= SEV.medium) throw new HttpError(422, 'Matéria/assunto com conteúdo não permitido.');
  const m = await one('SELECT * FROM materials WHERE id=$1 AND user_id=$2', [b.materialId, req.user.id]);
  if (!m) throw new HttpError(404, 'Material não encontrado.');
  const caderno = b.cadernoId ? await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [b.cadernoId, req.user.id]) : null;
  const used = await consumeGeneration(req.user, b.nivel);
  await query('UPDATE materials SET materia=$2, assunto=$3 WHERE id=$1', [m.id, b.materia, b.assunto || null]);

  res.status(200).set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (o) => { if (!res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
  const ping = setInterval(() => send({ type: 'ping' }), 15000);
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctrl.abort(); }); // aluno fechou a página → para de gastar com a IA
  try {
    let knowledge;
    const topicHint = [b.assunto, ...(m.edital_match?.topicos_cobertos || []).map((t) => t.nome)].filter(Boolean).join(' ');
    const targetEditalId = m.edital_id || caderno?.edital_id || null;
    const targetProvasIds = Array.isArray(caderno?.provas_ids) ? caderno.provas_ids : [];
    try { knowledge = await getKnowledge(b.banca, b.materia, 6, targetEditalId, topicHint, targetProvasIds); }
    catch (e) { console.warn('[gerar] sem conhecimento da banca:', e.message); knowledge = { provas: 0, caracteristicas: [], padroes: [], pegadinhas: [], exemplos: [] }; }
    const formato = BANCA[b.banca].formato;
    const materialNorm = normWords(m.text);
    let progressBase = 0, lastMeta = null, dropped = 0;
    const alertas = [];
    // Gera N questões, normaliza e passa pela varredura de segurança
    const editalContext = m.edital_match?.topicos_cobertos || [];
    const editalTitulo = m.edital_match?.edital_titulo || '';
    // Fácil/Médio: Haiku gera (barato, empatou com o Sonnet no Médio); Difícil/Misto: Sonnet gera (pegadinha mais fina)
    const genTask = ['Difícil', 'Misto'].includes(b.nivel) ? 'generate_dificil' : 'generate';
    const gen = async (qtd, evitar) => {
      let count = 0;
      const { data, meta } = await runJSON(genTask, {
        ...promptGenerate({ ...b, qtd, evitar, text: m.text, knowledge, editalContext, editalTitulo }), cacheSystem: true, maxTokens: Math.min(32000, 1300 * qtd + 1500), userId: req.user.id, signal: ctrl.signal,
        onText: (snap) => { const n = (snap.match(/"enunciado"\s*:/g) || []).length; if (n > count) { count = n; send({ type: 'progress', count: Math.min(b.qtd, progressBase + count) }); } },
      }, generateSchema);
      lastMeta = meta; alertas.push(...data.alertas);
      const out = [];
      for (const q of data.questoes.slice(0, qtd)) {
        const n = normalizeQ(q, formato);
        if (!n) { dropped++; continue; }
        // Saída da IA também é varrida (defesa contra injeção que tenha "vazado" para a resposta)
        if (SEV[scanText([n.enunciado, ...n.alternativas, n.comentario].join('\n')).severity] >= SEV.high) { dropped++; continue; }
        n.ancorada = isAnchored(n.trecho, materialNorm);
        out.push(n);
      }
      return out;
    };
    // Revisor: resolve sem ver o gabarito; só ficam as questões em que ele chega à mesma resposta
    const stats = { geradas: 0, aprovadas: 0, descartadas: 0, refeitas: 0, revisor: config.review.enabled ? 'ok' : 'desativado', motivos: [] };
    const review = async (list) => {
      if (!config.review.enabled || !list.length) return list.map((q) => ({ ...q, verificada: null }));
      send({ type: 'stage', stage: 'revisando' });
      const r = await reviewQuestions({ questoes: list, formato, text: m.text, userId: req.user.id, signal: ctrl.signal, geradoPor: lastMeta && { provider: lastMeta.provider, model: lastMeta.model } });
      if (!r.available) { stats.revisor = 'indisponivel'; return list.map((q) => ({ ...q, verificada: null })); }
      const kept = [];
      list.forEach((q, i) => { if (r.verdicts[i].ok) kept.push({ ...q, verificada: true }); else { stats.descartadas++; stats.motivos.push(r.verdicts[i].motivo); } });
      return kept;
    };

    let first = await gen(b.qtd);
    stats.geradas += first.length;
    let qs = await review(first);
    const missing = b.qtd - qs.length;
    if (missing > 0 && stats.descartadas > 0 && config.review.regenerate && stats.revisor === 'ok') {
      send({ type: 'stage', stage: 'refazendo', count: missing });
      progressBase = qs.length;
      try {
        const extra = await gen(missing, qs.map((q) => q.enunciado));
        stats.geradas += extra.length;
        const ok = await review(extra);
        stats.refeitas = ok.length;
        qs = qs.concat(ok);
      } catch (e) { if (e?.code === 'aborted') throw e; console.warn('[gerar] reposição falhou:', e.message); }
    }
    stats.aprovadas = qs.length;
    stats.motivos = stats.motivos.slice(0, 10);
    const data = { alertas }, meta = lastMeta;
    if (data.alertas.length) await logSecurityEvent({ userId: req.user.id, kind: 'ia_relatou_instrucao', severity: 'medium', fileName: m.file_name, details: { alertas: data.alertas, materialId: m.id } });
    if (!qs.length) throw Object.assign(new Error('Nenhuma questão passou na revisão automática. Tente novamente ou use um material mais completo.'), { code: 'bad_output' });
    const s = await one(`INSERT INTO question_sets(user_id,material_id,edital_id,caderno_id,banca,materia,assunto,nivel,formato,arquivo,questoes,model,review_stats)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, m.id, targetEditalId, caderno ? caderno.id : null, b.banca, b.materia, b.assunto || null, b.nivel, formato, m.file_name, JSON.stringify(qs), `${meta.provider}:${meta.model}`, JSON.stringify(stats)]);
    if (caderno) {
      const mIds = Array.isArray(caderno.materiais_ids) ? caderno.materiais_ids : [];
      if (!mIds.includes(m.id)) mIds.unshift(m.id);
      await query('UPDATE cadernos SET materiais_ids=$2, updated_at=now() WHERE id=$1', [caderno.id, JSON.stringify(mIds)]).catch(() => {});
    }
    send({ type: 'done', set: view(s), descartadas: dropped + stats.descartadas, exemplosUsados: knowledge.exemplos.length, provasUsadas: knowledge.provas });
  } catch (e) {
    await refundGeneration(req.user, used).catch(() => {});
    if (e?.code !== 'aborted') console.error('[gerar]', e?.message || e);
    send({ type: 'error', message: e?.name === 'AiError' ? userMessage(e) : e?.code === 'bad_output' ? e.message : 'Não foi possível gerar as questões. Tente novamente.' });
  } finally {
    clearInterval(ping);
    if (!res.writableEnded) res.end();
  }
}));

// Gera uma BATERIA DE REVANCHE DA IA: questões inéditas focadas nos pontos cegos onde o aluno errou.
// A base (questões erradas) vem sempre do servidor: simulado (setId) ou caderno (cadernoId + keys) do próprio aluno.
r.post('/revanche', geracaoLimit, ah(async (req, res) => {
  const b = parseBody(z.object({
    setId: z.string().uuid().optional().nullable(),
    cadernoId: z.string().uuid().optional().nullable(),
    editalId: z.string().uuid().optional().nullable(),
    indices: z.array(z.number().int().min(0).max(500)).max(50).optional().default([]),
    keys: z.array(z.string().max(120)).max(MAX_BASE).optional().default([]),
    banca: z.string().max(40).optional().nullable(),
    materia: z.string().trim().max(100).optional().nullable(),
    assunto: z.string().trim().max(150).optional().nullable(),
    qtd: z.coerce.number().int().min(1).max(10).optional().default(3),
  }), req.body);
  for (const v of [b.materia, b.assunto]) if (v && SEV[scanText(v).severity] >= SEV.medium) throw new HttpError(422, 'Matéria/assunto com conteúdo não permitido.');
  if (b.editalId && !(await one('SELECT id FROM editais WHERE id=$1 AND user_id=$2', [b.editalId, req.user.id]))) throw new HttpError(404, 'Edital não encontrado.');

  const { base: questoesErradas, originalSet, caderno } = await coletarQuestoesErradas({
    userId: req.user.id, setId: b.setId, indices: b.indices, cadernoId: b.cadernoId, keys: b.keys,
  });
  if (!questoesErradas.length) throw new HttpError(400, 'Nenhuma questão errada foi encontrada para gerar a revanche.');

  const banca = [b.banca, originalSet?.banca, caderno?.banca].find((x) => x && BANCA[x]) || 'fgv';
  const materia = b.materia || originalSet?.materia || questoesErradas[0].materia || 'Geral';
  const assunto = b.assunto || `Revanche: ${materia}`;
  const cadernoId = caderno?.id || originalSet?.caderno_id || null;

  const used = await consumeGeneration(req.user, 'Médio');

  res.status(200).set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (o) => { if (!res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
  const ping = setInterval(() => send({ type: 'ping' }), 15000);
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });

  try {
    let knowledge;
    try { knowledge = await getKnowledge(banca, materia, 4); } catch { knowledge = { provas: 0, exemplos: [] }; }
    const formato = BANCA[banca].formato;
    let count = 0;
    send({ type: 'stage', stage: 'analisando_pontos_cegos' });

    const { data, meta } = await runJSON('generate', {
      ...promptRevanche({ banca, materia, assunto, questoesErradas, qtd: b.qtd, knowledge }),
      cacheSystem: true,
      maxTokens: Math.min(32000, 1300 * b.qtd + 1500),
      userId: req.user.id,
      signal: ctrl.signal,
      onText: (snap) => {
        const n = (snap.match(/"enunciado"\s*:/g) || []).length;
        if (n > count) { count = n; send({ type: 'progress', count: Math.min(b.qtd, count) }); }
      },
    }, generateSchema);

    const out = [];
    for (const q of (data.questoes || []).slice(0, b.qtd)) {
      const n = normalizeQ(q, formato);
      if (!n) continue;
      if (SEV[scanText([n.enunciado, ...n.alternativas, n.comentario].join('\n')).severity] >= SEV.high) continue;
      out.push(n);
    }
    if (!out.length) throw Object.assign(new Error('Não foi possível formatar as questões da revanche.'), { code: 'bad_output' });

    // Revisor: questão reprovada nunca chega ao aluno (gabarito errado na revanche ensinaria o erro)
    let qs = out.map((q) => ({ ...q, verificada: null }));
    if (config.review.enabled) {
      send({ type: 'stage', stage: 'revisando' });
      const mat = originalSet?.material_id ? await one('SELECT text FROM materials WHERE id=$1 AND user_id=$2', [originalSet.material_id, req.user.id]) : null;
      const rev = await reviewQuestions({ questoes: out, formato, text: mat?.text || '', userId: req.user.id, signal: ctrl.signal, geradoPor: meta && { provider: meta.provider, model: meta.model } });
      if (rev.available) qs = out.filter((_, i) => rev.verdicts[i]?.ok).map((q) => ({ ...q, verificada: true }));
    }
    if (!qs.length) throw Object.assign(new Error('Nenhuma questão da revanche passou na revisão automática. Tente novamente.'), { code: 'bad_output' });

    const s = await one(
      `INSERT INTO question_sets(user_id, material_id, edital_id, caderno_id, banca, materia, assunto, nivel, formato, arquivo, questoes, model, origem, estatisticas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.id, originalSet?.material_id || null, b.editalId || originalSet?.edital_id || caderno?.edital_id || null, cadernoId,
        banca, materia, assunto, 'Médio', formato, 'Bateria de Revanche', JSON.stringify(qs), `${meta.provider}:${meta.model}`, 'revanche',
        JSON.stringify({ revancheDe: { setId: originalSet?.id || null, cadernoId, keys: questoesErradas.map((q) => q.key), totalOriginaisErradas: questoesErradas.length } })]
    );
    send({ type: 'done', set: view(s) });
  } catch (e) {
    await refundGeneration(req.user, used).catch(() => {});
    if (e?.code !== 'aborted') console.error('[revanche]', e?.message || e);
    send({ type: 'error', message: e?.name === 'AiError' ? userMessage(e) : e?.code === 'bad_output' ? e.message : 'Não foi possível gerar a bateria de revanche.' });
  } finally {
    clearInterval(ping);
    if (!res.writableEnded) res.end();
  }
}));

r.get('/', ah(async (req, res) => {
  const rows = await many('SELECT * FROM question_sets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 300', [req.user.id]);
  const situacao = await carregarSituacaoOficial(rows.map((s) => s.questoes));
  for (const s of rows) s.questoes = situacao(s.questoes);
  res.json({ sets: rows.map(view) });
}));

r.get('/:id', ah(async (req, res) => {
  const s = await one('SELECT * FROM question_sets WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');
  s.questoes = await aplicarSituacaoOficial(s.questoes);
  res.json({ set: view(s) });
}));

r.patch('/:id', ah(async (req, res) => {
  const b = parseBody(z.object({
    respostas: z.record(z.string().regex(/^\d{1,3}$/), z.enum(LET)).optional(),
    finalizado: z.boolean().optional(),
    tempoGastoSegundos: z.number().int().min(0).max(86400).optional(),
    duvidas: z.array(z.number().int().min(0).max(500)).optional(),
  }), req.body);

  const antes = await one(
    'SELECT id, respostas, questoes, caderno_id, modo_prova, formato, origem, finalizado, tempo_gasto_segundos, estatisticas FROM question_sets WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (!antes) throw new HttpError(404, 'Simulado não encontrado.');

  let statsObj = null;
  if (b.finalizado) {
    statsObj = { ...(antes.estatisticas || {}) };
    const qs = await aplicarSituacaoOficial(antes.questoes || []); // anulada não conta na nota
    const resp = b.respostas !== undefined ? b.respostas : (antes.respostas || {});
    const tempo = b.tempoGastoSegundos !== undefined ? b.tempoGastoSegundos : (antes.tempo_gasto_segundos || 0);
    statsObj.resultadoFinal = pontuarSimulado(qs, resp, antes.formato, tempo);

    // Revanche vencida (≥ 65%) avança as questões-base no caderno — só na 1ª finalização, para não avançar a cada clique
    if (antes.origem === 'revanche' && !antes.finalizado) {
      const rf = statsObj.resultadoFinal;
      const superou = rf.total > 0 && rf.acertos / rf.total >= 0.65;
      statsObj.revancheSuperada = superou;
      const de = statsObj.revancheDe || {};
      if (superou) {
        await aplicarVitoriaRevanche({
          userId: req.user.id,
          cadernoId: de.cadernoId || antes.caderno_id,
          keys: Array.isArray(de.keys) ? de.keys : [],
          setIdLegado: de.setId || null,
        });
      }
    }
  }

  const s = await one(
    `UPDATE question_sets SET
       respostas = COALESCE($3, respostas),
       finalizado = COALESCE($4, finalizado),
       tempo_gasto_segundos = COALESCE($5, tempo_gasto_segundos),
       duvidas = COALESCE($6, duvidas),
       estatisticas = COALESCE($7, estatisticas),
       updated_at = now()
     WHERE id=$1 AND user_id=$2 RETURNING *`,
    [
      req.params.id,
      req.user.id,
      b.respostas ? JSON.stringify(b.respostas) : null,
      b.finalizado ?? null,
      b.tempoGastoSegundos !== undefined ? b.tempoGastoSegundos : null,
      b.duvidas ? JSON.stringify(b.duvidas) : null,
      statsObj ? JSON.stringify(statsObj) : null,
    ]
  );

  // Erro/acerto no simulado de um caderno entra no ciclo de revisão espaçada (C4)
  if (s && antes.caderno_id && b.respostas) {
    await registrarRespostasNaRevisao({
      cadernoId: antes.caderno_id,
      userId: req.user.id,
      setId: s.id,
      questoes: antes.questoes || [],
      antes: antes.respostas || {},
      depois: b.respostas,
    });
  }

  if (b.respostas) {
    await registrarAtividade(req.user.id, contarNovas(antes.questoes, antes.respostas, b.respostas));
  }

  s.questoes = await aplicarSituacaoOficial(s.questoes);
  res.json({ set: view(s) });
}));

const qIndex = (req) => { const i = Number(req.params.i); if (!Number.isInteger(i)) throw new HttpError(404, 'Questão não encontrada.'); return i; };
r.get('/:id/feedback', ah(async (req, res) => res.json({ feedback: await listFeedback(req.user, req.params.id) })));
r.post('/:id/questoes/:i/avaliar', feedbackLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }), req.body);
  res.json(await rate(req.user, req.params.id, qIndex(req), b.rating));
}));
r.post('/:id/questoes/:i/reportar', feedbackLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ motivo: z.string().trim().min(5, 'Explique em poucas palavras qual é o erro.').max(600) }), req.body);
  res.status(202).json(await report(req.user, req.params.id, qIndex(req), b.motivo));
}));

r.post('/:id/questoes/:i/por-que-errei', explainLimit, ah(async (req, res) => {
  const s = await one('SELECT * FROM question_sets WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');
  const idx = qIndex(req);
  const qs = await aplicarSituacaoOficial(Array.isArray(s.questoes) ? s.questoes : []);
  const q = qs[idx];
  if (!q) throw new HttpError(404, 'Questão não encontrada.');

  // A resposta gravada vale; a do corpo só cobre o intervalo antes do salvamento (e é validada no serviço)
  const r = (s.respostas || {})[String(idx)];
  const respostaAluno = r || (typeof req.body?.resposta === 'string' ? req.body.resposta.slice(0, 3) : '');
  if (!respostaAluno) throw new HttpError(400, 'Nenhuma resposta informada para esta questão.');

  const result = await obterOuGerarExplicacao({
    user: req.user,
    questao: q,
    respostaAluno,
    banca: s.banca,
    materia: q.materia || s.materia,
    formato: s.formato,
  });

  res.json(result);
}));

r.delete('/:id', ah(async (req, res) => {
  await query('DELETE FROM question_sets WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

export default r;
