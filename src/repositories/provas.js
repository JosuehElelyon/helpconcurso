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

// ---------- Ciclo de vida da prova (envio → checagem → revisão → treino) ----------

const COLUNA = /^[a-z_]+$/;
/** Muda o status e, opcionalmente, outras colunas (nomes vindos do código, nunca do usuário). */
export function definirStatus(id, status, extra = {}) {
  const cols = Object.keys(extra);
  if (cols.some((c) => !COLUNA.test(c))) throw new Error('coluna inválida em definirStatus');
  const sets = cols.map((c, i) => `${c}=$${i + 3}`).join(', ');
  return one(`UPDATE provas SET status=$2${sets ? ', ' + sets : ''}, updated_at=now() WHERE id=$1 RETURNING *`, [id, status, ...Object.values(extra)]);
}

export const definirErro = (id, status, mensagem) =>
  query('UPDATE provas SET status=$2, error=$3, updated_at=now() WHERE id=$1', [id, status, String(mensagem || '').slice(0, 500)]);

export const enviadasNas24h = async (userId) =>
  (await one("SELECT count(*)::int AS n FROM provas WHERE uploaded_by=$1 AND created_at > now() - interval '24 hours'", [userId])).n;

/** Mesmo arquivo já enviado (duplicata exata). */
export const porSha256 = (sha) => one('SELECT id, status, review_note, banca FROM provas WHERE sha256=$1 ORDER BY created_at DESC LIMIT 1', [sha]);

export const inserir = (c) => one(
  `INSERT INTO provas(banca, banca_informada, orgao, cargo, ano, titulo, file_name, file_key, gabarito_name, gabarito_key, sha256, gabarito_sha256,
     text, gabarito_text, needs_ocr, page_count, security, source, uploaded_by, edital_id, status, official_url, oficial_confirmado, official_url_tipo)
   VALUES ($1,$1,NULLIF($2,''),NULLIF($3,''),NULLIF($4,''),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'CHECKING',$20,$21,$22) RETURNING *`,
  [c.banca, c.orgao, c.cargo, c.ano, c.titulo, c.fileName, c.fileKey, c.gabaritoName, c.gabaritoKey, c.sha256, c.gabaritoSha256,
    c.text, c.gabaritoText, c.needsOcr, c.pages, JSON.stringify(c.security), c.source, c.uploadedBy, c.editalId,
    c.officialUrl, c.oficialConfirmado, c.officialUrlTipo]);

/** Outras provas da banca com impressão digital (para achar duplicata por conteúdo). */
export const comImpressaoDigital = (banca, excetoId, status) => many(
  'SELECT id, status, fingerprint, orgao, ano, cargo FROM provas WHERE banca=$1 AND id<>$2 AND fingerprint IS NOT NULL AND status = ANY($3)',
  [banca, excetoId, status]);

/** Prova com nome e e-mail de quem enviou (para o aviso por e-mail). */
export const comAutor = (id) => one('SELECT p.*, u.email, u.name FROM provas p JOIN users u ON u.id=p.uploaded_by WHERE p.id=$1', [id]);

export const buscarPronta = (id) => one("SELECT * FROM provas WHERE id=$1 AND status='READY'", [id]);

export const marcarGabaritoDefinitivo = (id, { url, confirmado, texto }) => query(
  `UPDATE provas SET gabarito_definitivo=true, gabarito_definitivo_url=$2, gabarito_definitivo_confirmado=$3,
     gabarito_text=coalesce($4, gabarito_text), updated_at=now() WHERE id=$1`, [id, url || null, !!confirmado, texto || null]);

// ---------- Questões extraídas (prova_questoes) ----------

export const excluirQuestoes = (provaId) => query('DELETE FROM prova_questoes WHERE prova_id=$1', [provaId]);

export const inserirQuestao = (c) => query(
  `INSERT INTO prova_questoes(prova_id,banca,materia,numero,enunciado,alternativas,gabarito,flagged,topico,materia_id,topico_id,comando,pegadinha_tipo,habilidade,dispositivos,consenso_gabarito,divergencia_gabarito)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
  [c.provaId, c.banca, c.materia || null, c.numero, c.enunciado, JSON.stringify(c.alternativas), c.gabarito || null, c.flagged,
    c.topico, c.materiaId, c.topicoId, c.comando || null, c.pegadinha || null, c.habilidade || null, JSON.stringify(c.dispositivos || []),
    c.consenso === undefined ? null : c.consenso, c.divergencia ? JSON.stringify(c.divergencia) : null]);

export const questoesSemRotulo = (provaId) =>
  many('SELECT id, numero, enunciado FROM prova_questoes WHERE prova_id=$1 AND comando IS NULL AND NOT flagged', [provaId]);

/** Completa os rótulos de uma questão ainda sem rótulo (não mexe em enunciado nem gabarito). */
export const rotularQuestao = (id, c) => query(
  `UPDATE prova_questoes SET topico=$2, materia_id=$3, topico_id=$4, comando=$5, pegadinha_tipo=$6, habilidade=$7, dispositivos=$8
   WHERE id=$1 AND comando IS NULL`,
  [id, c.topico, c.materiaId, c.topicoId, c.comando || null, c.pegadinha || null, c.habilidade || null, JSON.stringify(c.dispositivos || [])]);

/** Provas prontas com questões sem rótulo e sem rotulagem já na fila (opcionalmente só uma). */
export const idsParaRotular = async (provaId = null) => (await many(
  `SELECT DISTINCT q.prova_id AS id FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
   WHERE p.status='READY' AND q.comando IS NULL AND NOT q.flagged AND length(coalesce(p.text, '')) >= 200
     AND ($1::uuid IS NULL OR p.id = $1)
     AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.type='prova.relabel' AND j.status IN ('queued','running')
                     AND j.payload->>'provaId' = p.id::text)`, [provaId])).map((r) => r.id);

export const questoesParaGabarito = (provaId) =>
  many('SELECT id, numero, gabarito, alternativas, anulada FROM prova_questoes WHERE prova_id=$1', [provaId]);

export const anularQuestao = (id, motivo) =>
  query('UPDATE prova_questoes SET anulada=true, motivo_anulacao=$2, gabarito_definitivo=true WHERE id=$1', [id, motivo]);

/** Grava o gabarito definitivo de uma questão; guarda o original na primeira mudança. */
export const definirGabaritoDefinitivo = (id, { gabarito, alteradaPelaBanca, mudou, antes, motivo }) => query(
  `UPDATE prova_questoes SET gabarito=$2, gabarito_alterado=$3, anulada=false,
     gabarito_original = CASE WHEN $4 THEN coalesce(gabarito_original, $5) ELSE gabarito_original END,
     motivo_anulacao=$6, gabarito_definitivo=true, consenso_gabarito=true
   WHERE id=$1`, [id, gabarito, !!alteradaPelaBanca, !!mudou, antes || null, motivo || null]);
