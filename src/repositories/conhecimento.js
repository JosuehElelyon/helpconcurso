// Repositório do "conhecimento" de uma banca: estilo das provas prontas, questões reais de exemplo e contagens dos rótulos.
// Só SQL, só leitura. Só entram provas READY e questões válidas (questaoValida).
import { many } from '../db.js';
import { questaoValida } from '../lib/questoes-validas.js';

// Prioridade: provas do caderno ($pIds) primeiro, depois as ligadas ao edital por algum aluno (provas_editais)
const DO_EDITAL = (p) => `(EXISTS (SELECT 1 FROM provas_editais pe WHERE pe.prova_id = p.id AND pe.edital_id = ${p}))`;

/** Análises de estilo das provas prontas da banca (até 40). */
export const analisesDaBanca = (banca, editalId, provaIds) => many(
  `SELECT p.id, p.analysis FROM provas p
   WHERE p.banca=$1 AND p.status='READY'
   ORDER BY (p.id = ANY($3::uuid[])) DESC, ${DO_EDITAL('$2')} DESC, p.created_at DESC LIMIT 40`,
  [banca, editalId || null, provaIds]);

const BASE_EXEMPLOS = `SELECT q.id, q.materia, q.enunciado, q.alternativas, q.gabarito,
                         ${DO_EDITAL('$3')} AS from_edital, (p.id = ANY($4::uuid[])) AS from_caderno
                  FROM prova_questoes q JOIN provas p ON p.id=q.prova_id
                  WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')}`;

/** Questões reais da banca na matéria (até 40), em ordem que varia por dia (mesma para todos no dia). */
export const exemplosDaMateria = ({ banca, materia, editalId, provaIds, dia }) => many(
  `${BASE_EXEMPLOS} AND q.materia ILIKE $2 ORDER BY (p.id = ANY($4::uuid[])) DESC, ${DO_EDITAL('$3')} DESC, md5(q.id::text || $5) LIMIT 40`,
  [banca, `%${materia}%`, editalId || null, provaIds, dia]);

/** Questões reais da banca de qualquer matéria, fora as já escolhidas. */
export const exemplosDaBanca = ({ banca, excluirIds, editalId, provaIds, dia, limite = 30 }) => many(
  `${BASE_EXEMPLOS} AND NOT (q.id = ANY($2::uuid[])) ORDER BY (p.id = ANY($4::uuid[])) DESC, ${DO_EDITAL('$3')} DESC, md5(q.id::text || $6) LIMIT $5`,
  [banca, excluirIds, editalId || null, provaIds, limite, dia]);

/** Pegadinhas mais usadas pela banca (na matéria, se informada). */
export const pegadinhasDaBanca = (banca, filtroMateria) => many(
  `SELECT q.pegadinha_tipo AS k, count(*)::int AS n FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
   WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')} AND q.pegadinha_tipo IS NOT NULL AND q.pegadinha_tipo <> 'nenhuma'
     AND ($2::text IS NULL OR q.materia ILIKE $2)
   GROUP BY 1 ORDER BY n DESC, k LIMIT 6`, [banca, filtroMateria]);

/** Comandos de enunciado mais usados pela banca (banca inteira: é estilo). */
export const comandosDaBanca = (banca) => many(
  `SELECT q.comando AS k, count(*)::int AS n FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
   WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')} AND q.comando IS NOT NULL AND q.comando <> 'outro'
   GROUP BY 1 ORDER BY n DESC, k LIMIT 5`, [banca]);

/** Dispositivos legais citados ao menos 2 vezes pela banca (na matéria, se informada). */
export const dispositivosDaBanca = (banca, filtroMateria) => many(
  `SELECT d AS k, count(*)::int AS n FROM prova_questoes q JOIN provas p ON p.id = q.prova_id,
          jsonb_array_elements_text(coalesce(q.dispositivos, '[]'::jsonb)) AS d
   WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')} AND ($2::text IS NULL OR q.materia ILIKE $2)
   GROUP BY 1 HAVING count(*) >= 2 ORDER BY n DESC, k LIMIT 6`, [banca, filtroMateria]);
