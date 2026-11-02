// "Conhecimento" de uma banca = perfil base + estilo agregado das provas + questões reais de exemplo.
// Só entram provas READY e questões que passaram na varredura de segurança (flagged = false).
import { many } from '../db.js';

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
    `SELECT id, edital_id, analysis FROM provas
     WHERE banca=$1 AND status='READY'
     ORDER BY (id = ANY($3::uuid[])) DESC, (edital_id = $2) DESC NULLS LAST, created_at DESC LIMIT 40`,
    [banca, editalId || null, pIds]
  );
  const an = provas.map((p) => p.analysis || {});
  let exemplos = [];
  if (nExemplos > 0) {
    const base = `SELECT q.id, q.materia, q.enunciado, q.alternativas, q.gabarito,
                         (p.edital_id = $3) AS from_edital, (p.id = ANY($4::uuid[])) AS from_caderno
                  FROM prova_questoes q JOIN provas p ON p.id=q.prova_id
                  WHERE q.banca=$1 AND p.status='READY' AND NOT q.flagged`;
    let pool = [];
    if (materia) {
      pool = await many(`${base} AND q.materia ILIKE $2 ORDER BY (p.id = ANY($4::uuid[])) DESC, (p.edital_id = $3) DESC NULLS LAST, random() LIMIT 40`, [banca, `%${materia}%`, editalId || null, pIds]);
    }
    if (pool.length < nExemplos) {
      const ids = pool.map((e) => e.id);
      const extra = await many(`${base} AND NOT (q.id = ANY($2::uuid[])) ORDER BY (p.id = ANY($4::uuid[])) DESC, (p.edital_id = $3) DESC NULLS LAST, random() LIMIT $5`, [banca, ids, editalId || null, pIds, 30]);
      pool = pool.concat(extra);
    }
    const kw = tokenize(`${materia || ''} ${assunto || ''}`);
    if (kw.length || pIds.length) {
      pool.forEach((q) => {
        const textNorm = String(`${q.materia || ''} ${q.enunciado || ''}`).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let hits = 0;
        for (const w of kw) if (textNorm.includes(w)) hits++;
        q._score = (q.from_caderno ? 8 : 0) + (q.from_edital ? 5 : 0) + hits * 2 + Math.random() * 0.5;
      });
      pool.sort((a, b) => (b._score || 0) - (a._score || 0));
    }
    exemplos = pool.slice(0, nExemplos).map(({ id, materia: mat, enunciado, alternativas, gabarito }) => ({ id, materia: mat, enunciado, alternativas, gabarito }));
  }
  return {
    provas: provas.length,
    caracteristicas: tally(an.map((a) => a.caracteristicas), 10),
    padroes: tally(an.map((a) => a.padroes_enunciado), 8),
    pegadinhas: tally(an.map((a) => a.pegadinhas), 8),
    exemplos,
  };
}
