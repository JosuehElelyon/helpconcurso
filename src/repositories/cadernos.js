// Repositório de cadernos (tabela cadernos). Só SQL; toda consulta filtra pelo dono.
import { one, many, query } from '../db.js';

// Colunas jsonb de mapa (chave da questão → valor) que aceitam mesclar/remover chave de forma atômica
const MAPAS = new Set(['favoritas', 'anotacoes', 'respostas_extras', 'revisao_espacada']);
const mapa = (coluna) => { if (!MAPAS.has(coluna)) throw new Error(`coluna inválida: ${coluna}`); return coluna; };

export const buscar = (id, userId) => one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [id, userId]);

/** Cadernos do aluno com o título do edital (lista da tela). */
export const listarComEdital = (userId, limite = 100) => many(
  `SELECT c.*, e.titulo AS edital_titulo FROM cadernos c LEFT JOIN editais e ON e.id = c.edital_id
   WHERE c.user_id = $1 ORDER BY c.updated_at DESC LIMIT $2`, [userId, limite]);

export const inserir = ({ userId, titulo, descricao, banca, orgao, cargo, ano, editalId, materiaisIds, provasIds }) => one(
  `INSERT INTO cadernos (user_id, titulo, descricao, banca, orgao, cargo, ano, edital_id, materiais_ids, provas_ids)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
  [userId, titulo, descricao || null, banca, orgao, cargo, ano, editalId, JSON.stringify(materiaisIds), JSON.stringify(provasIds)]);

export const definirMateriais = (id, materiaisIds) =>
  one('UPDATE cadernos SET materiais_ids=$2, updated_at=now() WHERE id=$1 RETURNING *', [id, JSON.stringify(materiaisIds)]);

export const definirQuestoesExtras = (id, extras) =>
  one('UPDATE cadernos SET questoes_extras=$2, updated_at=now() WHERE id=$1 RETURNING *', [id, JSON.stringify(extras)]);

export const definirProvas = (id, provasIds, extras) =>
  one('UPDATE cadernos SET provas_ids=$2, questoes_extras=$3, updated_at=now() WHERE id=$1 RETURNING *', [id, JSON.stringify(provasIds), JSON.stringify(extras)]);

/** Substitui um mapa inteiro (usado só em "refazer": all/erros). */
export const definirMapa = (id, userId, coluna, valor) =>
  query(`UPDATE cadernos SET ${mapa(coluna)}=$3, updated_at=now() WHERE id=$1 AND user_id=$2`, [id, userId, JSON.stringify(valor)]);

/** Mescla chaves num mapa sem regravar o resto (duas ações seguidas não se sobrescrevem). */
export const mesclarMapa = (id, userId, coluna, parcial) =>
  query(`UPDATE cadernos SET ${mapa(coluna)} = coalesce(${mapa(coluna)}, '{}'::jsonb) || $3::jsonb, updated_at=now() WHERE id=$1 AND user_id=$2`,
    [id, userId, JSON.stringify(parcial)]);

export const removerDoMapa = (id, userId, coluna, chave) =>
  query(`UPDATE cadernos SET ${mapa(coluna)} = coalesce(${mapa(coluna)}, '{}'::jsonb) - $3::text, updated_at=now() WHERE id=$1 AND user_id=$2`,
    [id, userId, chave]);

export const tocar = (id) => query('UPDATE cadernos SET updated_at=now() WHERE id=$1', [id]);

export const excluir = (id, userId) => query('DELETE FROM cadernos WHERE id=$1 AND user_id=$2', [id, userId]);
