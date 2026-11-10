// Repositório de avaliações e reportes de erro das questões (tabela question_feedback). Só SQL.
import { one, many, query } from '../db.js';

export const avaliar = (setId, i, userId, banca, materia, nota) => one(
  `INSERT INTO question_feedback(set_id,q_index,user_id,banca,materia,rating) VALUES ($1,$2,$3,$4,$5,$6)
   ON CONFLICT (set_id,q_index,user_id) DO UPDATE SET rating=EXCLUDED.rating, updated_at=now() RETURNING *`, [setId, i, userId, banca, materia, nota]);

export const reportesNas24h = async (userId) =>
  (await one("SELECT count(*)::int AS n FROM question_feedback WHERE user_id=$1 AND report_status <> 'none' AND updated_at > now() - interval '24 hours'", [userId])).n;

export const situacaoDoReporte = (setId, i, userId) =>
  one('SELECT report_status FROM question_feedback WHERE set_id=$1 AND q_index=$2 AND user_id=$3', [setId, i, userId]);

export const registrarReporte = (setId, i, userId, banca, materia, motivo) => one(
  `INSERT INTO question_feedback(set_id,q_index,user_id,banca,materia,report_reason,report_status) VALUES ($1,$2,$3,$4,$5,$6,'pending')
   ON CONFLICT (set_id,q_index,user_id) DO UPDATE SET report_reason=EXCLUDED.report_reason, report_status='pending', report_result=NULL, updated_at=now() RETURNING *`,
  [setId, i, userId, banca, materia, motivo]);

export const doSimulado = (setId, userId) => many('SELECT * FROM question_feedback WHERE set_id=$1 AND user_id=$2', [setId, userId]);

export const buscar = (id) => one('SELECT * FROM question_feedback WHERE id=$1', [id]);

/** Fecha o reporte: confirmed | rejected | failed, com o resultado da verificação. */
export const concluirReporte = (id, situacao, resultado) =>
  query('UPDATE question_feedback SET report_status=$2, report_result=$3, updated_at=now() WHERE id=$1', [id, situacao, JSON.stringify(resultado)]);
