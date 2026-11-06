// Repositório de provas da base compartilhada (tabelas provas e prova_questoes). Só SQL.
// Provas são públicas quando READY; enquanto não ficam prontas, só quem enviou as enxerga.
import { one, many } from '../db.js';
import { questaoValida } from '../lib/questoes-validas.js';

export const buscar = (id) => one('SELECT * FROM provas WHERE id=$1', [id]);

/** Prova que o aluno pode usar: pronta (pública) ou enviada por ele. */
export const buscarAcessivel = (id, userId) => one("SELECT * FROM provas WHERE id=$1 AND (status='READY' OR uploaded_by=$2)", [id, userId]);

export const prontasPorIds = (ids) => (ids.length ? many(
  `SELECT id, banca, titulo, file_name, orgao, cargo, ano, status FROM provas WHERE id = ANY($1::uuid[]) AND status = 'READY'`, [ids]) : Promise.resolve([]));

export const resumoPorIds = (ids) => (ids.length ? many(
  'SELECT id, banca, titulo, file_name, orgao, cargo, ano, status, num_questoes, created_at FROM provas WHERE id = ANY($1::uuid[]) ORDER BY created_at DESC', [ids]) : Promise.resolve([]));

/** Provas que o aluno pode juntar a um caderno: as prontas e as que ele enviou (primeiro as dele). */
export const disponiveisPara = (userId, limite = 150) => many(
  `SELECT id, banca, titulo, file_name, orgao, cargo, ano, edital_id, status, num_questoes, uploaded_by, created_at
   FROM provas WHERE status = 'READY' OR uploaded_by = $1
   ORDER BY (uploaded_by = $1) DESC, created_at DESC LIMIT $2`, [userId, limite]);

/** Provas do edital (ou a prova de origem do edital) que o aluno pode usar. */
export const idsDoEdital = async (userId, editalId, provaOrigemId, limite = 20) => (await many(
  `SELECT id FROM provas WHERE (edital_id=$1 OR id=$2) AND (uploaded_by=$3 OR status='READY') ORDER BY created_at DESC LIMIT $4`,
  [editalId, provaOrigemId || null, userId, limite])).map((p) => p.id);

export const idsEnviadasDaBanca = async (userId, banca, limite = 20) =>
  (await many('SELECT id FROM provas WHERE uploaded_by=$1 AND banca=$2 ORDER BY created_at DESC LIMIT $3', [userId, banca, limite])).map((p) => p.id);

/** Questões válidas para o aluno (sem anuladas/divergentes) e com gabarito. */
export const questoesValidas = (provaId, limite = 80) => many(
  `SELECT id, numero, materia, enunciado, alternativas, gabarito FROM prova_questoes
   WHERE prova_id = $1 AND ${questaoValida('')} AND gabarito IS NOT NULL AND length(trim(gabarito)) > 0
   ORDER BY numero ASC NULLS LAST LIMIT $2`, [provaId, limite]);
