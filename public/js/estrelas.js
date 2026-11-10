// Front do HelpConcurso — Estrelas.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { EstrelasPainel } from './components/EstrelasPainel.js';
import { S } from './estado.js';
import { render } from './render.js';
import { $, api, on, toast } from './util.js';

// ---------- Estrelas ----------
const KIND_LABEL = { prova_aprovada: 'Prova aprovada', erro_confirmado: 'Erro confirmado', avaliacao: 'Avaliação de questão', troca: 'Troca por gerações' };
function viewEstrelas() {
  const st = S.stars;
  if (!st) return '<div class="empty"><span class="spinner sm"></span></div>';
  return EstrelasPainel({ stars: st, kindLabels: KIND_LABEL });
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

/** Eventos da tela (estrelas); chamada pela bindApp em eventos.js a cada desenho. */
function ligarEstrelas() {
  on('[data-star-step]', 'click', (e) => {
    const inp = $('#redeemN');
    if (!inp || inp.disabled) return;
    const delta = Number(e.currentTarget.dataset.starStep || 0);
    const max = Math.max(1, Number(inp.max || 1));
    const atual = Number(inp.value || 1);
    inp.value = String(Math.max(1, Math.min(max, atual + delta)));
  });
  on('#redeem', 'click', async () => {
    const n = Math.max(1, parseInt($('#redeemN')?.value || '1', 10));
    try { S.stars = await api('/me/estrelas/trocar', { method: 'POST', body: { geracoes: n } }); toast(`Pronto! +${n} geração(ões) extra(s).`); api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {}); }
    catch (err) { toast(err.message); }
    render();
  });
}

export { KIND_LABEL, viewEstrelas, refreshStars, celebrate, fbPollT, loadFeedback, ligarEstrelas };
