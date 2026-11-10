/* =========================================================
   HelpConcurso — front-end (SPA sem framework)
   Conversa com a API em /api/v1 (constante API). Estado em S, render() redesenha a tela.
   ========================================================= */
// O código fica em public/js/ (um módulo por área). Este arquivo só carrega os módulos e inicia o app
// (o boot roda aqui, depois que todos os módulos foram avaliados).
import './js/icones.js';
import './js/util.js';
import './js/estado.js';
import './js/render.js';
import './js/auth.js';
import './js/shell.js';
import './js/conta.js';
import './js/planos.js';
import './js/inicio.js';
import './js/hoje.js';
import './js/gerar.js';
import './js/simulado.js';
import './js/cadernos.js';
import './js/bancas.js';
import './js/enviar-provas.js';
import './js/admin.js';
import './js/estrelas.js';
import './js/edital.js';
import './js/desempenho.js';
import './js/modal.js';
import './js/eventos.js';
import './js/sessao.js';
import { S } from './js/estado.js';
import { render } from './js/render.js';
import { enterApp } from './js/sessao.js';
import { api, toast } from './js/util.js';

// ---------- Inicialização ----------
(async function boot() {
  render();
  const q = new URLSearchParams(location.search);
  const acao = q.get('acao');
  if (acao) {
    S.authEmail = q.get('email') || ''; S.authCode = (q.get('codigo') || '').replace(/\D/g, '').slice(0, 6);
    history.replaceState(null, '', location.pathname + location.hash);
    if (acao === 'verificar' && S.authEmail && S.authCode.length === 6) {
      try {
        const r = await api('/auth/verify', { method: 'POST', body: { email: S.authEmail, code: S.authCode } });
        toast('E-mail confirmado. Bem-vindo!'); return await enterApp(r.user);
      } catch (e) { S.authErr = e.message; }
    }
    S.screen = 'auth'; S.auth = acao === 'redefinir' ? 'redefinir' : 'verificar'; render(); return;
  }
  try {
    const { user } = await api('/auth/me');
    if (user && user.emailVerified) return enterApp(user);
    if (user) { S.authEmail = user.email; S.auth = 'verificar'; }
  } catch { /* offline */ }
  S.screen = 'auth'; render();
})();
