// "Conhecimento" de uma banca = perfil base + estilo agregado das provas + questões reais de exemplo.
// Só entram provas READY e questões que passaram na varredura de segurança (flagged = false).
import { many } from '../db.js';

const tally = (lists, max) => {
  const m = new Map();
  for (const l of lists) for (const x of l || []) { const k = String(x).trim(); if (k) m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map((e) => e[0]);
};

export async function getKnowledge(banca, materia, nExemplos = 6) {
  const provas = await many("SELECT analysis FROM provas WHERE banca=$1 AND status='READY' ORDER BY created_at DESC LIMIT 40", [banca]);
  const an = provas.map((p) => p.analysis || {});
  let exemplos = [];
  if (nExemplos > 0) {
    const base = `SELECT q.id, q.materia, q.enunciado, q.alternativas, q.gabarito FROM prova_questoes q JOIN provas p ON p.id=q.prova_id
                  WHERE q.banca=$1 AND p.status='READY' AND NOT q.flagged`;
    if (materia) exemplos = await many(`${base} AND q.materia ILIKE $2 ORDER BY random() LIMIT $3`, [banca, `%${materia}%`, nExemplos]);
    if (exemplos.length < nExemplos) {
      const ids = exemplos.map((e) => e.id);
      exemplos = exemplos.concat(await many(`${base} AND NOT (q.id = ANY($2::uuid[])) ORDER BY random() LIMIT $3`, [banca, ids, nExemplos - exemplos.length]));
    }
  }
  return {
    provas: provas.length,
    caracteristicas: tally(an.map((a) => a.caracteristicas), 10),
    padroes: tally(an.map((a) => a.padroes_enunciado), 8),
    pegadinhas: tally(an.map((a) => a.pegadinhas), 8),
    exemplos,
  };
}
