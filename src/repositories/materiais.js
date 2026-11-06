// Repositório de materiais de estudo (tabela materials). Só SQL; toda consulta filtra pelo dono.
import { one, query } from '../db.js';

export const buscar = (id, userId) => one('SELECT * FROM materials WHERE id=$1 AND user_id=$2', [id, userId]);

export const definirMateria = (id, materia, assunto) =>
  query('UPDATE materials SET materia=$2, assunto=$3 WHERE id=$1', [id, materia, assunto || null]);
