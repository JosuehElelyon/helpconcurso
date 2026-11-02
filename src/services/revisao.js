// Liga as respostas dadas no simulado (fora da tela do caderno) ao ciclo de revisão espaçada do caderno.
import { one, query } from '../db.js';
import { calcularRevisao, estadoEfetivo } from '../lib/revisao-espacada.js';

/**
 * Recalcula o ciclo das questões cuja resposta mudou e grava só essas chaves (merge atômico no jsonb — duas respostas
 * seguidas não se sobrescrevem).
 */
export async function registrarRespostasNaRevisao({ cadernoId, userId, setId, questoes = [], antes = {}, depois = {} }) {
  const c = await one('SELECT revisao_espacada FROM cadernos WHERE id=$1 AND user_id=$2', [cadernoId, userId]);
  if (!c) return 0;
  const mapa = c.revisao_espacada || {};
  const novos = {};
  for (const [i, resp] of Object.entries(depois)) {
    if (resp == null || antes[i] === resp) continue;
    const q = questoes[Number(i)];
    if (!q?.gabarito) continue;
    const key = `set:${setId}:${i}`;
    const novo = calcularRevisao({ estadoAnterior: estadoEfetivo(mapa[key], antes[i] ?? null, q.gabarito), acerto: resp === q.gabarito });
    if (novo) novos[key] = novo;
  }
  if (!Object.keys(novos).length) return 0;
  await query("UPDATE cadernos SET revisao_espacada = coalesce(revisao_espacada, '{}'::jsonb) || $3::jsonb WHERE id=$1 AND user_id=$2", [cadernoId, userId, JSON.stringify(novos)]);
  return Object.keys(novos).length;
}
