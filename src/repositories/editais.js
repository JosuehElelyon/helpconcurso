// Repositório de editais (tabela editais). Só SQL; toda consulta filtra pelo dono.
import { one } from '../db.js';

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
