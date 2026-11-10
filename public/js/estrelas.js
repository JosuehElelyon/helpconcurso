// Front do HelpConcurso — Estrelas.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { api, esc, fmtDate, toast } from './util.js';

// ---------- Estrelas ----------
const KIND_LABEL = { prova_aprovada: 'Prova aprovada', erro_confirmado: 'Erro confirmado', avaliacao: 'Avaliação de questão', troca: 'Troca por gerações' };
function viewEstrelas() {
  const st = S.stars;
  if (!st) return '<div class="empty"><span class="spinner sm"></span></div>';
  const lv = st.level, next = lv.proximo;
  const pct = next ? Math.round(((st.total - lv.min) / (next.min - lv.min)) * 100) : 100;
  const canRedeem = Math.floor(st.balance / st.regras.porGeracao);
  return `<h1 class="page-title">Minhas estrelas</h1><p class="page-sub">Você ganha estrelas quando suas contribuições são verificadas e ajudam outros alunos.</p>
  <div class="hero" style="grid-template-columns:1.3fr 1fr">
    <div class="hero-main">
      <div class="eyebrow">Seu nível</div>
      <h2 style="display:flex;align-items:center;gap:10px"><span class="lvl-ic">${lv.icone}</span>${esc(lv.nome)}</h2>
      <p>${st.total} estrela(s) acumulada(s)${next ? ` · faltam ${next.min - st.total} para ${esc(next.nome)}` : ' · nível máximo!'}</p>
      <div class="lvl-bar"><i style="width:${Math.max(3, pct)}%"></i></div>
      <div class="hero-steps">${st.levels.map((l) => `<span style="${l.min <= st.total ? 'color:#fff;border-color:var(--accent)' : ''}">${l.icone} ${esc(l.nome)} · ${l.min}</span>`).join('')}</div>
    </div>
    <div class="card card-pad">
      <div class="eyebrow">Saldo para trocar</div>
      <div style="font-size:40px;font-weight:800;letter-spacing:-.02em;color:var(--ink)">★ ${st.balance}</div>
      <p class="hint" style="margin:4px 0 14px">${st.regras.porGeracao} estrelas = 1 geração extra de simulado. Trocar não diminui seu nível.${st.bonusCredits ? ` Você tem ${st.bonusCredits} geração(ões) extra(s).` : ''}</p>
      <div class="row"><input class="input" id="redeemN" type="number" min="1" max="${Math.max(1, canRedeem)}" value="${Math.max(1, Math.min(1, canRedeem))}" style="width:90px" ${canRedeem ? '' : 'disabled'}>
        <button class="btn btn-primary" id="redeem" ${canRedeem ? '' : 'disabled'}>Trocar por gerações</button></div>
      <p class="hint" style="margin:12px 0 0">Em breve: desconto na mensalidade.</p>
    </div>
  </div>
  <div class="train-grid" style="margin-top:16px">
    <div class="card card-pad"><h3 style="margin:0 0 10px;font-size:16px">Como ganhar estrelas</h3>
      <div class="trait">${ic('upload', 'sm')}<span><b>+${st.regras.provaAprovada}</b> por prova enviada e aprovada na base <button class="link-btn" data-go="contribuir">Enviar provas</button></span></div>
      <div class="trait">${ic('flag', 'sm')}<span><b>+${st.regras.erroConfirmado}</b> por erro reportado e confirmado pela IA</span></div>
      <div class="trait">${ic('thumbUp', 'sm')}<span><b>+${st.regras.avaliacao}</b> por questão avaliada (até ${st.regras.avaliacoesPorDia} por dia)</span></div>
      <p class="hint" style="margin:10px 0 0">Só contam contribuições verificadas: provas recusadas ou duplicadas e reportes não confirmados não dão estrelas.</p></div>
    <div class="card"><div style="padding:16px 18px 8px"><h3 style="margin:0;font-size:16px">Extrato</h3></div>
      ${st.history.length ? st.history.map((h) => `<div class="prova row" style="justify-content:space-between;flex-wrap:nowrap"><div style="min-width:0"><div class="li-title">${esc(h.note || KIND_LABEL[h.kind] || h.kind)}</div><div class="li-meta">${esc(KIND_LABEL[h.kind] || h.kind)} · ${fmtDate(h.created_at)}</div></div><b style="color:${h.stars > 0 ? 'var(--ok)' : 'var(--muted)'}">${h.stars > 0 ? '+' : ''}${h.stars} ★</b></div>`).join('')
        : `<div class="empty" style="padding:24px">${ic('star')}<div>Nenhuma estrela ainda.</div></div>`}</div>
  </div>`;
}
async function refreshStars({ silent = false } = {}) {
  try {
    const prev = S.stars;
    S.stars = await api('/me/estrelas');
    const gained = prev ? S.stars.total - prev.total : 0;
    if (gained > 0 && !silent) celebrate(gained, prev.level.indice !== S.stars.level.indice ? S.stars.level : null);
    else if (S.screen === 'app') render();
  } catch { /* sem estrelas não impede o uso */ }
}
function celebrate(n, newLevel) {
  if (S.screen === 'app' && !S.modal) render();
  const el = document.createElement('div');
  el.className = 'star-pop'; el.textContent = `+${n} ★`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
  const ic2 = document.getElementById('starIc'); if (ic2) { ic2.classList.remove('spin'); void ic2.offsetWidth; ic2.classList.add('spin'); }
  if (newLevel) toast(`${newLevel.icone} Novo nível: ${newLevel.nome}!`);
}
let fbPollT;
async function loadFeedback(setId) {
  try {
    const { feedback } = await api(`/sets/${setId}/feedback`);
    const map = {}; feedback.forEach((f) => { map[f.q] = f; });
    const before = S.feedback[setId] || {};
    S.feedback[setId] = map;
    const newlyConfirmed = feedback.some((f) => f.reportStatus === 'confirmed' && before[f.q]?.reportStatus === 'pending');
    if (newlyConfirmed) { const r = await api(`/sets/${setId}`); S.sets = S.sets.map((x) => (x.id === setId ? r.set : x)); refreshStars(); }
    if (S.view === 'simulado' && S.active === setId && !S.modal && S.reportOpen == null) render();
    clearTimeout(fbPollT);
    if (feedback.some((f) => f.reportStatus === 'pending')) fbPollT = setTimeout(() => { if (S.view === 'simulado' && S.active === setId) loadFeedback(setId); }, 3000);
  } catch { /* opcional */ }
}

export { KIND_LABEL, viewEstrelas, refreshStars, celebrate, fbPollT, loadFeedback };
