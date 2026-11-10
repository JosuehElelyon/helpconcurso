// Repositório da atividade diária (tabela atividade_diaria, dia de Brasília). Só SQL.
import { many, query } from '../db.js';

const DIA_BR = "(now() AT TIME ZONE 'America/Sao_Paulo')::date";

/** Soma respostas e acertos ao dia de hoje. */
export const somarAoDia = (userId, respondidas, acertos) => query(
  `INSERT INTO atividade_diaria(user_id, dia, respondidas, acertos) VALUES ($1, ${DIA_BR}, $2, $3)
   ON CONFLICT (user_id, dia) DO UPDATE SET respondidas = atividade_diaria.respondidas + EXCLUDED.respondidas,
     acertos = atividade_diaria.acertos + EXCLUDED.acertos, updated_at = now()`, [userId, respondidas, acertos]);

/** Dias estudados recentes, do mais novo para o mais antigo. */
export const diasRecentes = (userId, dias = 400) => many(
  `SELECT to_char(dia, 'YYYY-MM-DD') AS dia, respondidas, acertos FROM atividade_diaria
   WHERE user_id=$1 AND dia > ${DIA_BR} - $2::int ORDER BY dia DESC`, [userId, dias]);
