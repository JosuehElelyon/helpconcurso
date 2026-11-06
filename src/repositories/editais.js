// Repositório de editais (tabela editais). Só SQL; toda consulta filtra pelo dono.
import { one } from '../db.js';

export const existe = async (id, userId) => !!(await one('SELECT 1 FROM editais WHERE id=$1 AND user_id=$2', [id, userId]));
