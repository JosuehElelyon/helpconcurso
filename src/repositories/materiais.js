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

/** Texto do material pelo id, sem filtrar dono — só para tarefas de fundo (verificação de erro reportado). */
export const textoParaTarefa = async (id) => (await one('SELECT text FROM materials WHERE id=$1', [id]))?.text ?? null;

/** Materiais do aluno com o texto (lista da tela de materiais). */
export const listarCompletos = (userId, limite = 100) =>
  many('SELECT * FROM materials WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limite]);

export const inserir = (c) => one(
  `INSERT INTO materials(user_id,file_name,file_key,mime_type,size,pages,text,word_count,materia,detect,edital_id,edital_match,sha256,security,ocr)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
  [c.userId, c.fileName, c.fileKey, c.mime, c.size, c.pages, c.text, c.wordCount, c.materia, c.detect ? JSON.stringify(c.detect) : null,
    c.editalId, c.editalMatch ? JSON.stringify(c.editalMatch) : null, c.sha256, JSON.stringify(c.security), c.ocr]);

/** Liga (ou desliga, com editalId null) o material a um edital do aluno. */
export const definirEdital = (id, userId, editalId, cruzamento) =>
  one('UPDATE materials SET edital_id=$3, edital_match=$4 WHERE id=$1 AND user_id=$2 RETURNING *',
    [id, userId, editalId, cruzamento ? JSON.stringify(cruzamento) : null]);

export const excluir = (id, userId) => one('DELETE FROM materials WHERE id=$1 AND user_id=$2 RETURNING file_key', [id, userId]);
