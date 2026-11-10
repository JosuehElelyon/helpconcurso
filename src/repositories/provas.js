// Repositório de provas da base compartilhada (tabelas provas e prova_questoes). Só SQL.
// Provas são públicas quando READY; enquanto não ficam prontas, só quem enviou as enxerga.
import { one, many, query } from '../db.js';
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

/** Prova que o aluno pode vincular ao edital: enviada por ele (ou qualquer uma, se admin). */
export const idEnviadaPor = async (id, userId, isAdmin) =>
  (await one('SELECT id FROM provas WHERE id=$1 AND (uploaded_by=$2 OR $3)', [id, userId, !!isAdmin]))?.id || null;

export const vincularEdital = (provaId, editalId) => query('UPDATE provas SET edital_id=$2 WHERE id=$1', [provaId, editalId]);

/** Provas ligadas ao edital (ou a prova de origem dele). */
export const doEdital = (editalId, provaOrigemId) => many(
  'SELECT id, banca, titulo, file_name, status, num_questoes, created_at FROM provas WHERE edital_id=$1 OR id=$2 ORDER BY created_at DESC',
  [editalId, provaOrigemId || null]);

/** Questões reais (matéria e enunciado) das provas ligadas ou da banca — base da incidência por tópico. */
export const questoesParaIncidencia = (provaIds, banca) => many(
  `SELECT q.materia, q.enunciado FROM prova_questoes q JOIN provas p ON p.id=q.prova_id
   WHERE ${questaoValida('q')} AND p.status='READY' AND (p.id = ANY($1::uuid[]) OR ($2::text IS NOT NULL AND q.banca=$2))
   LIMIT 400`, [provaIds, banca || null]);

// Texto do edital/IA dentro de ILIKE: % e _ viram literais
export const escaparLike = (t) => String(t || '').replace(/[\\%_]/g, (c) => `\\${c}`);

const COLUNAS_REAIS = `q.id, q.numero, q.materia, q.materia_id, q.topico, q.topico_id, q.comando, q.pegadinha_tipo,
       q.dispositivos, q.habilidade, q.enunciado, q.alternativas, q.gabarito,
       p.id AS prova_id, p.titulo AS prova_titulo, p.file_name, p.ano AS prova_ano, p.banca,
       (p.edital_id = $1 OR p.id = $2) AS vinculada`;
const REAIS_VALIDAS = `p.status = 'READY' AND ${questaoValida('q')}
   AND q.gabarito IS NOT NULL AND length(trim(q.gabarito)) > 0
   AND (($3::text IS NOT NULL AND q.banca = $3) OR p.edital_id = $1 OR p.id = $2)`;

/** Questões reais candidatas a um tópico do edital (da banca ou das provas ligadas). Ordem estável. */
export const questoesReaisDoTopico = ({ editalId, provaOrigemId, banca, topicoId, topicoNome, materia }) => many(
  `SELECT ${COLUNAS_REAIS} FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
   WHERE ${REAIS_VALIDAS}
     AND (($4::text IS NOT NULL AND q.topico_id = $4) OR q.topico ILIKE $5 OR q.materia ILIKE $6)
   ORDER BY q.id LIMIT 400`,
  [editalId, provaOrigemId || null, banca || null, topicoId || null, `%${escaparLike(topicoNome)}%`, `%${escaparLike(materia)}%`]);

/**
 * Questões reais de uma disciplina para o Simulado Prova Real. Casa pela taxonomia ou pelo nome completo (R10);
 * as que o aluno ainda não recebeu vêm primeiro, sorteadas — antes do corte de 300.
 */
export const questoesReaisDaDisciplina = ({ editalId, provaOrigemId, banca, materiaId, materia, jaUsadas = [] }) => many(
  `SELECT ${COLUNAS_REAIS} FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
   WHERE ${REAIS_VALIDAS}
     AND (($4::text IS NOT NULL AND q.materia_id = $4) OR q.materia ILIKE $5 OR q.topico ILIKE $5)
   ORDER BY (q.id = ANY($6::uuid[])) ASC, random()
   LIMIT 300`,
  [editalId, provaOrigemId || null, banca || null, materiaId || null, `%${escaparLike(materia)}%`, jaUsadas]);
