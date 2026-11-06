// Repositório de cadernos (tabela cadernos). Só SQL; toda consulta filtra pelo dono.
import { one, query } from '../db.js';

export const buscar = (id, userId) => one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [id, userId]);

export const definirMateriais = (id, materiaisIds) =>
  query('UPDATE cadernos SET materiais_ids=$2, updated_at=now() WHERE id=$1', [id, JSON.stringify(materiaisIds)]);
