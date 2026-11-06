// Repositório de métricas de desempenho e atividade (tabelas question_sets, atividade_diaria, users).
// Só SQL: sem regra de negócio. Toda consulta filtra pelo dono (userId).
import { one, many } from '../db.js';

/**
 * Consulta otimizada para o cockpit de desempenho:
 * Em vez de carregar os enunciados e alternativas pesados do JSON de questões,
 * carrega apenas os gabaritos e o comprimento do array, limitando ao período recente.
 */
export async function buscarSimuladosParaDesempenho(userId, diasLimite = 90) {
  return many(
    `SELECT id, caderno_id, modo_prova, tempo_gasto_segundos, materia, created_at,
            respostas,
            (
              SELECT jsonb_agg(jsonb_build_object('gabarito', q->>'gabarito'))
              FROM jsonb_array_elements(COALESCE(questoes, '[]'::jsonb)) q
            ) AS gabaritos,
            COALESCE(jsonb_array_length(questoes), 0) AS total_questoes
     FROM question_sets
     WHERE user_id = $1
       AND created_at >= (now() - ($2 || ' days')::interval)
     ORDER BY created_at DESC`,
    [userId, diasLimite]
  );
}

/** Histórico diário de questões respondidas e acertos dos últimos dias. */
export async function buscarAtividadeRecente(userId, dias = 30) {
  return many(
    `SELECT to_char(dia, 'YYYY-MM-DD') AS dia, respondidas, acertos
     FROM atividade_diaria
     WHERE user_id = $1
       AND dia >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($2::int - 1))
     ORDER BY dia ASC`,
    [userId, dias]
  );
}

/** Metas e dados de perfil do aluno para a barra de prontidão e evolução. */
export async function buscarMetaPerfil(userId) {
  return one(
    'SELECT meta_diaria, data_prova, concurso_alvo, banca_preferida FROM users WHERE id=$1',
    [userId]
  );
}

