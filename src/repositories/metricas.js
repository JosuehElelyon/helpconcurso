// Repositório de métricas do painel admin (uso e custo de IA, qualidade das questões). Só SQL, só leitura.
import { one, many } from '../db.js';

const periodo = (dias) => String(Math.max(1, Math.min(365, Number(dias) || 30)));

/** Uso de IA por tarefa/provedor/modelo (o provedor simulado fica de fora). */
export const usoDeIA = (dias) => many(
  `SELECT task, provider, model, batch, count(*)::int AS chamadas, sum(CASE WHEN ok THEN 0 ELSE 1 END)::int AS falhas,
          sum(CASE WHEN fallback THEN 1 ELSE 0 END)::int AS reservas,
          coalesce(sum(input_tokens),0)::bigint AS entrada, coalesce(sum(output_tokens),0)::bigint AS saida,
          coalesce(sum(cache_read_tokens),0)::bigint AS cache, coalesce(sum(cache_write_tokens),0)::bigint AS cache_escrita,
          round(avg(duration_ms))::int AS ms_medio
   FROM ai_usage WHERE created_at > now() - ($1 || ' days')::interval AND provider <> 'mock'
   GROUP BY task, provider, model, batch ORDER BY task, batch`, [periodo(dias)]);

/** Quantas vezes cada funcionalidade foi usada no período (para custo médio por uso). Simulados da IA simulada (mock) não contam. */
export const usosPorFuncionalidade = (dias) => one(
  `SELECT
     (SELECT count(*) FROM question_sets WHERE created_at > now() - ($1 || ' days')::interval AND origem IN ('ia','revanche') AND coalesce(model, '') NOT LIKE 'mock:%')::int AS simulados,
     (SELECT count(*) FROM materials WHERE created_at > now() - ($1 || ' days')::interval)::int AS materiais,
     (SELECT count(*) FROM questao_explicacoes WHERE created_at > now() - ($1 || ' days')::interval)::int AS explicacoes,
     (SELECT count(*) FROM provas WHERE created_at > now() - ($1 || ' days')::interval)::int AS provas,
     (SELECT count(*) FROM editais WHERE created_at > now() - ($1 || ' days')::interval)::int AS editais,
     (SELECT count(*) FROM question_feedback WHERE report_status <> 'none' AND updated_at > now() - ($1 || ' days')::interval)::int AS reportes`,
  [periodo(dias)]);

/**
 * Qualidade por gerador × versão do prompt × revisor: o que o revisor descartou e o que os alunos acharam
 * (👍/👎, erros confirmados). Simulados anteriores à migração 022 aparecem como "(sem versão)".
 */
export const qualidadePorModelo = (dias) => many(
  `WITH s AS (
     SELECT id, model, coalesce(prompt_versao, '(sem versão)') AS pv, review_stats AS rs, jsonb_array_length(coalesce(questoes, '[]'::jsonb)) AS n
     FROM question_sets
     WHERE created_at > now() - ($1 || ' days')::interval AND origem IN ('ia', 'revanche') AND model IS NOT NULL AND model NOT LIKE 'mock:%')
   SELECT s.model AS gerador, s.pv AS prompt_versao, coalesce(s.rs->>'revisorModelo', '—') AS revisor,
          count(*)::int AS simulados, coalesce(sum(s.n), 0)::int AS questoes_entregues,
          coalesce(sum((s.rs->>'geradas')::int), 0)::int AS geradas, coalesce(sum((s.rs->>'descartadas')::int), 0)::int AS descartadas,
          count(*) FILTER (WHERE s.rs->>'revisor' = 'indisponivel')::int AS revisor_indisponivel,
          coalesce(sum(f.gostei), 0)::int AS gostei, coalesce(sum(f.nao_gostei), 0)::int AS nao_gostei,
          coalesce(sum(f.confirmados), 0)::int AS erros_confirmados
   FROM s LEFT JOIN LATERAL (
     SELECT count(*) FILTER (WHERE rating = 1) AS gostei, count(*) FILTER (WHERE rating = -1) AS nao_gostei,
            count(*) FILTER (WHERE report_status = 'confirmed') AS confirmados
     FROM question_feedback WHERE set_id = s.id) f ON true
   GROUP BY 1, 2, 3 ORDER BY simulados DESC`, [periodo(dias)]);

/** 👍/👎 e erros por banca (dado próprio do produto, todo o período). */
export const qualidadePorBanca = () => many(
  `SELECT banca, count(*) FILTER (WHERE rating=1)::int AS gostei, count(*) FILTER (WHERE rating=-1)::int AS nao_gostei,
          count(*) FILTER (WHERE report_status='confirmed')::int AS erros_confirmados,
          count(*) FILTER (WHERE report_status='rejected')::int AS erros_nao_confirmados
   FROM question_feedback GROUP BY banca ORDER BY banca`);

/** Totais do revisor automático no período. */
export const totaisDoRevisor = (dias) => one(
  `SELECT coalesce(sum((review_stats->>'geradas')::int),0)::int AS geradas, coalesce(sum((review_stats->>'descartadas')::int),0)::int AS descartadas,
          coalesce(sum((review_stats->>'refeitas')::int),0)::int AS refeitas
   FROM question_sets WHERE created_at > now() - ($1 || ' days')::interval AND review_stats IS NOT NULL`, [periodo(dias)]);

export const filaPorSituacao = () => many('SELECT status, count(*)::int AS n FROM jobs GROUP BY status');
