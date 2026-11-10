// Front do HelpConcurso — Bancas e estilos (todos).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { ic } from './icones.js';
import { esc } from './util.js';

// ---------- Bancas e estilos (todos) ----------
function viewBancas() {
  return `<h1 class="page-title">Bancas e estilos</h1><p class="page-sub">Como a IA entende cada banca: o perfil base e o que ela aprendeu com as provas anteriores cadastradas.</p>
  <div class="grid">${S.bancas.map((b) => `<div class="card card-pad">
    <div class="row" style="justify-content:space-between"><div class="row"><span class="bdot" style="background:${b.cor}"></span><h3 style="margin:0;font-size:18px">${b.nome}</h3><span class="hint">${esc(b.full)}</span></div>
      <span class="badge ${b.provasTreinadas ? 'brand' : ''}">${b.provasTreinadas} prova(s) · ${b.questoesReais || 0} questões reais</span></div>
    <div class="hint" style="margin:6px 0 10px">${b.formatoLabel} · ${esc(b.provas)}</div>
    <p style="margin:0 0 10px;color:var(--ink-2)">${esc(b.resumo)}</p>
    ${b.estilo.map((s) => `<div class="trait">${ic('check', 'sm')}<span>${esc(s)}</span></div>`).join('')}
    ${b.aprendido.caracteristicas.map((s) => `<div class="trait">${ic('spark', 'sm')}<span>${esc(s)}<span class="learned">aprendido</span></span></div>`).join('')}
    ${b.aprendido.pegadinhas.length ? `<div class="eyebrow" style="margin:14px 0 6px">Pegadinhas observadas</div><div class="chips">${b.aprendido.pegadinhas.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
  </div>`).join('')}</div>`;
}

export { viewBancas };
