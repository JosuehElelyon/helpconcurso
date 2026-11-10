// Front do HelpConcurso — Navegação e eventos.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { ligarAdmin, loadAdmin } from './admin.js';
import { ligarCaderno, ligarCadernos, openCaderno, refreshCadernos } from './cadernos.js';
import { ligarConta, ligarContaEPlanos, loadConta, loadPlanos, showAvatarModal } from './conta.js';
import { ligarDesempenho, loadDesempenho } from './desempenho.js';
import { ligarEdital, refreshEditais } from './edital.js';
import { ligarEnviarProvas } from './enviar-provas.js';
import { S, isAdmin, newWiz } from './estado.js';
import { ligarEstrelas, loadFeedback, refreshStars } from './estrelas.js';
import { ligarGerar } from './gerar.js';
import { avisoAvatarKey, loadHoje } from './hoje.js';
import { ic } from './icones.js';
import { abrirModalTermos, aceitarTermosAgora, confirmarExclusaoConta } from './modal.js';
import { ligarPlanos } from './planos.js';
import { render } from './render.js';
import { ligarSimulado } from './simulado.js';
import { $, api, on, toast } from './util.js';

// ---------- Navegação e eventos ----------
const ROUTES = ['home', 'desempenho', 'gerar', 'edital', 'questoes', 'bancas', 'contribuir', 'estrelas', 'provas', 'conta', 'planos'];
function go(v) {
  S.view = v; S.drawer = false;
  if (ROUTES.includes(v)) { try { if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v); } catch {} }
  if (v === 'desempenho') loadDesempenho(S.desempEditalId);
  if (v === 'provas' && isAdmin()) loadAdmin(S.adminTab === 'monitor').then(() => { if (S.view === 'provas') render(); }).catch((e) => toast(e.message));
  if (v === 'estrelas') refreshStars({ silent: true });
  if (v === 'conta') loadConta();
  if (v === 'home') loadHoje();
  if (v === 'planos') loadPlanos();
  if (v === 'edital') { refreshEditais(); api('/provas/minhas').then((r) => { S.minhas = r.provas; if (S.view === 'edital') render(); }).catch(() => {}); }
  if (v === 'simulado' && S.active) loadFeedback(S.active);
  if (v === 'contribuir') {
    refreshEditais({ silent: true });
    api('/provas/minhas').then((r) => { S.minhas = r.provas; if (S.view === 'contribuir') render(); }).catch(() => {});
  }
  if (v === 'questoes') refreshCadernos({ silent: true }).then(() => { if (S.view === 'questoes') render(); });
  if (v === 'gerar') {
    refreshCadernos({ silent: true });
    api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {});
    api('/provas/minhas').then((r) => { S.minhas = r.provas; }).catch(() => {});
  }
  render(); window.scrollTo({ top: 0 });
}
// Foto de perfil que não carrega volta para as iniciais (a CSP bloqueia onerror inline)
document.addEventListener('error', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLImageElement) || !t.classList.contains('avatar')) return;
  const sp = document.createElement('span'); sp.className = t.className; sp.textContent = t.dataset.ini || '?'; t.replaceWith(sp);
}, true);
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S.screen === 'app' && ROUTES.includes(h) && h !== S.view) go(h); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (S.drawer || S.modal)) { S.drawer = false; S.modal = null; render(); } });

function bindApp() {
  // Eventos comuns a todas as telas; os de cada tela ficam no módulo dela (ligar<Tela>)
  if (S.view === 'conta') ligarConta();
  if (S.view === 'planos') ligarPlanos();
  if (S.view === 'planos' || S.view === 'conta') ligarContaEPlanos();
  if (S.view === 'desempenho') ligarDesempenho();
  on('[data-go]', 'click', (e) => go(e.currentTarget.dataset.go));
  on('[data-radar-filter]', 'click', (e) => {
    S.editalTopicFilter = e.currentTarget.dataset.radarFilter;
    const y = window.scrollY; render(); window.scrollTo({ top: y });
  });
  on('#openMenu', 'click', () => { S.drawer = true; render(); });
  on('[data-close]', 'click', () => { S.drawer = false; render(); });
  on('[data-logout]', 'click', async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); Object.assign(S, { screen: 'auth', auth: 'entrar', user: null, sets: [], cadernos: [], activeCaderno: null, drawer: false, loaded: false }); render(); });
  on('[data-open]', 'click', (e) => { S.active = e.currentTarget.dataset.open; go('simulado'); });
  on('[data-open-caderno]', 'click', (e) => { S.cadernoFeedTab = ''; openCaderno(e.currentTarget.dataset.openCaderno); });
  on('[data-cad-feed-mat]', 'click', (e) => { S.cadernoFeedTab = 'material'; openCaderno(e.currentTarget.dataset.cadFeedMat); });
  on('[data-cad-feed-prova]', 'click', (e) => { S.cadernoFeedTab = 'prova'; openCaderno(e.currentTarget.dataset.cadFeedProva); });
  on('[data-new-caderno-home]', 'click', () => { S.bancoTab = 'cadernos'; S.cadernoNewOpen = true; go('questoes'); });
  on('[data-open-edital]', 'click', async (e) => {
    const id = e.currentTarget.dataset.openEdital;
    try { await api(`/editais/${id}/ativar`, { method: 'POST' }); } catch {}
    go('edital');
  });
  on('[data-bancatile]', 'click', (e) => { if (isAdmin()) { S.provaBanca = e.currentTarget.dataset.bancatile; S.adminTab = 'base'; go('provas'); } else go('bancas'); });
  on('[data-mclose]', 'click', (e) => { if (e.target === e.currentTarget) { S.modal = null; render(); } });
  on('[data-mclose2]', 'click', () => { S.modal = null; render(); });
  on('#btnAceitarTermos', 'click', aceitarTermosAgora);
  on('#exConfirmar', 'click', confirmarExclusaoConta);
  on('[data-open-termos]', 'click', () => abrirModalTermos());
  on('#mOk', 'click', () => { const f = S.modal.fn; S.modal = null; f(); });
  on('#openAvatarModal', 'click', () => showAvatarModal());
  on('#openAvatarModal2', 'click', () => showAvatarModal());
  on('[data-train-topic]', 'click', (e) => {
    const [mat, top] = e.currentTarget.dataset.trainTopic.split('||');
    S.wiz = newWiz();
    if (S.materias.includes(mat)) S.wiz.materia = mat;
    S.wiz.assunto = top.slice(0, 100);
    go('gerar');
    toast(`Envie seu resumo sobre "${top.slice(0, 50)}" para gerar questões focadas!`);
  });
  on('[data-treinar-reais]', 'click', async (e) => {
    const topicoId = e.currentTarget.dataset.treinarReais;
    const ed = S.activeEdital;
    if (!ed) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner sm"></span>';
    try {
      const r = await api(`/editais/${ed.id}/topicos/${topicoId}/praticar-reais`, { method: 'POST', body: { limite: 10 } });
      if (r.set) {
        S.sets.unshift(r.set);
        S.active = r.set.id;
        go('simulado');
        toast(`Simulado com ${r.count} questão(ões) reais da banca: ${r.doTopico} deste tópico${r.daDisciplina ? ` e ${r.daDisciplina} da disciplina (${r.disciplina?.materia || 'mesma matéria'})` : ''}. Custo US$ 0.`);
      }
    } catch (err) {
      toast(err.message);
      btn.disabled = false;
      btn.innerHTML = `${ic('book', 'sm')} Reais`;
    }
  });
  on('[data-hoje-revisar]', 'click', (e) => { S.cadFilter = { ...(S.cadFilter || {}), status: 'revisao_hoje' }; S.cadernoFeedTab = ''; openCaderno(e.currentTarget.dataset.hojeRevisar); });
  on('[data-aviso-avatar]', 'click', (e) => {
    if (e.currentTarget.dataset.avisoAvatar === 'abrir') return showAvatarModal();
    try { localStorage.setItem(avisoAvatarKey(), '1'); } catch { /* modo privado */ }
    render();
  });
  const handleRemoveAvatar = async () => {
    try {
      const res = await api('/me/avatar', { method: 'DELETE' });
      S.conta = res;
      if (S.user) S.user.avatarUrl = null;
      S.modal = null;
      toast('Foto de perfil removida.');
    } catch (e) { toast(e.message); }
    render();
  };
  on('#btnRemoverAvatar', 'click', handleRemoveAvatar);
  on('#btnModalRemoveAvatar', 'click', handleRemoveAvatar);
  on('[data-choose-preset]', 'click', async (e) => {
    const preset = e.currentTarget.dataset.choosePreset;
    try {
      const res = await api('/me/avatar/preset', { method: 'PATCH', body: { preset } });
      S.conta = res;
      if (S.user) S.user.avatarUrl = res.perfil.avatarUrl;
      S.modal = null;
      toast('Avatar selecionado!');
    } catch (err) { toast(err.message); }
    render();
  });
  const sendAvatarFile = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast('A imagem deve ter no máximo 4 MB.');
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type) && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
      return toast('Formato inválido. Envie uma imagem PNG, JPEG, WebP ou GIF.');
    }
    const status = $('#avatarUploadStatus');
    if (status) status.textContent = 'Enviando imagem…';
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api('/me/avatar', { method: 'POST', form: fd });
      S.conta = res;
      if (S.user) S.user.avatarUrl = res.perfil.avatarUrl;
      S.modal = null;
      toast('Foto de perfil atualizada!');
    } catch (err) {
      toast(err.message);
      if (status) status.textContent = 'Falha no envio. Tente novamente.';
    }
    render();
  };
  on('#btnSelectAvatarFile', 'click', () => $('#avatarInput')?.click());
  on('#avatarInput', 'change', (e) => {
    const file = e.target.files?.[0];
    if (file) sendAvatarFile(file);
  });
  const dropZone = $('#avatarDropZone');
  if (dropZone) {
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--brand)'; };
    dropZone.ondragleave = () => { dropZone.style.borderColor = ''; };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      const file = e.dataTransfer?.files?.[0];
      if (file) sendAvatarFile(file);
    };
  }
  const w = S.wiz;
  if (S.view === 'gerar' && w) ligarGerar();
  if (S.view === 'simulado') ligarSimulado();
  if (S.view === 'edital') ligarEdital();
  if (S.view === 'estrelas') ligarEstrelas();
  if (S.view === 'questoes') ligarCadernos();
  if (S.view === 'caderno' && S.activeCaderno) ligarCaderno();
  if (S.view === 'contribuir') ligarEnviarProvas();
  if (S.view === 'provas' && isAdmin()) ligarAdmin();
}

export { ROUTES, go, bindApp };
