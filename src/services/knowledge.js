// "Conhecimento" de uma banca = perfil base + estilo agregado das provas + questões reais de exemplo.
// Só entram provas READY e questões que passaram na varredura de segurança (flagged = false).
import crypto from 'node:crypto';
import { many } from '../db.js';
import { questaoValida } from '../lib/questoes-validas.js';
import { COMANDOS, PEGADINHAS } from '../lib/cobranca.js';

// Ordem dos exemplos: varia por dia, mas é a mesma para todos os alunos no dia (system estável → cache do provedor)
const diaBR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const desempate = (id, dia) => parseInt(crypto.createHash('md5').update(String(id) + dia).digest('hex').slice(0, 6), 16) / 0xffffff;

const tally = (lists, max) => {
  const m = new Map();
  for (const l of lists) for (const x of l || []) { const k = String(x).trim(); if (k) m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map((e) => e[0]);
};

const STOP = new Set(['para', 'como', 'mais', 'pelo', 'pela', 'seus', 'suas', 'sobre', 'entre', 'apos', 'ante', 'cada', 'qual', 'quais', 'quando', 'onde', 'porque', 'este', 'esta', 'esse', 'essa', 'isso', 'aquilo', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra']);
const tokenize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length >= 4 && !STOP.has(w));

export async function getKnowledge(banca, materia, nExemplos = 6, editalId = null, assunto = '', provaIds = []) {
  const pIds = Array.isArray(provaIds) ? provaIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : [];
  const provas = await many(
    `SELECT p.id, p.analysis FROM provas p
     WHERE p.banca=$1 AND p.status='READY'
     ORDER BY (p.id = ANY($3::uuid[])) DESC, (EXISTS (SELECT 1 FROM provas_editais pe WHERE pe.prova_id = p.id AND pe.edital_id = $2)) DESC, p.created_at DESC LIMIT 40`,
    [banca, editalId || null, pIds]
  );
  const an = provas.map((p) => p.analysis || {});
  let exemplos = [];
  const dia = diaBR();
  if (nExemplos > 0) {
    const base = `SELECT q.id, q.materia, q.enunciado, q.alternativas, q.gabarito,
                         (EXISTS (SELECT 1 FROM provas_editais pe WHERE pe.prova_id = p.id AND pe.edital_id = $3)) AS from_edital, (p.id = ANY($4::uuid[])) AS from_caderno
                  FROM prova_questoes q JOIN provas p ON p.id=q.prova_id
                  WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')}`;
    let pool = [];
    if (materia) {
      pool = await many(`${base} AND q.materia ILIKE $2 ORDER BY (p.id = ANY($4::uuid[])) DESC, (EXISTS (SELECT 1 FROM provas_editais pe WHERE pe.prova_id = p.id AND pe.edital_id = $3)) DESC, md5(q.id::text || $5) LIMIT 40`, [banca, `%${materia}%`, editalId || null, pIds, dia]);
    }
    if (pool.length < nExemplos) {
      const ids = pool.map((e) => e.id);
      const extra = await many(`${base} AND NOT (q.id = ANY($2::uuid[])) ORDER BY (p.id = ANY($4::uuid[])) DESC, (EXISTS (SELECT 1 FROM provas_editais pe WHERE pe.prova_id = p.id AND pe.edital_id = $3)) DESC, md5(q.id::text || $6) LIMIT $5`, [banca, ids, editalId || null, pIds, 30, dia]);
      pool = pool.concat(extra);
    }
    const kw = tokenize(`${materia || ''} ${assunto || ''}`);
    if (kw.length || pIds.length) {
      pool.forEach((q) => {
        const textNorm = String(`${q.materia || ''} ${q.enunciado || ''}`).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let hits = 0;
        for (const w of kw) if (textNorm.includes(w)) hits++;
        q._score = (q.from_caderno ? 8 : 0) + (q.from_edital ? 5 : 0) + hits * 2 + desempate(q.id, dia) * 0.5;
      });
      pool.sort((a, b) => (b._score || 0) - (a._score || 0));
    }
    exemplos = pool.slice(0, nExemplos).map(({ id, materia: mat, enunciado, alternativas, gabarito }) => ({ id, materia: mat, enunciado, alternativas, gabarito }));
  }

  // DNA da banca (Fase 2): como a banca cobra, contado sobre TODAS as questões rotuladas (sem sorteio → o system do prompt
  // fica igual para todos os alunos da banca/matéria e o cache do provedor funciona). Pegadinhas e leis: só da matéria pedida;
  // comandos: da banca inteira (é estilo de enunciado). Códigos do vocabulário fechado viram descrição legível.
  let pegadinhasRotuladas = [];
  let comandosRotulados = [];
  let dispositivosRotulados = [];
  try {
    const filtroMateria = materia ? `%${materia}%` : null;
    const fmt = (rows, vocab) => rows.map((r) => `${vocab ? vocab[r.k] || r.k : r.k} (${r.n} questões)`);
    const [pegs, cmds, disps] = await Promise.all([
      many(`SELECT q.pegadinha_tipo AS k, count(*)::int AS n FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
            WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')} AND q.pegadinha_tipo IS NOT NULL AND q.pegadinha_tipo <> 'nenhuma'
              AND ($2::text IS NULL OR q.materia ILIKE $2)
            GROUP BY 1 ORDER BY n DESC, k LIMIT 6`, [banca, filtroMateria]),
      many(`SELECT q.comando AS k, count(*)::int AS n FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
            WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')} AND q.comando IS NOT NULL AND q.comando <> 'outro'
            GROUP BY 1 ORDER BY n DESC, k LIMIT 5`, [banca]),
      many(`SELECT d AS k, count(*)::int AS n FROM prova_questoes q JOIN provas p ON p.id = q.prova_id,
                   jsonb_array_elements_text(coalesce(q.dispositivos, '[]'::jsonb)) AS d
            WHERE q.banca=$1 AND p.status='READY' AND ${questaoValida('q')} AND ($2::text IS NULL OR q.materia ILIKE $2)
            GROUP BY 1 HAVING count(*) >= 2 ORDER BY n DESC, k LIMIT 6`, [banca, filtroMateria]),
    ]);
    pegadinhasRotuladas = fmt(pegs, PEGADINHAS);
    comandosRotulados = fmt(cmds, COMANDOS);
    dispositivosRotulados = fmt(disps, null);
  } catch (e) {
    console.warn('[conhecimento] DNA da banca indisponível:', e.message);
  }

  return {
    provas: provas.length,
    caracteristicas: tally(an.map((a) => a.caracteristicas), 10),
    padroes: tally(an.map((a) => a.padroes_enunciado), 8),
    pegadinhas: tally(an.map((a) => a.pegadinhas), 8),
    pegadinhasReais: pegadinhasRotuladas,
    comandosReais: comandosRotulados,
    dispositivosReais: dispositivosRotulados,
    exemplos,
  };
}
