// Repositório de materiais de estudo (tabela materials). Só SQL; toda consulta filtra pelo dono.
import { one, many, query } from '../db.js';

export const buscar = (id, userId) => one('SELECT * FROM materials WHERE id=$1 AND user_id=$2', [id, userId]);

export const definirMateria = (id, materia, assunto) =>
  query('UPDATE materials SET materia=$2, assunto=$3 WHERE id=$1', [id, materia, assunto || null]);

export const listarDoAluno = (userId, limite = 100) => many(
  'SELECT id, file_name, materia, assunto, word_count, edital_id, created_at FROM materials WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limite]);

export const porIds = (userId, ids) => (ids.length ? many(
  `SELECT id, file_name, materia, assunto, word_count, edital_id, edital_match, created_at FROM materials
   WHERE user_id=$1 AND id = ANY($2::uuid[]) ORDER BY created_at DESC`, [userId, ids]) : Promise.resolve([]));

export const idsDoEdital = async (userId, editalId, limite = 50) =>
  (await many('SELECT id FROM materials WHERE user_id=$1 AND edital_id=$2 ORDER BY created_at DESC LIMIT $3', [userId, editalId, limite])).map((m) => m.id);

/** Materiais do aluno para o painel do edital (cobertura por tópico). */
export const listarParaPainel = (userId) =>
  many('SELECT id, file_name, materia, assunto, edital_id, edital_match, created_at FROM materials WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
