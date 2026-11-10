// Regra de negócio dos simulados: gerar (IA + revisor), Bateria de Revanche, salvar respostas/finalizar e "Por que errei?".
// Não conhece HTTP: recebe dados já validados e devolve linhas do banco; o progresso da geração sai pelo callback `emitir`.
import { runJSON } from '../ai/index.js';
import { userMessage } from '../ai/errors.js';
import { generateSchema } from '../ai/schemas.js';
import { promptGenerate, promptRevanche, PROMPT_VERSAO } from '../lib/prompts.js';
import { BANCA } from '../lib/bancas.js';
import { HttpError } from '../lib/http.js';
import { config } from '../config.js';
import { scanText, SEV, logSecurityEvent } from '../security/index.js';
import * as simulados from '../repositories/simulados.js';
import * as materiais from '../repositories/materiais.js';
import * as cadernos from '../repositories/cadernos.js';
import * as editais from '../repositories/editais.js';
import { getKnowledge } from './knowledge.js';
import { consumeGeneration, refundGeneration } from './quota.js';
import { reviewQuestions } from './review.js';
import { registrarRespostasNaRevisao } from './revisao.js';
import { aplicarSituacaoOficial, carregarSituacaoOficial } from './situacao-oficial.js';
import { registrarAtividade, contarNovas } from './atividade.js';
import { obterOuGerarExplicacao } from './explicacao.js';
import { pontuarSimulado } from './pontuacao.js';
import { coletarQuestoesErradas, aplicarVitoriaRevanche } from './revanche.js';

const SEM_CONHECIMENTO = { provas: 0, caracteristicas: [], padroes: [], pegadinhas: [], exemplos: [] };
const clean = (s, max) => String(s || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const normWords = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const erroSaida = (msg) => Object.assign(new Error(msg), { code: 'bad_output' });

// ---------- Regras puras sobre as questões geradas ----------

/** O trecho citado existe mesmo no material? (evita "alucinação" e citação inventada) */
export function isAnchored(trecho, materialNorm) {
  const w = normWords(trecho).split(' ').filter(Boolean);
  if (w.length < 4) return false;
  if (w.length <= 8) return materialNorm.includes(w.join(' '));
  let hit = 0, tot = 0;
  for (let i = 0; i + 6 <= w.length; i += 3) { tot++; if (materialNorm.includes(w.slice(i, i + 6).join(' '))) hit++; }
  return tot > 0 && hit / tot >= 0.5;
}

/** Normaliza a questão vinda da IA para o formato da banca; null = descartar. */
export function normalizeQ(q, formato) {
  const out = { tema: clean(q.tema, 120), topico_edital: clean(q.topico_edital, 180), nivel: clean(q.nivel, 20), enunciado: clean(q.enunciado, 6000), comentario: clean(q.comentario, 3000), trecho: clean(q.trecho_base, 1200), pegadinha: clean(q.pegadinha, 600) };
  if (out.enunciado.length < 10) return null;
  if (formato === 'ce') {
    out.alternativas = [];
    const g = clean(q.gabarito, 3).toUpperCase();
    if (!/^[CE]/.test(g)) return null;
    out.gabarito = g[0];
  } else {
    const alts = (q.alternativas || []).map((a) => clean(a, 1500).replace(/^\(?[A-Ea-e][).\-–]\s+/, '')).filter(Boolean).slice(0, 5);
    if (alts.length !== 5 || new Set(alts.map((a) => a.toLowerCase())).size < 5) return null;
    const g = clean(q.gabarito, 3).toUpperCase().replace(/[^A-E]/g, '').charAt(0);
    if (!g) return null;
    out.alternativas = alts; out.gabarito = g;
  }
  return out;
}

const textoProibido = (v) => v && SEV[scanText(v).severity] >= SEV.medium;
const saidaPerigosa = (n) => SEV[scanText([n.enunciado, ...n.alternativas, n.comentario].join('\n')).severity] >= SEV.high;
const contadorDeQuestoes = (emitir, base, max) => {
  let count = 0;
  return (snap) => {
    const n = (snap.match(/"enunciado"\s*:/g) || []).length;
    if (n > count) { count = n; emitir({ type: 'progress', count: Math.min(max, base() + count) }); }
  };
};

/** Mensagem para o aluno quando a geração falha (detalhe técnico fica no log). */
export const mensagemDeFalha = (e, padrao) => (e?.name === 'AiError' ? userMessage(e) : e?.code === 'bad_output' ? e.message : padrao);

// ---------- Gerar simulado ----------

/**
 * Etapa síncrona (antes de abrir o fluxo): confere material/caderno/textos e consome a cota.
 * Erros aqui viram status HTTP normais (404, 422, 429).
 */
export async function prepararGeracao(user, dados) {
  for (const v of [dados.materia, dados.assunto]) if (textoProibido(v)) throw new HttpError(422, 'Matéria/assunto com conteúdo não permitido.');
  const material = await materiais.buscar(dados.materialId, user.id);
  if (!material) throw new HttpError(404, 'Material não encontrado.');
  const caderno = dados.cadernoId ? await cadernos.buscar(dados.cadernoId, user.id) : null;
  if (dados.cadernoId && !caderno) throw new HttpError(404, 'Caderno não encontrado.');
  const cotaUsada = await consumeGeneration(user, dados.nivel);
  await materiais.definirMateria(material.id, dados.materia, dados.assunto);
  return { user, dados, material, caderno, cotaUsada };
}

/** Gera, revisa (e repõe as descartadas) e grava. Em falha devolve a cota e relança. */
export async function executarGeracao({ user, dados: b, material: m, caderno, cotaUsada }, { emitir = () => {}, signal } = {}) {
  try {
    const topicHint = [b.assunto, ...(m.edital_match?.topicos_cobertos || []).map((t) => t.nome)].filter(Boolean).join(' ');
    const editalId = m.edital_id || caderno?.edital_id || null;
    const provasIds = Array.isArray(caderno?.provas_ids) ? caderno.provas_ids : [];
    let knowledge;
    try { knowledge = await getKnowledge(b.banca, b.materia, 6, editalId, topicHint, provasIds); }
    catch (e) { console.warn('[gerar] sem conhecimento da banca:', e.message); knowledge = SEM_CONHECIMENTO; }

    const formato = BANCA[b.banca].formato;
    const materialNorm = normWords(m.text);
    const editalContext = m.edital_match?.topicos_cobertos || [];
    const editalTitulo = m.edital_match?.edital_titulo || '';
    // Fácil/Médio: Haiku gera (barato, empatou com o Sonnet no Médio); Difícil/Misto: Sonnet gera (pegadinha mais fina)
    const tarefa = ['Difícil', 'Misto'].includes(b.nivel) ? 'generate_dificil' : 'generate';
    let progressoBase = 0, ultimaMeta = null, descartadasFormato = 0;
    const alertas = [];

    const gerar = async (qtd, evitar) => {
      const { data, meta } = await runJSON(tarefa, {
        ...promptGenerate({ ...b, qtd, evitar, text: m.text, knowledge, editalContext, editalTitulo }),
        cacheSystem: true, maxTokens: Math.min(32000, 1300 * qtd + 1500), userId: user.id, signal,
        onText: contadorDeQuestoes(emitir, () => progressoBase, b.qtd),
      }, generateSchema);
      ultimaMeta = meta; alertas.push(...data.alertas);
      const out = [];
      for (const q of data.questoes.slice(0, qtd)) {
        const n = normalizeQ(q, formato);
        // Saída da IA também é varrida (defesa contra injeção que tenha "vazado" para a resposta)
        if (!n || saidaPerigosa(n)) { descartadasFormato++; continue; }
        n.ancorada = isAnchored(n.trecho, materialNorm);
        out.push(n);
      }
      return out;
    };

    // Revisor: resolve sem ver o gabarito; só ficam as questões em que ele chega à mesma resposta
    const stats = { geradas: 0, aprovadas: 0, descartadas: 0, refeitas: 0, revisor: config.review.enabled ? 'ok' : 'desativado', motivos: [] };
    const revisar = async (lista) => {
      if (!config.review.enabled || !lista.length) return lista.map((q) => ({ ...q, verificada: null }));
      emitir({ type: 'stage', stage: 'revisando' });
      const r = await reviewQuestions({ questoes: lista, formato, text: m.text, userId: user.id, signal, geradoPor: ultimaMeta && { provider: ultimaMeta.provider, model: ultimaMeta.model } });
      if (!r.available) { stats.revisor = 'indisponivel'; return lista.map((q) => ({ ...q, verificada: null })); }
      if (r.modelo) stats.revisorModelo = r.modelo;
      const mantidas = [];
      lista.forEach((q, i) => { if (r.verdicts[i].ok) mantidas.push({ ...q, verificada: true }); else { stats.descartadas++; stats.motivos.push(r.verdicts[i].motivo); } });
      return mantidas;
    };

    const primeira = await gerar(b.qtd);
    stats.geradas += primeira.length;
    let qs = await revisar(primeira);
    const faltam = b.qtd - qs.length;
    if (faltam > 0 && stats.descartadas > 0 && config.review.regenerate && stats.revisor === 'ok') {
      emitir({ type: 'stage', stage: 'refazendo', count: faltam });
      progressoBase = qs.length;
      try {
        const extra = await gerar(faltam, qs.map((q) => q.enunciado));
        stats.geradas += extra.length;
        const ok = await revisar(extra);
        stats.refeitas = ok.length;
        qs = qs.concat(ok);
      } catch (e) { if (e?.code === 'aborted') throw e; console.warn('[gerar] reposição falhou:', e.message); }
    }
    stats.aprovadas = qs.length;
    stats.motivos = stats.motivos.slice(0, 10);

    if (alertas.length) await logSecurityEvent({ userId: user.id, kind: 'ia_relatou_instrucao', severity: 'medium', fileName: m.file_name, details: { alertas, materialId: m.id } });
    if (!qs.length) throw erroSaida('Nenhuma questão passou na revisão automática. Tente novamente ou use um material mais completo.');

    const set = await simulados.inserir({
      user_id: user.id, material_id: m.id, edital_id: editalId, caderno_id: caderno?.id || null, banca: b.banca, materia: b.materia,
      assunto: b.assunto || null, nivel: b.nivel, formato, arquivo: m.file_name, questoes: qs,
      model: `${ultimaMeta.provider}:${ultimaMeta.model}`, review_stats: stats, prompt_versao: `${tarefa}:${PROMPT_VERSAO[tarefa]}`,
    });
    if (caderno) {
      const ids = Array.isArray(caderno.materiais_ids) ? [...caderno.materiais_ids] : [];
      if (!ids.includes(m.id)) ids.unshift(m.id);
      await cadernos.definirMateriais(caderno.id, ids).catch(() => {});
    }
    return { set, descartadas: descartadasFormato + stats.descartadas, exemplosUsados: knowledge.exemplos.length, provasUsadas: knowledge.provas };
  } catch (e) {
    await refundGeneration(user, cotaUsada).catch(() => {});
    throw e;
  }
}

// ---------- Bateria de Revanche ----------

/** Etapa síncrona: confere textos e dono, reúne as questões erradas (sempre do servidor) e consome a cota. */
export async function prepararRevanche(user, b) {
  for (const v of [b.materia, b.assunto]) if (textoProibido(v)) throw new HttpError(422, 'Matéria/assunto com conteúdo não permitido.');
  if (b.editalId && !(await editais.existe(b.editalId, user.id))) throw new HttpError(404, 'Edital não encontrado.');
  const { base, originalSet, caderno } = await coletarQuestoesErradas({ userId: user.id, setId: b.setId, indices: b.indices, cadernoId: b.cadernoId, keys: b.keys });
  if (!base.length) throw new HttpError(400, 'Nenhuma questão errada foi encontrada para gerar a revanche.');
  const banca = [b.banca, originalSet?.banca, caderno?.banca].find((x) => x && BANCA[x]) || 'fgv';
  const materia = b.materia || originalSet?.materia || base[0].materia || 'Geral';
  const cotaUsada = await consumeGeneration(user, 'Médio');
  return {
    user, qtd: b.qtd, base, originalSet, caderno, banca, materia,
    assunto: b.assunto || `Revanche: ${materia}`,
    cadernoId: caderno?.id || originalSet?.caderno_id || null,
    editalId: b.editalId || originalSet?.edital_id || caderno?.edital_id || null,
    cotaUsada,
  };
}

/** Gera as questões inéditas, revisa (reprovada nunca chega ao aluno) e grava. Em falha devolve a cota e relança. */
export async function executarRevanche(ctx, { emitir = () => {}, signal } = {}) {
  const { user, qtd, base, originalSet, banca, materia, assunto, cadernoId, editalId, cotaUsada } = ctx;
  try {
    let knowledge;
    try { knowledge = await getKnowledge(banca, materia, 4); } catch { knowledge = SEM_CONHECIMENTO; }
    const formato = BANCA[banca].formato;
    emitir({ type: 'stage', stage: 'analisando_pontos_cegos' });

    const { data, meta } = await runJSON('generate', {
      ...promptRevanche({ banca, materia, assunto, questoesErradas: base, qtd, knowledge }),
      cacheSystem: true, maxTokens: Math.min(32000, 1300 * qtd + 1500), userId: user.id, signal,
      onText: contadorDeQuestoes(emitir, () => 0, qtd),
    }, generateSchema);

    const out = (data.questoes || []).slice(0, qtd).map((q) => normalizeQ(q, formato)).filter((n) => n && !saidaPerigosa(n));
    if (!out.length) throw erroSaida('Não foi possível formatar as questões da revanche.');

    // Revisor: gabarito errado na revanche ensinaria o erro → só passam as aprovadas
    let qs = out.map((q) => ({ ...q, verificada: null }));
    const stats = { geradas: out.length, aprovadas: out.length, descartadas: 0, refeitas: 0, revisor: config.review.enabled ? 'ok' : 'desativado' };
    if (config.review.enabled) {
      emitir({ type: 'stage', stage: 'revisando' });
      const mat = originalSet?.material_id ? await materiais.buscar(originalSet.material_id, user.id) : null;
      const rev = await reviewQuestions({ questoes: out, formato, text: mat?.text || '', userId: user.id, signal, geradoPor: meta && { provider: meta.provider, model: meta.model } });
      if (rev.available) {
        qs = out.filter((_, i) => rev.verdicts[i]?.ok).map((q) => ({ ...q, verificada: true }));
        Object.assign(stats, { aprovadas: qs.length, descartadas: out.length - qs.length, ...(rev.modelo ? { revisorModelo: rev.modelo } : {}) });
      } else stats.revisor = 'indisponivel';
    }
    if (!qs.length) throw erroSaida('Nenhuma questão da revanche passou na revisão automática. Tente novamente.');

    return simulados.inserir({
      user_id: user.id, material_id: originalSet?.material_id || null, edital_id: editalId, caderno_id: cadernoId,
      banca, materia, assunto, nivel: 'Médio', formato, arquivo: 'Bateria de Revanche', questoes: qs,
      model: `${meta.provider}:${meta.model}`, origem: 'revanche', review_stats: stats, prompt_versao: `revanche:${PROMPT_VERSAO.revanche}`,
      estatisticas: { revancheDe: { setId: originalSet?.id || null, cadernoId, keys: base.map((q) => q.key), totalOriginaisErradas: base.length } },
    });
  } catch (e) {
    await refundGeneration(user, cotaUsada).catch(() => {});
    throw e;
  }
}

// ---------- Consultas ----------

/** Lista com a situação oficial aplicada (anulada/gabarito definitivo) numa consulta só. */
export async function listar(user) {
  const rows = await simulados.listar(user.id);
  const situacao = await carregarSituacaoOficial(rows.map((s) => s.questoes));
  for (const s of rows) s.questoes = situacao(s.questoes);
  return rows;
}

export async function detalhe(user, id) {
  const s = await simulados.buscar(id, user.id);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');
  s.questoes = await aplicarSituacaoOficial(s.questoes);
  return s;
}

export const excluir = (user, id) => simulados.excluir(id, user.id);

// ---------- Responder / finalizar ----------

/**
 * Salva respostas, tempo e dúvidas. Ao finalizar: pontua (sem anuladas) e, se for revanche vencida (≥ 65%) na 1ª
 * finalização, avança as questões-base no caderno. Respostas novas alimentam revisão espaçada e atividade do dia.
 */
export async function salvarProgresso(user, id, b) {
  const antes = await simulados.buscar(id, user.id);
  if (!antes) throw new HttpError(404, 'Simulado não encontrado.');

  let estatisticas = null;
  if (b.finalizado) {
    estatisticas = { ...(antes.estatisticas || {}) };
    const qs = await aplicarSituacaoOficial(antes.questoes || []);
    const resp = b.respostas !== undefined ? b.respostas : (antes.respostas || {});
    const tempo = b.tempoGastoSegundos !== undefined ? b.tempoGastoSegundos : (antes.tempo_gasto_segundos || 0);
    estatisticas.resultadoFinal = pontuarSimulado(qs, resp, antes.formato, tempo);

    if (antes.origem === 'revanche' && !antes.finalizado) {
      const rf = estatisticas.resultadoFinal;
      const superou = rf.total > 0 && rf.acertos / rf.total >= 0.65;
      estatisticas.revancheSuperada = superou;
      const de = estatisticas.revancheDe || {};
      if (superou) {
        await aplicarVitoriaRevanche({ userId: user.id, cadernoId: de.cadernoId || antes.caderno_id, keys: Array.isArray(de.keys) ? de.keys : [], setIdLegado: de.setId || null });
      }
    }
  }

  const s = await simulados.atualizarProgresso(id, user.id, { ...b, estatisticas });

  // Erro/acerto no simulado de um caderno entra no ciclo de revisão espaçada (C4)
  if (antes.caderno_id && b.respostas) {
    await registrarRespostasNaRevisao({ cadernoId: antes.caderno_id, userId: user.id, setId: s.id, questoes: antes.questoes || [], antes: antes.respostas || {}, depois: b.respostas });
  }
  if (b.respostas) await registrarAtividade(user.id, contarNovas(antes.questoes, antes.respostas, b.respostas));

  s.questoes = await aplicarSituacaoOficial(s.questoes);
  return s;
}

// ---------- "Por que errei?" ----------

/** A resposta gravada vale; a enviada só cobre o intervalo antes do salvamento (validada no serviço de explicação). */
export async function explicarErro(user, id, idx, respostaEnviada) {
  const s = await simulados.buscar(id, user.id);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');
  const qs = await aplicarSituacaoOficial(Array.isArray(s.questoes) ? s.questoes : []);
  const q = qs[idx];
  if (!q) throw new HttpError(404, 'Questão não encontrada.');
  const respostaAluno = (s.respostas || {})[String(idx)] || (typeof respostaEnviada === 'string' ? respostaEnviada.slice(0, 3) : '');
  if (!respostaAluno) throw new HttpError(400, 'Nenhuma resposta informada para esta questão.');
  return obterOuGerarExplicacao({ user, questao: q, respostaAluno, banca: s.banca, materia: q.materia || s.materia, formato: s.formato });
}
