// Repositório da taxonomia própria (matéria → tópico). Só SQL.
import { many, query } from '../db.js';

/** Cria ou atualiza (sinônimos) uma matéria-semente. */
export const semearMateria = (id, nome, nomeNorm, sinonimos) => query(
  `INSERT INTO taxonomia(id, tipo, nome, nome_norm, sinonimos, origem) VALUES ($1,'materia',$2,$3,$4,'semente')
   ON CONFLICT (id) DO UPDATE SET sinonimos = EXCLUDED.sinonimos`, [id, nome, nomeNorm, JSON.stringify(sinonimos || [])]);

export const materias = () => many("SELECT id, nome_norm, sinonimos FROM taxonomia WHERE tipo='materia'");

/** Garante o tópico filho da matéria (idempotente). */
export const garantirTopico = (id, materiaId, nome, nomeNorm) =>
  query("INSERT INTO taxonomia(id, tipo, pai_id, nome, nome_norm) VALUES ($1,'topico',$2,$3,$4) ON CONFLICT DO NOTHING", [id, materiaId, nome, nomeNorm]);
