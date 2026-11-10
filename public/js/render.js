// Front do HelpConcurso — Render.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { viewProvas } from './admin.js';
import { bindAuth, viewAuth } from './auth.js';
import { viewBancas } from './bancas.js';
import { viewBanco, viewCaderno } from './cadernos.js';
import { viewConta } from './conta.js';
import { viewDesempenho } from './desempenho.js';
import { viewEdital } from './edital.js';
import { viewContribuir } from './enviar-provas.js';
import { S, isAdmin } from './estado.js';
import { viewEstrelas } from './estrelas.js';
import { bindApp } from './eventos.js';
import { viewGerar } from './gerar.js';
import { viewHome } from './hoje.js';
import { viewModal } from './modal.js';
import { viewPlanos } from './planos.js';
import { viewShell } from './shell.js';
import { viewPratica } from './simulado.js';
import { $ } from './util.js';

// ---------- Render ----------
function render() {
  document.body.classList.toggle('drawer-open', S.drawer);
  const app = $('#app');
  if (S.screen === 'boot') { app.innerHTML = '<div class="progress-box" style="padding-top:30vh"><div class="spinner"></div><div class="hint">Carregando HelpConcurso…</div></div>'; return; }
  if (S.screen === 'auth') { app.innerHTML = viewAuth() + (S.modal ? viewModal() : ''); bindAuth(); return; }
  app.innerHTML = viewShell(viewBody()) + (S.modal ? viewModal() : '');
  bindApp();
}
function viewBody() {
  switch (S.view) {
    case 'gerar': return viewGerar();
    case 'questoes': return viewBanco();
    case 'caderno': return viewCaderno();
    case 'simulado': return viewPratica();
    case 'bancas': return viewBancas();
    case 'provas': return isAdmin() ? viewProvas() : viewHome();
    case 'contribuir': return viewContribuir();
    case 'estrelas': return viewEstrelas();
    case 'edital': return viewEdital();
    case 'desempenho': return viewDesempenho();
    case 'conta': return viewConta();
    case 'planos': return viewPlanos();
    default: return viewHome();
  }
}

export { render, viewBody };
