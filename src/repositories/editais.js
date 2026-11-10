// Repositório de editais (tabela editais). Só SQL; toda consulta filtra pelo dono.
import { one, many, query } from '../db.js';

export const existe = async (id, userId) => !!(await one('SELECT 1 FROM editais WHERE id=$1 AND user_id=$2', [id, userId]));

export const buscar = (id, userId) => one('SELECT * FROM editais WHERE id=$1 AND user_id=$2', [id, userId]);

export const buscarResumo = (id, userId) =>
  one('SELECT id, titulo, banca, orgao, cargo, ano FROM editais WHERE id=$1 AND user_id=$2', [id, userId]);

/** Busca o edital marcado como ativo (active=true) ou o mais recente do aluno. */
export async function buscarAtivoOuRecente(userId) {
  const ativo = await one('SELECT * FROM editais WHERE user_id=$1 AND active=true ORDER BY updated_at DESC LIMIT 1', [userId]);
  if (ativo) return ativo;
  return one('SELECT * FROM editais WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1', [userId]);
}

export const listar = (userId, limite = 30) =>
  many('SELECT * FROM editais WHERE user_id=$1 ORDER BY active DESC, created_at DESC LIMIT $2', [userId, limite]);

/** Deixa só este edital como ativo do aluno. */
export const ativar = (id, userId) => query('UPDATE editais SET active = (id = $2), updated_at=now() WHERE user_id=$1', [userId, id]);

export const desativarTodos = (userId) => query('UPDATE editais SET active=false WHERE user_id=$1', [userId]);

export const excluir = (id, userId) => one('DELETE FROM editais WHERE id=$1 AND user_id=$2 RETURNING file_key, active', [id, userId]);

export const ativarMaisRecente = (userId) =>
  query('UPDATE editais SET active=true WHERE id=(SELECT id FROM editais WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)', [userId]);

export const inserir = (c) => one(
  `INSERT INTO editais(user_id,titulo,orgao,cargo,banca,ano,prova_id,file_name,file_key,mime_type,size,pages,text,word_count,verticalizado,sha256,security,ocr,active,canonico_id,official_url,oficial_confirmado,official_url_tipo)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,true,$19,$20,$21,$22) RETURNING *`,
  [c.userId, c.titulo, c.orgao, c.cargo, c.banca, c.ano, c.provaId, c.fileName, c.fileKey, c.mimeType, c.size, c.pages, c.text, c.wordCount,
    JSON.stringify(c.verticalizado), c.sha256, JSON.stringify(c.security), c.ocr, c.canonicoId, c.officialUrl, c.oficialConfirmado, c.officialUrlTipo]);

// ---------- Edital canônico: o mesmo edital é lido pela IA uma vez só ----------

/** Busca pela chave (texto normalizado + cargo) e já conta mais um uso. */
export const usarCanonico = (chave) => one('UPDATE editais_canonicos SET usos=usos+1, updated_at=now() WHERE chave=$1 RETURNING *', [chave]);

export const confirmarFonteDoCanonico = (id, url, tipo) =>
  query('UPDATE editais_canonicos SET official_url=$2, oficial_confirmado=true, official_url_tipo=$3 WHERE id=$1', [id, url, tipo]);

export const inserirCanonico = (c) => one(
  `INSERT INTO editais_canonicos(chave,titulo,orgao,cargo,banca,ano,verticalizado,prompt_versao,official_url,oficial_confirmado,official_url_tipo)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
   ON CONFLICT (chave) DO UPDATE SET usos = editais_canonicos.usos + 1, updated_at = now() RETURNING id`,
  [c.chave, c.titulo, c.orgao, c.cargo, c.banca, c.ano, JSON.stringify(c.verticalizado), c.promptVersao,
    c.officialUrl || null, !!c.oficialConfirmado, c.officialUrlTipo || null]);
