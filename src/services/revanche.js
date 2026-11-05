// Bateria de Revanche: as questões erradas que servem de base vêm SEMPRE do servidor (simulado ou caderno do próprio
// aluno) — nunca do corpo da requisição. Assim o texto que entra no prompt é limitado e já passou pelas barreiras.
import { one, many, query } from '../db.js';
import { HttpError } from '../lib/http.js';
import { calcularRevisao, estadoEfetivo } from '../lib/revisao-espacada.js';
import { carregarSituacaoOficial } from './situacao-oficial.js';

export const MAX_BASE = 5; // questões erradas usadas como base do prompt
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const corta = (s, n) => String(s || '').slice(0, n);

const paraBase = (q, resposta, key, fallback = {}) => ({
  key,
  enunciado: corta(q.enunciado, 4000),
  alternativas: (Array.isArray(q.alternativas) ? q.alternativas : []).slice(0, 5).map((a) => corta(a, 800)),
  gabarito: corta(q.gabarito, 3),
  respostaAluno: corta(resposta, 3),
  pegadinha: corta(q.pegadinha, 600),
  comentario: corta(q.comentario, 1500),
  materia: corta(q.materia || fallback.materia, 100),
  topico: corta(q.topico_edital || q.topico || q.tema || fallback.assunto, 180),
});
const errou = (q, r) => q && !q.anulada && r != null && r !== '' && q.gabarito && r !== q.gabarito;

/** Caderno do aluno (ou 404). */
export async function cadernoDoAluno(cadernoId, userId) {
  if (!cadernoId) return null;
  const c = UUID.test(String(cadernoId)) ? await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [cadernoId, userId]) : null;
  if (!c) throw new HttpError(404, 'Caderno não encontrado.');
  return c;
}

/** Questão de um caderno pela chave (`set:<id>:<i>` ou `extra:<id>`), com a resposta dada e a situação oficial aplicada. */
export async function questaoDoCaderno(caderno, key, userId) {
  const k = String(key || '');
  if (k.startsWith('set:')) {
    const [, setId, idxStr] = k.split(':');
    const idx = Number(idxStr);
    if (!UUID.test(setId) || !Number.isInteger(idx) || idx < 0) return null;
    const s = await one('SELECT * FROM question_sets WHERE id=$1 AND user_id=$2 AND caderno_id=$3', [setId, userId, caderno.id]);
    if (!s) return null;
    const qs = (await carregarSituacaoOficial([s.questoes]))(s.questoes);
    const q = qs[idx];
    return q ? { q, resposta: (s.respostas || {})[String(idx)] ?? null, set: s } : null;
  }
  if (k.startsWith('extra:')) {
    const qid = k.slice(6);
    const extras = Array.isArray(caderno.questoes_extras) ? caderno.questoes_extras : [];
    const q0 = extras.find((x) => String(x.id) === qid);
    if (!q0) return null;
    const [q] = (await carregarSituacaoOficial([[q0]]))([q0]);
    return { q, resposta: (caderno.respostas_extras || {})[qid] ?? null, set: null };
  }
  return null;
}

/**
 * Reúne as questões erradas que servem de base para a revanche.
 * - setId (+ indices opcionais): do simulado do aluno
 * - cadernoId + keys: questões específicas do caderno
 * - cadernoId sem keys: últimas erradas dos simulados do caderno
 */
export async function coletarQuestoesErradas({ userId, setId = null, indices = [], cadernoId = null, keys = [] }) {
  const caderno = await cadernoDoAluno(cadernoId, userId);
  const base = [];
  let originalSet = null;

  if (setId) {
    originalSet = UUID.test(String(setId)) ? await one('SELECT * FROM question_sets WHERE id=$1 AND user_id=$2', [setId, userId]) : null;
    if (!originalSet) throw new HttpError(404, 'Simulado não encontrado.');
    const qs = (await carregarSituacaoOficial([originalSet.questoes]))(originalSet.questoes);
    const resp = originalSet.respostas || {};
    const alvo = indices.length ? indices : qs.map((_, i) => i);
    for (const i of alvo) {
      if (errou(qs[i], resp[String(i)])) base.push(paraBase(qs[i], resp[String(i)], `set:${originalSet.id}:${i}`, originalSet));
      if (base.length >= MAX_BASE) break;
    }
  } else if (caderno && keys.length) {
    for (const key of keys.slice(0, MAX_BASE)) {
      const found = await questaoDoCaderno(caderno, key, userId);
      if (found && errou(found.q, found.resposta)) base.push(paraBase(found.q, found.resposta, key, found.set || caderno));
    }
  } else if (caderno) {
    const sets = await many('SELECT * FROM question_sets WHERE caderno_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 5', [caderno.id, userId]);
    const situacao = await carregarSituacaoOficial(sets.map((s) => s.questoes));
    for (const s of sets) {
      const qs = situacao(s.questoes);
      const resp = s.respostas || {};
      for (let i = 0; i < qs.length && base.length < MAX_BASE; i++) {
        if (errou(qs[i], resp[String(i)])) base.push(paraBase(qs[i], resp[String(i)], `set:${s.id}:${i}`, s));
      }
      if (base.length >= MAX_BASE) break;
    }
  }

  return { base, originalSet, caderno };
}

/**
 * O aluno venceu a revanche: as questões-base no caderno avançam UMA fase pelo algoritmo normal (data da próxima
 * revisão, intervalo e acertos seguidos coerentes). Merge atômico só das chaves alteradas.
 */
export async function aplicarVitoriaRevanche({ userId, cadernoId, keys = [], setIdLegado = null }) {
  if (!cadernoId) return 0;
  const c = await one('SELECT revisao_espacada FROM cadernos WHERE id=$1 AND user_id=$2', [cadernoId, userId]);
  if (!c) return 0;
  const mapa = c.revisao_espacada || {};
  const alvo = keys.length ? keys : setIdLegado ? Object.keys(mapa).filter((k) => k.startsWith(`set:${setIdLegado}:`)) : [];
  const novos = {};
  for (const key of alvo) {
    const atual = mapa[key] || estadoEfetivo(null, 'x', 'y'); // errada sem estado → entra na Fase 1 antes de avançar
    if (atual.dominada) continue;
    const novo = calcularRevisao({ estadoAnterior: atual, acerto: true });
    if (novo) novos[key] = { ...novo, revancheVencida: true };
  }
  if (!Object.keys(novos).length) return 0;
  await query("UPDATE cadernos SET revisao_espacada = coalesce(revisao_espacada, '{}'::jsonb) || $3::jsonb, updated_at=now() WHERE id=$1 AND user_id=$2",
    [cadernoId, userId, JSON.stringify(novos)]);
  return Object.keys(novos).length;
}
