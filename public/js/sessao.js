// Front do HelpConcurso — Inicialização.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { refreshCadernos } from './cadernos.js';
import { refreshEditais } from './edital.js';
import { S } from './estado.js';
import { refreshStars } from './estrelas.js';
import { ROUTES, go } from './eventos.js';
import { loadHoje } from './hoje.js';
import { conferirTermos } from './modal.js';
import { render } from './render.js';
import { api, toast } from './util.js';

// ---------- Inicialização ----------
async function enterApp(user) {
  S.user = user; S.screen = 'app';
  const h = location.hash.slice(1); S.view = ROUTES.includes(h) ? h : 'home';
  render();
  try {
    const [b, s] = await Promise.all([api('/bancas'), api('/sets')]);
    Object.assign(S, { bancas: b.bancas, materias: b.materias, niveis: b.niveis, sets: s.sets, loaded: true });
    await Promise.all([refreshStars({ silent: true }), refreshEditais({ silent: true }), refreshCadernos({ silent: true }), loadHoje()]);
    if (['provas', 'contribuir', 'gerar', 'edital', 'metas', 'conta', 'planos', 'estrelas'].includes(S.view)) { go(S.view); return conferirTermos(); }
  } catch (e) { toast(e.message); }
  render();
  conferirTermos();
}

export { enterApp };
