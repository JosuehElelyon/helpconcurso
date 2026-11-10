// Front do HelpConcurso — Navegação e eventos.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { loadAdmin, reviewHtml, schedulePoll } from './admin.js';
import { openCaderno, refreshCadernos } from './cadernos.js';
import { brl, loadConta, loadPlanos, showAvatarModal } from './conta.js';
import { loadDesempenho } from './desempenho.js';
import { refreshEditais } from './edital.js';
import { S, isAdmin, newWiz } from './estado.js';
import { loadFeedback, refreshStars } from './estrelas.js';
import { dispararRevanche, generate, modoProvaTimer, uploadMaterial } from './gerar.js';
import { avisoAvatarKey, loadHoje } from './hoje.js';
import { ic } from './icones.js';
import { placar } from './inicio.js';
import { abrirModalTermos, aceitarTermosAgora, confirmBox, confirmarExclusaoConta } from './modal.js';
import { render } from './render.js';
import { saveSetSoon, saveT, setText } from './simulado.js';
import { $, API, API_ORIGEM, LETRAS, api, esc, renderAvatar, toast } from './util.js';

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
  const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  if (S.view === 'conta') {
    const cf = $('#contaForm');
    if (cf) cf.onsubmit = async (ev) => {
      ev.preventDefault();
      const body = { name: $('#cNome').value.trim(), telefone: $('#cTel').value.trim(), concursoAlvo: $('#cAlvo').value.trim(), bancaPreferida: $('#cBanca').value, dataProva: $('#cData').value, metaDiaria: $('#cMeta').value ? Number($('#cMeta').value) : null };
      S.contaBusy = true; render();
      try { S.conta = await api('/me/conta', { method: 'PATCH', body }); Object.assign(S.user, { name: S.conta.perfil.name }); toast('Dados salvos.'); }
      catch (e) { toast(e.message); }
      S.contaBusy = false; render();
    };
    const sf = $('#senhaForm');
    if (sf) sf.onsubmit = async (ev) => {
      ev.preventDefault();
      const senhaAtual = $('#sAtual').value, novaSenha = $('#sNova').value;
      if (novaSenha.length < 8) return toast('A nova senha precisa ter ao menos 8 caracteres.');
      try { await api('/me/conta/senha', { method: 'POST', body: { senhaAtual, novaSenha } }); toast('Senha alterada.'); $('#sAtual').value = ''; $('#sNova').value = ''; }
      catch (e) { toast(e.message); }
    };
    on('#btnExportarDados', 'click', async () => {
      try {
        const r = await fetch(API + '/me/exportar', { credentials: API_ORIGEM ? 'include' : 'same-origin' });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível gerar o arquivo.');
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement('a');
        a.href = url; a.download = `helpconcurso-meus-dados-${new Date().toISOString().slice(0, 10)}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (e) { toast(e.message); }
    });
    on('#btnExcluirConta', 'click', () => {
      S.modal = {
        title: 'Excluir minha conta',
        html: `<p>Isto apaga de vez sua conta, materiais, editais, simulados, cadernos e histórico. <b>Não tem volta.</b> Provas que você enviou continuam na base compartilhada, sem o seu nome.</p>
          <p class="hint">Se quiser guardar uma cópia, use antes "Baixar meus dados".</p>
          <div class="field"><label for="exSenha">Sua senha</label><input class="input" id="exSenha" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="exConf">Digite EXCLUIR para confirmar</label><input class="input" id="exConf" autocomplete="off"></div>
          <div class="row" style="justify-content:flex-end;gap:8px"><button type="button" class="btn btn-ghost" data-mclose2>Cancelar</button><button type="button" class="btn btn-primary danger-soft" id="exConfirmar">Excluir definitivamente</button></div>`,
      };
      render();
    });
  }
  if (S.view === 'planos') {
    on('[data-periodo]', 'click', (e) => { S.planoPeriodo = e.currentTarget.dataset.periodo; render(); });
    on('[data-upgrade]', 'click', (e) => {
      const p = S.planosData.planos.find((x) => x.id === e.currentTarget.dataset.upgrade);
      const anual = S.planoPeriodo === 'anual';
      S.modal = {
        title: `Plano ${p.nome} · ${anual ? 'anual' : 'mensal'}`,
        html: `<p style="margin-top:0">Valor: <b>${brl(anual ? p.precoAnual : p.precoMensal)}</b> ${anual ? 'por ano' : 'por mês'}.</p>
          <div class="banner info">${ic('info', 'sm')}<div>Ao confirmar, nossa equipe recebe o seu pedido e envia as instruções de pagamento para <b>${esc(S.user.email)}</b>. O plano é ativado assim que o pagamento for confirmado.</div></div>
          <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-ghost" data-mclose2>Voltar</button><button class="btn btn-primary" id="confirmUpgrade" data-plano="${p.id}">${ic('check', 'sm')} Confirmar pedido</button></div>`,
      };
      render();
    });
  }
  if (S.view === 'planos' || S.view === 'conta') {
    on('#confirmUpgrade', 'click', async (e) => {
      const plano = e.currentTarget.dataset.plano;
      try {
        const r = await api('/me/conta/upgrade', { method: 'POST', body: { plano, periodicidade: S.planoPeriodo } });
        S.conta = r.conta; S.modal = null;
        toast('Pedido enviado! Você vai receber as instruções de pagamento por e-mail.');
      } catch (err) { toast(err.message); }
      render();
    });
    on('#cancelPedido', 'click', async () => {
      try { S.conta = await api('/me/conta/upgrade', { method: 'DELETE' }); toast('Pedido cancelado.'); } catch (err) { toast(err.message); }
      render();
    });
  }
  if (S.view === 'desempenho') {
    on('#btnRefreshDesemp', 'click', () => loadDesempenho(S.desempEditalId));
    on('#selDesempEdital', 'change', (e) => {
      S.desempEditalId = e.target.value;
      loadDesempenho(S.desempEditalId);
    });
  }
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

  // ---------- Avatar (upload, presets e remoção) ----------
  on('#openAvatarModal', 'click', () => showAvatarModal());
  on('#openAvatarModal2', 'click', () => showAvatarModal());
  // Tópicos do edital (painel do edital e tela "Hoje")
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
  if (S.view === 'gerar' && w) {
    const fi = $('#fileIn'), drop = $('#drop');
    const send = (file) => { const fd = new FormData(); fd.append('file', file); uploadMaterial(fd); };
    if (fi) fi.onchange = () => fi.files[0] && send(fi.files[0]);
    if (drop) {
      ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) send(f); });
    }
    const wes = $('#wizEditalSel');
    if (wes) wes.onchange = async () => {
      w.editalId = wes.value;
      const chosen = (S.editais || []).find((x) => x.id === w.editalId);
      if (chosen?.banca && S.bancas.some((b) => b.id === chosen.banca)) w.banca = chosen.banca;
      if (w.material) {
        w.uploading = true; render();
        try { const r = await api(`/materials/${w.material.id}/edital`, { method: 'POST', body: { editalId: w.editalId } }); w.material = r.material; refreshEditais({ silent: true }); }
        catch (e) { toast(e.message); }
        w.uploading = false;
      }
      render();
    };
    on('#wizToggleEditalUp', 'click', () => { w.showEditalUpload = !w.showEditalUpload; render(); });
    const wef = $('#wizEditalFile');
    if (wef) wef.onchange = async () => {
      const f = wef.files[0]; if (!f) return;
      const bancaIn = $('#wizEdBanca')?.value || w.banca || '';
      const provaIn = $('#wizEdProva')?.value || '';
      w.editalBusy = true; w.showEditalUpload = false; render();
      try {
        const fd = new FormData(); fd.append('file', f);
        if (bancaIn) fd.append('banca', bancaIn);
        if (provaIn) fd.append('provaId', provaIn);
        const r = await api('/editais', { method: 'POST', form: fd });
        await refreshEditais({ silent: true });
        w.editalId = r.edital.id;
        if (r.edital.banca && S.bancas.some((b) => b.id === r.edital.banca)) w.banca = r.edital.banca;
        if (w.material) {
          const rm = await api(`/materials/${w.material.id}/edital`, { method: 'POST', body: { editalId: w.editalId } });
          w.material = rm.material;
        }
        toast(`Edital "${r.edital.titulo}" verticalizado (${r.edital.resumo.totalTopicos} tópicos)!`);
      } catch (e) { toast(e.message); }
      w.editalBusy = false; render();
    };
    on('#modePaste', 'click', () => { w.mode = 'paste'; w.err = ''; render(); });
    on('#modeFile', 'click', () => { w.mode = 'file'; render(); });
    on('#usePaste', 'click', () => uploadMaterial({ text: $('#pasteIn').value || '' }));
    on('#resetFile', 'click', () => { S.wiz = newWiz(); render(); });
    on('[data-step]', 'click', (e) => { w.step = +e.currentTarget.dataset.step; w.genErr = ''; render(); });
    const ms = $('#matSel'); if (ms) ms.onchange = () => { w.materia = ms.value; };
    const ai = $('#assIn'); if (ai) ai.oninput = () => { w.assunto = ai.value.trim(); };
    on('#toStep3', 'click', () => { if (!w.materia) return toast('Selecione a matéria do material.'); w.step = 3; render(); });
    on('[data-banca]', 'click', (e) => {
      w.banca = e.currentTarget.dataset.banca;
      if (!w.cadernoId) {
        const matchCad = (S.cadernos || []).find((c) => c.banca === w.banca && (!w.editalId || c.editalId === w.editalId));
        if (matchCad) w.cadernoId = matchCad.id;
      }
      render();
    });
    const wcs = $('#wizCadSel'); if (wcs) wcs.onchange = () => { w.cadernoId = wcs.value; };
    on('[data-qtd]', 'click', (e) => { w.qtd = +e.currentTarget.dataset.qtd; render(); });
    on('[data-nivel]', 'click', (e) => { w.nivel = e.currentTarget.dataset.nivel; render(); });
    on('#gen', 'click', () => { if (!w.generating) generate(); });
  }
  if (S.view === 'simulado') {
    const s = S.sets.find((x) => x.id === S.active);
    on('[data-rate]', 'click', async (e) => {
      const [i, v] = e.currentTarget.dataset.rate.split(':').map(Number);
      const cur = (S.feedback[s.id] || {})[i] || {};
      const rating = cur.rating === v ? 0 : v;
      S.feedback[s.id] = { ...(S.feedback[s.id] || {}), [i]: { ...cur, q: i, rating: rating || null } };
      const y = window.scrollY; render(); window.scrollTo({ top: y });
      try { const r = await api(`/sets/${s.id}/questoes/${i}/avaliar`, { method: 'POST', body: { rating } }); if (r.stars) refreshStars(); }
      catch (err) { toast(err.message); }
    });
    on('[data-repopen]', 'click', (e) => { S.reportOpen = +e.currentTarget.dataset.repopen; const y = window.scrollY; render(); window.scrollTo({ top: y }); const t = $(`#rep${S.reportOpen}`); t && t.focus(); });
    on('[data-repcancel]', 'click', () => { S.reportOpen = null; const y = window.scrollY; render(); window.scrollTo({ top: y }); });
    on('[data-repsend]', 'click', async (e) => {
      const i = +e.currentTarget.dataset.repsend, motivo = ($(`#rep${i}`)?.value || '').trim();
      if (motivo.length < 5) return toast('Explique em poucas palavras qual é o erro.');
      e.currentTarget.disabled = true;
      try {
        const r = await api(`/sets/${s.id}/questoes/${i}/reportar`, { method: 'POST', body: { motivo } });
        S.feedback[s.id] = { ...(S.feedback[s.id] || {}), [i]: r.feedback }; S.reportOpen = null;
        toast('Recebido! A IA vai verificar e você ganha estrelas se o erro for confirmado.');
        loadFeedback(s.id);
      } catch (err) { toast(err.message); e.currentTarget.disabled = false; return; }
      const y = window.scrollY; render(); window.scrollTo({ top: y });
    });
    on('[data-ans]', 'click', (e) => {
      const [i, L] = e.currentTarget.dataset.ans.split(':');
      if (s.modoProva && !s.finalizado && s.formato === 'ce' && s.respostas?.[i] === L) {
        delete s.respostas[i];
      } else {
        s.respostas = { ...(s.respostas || {}), [i]: L };
      }
      const y = window.scrollY; render(); window.scrollTo({ top: y });
      saveSetSoon(s, { respostas: s.respostas, tempoGastoSegundos: s.tempoGastoSegundos });
    });
    on('[data-clear-ans]', 'click', (e) => {
      const i = e.currentTarget.dataset.clearAns;
      if (s.respostas) delete s.respostas[i];
      const y = window.scrollY; render(); window.scrollTo({ top: y });
      saveSetSoon(s, { respostas: s.respostas, tempoGastoSegundos: s.tempoGastoSegundos });
    });
    on('[data-toggle-duvida]', 'click', (e) => {
      const idx = Number(e.currentTarget.dataset.toggleDuvida);
      const duv = new Set(s.duvidas || []);
      if (duv.has(idx)) duv.delete(idx);
      else duv.add(idx);
      s.duvidas = Array.from(duv);
      const y = window.scrollY; render(); window.scrollTo({ top: y });
      saveSetSoon(s, { duvidas: s.duvidas, tempoGastoSegundos: s.tempoGastoSegundos });
    });
    on('#toggleNavGrid', 'click', () => {
      S.navGridOpen = !S.navGridOpen;
      const card = $('#navGridCard');
      if (card) card.style.display = S.navGridOpen ? 'block' : 'none';
    });
    on('[data-goto-q]', 'click', (e) => {
      const idx = e.currentTarget.dataset.gotoQ;
      const el = $(`#q${idx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    on('#finishProva', 'click', () => {
      const { n, resp } = placar(s);
      const duvCount = (s.duvidas || []).length;
      const ce = s.formato === 'ce';
      const msg = `Você respondeu ${resp} de ${n} questões.${duvCount ? ` Restam ${duvCount} marcada(s) como dúvida.` : ''}${ce ? ' No estilo CEBRASPE, cada erro desconta 1 acerto. Deixar em branco não desconta nem pontua.' : ''} Deseja entregar sua prova agora?`;
      confirmBox('Entregar Prova Real?', msg, 'Entregar agora', false, async () => {
        s.finalizado = true;
        if (modoProvaTimer) clearInterval(modoProvaTimer);
        try {
          const r = await api(`/sets/${s.id}`, {
            method: 'PATCH',
            body: {
              respostas: s.respostas || {},
              finalizado: true,
              tempoGastoSegundos: s.tempoGastoSegundos || 0,
              duvidas: s.duvidas || [],
            },
          });
          Object.assign(s, r.set);
          render();
          window.scrollTo({ top: 0 });
          toast('Prova entregue com sucesso! Confira seu resultado oficial.');
        } catch (err) {
          toast(err.message || 'Erro ao finalizar a prova.');
        }
      });
    });
    on('[data-pq-errei]', 'click', async (e) => {
      const idx = e.currentTarget.dataset.pqErrei;
      const key = `set:${s.id}:${idx}`;
      S.explicacoes = S.explicacoes || {};
      S.explicacaoLoading = S.explicacaoLoading || {};
      if (S.explicacoes[key]) return;
      S.explicacaoLoading[key] = true;
      const y = window.scrollY; render(); window.scrollTo({ top: y });
      try {
        const resp = s.respostas?.[idx];
        const res = await api(`/sets/${s.id}/questoes/${idx}/por-que-errei`, {
          method: 'POST',
          body: { resposta: resp },
        });
        S.explicacoes[key] = res;
      } catch (err) {
        toast(err.message || 'Não foi possível gerar a explicação.');
      } finally {
        S.explicacaoLoading[key] = false;
        const y2 = window.scrollY; render(); window.scrollTo({ top: y2 });
      }
    });
    on('#btnRevancheSimulado', 'click', () => {
      dispararRevanche({ setId: s.id });
    });
    on('[data-revanche-q-idx]', 'click', (e) => {
      const idx = Number(e.currentTarget.dataset.revancheQIdx);
      dispararRevanche({ setId: s.id, indices: [idx] });
    });
    on('.btn-revanche-card', 'click', () => {
      dispararRevanche({ setId: s.id });
    });
    on('#copySet', 'click', async () => { try { await navigator.clipboard.writeText(setText(s)); toast('Questões copiadas com o gabarito'); } catch { toast('Não foi possível copiar'); } });
    on('#printSet', 'click', () => window.print());
    on('#delSet', 'click', () => confirmBox('Excluir simulado?', 'As questões deste simulado serão removidas.', 'Excluir', true, async () => { await api(`/sets/${s.id}`, { method: 'DELETE' }).catch(() => {}); S.sets = S.sets.filter((x) => x.id !== s.id); go('questoes'); toast('Simulado excluído'); }));
    on('#resetSet', 'click', () => confirmBox('Refazer simulado?', 'Suas respostas serão apagadas para você resolver de novo.', 'Refazer', false, () => { s.respostas = {}; s.finalizado = false; api(`/sets/${s.id}`, { method: 'PATCH', body: { respostas: {}, finalizado: false } }).catch(() => {}); render(); window.scrollTo({ top: 0 }); }));
    on('#finish', 'click', () => {
      const r = s.respostas || {}, { n, resp, ac } = placar(s);
      const fin = () => { s.finalizado = true; clearTimeout(saveT); api(`/sets/${s.id}`, { method: 'PATCH', body: { respostas: r, finalizado: true } }).catch(() => {}); render(); toast(`Resultado: ${ac} de ${n} (${Math.round((ac / Math.max(1, n)) * 100)}%)${s.formato === 'ce' ? ` · nota líquida ${ac - (resp - ac)}` : ''}`); };
      if (resp < n && !s.finalizado && s.formato !== 'ce') confirmBox('Finalizar com questões em branco?', `Você respondeu ${resp} de ${n}. As demais contam como erro.`, 'Finalizar', false, fin); else fin();
    });
  }
  if (S.view === 'edital') {
    const efm = S.edForm || (S.edForm = { banca: '', orgao: '', cargo: '', ano: '', provaId: '' });
    on('[data-edb]', 'click', (e) => { efm.banca = e.currentTarget.dataset.edb; render(); });
    ['Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#ed' + k); if (el) el.oninput = () => { efm[k.toLowerCase()] = el.value; }; });
    const eps = $('#edProvaSel');
    if (eps) eps.onchange = () => { efm.provaId = eps.value; };
    const submitEdital = async (payload) => {
      if (efm.ano && !/^\d{4}$/.test(efm.ano)) return toast('Ano inválido.');
      S.editalUploading = true; S.editalErr = ''; render();
      try {
        if (payload instanceof FormData) {
          if (efm.banca) payload.append('banca', efm.banca);
          if (efm.orgao) payload.append('orgao', efm.orgao);
          if (efm.cargo) payload.append('cargo', efm.cargo);
          if (efm.ano) payload.append('ano', efm.ano);
          if (efm.provaId) payload.append('provaId', efm.provaId);
          if (efm.link) payload.append('officialUrl', efm.link);
        } else if (payload && typeof payload === 'object') {
          Object.assign(payload, { banca: efm.banca, orgao: efm.orgao, cargo: efm.cargo, ano: efm.ano, provaId: efm.provaId, officialUrl: efm.link || '' });
        }
        const r = payload instanceof FormData ? await api('/editais', { method: 'POST', form: payload }) : await api('/editais', { method: 'POST', body: payload });
        S.editalShowForm = false; S.edForm = null;
        await refreshEditais({ silent: true });
        const avisoLink = (r.warnings || []).find((w) => /link/i.test(w));
        toast(`Edital verticalizado: ${r.edital.resumo.totalDisciplinas} disciplinas e ${r.edital.resumo.totalTopicos} tópicos!${r.edital.oficialConfirmado ? ' Baixado da fonte oficial ✔' : ''}${avisoLink ? ' ' + avisoLink : ''}`);
      } catch (e) { S.editalErr = e.message; }
      S.editalUploading = false; render();
    };
    const ef = $('#edFileIn'), edDrop = $('#edDrop');
    if (ef) ef.onchange = () => { if (ef.files[0]) { const fd = new FormData(); fd.append('file', ef.files[0]); submitEdital(fd); } };
    if (edDrop) {
      ['dragenter', 'dragover'].forEach((t) => edDrop.addEventListener(t, (e) => { e.preventDefault(); edDrop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => edDrop.addEventListener(t, (e) => { e.preventDefault(); edDrop.classList.remove('over'); }));
      edDrop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) { const fd = new FormData(); fd.append('file', f); submitEdital(fd); } });
    }
    on('#edModePaste', 'click', () => { S.editalMode = 'paste'; S.editalErr = ''; render(); });
    on('#edModeFile', 'click', () => { S.editalMode = 'file'; render(); });
    on('#edUsePaste', 'click', () => submitEdital({ text: $('#edPasteIn')?.value || '' }));
    const edl = $('#edLink'); if (edl) edl.oninput = () => { efm.link = edl.value.trim(); };
    on('#edImportLink', 'click', () => (efm.link ? submitEdital({ text: '' }) : toast('Cole o link direto do edital no site oficial.')));
    on('#edNewBtn', 'click', () => { S.editalShowForm = true; S.editalErr = ''; render(); });
    on('#edCancelForm', 'click', () => { S.editalShowForm = false; S.editalErr = ''; render(); });
    on('#edSendProva', 'click', () => {
      const ed = S.activeEdital;
      S.cform = { banca: ed?.banca && S.bancas.some((b) => b.id === ed.banca) ? ed.banca : '', orgao: ed?.orgao || '', cargo: ed?.cargo || '', ano: ed?.ano || '', files: [], gabarito: null, editalId: ed?.id || '', editalFile: null };
      go('contribuir');
    });
    const sw = $('#edSwitch');
    if (sw) sw.onchange = async () => {
      try { const r = await api(`/editais/${sw.value}/ativar`, { method: 'POST' }); S.activeEdital = r.edital; await refreshEditais({ silent: true }); render(); }
      catch (e) { toast(e.message); }
    };
    on('#edDelBtn', 'click', () => {
      const ed = S.activeEdital; if (!ed) return;
      confirmBox('Remover este edital?', `O edital "${ed.titulo}" será excluído. Seus materiais e simulados continuam salvos.`, 'Remover', true, async () => {
        await api(`/editais/${ed.id}`, { method: 'DELETE' }).catch(() => {});
        await refreshEditais();
        toast('Edital removido');
      });
    });
    on('#btnSimuladoProvaReal', 'click', () => {
      const ed = S.activeEdital;
      if (!ed) return;
      const vert = ed.disciplinas || ed.verticalizado || [];
      // Usa o modal do app (S.modal); antes chamava modal()/closeModal(), que não existiam — o botão não abria nada
      S.modal = { title: 'Simulado no Formato da Prova Real', html: `
        <div style="margin-bottom:14px">
          <p style="margin:0 0 12px;font-size:14px">Simule as condições reais do seu concurso com questões oficiais da banca distribuídas conforme o peso das disciplinas do edital.</p>
          <div class="field" style="margin-bottom:12px">
            <label for="prQtdTotal">Quantidade total de questões</label>
            <select class="select" id="prQtdTotal">
              <option value="20">20 questões (Simulado rápido)</option>
              <option value="30" selected>30 questões (Padrão)</option>
              <option value="50">50 questões (Simulado intermediário)</option>
              <option value="70">70 questões (Simulado extenso)</option>
              <option value="100">100 questões (Prova completa)</option>
              <option value="120">120 questões (Padrão CEBRASPE)</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:12px">
            <label for="prTempoMin">Tempo de prova (Cronômetro regressivo)</label>
            <select class="select" id="prTempoMin">
              <option value="60">1 hora (60 minutos)</option>
              <option value="90">1 hora e 30 minutos (90 minutos)</option>
              <option value="120" selected>2 horas (120 minutos)</option>
              <option value="180">3 horas (180 minutos)</option>
              <option value="210">3 horas e 30 minutos (210 minutos)</option>
              <option value="240">4 horas (240 minutos)</option>
              <option value="0">Sem limite de tempo (Livre)</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:6px">
            <label>Disciplinas verticalizadas do edital</label>
            <div style="max-height:120px;overflow-y:auto;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);font-size:13px">
              ${vert.map((d) => `<div>• <b>${esc(d.materia)}</b> <span class="hint">(peso ${Number(d.peso) || 1})</span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="row" style="justify-content:flex-end;gap:8px">
          <button type="button" class="btn btn-ghost" data-mclose2>Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnIniciarProvaReal">${ic('timer', 'sm')} Iniciar Prova Real</button>
        </div>
      ` };
      render();
    });
    // Ligado aqui (e não dentro do clique acima) para continuar funcionando depois de qualquer redesenho
    on('#btnIniciarProvaReal', 'click', async (e) => {
      const ed = S.activeEdital;
      const btn = e.currentTarget;
      if (!ed) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner sm"></span> Montando prova...';
      try {
        // "0" = sem limite de tempo; por isso não usa "|| 120" no tempo
        const qtdTotal = Number($('#prQtdTotal')?.value) || 30;
        const tempoMinutos = Number($('#prTempoMin')?.value ?? 120);
        const res = await api(`/editais/${ed.id}/simulado-prova-real`, { method: 'POST', body: { qtdTotal, tempoMinutos } });
        S.modal = null;
        S.sets.unshift(res.set);
        S.active = res.set.id;
        go('simulado');
        toast(`Simulado Prova Real iniciado (${res.count} questões). Boa prova!`);
      } catch (err) {
        toast(err.message || 'Não foi possível gerar a prova real.');
        btn.disabled = false;
        btn.textContent = 'Iniciar Prova Real';
      }
    });
  }
  if (S.view === 'estrelas') {
    on('#redeem', 'click', async () => {
      const n = Math.max(1, parseInt($('#redeemN')?.value || '1', 10));
      try { S.stars = await api('/me/estrelas/trocar', { method: 'POST', body: { geracoes: n } }); toast(`Pronto! +${n} geração(ões) extra(s).`); api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {}); }
      catch (err) { toast(err.message); }
      render();
    });
  }
  if (S.view === 'questoes') {
    const fb = $('#fBanca'), fm = $('#fMat');
    if (fb) fb.onchange = () => { S.filter.banca = fb.value; render(); };
    if (fm) fm.onchange = () => { S.filter.materia = fm.value; render(); };
    on('[data-btab]', 'click', (e) => { S.bancoTab = e.currentTarget.dataset.btab; render(); });
    on('#btnToggleNewCad', 'click', () => { S.cadernoNewOpen = !S.cadernoNewOpen; S.bancoTab = 'cadernos'; render(); });
    on('#btnCancelNewCad', 'click', () => { S.cadernoNewOpen = false; render(); });
    const cf = S.cadForm || (S.cadForm = { banca: 'cebraspe', editalId: '', orgao: '', cargo: '', ano: '', titulo: '', descricao: '', importarExistentes: true });
    on('[data-cad-banca]', 'click', (e) => { cf.banca = e.currentTarget.dataset.cadBanca; render(); });
    const ces = $('#cadEditalSel');
    if (ces) ces.onchange = () => {
      cf.editalId = ces.value;
      const ed = (S.editais || []).find((x) => x.id === cf.editalId);
      if (ed) {
        if (ed.banca && S.bancas.some((b) => b.id === ed.banca)) cf.banca = ed.banca;
        if (ed.orgao && !cf.orgao) cf.orgao = ed.orgao;
        if (ed.cargo && !cf.cargo) cf.cargo = ed.cargo;
        if (ed.ano && !cf.ano) cf.ano = ed.ano;
      }
      render();
    };
    ['Titulo', 'Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#cad' + k); if (el) el.oninput = () => { cf[k.toLowerCase()] = el.value; }; });
    const cim = $('#cadImportar'); if (cim) cim.onchange = () => { cf.importarExistentes = cim.checked; };
    const ncf = $('#newCadForm');
    if (ncf) ncf.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!cf.banca) return toast('Escolha a banca do caderno.');
      if (cf.ano && !/^\d{4}$/.test(cf.ano)) return toast('Ano inválido.');
      S.cadernoBusy = true; render();
      try {
        const r = await api('/cadernos', { method: 'POST', body: cf });
        S.cadernoNewOpen = false; S.cadForm = null;
        S.activeCaderno = r.caderno;
        await refreshCadernos({ silent: true });
        S.view = 'caderno';
        toast(`Caderno "${r.caderno.titulo}" criado com ${r.caderno.totalQuestoes} questão(ões)!`);
      } catch (err) { toast(err.message); }
      S.cadernoBusy = false; render();
    };
    on('[data-revanche]', 'click', (e) => {
      const [mat, top, b] = e.currentTarget.dataset.revanche.split('||');
      S.wiz = newWiz();
      if (S.materias.includes(mat)) S.wiz.materia = mat;
      if (top) S.wiz.assunto = top.slice(0, 100);
      if (b && S.bancas.some((x) => x.id === b)) S.wiz.banca = b;
      go('gerar');
      toast(`Envie seu resumo de ${mat}${top ? ` (${top.slice(0, 40)})` : ''} para gerar uma bateria de revanche!`);
    });
  }
  if (S.view === 'caderno' && S.activeCaderno) {
    const c = S.activeCaderno;
    on('[data-cad-ftab]', 'click', (e) => { S.cadernoFeedTab = e.currentTarget.dataset.cadFtab; render(); });
    on('#printCaderno', 'click', () => window.print());
    on('#delCaderno', 'click', () => confirmBox('Excluir este Caderno de Questões?', `O caderno "${c.titulo}" será removido. Seus materiais, provas e baterias avulsas continuam salvos.`, 'Excluir', true, async () => {
      await api(`/cadernos/${c.id}`, { method: 'DELETE' }).catch(() => {});
      S.activeCaderno = null;
      await refreshCadernos({ silent: true });
      go('questoes');
      toast('Caderno excluído');
    }));
    on('#cadGoWizNewMat', 'click', () => {
      S.wiz = newWiz();
      S.wiz.cadernoId = c.id;
      S.wiz.banca = c.banca;
      if (c.editalId) S.wiz.editalId = c.editalId;
      go('gerar');
      toast(`Envie seu conteúdo para gerar novas questões direto no caderno "${c.titulo}"!`);
    });
    const useExistingMat = async (matId) => {
      if (!matId) return toast('Selecione um material.');
      S.cadFeedBusy = true; render();
      try {
        const r = await api(`/cadernos/${c.id}/alimentar-material`, { method: 'POST', body: { materialId: matId } });
        S.activeCaderno = r.caderno;
        S.wiz = newWiz();
        S.wiz.cadernoId = c.id;
        S.wiz.banca = c.banca;
        S.wiz.editalId = c.editalId || r.material.editalId || '';
        S.wiz.material = { id: r.material.id, fileName: r.material.fileName, detect: r.material.detect, editalMatch: r.material.editalMatch, wordCount: 500, preview: '' };
        S.wiz.materia = r.material.materia && S.materias.includes(r.material.materia) ? r.material.materia : (r.material.detect?.materia && S.materias.includes(r.material.detect.materia) ? r.material.detect.materia : '');
        S.wiz.step = 2;
        S.cadFeedBusy = false;
        go('gerar');
        toast('Material selecionado! Confirme a matéria e gere novas questões para o seu caderno.');
      } catch (err) { S.cadFeedBusy = false; toast(err.message); render(); }
    };
    on('#cadUseExistingMat', 'click', () => useExistingMat($('#cadPickMat')?.value));
    on('[data-cad-gen-from-mat]', 'click', (e) => useExistingMat(e.currentTarget.dataset.cadGenFromMat));
    on('#cadImportProvaBtn', 'click', async () => {
      const provaId = $('#cadPickProva')?.value;
      if (!provaId) return toast('Selecione uma prova da banca.');
      S.cadFeedBusy = true; render();
      try {
        const r = await api(`/cadernos/${c.id}/alimentar-prova`, { method: 'POST', body: { provaId } });
        S.activeCaderno = r.caderno;
        S.cadernoFeedTab = '';
        await refreshCadernos({ silent: true });
        toast(r.message);
      } catch (err) { toast(err.message); }
      S.cadFeedBusy = false; render();
    });
    const cup = $('#cadUpProvaFile');
    if (cup) cup.onchange = async () => {
      const file = cup.files[0]; if (!file) return;
      S.cadFeedBusy = true; render();
      try {
        const fd = new FormData(); fd.append('prova', file);
        const r = await api(`/cadernos/${c.id}/alimentar-prova`, { method: 'POST', form: fd });
        S.activeCaderno = r.caderno;
        S.cadernoFeedTab = '';
        await refreshCadernos({ silent: true });
        toast(r.message);
      } catch (err) { toast(err.message); }
      S.cadFeedBusy = false; render();
    };
    on('#cadAttachSetBtn', 'click', async () => {
      const setId = $('#cadPickSet')?.value;
      if (!setId) return toast('Selecione uma bateria de questões.');
      S.cadFeedBusy = true; render();
      try {
        const r = await api(`/cadernos/${c.id}/vincular-simulado`, { method: 'POST', body: { setId } });
        S.activeCaderno = r.caderno;
        S.sets = S.sets.map((s) => (s.id === setId ? { ...s, cadernoId: c.id } : s));
        S.cadernoFeedTab = '';
        await refreshCadernos({ silent: true });
        toast('Bateria de questões adicionada ao caderno!');
      } catch (err) { toast(err.message); }
      S.cadFeedBusy = false; render();
    });
    const fs = $('#cadFStatus'), fo = $('#cadFOrigem'), fm = $('#cadFMat'), fq = $('#cadFQ');
    if (fs) fs.onchange = () => { S.cadFilter.status = fs.value; render(); };
    if (fo) fo.onchange = () => { S.cadFilter.origem = fo.value; render(); };
    if (fm) fm.onchange = () => { S.cadFilter.materia = fm.value; render(); };
    if (fq) fq.oninput = () => {
      S.cadFilter.q = fq.value;
      const pos = fq.selectionStart;
      render();
      const nfq = $('#cadFQ'); if (nfq) { nfq.focus(); try { nfq.setSelectionRange(pos, pos); } catch {} }
    };
    const interagir = async (body, msg) => {
      const y = window.scrollY;
      try {
        const r = await api(`/cadernos/${c.id}/interagir`, { method: 'PATCH', body });
        S.activeCaderno = r.caderno;
        refreshCadernos({ silent: true });
        if (msg) toast(msg);
      } catch (err) { toast(err.message); }
      render(); window.scrollTo({ top: y });
    };
    on('[data-cad-ans]', 'click', (e) => {
      const [key, L] = e.currentTarget.dataset.cadAns.split(':::');
      interagir({ key, resposta: L });
    });
    on('[data-cad-clear]', 'click', (e) => interagir({ key: e.currentTarget.dataset.cadClear, resposta: null }));
    on('[data-cad-fav]', 'click', (e) => {
      const key = e.currentTarget.dataset.cadFav;
      const q = (c.questoes || []).find((x) => x.key === key);
      interagir({ key, favorita: !q?.favorita });
    });
    on('[data-cad-note-toggle]', 'click', (e) => {
      const key = e.currentTarget.dataset.cadNoteToggle;
      S.cadNoteOpen = S.cadNoteOpen === key ? null : key;
      const y = window.scrollY; render(); window.scrollTo({ top: y });
    });
    on('[data-cad-note-cancel]', 'click', () => { S.cadNoteOpen = null; const y = window.scrollY; render(); window.scrollTo({ top: y }); });
    on('[data-cad-note-save]', 'click', (e) => {
      const key = e.currentTarget.dataset.cadNoteSave;
      const anotacao = ($('#cadNoteIn')?.value || '').trim();
      S.cadNoteOpen = null;
      interagir({ key, anotacao }, 'Anotação salva no caderno!');
    });
    on('#cadResetErros', 'click', () => confirmBox('Refazer questões erradas?', `As respostas das ${c.erros} questão(ões) que você errou serão limpas para você tentar novamente.`, 'Refazer erradas', false, () => interagir({ reset: 'erros' }, 'Questões erradas liberadas para revisão!')));
    on('#cadResetAll', 'click', () => confirmBox('Refazer todo o caderno?', 'Todas as respostas deste caderno serão limpas para você resolver novamente.', 'Limpar e refazer', false, () => interagir({ reset: 'all' }, 'Caderno reiniciado!')));
    on('[data-pq-caderno]', 'click', async (e) => {
      const qKey = e.currentTarget.dataset.pqCaderno;
      const stateKey = `cad:${qKey}`;
      S.explicacoes = S.explicacoes || {};
      S.explicacaoLoading = S.explicacaoLoading || {};
      if (S.explicacoes[stateKey]) return;
      S.explicacaoLoading[stateKey] = true;
      const y = window.scrollY; render(); window.scrollTo({ top: y });
      try {
        const q = (c.questoes || []).find((x) => x.key === qKey);
        const res = await api(`/cadernos/${c.id}/questoes/por-que-errei`, {
          method: 'POST',
          body: { key: qKey, resposta: q?.ans },
        });
        S.explicacoes[stateKey] = res;
      } catch (err) {
        toast(err.message || 'Não foi possível gerar a explicação.');
      } finally {
        S.explicacaoLoading[stateKey] = false;
        const y2 = window.scrollY; render(); window.scrollTo({ top: y2 });
      }
    });
    on('#btnRevancheCadernoGeral', 'click', () => {
      dispararRevanche({ cadernoId: c.id });
    });
    on('[data-revanche-cad-key]', 'click', (e) => {
      const qKey = e.currentTarget.dataset.revancheCadKey;
      const q = (c.questoes || []).find((x) => x.key === qKey);
      if (!q) return;
      dispararRevanche({
        cadernoId: c.id,
        keys: [q.key],
        banca: q.banca || c.banca,
        materia: q.materia,
        qtd: 3,
      });
    });
    on('[data-revanche]', 'click', (e) => {
      const [mat, top, b] = e.currentTarget.dataset.revanche.split('||');
      S.wiz = newWiz();
      S.wiz.cadernoId = c.id;
      if (S.materias.includes(mat)) S.wiz.materia = mat;
      if (top) S.wiz.assunto = top.slice(0, 100);
      if (b && S.bancas.some((x) => x.id === b)) S.wiz.banca = b;
      go('gerar');
      toast(`Envie seu resumo de ${mat} para gerar mais questões no seu caderno!`);
    });
  }
  if (S.view === 'contribuir') {
    const f = S.cform;
    on('[data-cb]', 'click', (e) => { f.banca = e.currentTarget.dataset.cb; render(); });
    ['Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#c' + k); if (el) el.oninput = () => { f[k.toLowerCase()] = el.value; }; });
    const addFiles = (list) => { f.files = f.files.concat([...list]).slice(0, 10); if (f.files.length > 1) { f.gabarito = null; f.editalFile = null; } S.cResults = []; render(); };
    const cf = $('#cFiles'), cd = $('#cDrop');
    if (cf) cf.onchange = () => addFiles(cf.files);
    if (cd) {
      ['dragenter', 'dragover'].forEach((t) => cd.addEventListener(t, (e) => { e.preventDefault(); cd.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => cd.addEventListener(t, (e) => { e.preventDefault(); cd.classList.remove('over'); }));
      cd.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    }
    const cg = $('#cGab'); if (cg) cg.onchange = () => { f.gabarito = cg.files[0] || null; render(); };
    const cl = $('#cLink');
    if (cl) cl.oninput = () => { f.link = cl.value.trim(); const btn = $('#cForm button[type=submit]'); if (btn && !S.cBusy) btn.disabled = (!f.files.length && !f.link) || !f.banca; };
    if (cl) cl.onchange = () => render();
    const ces = $('#cEditalSel'); if (ces) ces.onchange = () => { f.editalId = ces.value; render(); };
    const cef = $('#cEditalFile'); if (cef) cef.onchange = () => { f.editalFile = cef.files[0] || null; if (f.editalFile) f.editalId = ''; render(); };
    on('#cRmEdital', 'click', () => { f.editalFile = null; render(); });
    on('[data-rmc]', 'click', (e) => { f.files.splice(+e.currentTarget.dataset.rmc, 1); render(); });
    on('[data-open-edital]', 'click', async (e) => {
      const id = e.currentTarget.dataset.openEdital;
      try { await api(`/editais/${id}/ativar`, { method: 'POST' }); } catch {}
      go('edital');
    });
    on('[data-toggle-link-edital]', 'click', (e) => {
      const id = e.currentTarget.dataset.toggleLinkEdital;
      S.linkProvaId = S.linkProvaId === id ? null : id;
      render();
    });
    on('[data-save-link-edital]', 'click', async (e) => {
      const id = e.currentTarget.dataset.saveLinkEdital;
      const edId = $('#lpEdSel')?.value || '';
      S.linkBusy = true; render();
      try {
        await api(`/provas/${id}/edital`, { method: 'POST', body: { editalId: edId } });
        S.minhas = (await api('/provas/minhas')).provas;
        await refreshEditais({ silent: true });
        S.linkProvaId = null;
        toast(edId ? 'Edital vinculado à prova com sucesso!' : 'Vínculo de edital removido.');
      } catch (err) { toast(err.message); }
      S.linkBusy = false; render();
    });
    on('[data-upload-link-edital]', 'change', async (e) => {
      const id = e.currentTarget.dataset.uploadLinkEdital;
      const file = e.currentTarget.files[0]; if (!file) return;
      S.linkBusy = true; render();
      try {
        const fd = new FormData(); fd.append('edital', file);
        const r = await api(`/provas/${id}/edital`, { method: 'POST', form: fd });
        S.minhas = (await api('/provas/minhas')).provas;
        await refreshEditais({ silent: true });
        S.linkProvaId = null;
        toast(`Edital "${r.editalTitulo}" verticalizado e vinculado à prova!`);
      } catch (err) { toast(err.message); }
      S.linkBusy = false; render();
    });
    const form = $('#cForm');
    if (form) form.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!f.banca) return toast('Escolha a banca.');
      if (f.ano && !/^\d{4}$/.test(f.ano)) return toast('Ano inválido.');
      S.cResults = [];
      // Sem arquivo + link: um envio só, o servidor baixa a prova da fonte oficial
      const files = f.files.length ? [...f.files] : [null];
      let sharedEditalId = f.editalId || '';
      for (let i = 0; i < files.length; i++) {
        S.cBusy = files[i] ? `${i + 1}/${files.length}` : 'do link oficial'; render();
        const nome = files[i] ? files[i].name : 'Link oficial';
        const fd = new FormData();
        fd.append('banca', f.banca); fd.append('orgao', f.orgao); fd.append('cargo', f.cargo); fd.append('ano', f.ano);
        if (files[i]) fd.append('prova', files[i]);
        if (f.link && files.length === 1) fd.append('officialUrl', f.link);
        if (f.gabarito && files.length === 1) fd.append('gabarito', f.gabarito);
        if (f.editalFile && i === 0) fd.append('edital', f.editalFile);
        else if (sharedEditalId) fd.append('editalId', sharedEditalId);
        try {
          const r = await api('/provas', { method: 'POST', form: fd });
          if (r.editalId && !sharedEditalId) sharedEditalId = r.editalId;
          const aviso = (r.avisos || []).length ? ` Aviso: ${r.avisos.join(' ')}` : '';
          S.cResults.push(r.duplicate ? { name: nome, dup: true, msg: r.message + aviso } : { name: nome, ok: true, msg: `Recebida. Em verificação.${r.prova?.oficialConfirmado ? ' Baixada da fonte oficial ✔' : ''}${r.editalId ? ' Edital vinculado!' : ''}${aviso}` });
        } catch (e) { S.cResults.push({ name: nome, msg: e.message }); if (e.status === 429) break; }
      }
      S.cBusy = false; f.files = []; f.gabarito = null; f.editalFile = null; f.link = '';
      try { S.minhas = (await api('/provas/minhas')).provas; await refreshEditais({ silent: true }); } catch {}
      render();
    };
    schedulePoll();
  }
  if (S.view === 'provas' && isAdmin()) {
    const abrirPedidos = async () => {
      try {
        const { pedidos } = await api('/admin/pedidos');
        const pend = pedidos.filter((p) => p.status === 'pendente');
        S.modal = {
          title: `Pedidos de plano (${pend.length} pendente${pend.length === 1 ? '' : 's'})`,
          html: pedidos.length ? `<p class="hint" style="margin-top:0">Confirme o pagamento antes de aprovar. Aprovar soma 1 mês (ou 1 ano) ao período do aluno.</p>
            <table class="tbl"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Pedido em</th><th>Situação</th><th></th></tr></thead><tbody>${pedidos.map((p) => `<tr>
              <td><div class="row" style="gap:8px;flex-wrap:nowrap">${renderAvatar({ name: p.name, avatarUrl: p.avatar_url })}<div><b>${esc(p.name)}</b><div class="hint">${esc(p.email)}</div></div></div></td>
              <td>${esc(p.planoNome)} <span class="hint">(${esc(p.periodicidade)})</span></td>
              <td>${brl(p.valor)}</td><td>${new Date(p.created_at).toLocaleString('pt-BR')}</td>
              <td><span class="badge ${p.status === 'pendente' ? 'accent' : p.status === 'aprovado' ? 'brand' : ''}">${esc(p.status)}</span></td>
              <td>${p.status === 'pendente' ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn btn-primary" style="padding:7px 12px" data-pedido="${p.id}:aprovar">Aprovar</button><button class="btn btn-ghost" style="padding:7px 12px" data-pedido="${p.id}:recusar">Recusar</button></div>` : ''}</td>
            </tr>`).join('')}</tbody></table>` : '<p class="hint">Nenhum pedido ainda.</p>',
        };
        render();
      } catch (err) { toast(err.message); }
    };
    on('#admPedidos', 'click', abrirPedidos);
    on('[data-pedido]', 'click', async (e) => {
      const [pid, acao] = e.currentTarget.dataset.pedido.split(':');
      try { await api(`/admin/pedidos/${pid}/${acao}`, { method: 'POST' }); toast(acao === 'aprovar' ? 'Plano ativado e aluno avisado por e-mail.' : 'Pedido recusado.'); await abrirPedidos(); }
      catch (err) { toast(err.message); }
    });
    const abrirDivergencias = async () => {
      try {
        const { divergencias } = await api('/admin/divergencias');
        S.modal = {
          title: `Gabaritos em disputa (${divergencias.length})`,
          html: divergencias.length ? `<p class="hint" style="margin-top:0">Os dois modelos leram respostas diferentes. Essas questões ficam fora do alcance dos alunos até você escolher (ou aplicar o gabarito definitivo da prova).</p>
            <div style="max-height:420px;overflow-y:auto">${divergencias.map((d) => {
              const g = d.divergencia_gabarito || {};
              const opcoes = [...new Set([g.modelo1?.gabarito, g.modelo2?.gabarito].filter(Boolean))];
              return `<div class="card card-pad" style="margin-bottom:10px">
                <div class="hint">${esc(d.prova_titulo || '')} · questão ${d.numero ?? '—'} · ${esc(d.materia || '')}</div>
                <div style="margin:6px 0">${esc(d.enunciado)}</div>
                ${(d.alternativas || []).length ? `<ol type="A" style="margin:0 0 8px 18px">${d.alternativas.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>` : ''}
                <div class="row" style="gap:8px;flex-wrap:wrap">${opcoes.map((l) => `<button class="btn btn-ghost" data-resolver="${d.id}:${l}">Usar ${l}</button>`).join('')}
                  <span class="hint">(${esc(g.modelo1?.model || '?')}: ${esc(g.modelo1?.gabarito || '?')} · ${esc(g.modelo2?.model || '?')}: ${esc(g.modelo2?.gabarito || '?')})</span></div>
              </div>`;
            }).join('')}</div>` : '<p class="hint">Nenhuma divergência pendente.</p>',
        };
        render();
      } catch (err) { toast(err.message); }
    };
    on('#admDiverg', 'click', abrirDivergencias);
    on('[data-resolver]', 'click', async (e) => {
      const [qid, letra] = e.currentTarget.dataset.resolver.split(':');
      try { await api(`/admin/questoes/${qid}/gabarito`, { method: 'POST', body: { gabarito: letra } }); toast(`Gabarito ${letra} confirmado.`); await abrirDivergencias(); }
      catch (err) { toast(err.message); }
    });
    on('#admRotular', 'click', async () => { try { const r = await api('/admin/provas/rotular', { method: 'POST' }); toast(r.provas ? `${r.provas} prova(s) na fila para rotular (IAs grátis). Acompanhe em Monitor → Fila de tarefas.` : 'Todas as provas já estão rotuladas.'); } catch (e) { toast(e.message); } });
    on('[data-atab]', 'click', async (e) => { S.adminTab = e.currentTarget.dataset.atab; render(); if (S.adminTab === 'monitor') { try { await loadAdmin(true); } catch (err) { toast(err.message); } render(); } });
    on('[data-pb]', 'click', (e) => { S.provaBanca = e.currentTarget.dataset.pb; render(); });
    on('[data-analisar]', 'click', async (e) => {
      try { const { prova } = await api(`/admin/provas/${e.currentTarget.dataset.analisar}`); S.modal = { title: prova.titulo || prova.fileName, html: reviewHtml(prova) }; render(); }
      catch (err) { toast(err.message); }
    });
    on('[data-aprovar]', 'click', async (e) => {
      const id = e.currentTarget.dataset.aprovar, banca = $('#rvBanca')?.value;
      e.currentTarget.disabled = true;
      try { await api(`/admin/provas/${id}/aprovar`, { method: 'POST', body: { banca } }); S.modal = null; toast('Prova aprovada. O treino começou.'); await loadAdmin(false); }
      catch (err) { toast(err.message); }
      render();
    });
    on('[data-recusar]', 'click', async (e) => {
      const id = e.currentTarget.dataset.recusar, motivo = ($('#rvMotivo')?.value || '').trim();
      if (motivo.length < 3) return toast('Informe o motivo da recusa.');
      try { await api(`/admin/provas/${id}/recusar`, { method: 'POST', body: { motivo } }); S.modal = null; toast('Prova recusada.'); await loadAdmin(false); }
      catch (err) { toast(err.message); }
      render();
    });
    on('[data-reproc]', 'click', async (e) => { try { await api(`/admin/provas/${e.currentTarget.dataset.reproc}/reprocessar`, { method: 'POST' }); await loadAdmin(false); render(); } catch (err) { toast(err.message); } });
    on('[data-delprova]', 'click', (e) => { const id = e.currentTarget.dataset.delprova; confirmBox('Remover esta prova da base?', 'A IA deixa de usar o estilo e as questões dela. O arquivo é apagado.', 'Remover', true, async () => { await api(`/admin/provas/${id}`, { method: 'DELETE' }).catch(() => {}); await loadAdmin(false).catch(() => {}); S.bancas = (await api('/bancas')).bancas; render(); }); });
    on('[data-verq]', 'click', async (e) => {
      const p = (S.adminProvas || []).find((x) => x.id === e.currentTarget.dataset.verq);
      try {
        const { questoes } = await api(`/admin/provas/${p.id}/questoes`);
        S.modal = {
          title: `${questoes.length} questões extraídas · ${p.titulo || p.fileName}`,
          html: questoes.length ? questoes.map((q) => `<div class="qx"><div class="row" style="margin-bottom:6px;gap:6px">
            ${q.numero ? `<span class="q-num">${q.numero}</span>` : ''}
            ${q.materia ? `<span class="badge">${esc(q.materia)}</span>` : ''}
            ${q.gabarito ? `<span class="badge brand">Gabarito: ${esc(q.gabarito)}</span>` : ''}
            ${q.anulada ? '<span class="badge" style="background:var(--bad);color:#fff">ANULADA</span>' : ''}
            ${q.gabarito_alterado ? `<span class="badge" style="background:#eab308;color:#000" title="Original: ${esc(q.gabarito_original || '')}">Alterada (${esc(q.gabarito_original || '')} → ${esc(q.gabarito)})</span>` : ''}
            ${q.gabarito_definitivo ? '<span class="badge brand" style="font-size:11px">✔ Definitivo</span>' : ''}
            ${q.consenso_gabarito === false ? '<span class="badge" style="background:#ef4444;color:#fff" title="Divergência entre modelos de IA">⚠ Divergência</span>' : ''}
            ${q.flagged ? '<span class="sev high">Descartada pela segurança</span>' : ''}
          </div><div class="ex">${esc(q.enunciado)}${(q.alternativas || []).length ? '\n' + q.alternativas.map((a, j) => `${LETRAS[j]}) ${esc(a)}`).join('\n') : ''}</div></div>`).join('') : '<p>Nenhuma questão extraída.</p>',
        };
        render();
      } catch (err) { toast(err.message); }
    });
    on('#admLote', 'click', () => {
      S.modal = {
        title: 'Importar provas em lote (Fontes oficiais)',
        html: `
          <p class="hint" style="margin-bottom:12px">Cole links diretos de PDFs de provas e gabaritos em sites oficiais (Cebraspe, FGV, FCC, Vunesp, Cesgranrio, gov.br, Diários Oficiais). O servidor baixa com validação SSRF e treina automaticamente.</p>
          <div class="field"><label for="loteBanca">Banca padrão</label>
            <select class="select" id="loteBanca">${S.bancas.map((b) => `<option value="${b.id}" ${b.id === S.provaBanca ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="loteTexto">Links das provas (um por linha)</label>
            <textarea class="textarea" id="loteTexto" rows="6" placeholder="https://conhecimento.fgv.br/sites/default/files/concursos/prova.pdf | https://conhecimento.fgv.br/.../gabarito.pdf\nou apenas uma URL de prova por linha"></textarea>
            <span class="hint">Formato por linha: <code>link_prova.pdf | link_gabarito.pdf</code> ou apenas o link da prova.</span>
          </div>
          <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
            <button class="btn btn-quiet" onclick="S.modal=null;render()">Cancelar</button>
            <button class="btn btn-primary" id="btnExecLote">${ic('download', 'sm')} Iniciar importação</button>
          </div>
          <div id="loteRes" style="margin-top:14px"></div>
        `,
      };
      render();
    });
    on('#btnExecLote', 'click', async () => {
      const banca = $('#loteBanca')?.value;
      const texto = ($('#loteTexto')?.value || '').trim();
      if (!texto) return toast('Cole ao menos um link oficial.');
      const resEl = $('#loteRes');
      if (resEl) resEl.innerHTML = '<div class="row"><span class="spinner sm"></span> <span>Validando os links…</span></div>';
      try {
        const r = await api('/admin/provas/lote', { method: 'POST', body: { banca, texto } });
        toast(`${r.enfileiradas} link(s) na fila de importação${r.erros ? `, ${r.erros} recusado(s)` : ''}. As provas aparecem na lista conforme forem baixadas.`);
        await loadAdmin(false);
        S.modal = {
          title: 'Resultado da importação em lote',
          html: `
            <div class="banner ${r.erros ? 'warn' : 'info'}">${ic(r.erros ? 'alert' : 'check', 'sm')}<div><b>${r.enfileiradas} link(s) na fila</b> · ${r.erros} recusado(s) na validação. O download e o treino acontecem em segundo plano; acompanhe na lista de provas.</div></div>
            <div style="max-height:300px;overflow-y:auto;margin-top:12px">
              <table class="tbl"><thead><tr><th>Item</th><th>Status</th><th>Detalhes</th></tr></thead><tbody>${r.resultados.map((x) => `<tr><td>${x.item}</td><td><span class="badge ${x.status === 'na_fila' ? 'brand' : 'sev high'}">${esc(x.status)}</span></td><td class="hint">${esc(x.titulo || x.erro || x.mensagem || x.url)}</td></tr>`).join('')}</tbody></table>
            </div>
            <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-primary" onclick="S.modal=null;render()">Fechar</button></div>
          `,
        };
        render();
      } catch (err) {
        if (resEl) resEl.innerHTML = `<div class="hint" style="color:var(--bad)">${esc(err.message)}</div>`;
      }
    });
    on('[data-gabdef]', 'click', (e) => {
      const p = (S.adminProvas || []).find((x) => x.id === e.currentTarget.dataset.gabdef);
      if (!p) return;
      S.modal = {
        title: `Gabarito definitivo · ${p.titulo || p.fileName}`,
        html: `
          <p class="hint" style="margin-bottom:12px">Informe o gabarito oficial definitivo. Questões anuladas serão excluídas dos simulados e gabaritos alterados serão retificados automaticamente.</p>
          <div class="field"><label for="gdUrl">Link oficial do gabarito definitivo (recomendado)</label>
            <input class="input" id="gdUrl" placeholder="https://conhecimento.fgv.br/.../gabarito_definitivo.pdf" value="${esc(p.gabaritoDefinitivoUrl || '')}">
            <span class="hint">Baixa direto da fonte oficial com selo confirmado.</span>
          </div>
          <div class="field"><label for="gdTexto">Ou cole o texto do gabarito definitivo</label>
            <textarea class="textarea" id="gdTexto" rows="5" placeholder="1 - A\n2 - ANULADA\n3 - ALTERADA PARA C\n4 - D"></textarea>
          </div>
          <div class="field"><label for="gdArquivo">Ou anexe o arquivo (PDF/TXT)</label>
            <input class="input" type="file" id="gdArquivo" accept=".pdf,.txt,.docx,.doc">
          </div>
          <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
            <button class="btn btn-quiet" onclick="S.modal=null;render()">Cancelar</button>
            <button class="btn btn-primary" id="btnAplicarGab" data-pid="${p.id}">${ic('check', 'sm')} Aplicar gabarito definitivo</button>
          </div>
          <div id="gdStatus" style="margin-top:12px"></div>
        `,
      };
      render();
    });
    // Gabarito definitivo em 2 passos: prévia (nada é gravado) → o admin confere → confirma e grava
    const enviarGabarito = async ({ pid, url, text, file }, confirmar) => {
      if (file) {
        const fd = new FormData();
        fd.append('gabarito', file);
        if (url) fd.append('url', url);
        if (text) fd.append('text', text);
        fd.append('confirmar', confirmar ? 'true' : 'false');
        return api(`/admin/provas/${pid}/gabarito-definitivo`, { method: 'POST', form: fd });
      }
      return api(`/admin/provas/${pid}/gabarito-definitivo`, { method: 'POST', body: { url, text, confirmar } });
    };
    const STATUS_GAB = { anulada: ['sev high', 'Anulada'], alterada: ['brand', 'Alterada pela banca'], corrigida: ['accent', 'Extração corrigida'], confirmada: ['', 'Confirmada'] };
    on('#btnAplicarGab', 'click', async (e) => {
      const pid = e.currentTarget.dataset.pid;
      const url = ($('#gdUrl')?.value || '').trim();
      const text = ($('#gdTexto')?.value || '').trim();
      const file = $('#gdArquivo')?.files?.[0];
      if (!url && !text && !file) return toast('Informe o link oficial, cole o texto ou selecione um arquivo.');
      const stEl = $('#gdStatus');
      if (stEl) stEl.innerHTML = '<div class="row"><span class="spinner sm"></span> <span>Lendo o gabarito e montando a prévia…</span></div>';
      try {
        const r = await enviarGabarito({ pid, url, text, file }, false);
        S.gdPendente = { pid, url, text, file };
        const mudancas = (r.resumo.detalhes || []).filter((d) => d.status !== 'confirmada');
        S.modal = {
          title: 'Prévia do gabarito definitivo — confira antes de gravar',
          html: `
            <div class="banner ${mudancas.length ? 'warn' : 'info'}">${ic(mudancas.length ? 'alert' : 'check', 'sm')}<div>
              <b>${r.resumo.atualizadas} de ${r.resumo.totalQuestoesProva} questões encontradas</b> · ${r.resumo.anuladas} anulada(s) · ${r.resumo.alteradas} alterada(s) pela banca · ${r.resumo.corrigidas || 0} correção(ões) da extração${r.resumo.semCorrespondencia ? ` · ${r.resumo.semCorrespondencia} número(s) sem questão correspondente` : ''}${r.resumo.fonteOficial ? ' · <b>✔ baixado da fonte oficial</b>' : ''}
            </div></div>
            <div style="max-height:280px;overflow-y:auto;margin-top:12px">
              ${mudancas.length ? `<table class="tbl"><thead><tr><th>Questão</th><th>O que muda</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${mudancas.map((d) => `<tr><td>${d.numero}</td><td><span class="badge ${STATUS_GAB[d.status]?.[0] || ''}">${STATUS_GAB[d.status]?.[1] || esc(d.status)}</span></td><td>${esc(d.antes || '—')}</td><td>${d.status === 'anulada' ? 'anulada' : esc(d.gabarito || '—')}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Todas as respostas conferem com o que já está na base.</p>'}
            </div>
            <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
              <button class="btn btn-quiet" onclick="S.modal=null;S.gdPendente=null;render()">Cancelar</button>
              <button class="btn btn-primary" id="btnConfirmarGab">${ic('check', 'sm')} Confirmar e gravar</button>
            </div>
            <div id="gdStatus" style="margin-top:12px"></div>`,
        };
        render();
      } catch (err) {
        if (stEl) stEl.innerHTML = `<div class="hint" style="color:var(--bad)">${esc(err.message)}</div>`;
      }
    });
    on('#btnConfirmarGab', 'click', async () => {
      const pend = S.gdPendente;
      if (!pend) return;
      const stEl = $('#gdStatus');
      if (stEl) stEl.innerHTML = '<div class="row"><span class="spinner sm"></span> <span>Gravando…</span></div>';
      try {
        const r = await enviarGabarito(pend, true);
        S.gdPendente = null; S.modal = null;
        toast(`Gabarito definitivo gravado: ${r.resumo.anuladas} anulada(s), ${r.resumo.alteradas} alterada(s), ${r.resumo.corrigidas || 0} corrigida(s).`);
        await loadAdmin(false);
        render();
      } catch (err) {
        if (stEl) stEl.innerHTML = `<div class="hint" style="color:var(--bad)">${esc(err.message)}</div>`;
      }
    });
    schedulePoll();
  }
}

export { ROUTES, go, bindApp };
