// Preços da IA e cálculo de custo — usado pelo painel Admin e pelo limite diário de gasto (AI_LIMITE_USD_DIA).
// Preços por 1 milhão de tokens (US$), tabela da Anthropic de out/2026 — confira em https://claude.com/pricing ao trocar de modelo.
// cache = leitura de cache (~10% da entrada). Haiku 5.5: preço vale para prompts de até 100 mil tokens (acima disso, 0,50/2,50);
// nossos prompts são cortados bem abaixo disso. Chamadas em lote (AI_TRAINING_MODE=batch) custam 50%.
import { many } from '../db.js';

export const PRICE_PER_M = {
  'claude-opus-5-5':   { in: 4.0,  out: 20.0, cache: 0.20 },
  'claude-sonnet-5-5': { in: 2.0,  out: 10.0, cache: 0.20 },
  'claude-haiku-5-5':  { in: 0.10, out: 0.50, cache: 0.01 },
  default:             { in: 2.0,  out: 10.0, cache: 0.20 },
};
export const USD_TO_BRL = 5.80;
const BATCH_DISCOUNT = 0.5;

export function costUsd(model, inputTokens, outputTokens, cacheTokens = 0, batch = false) {
  const mKey = Object.keys(PRICE_PER_M).find((k) => String(model || '').includes(k)) || 'default';
  const p = PRICE_PER_M[mKey];
  const cache = Number(cacheTokens || 0);
  const uncachedIn = Math.max(0, Number(inputTokens || 0) - cache);
  const usd = (uncachedIn * p.in + cache * p.cache + Number(outputTokens || 0) * p.out) / 1_000_000;
  return batch ? usd * BATCH_DISCOUNT : usd;
}

/** Gasto real (sem o provedor simulado) desde a meia-noite de Brasília. */
export async function spentTodayUsd() {
  const rows = await many(`SELECT model, batch, coalesce(sum(input_tokens),0)::bigint AS ent, coalesce(sum(output_tokens),0)::bigint AS sai, coalesce(sum(cache_read_tokens),0)::bigint AS cache
                           FROM ai_usage
                           WHERE provider <> 'mock' AND created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')
                           GROUP BY model, batch`);
  return rows.reduce((acc, r) => acc + costUsd(r.model, r.ent, r.sai, r.cache, r.batch), 0);
}
