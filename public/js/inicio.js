// Front do HelpConcurso — Home.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';

// ---------- Home ----------
// Placar de um simulado: questão anulada pela banca não conta (nem no total, nem em acerto/erro)
function placar(s) {
  const r = s.respostas || {}, qs = s.questoes || [];
  let n = 0, resp = 0, ac = 0;
  qs.forEach((q, i) => { if (q.anulada) return; n++; if (r[i] != null) { resp++; if (r[i] === q.gabarito) ac++; } });
  return { n, resp, ac, er: resp - ac, anuladas: qs.length - n };
}
function stats() {
  const qs = S.sets.reduce((a, s) => a + (s.questoes || []).length, 0);
  let resp = 0, ac = 0;
  S.sets.forEach((s) => { const p = placar(s); resp += p.resp; ac += p.ac; });
  return { qs, feitos: S.sets.filter((s) => s.finalizado).length, taxa: resp ? Math.round((ac / resp) * 100) + '%' : '—', provas: S.bancas.reduce((a, b) => a + (b.provasTreinadas || 0), 0) };
}

export { placar, stats };
