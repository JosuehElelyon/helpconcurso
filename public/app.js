/* =========================================================
   HelpConcurso — front-end (SPA sem framework)
   Conversa com a API em /api. Estado em S, render() redesenha a tela.
   ========================================================= */

// ---------- Ícones ----------
const P = {
  logo: '<path d="M12 2.8 4.5 6v5.6c0 4.5 3.1 8.4 7.5 9.6 4.4-1.2 7.5-5.1 7.5-9.6V6Z"/><path d="m8.6 12.2 2.4 2.4 4.6-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5Z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  home: '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3v.5A3 3 0 0 0 4 10.3 3 3 0 0 0 5 15a3 3 0 0 0 4 4.5V4Z"/><path d="M15 4a3 3 0 0 1 3 3v.5a3 3 0 0 1 2 2.8 3 3 0 0 1-1 4.7 3 3 0 0 1-4 4.5V4Z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>', arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>', arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', alert: '<path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>',
  thumbUp: '<path d="M7 10v10H4V10Z"/><path d="M7 10l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7"/>',
  thumbDown: '<path d="M17 14V4h3v10Z"/><path d="M17 14l-4 7a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.7 4H17"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19V5"/>', clip: '<path d="M8 6h8M8 10h8M8 14h5"/><rect x="4" y="3" width="16" height="18" rx="2"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  award: '<circle cx="12" cy="8" r="6"/><polyline points="8.2 13 7 22 12 19 17 22 15.8 13"/>',
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => (n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';
function renderAvatar(u, sizeClass = '') {
  if (!u) return `<span class="avatar ${sizeClass}">?</span>`;
  const name = u.name || '';
  const init = initials(name);
  const url = u.avatarUrl || u.avatar_url;
  if (url) {
    return `<img src="${esc(url)}" class="avatar ${sizeClass}" alt="${esc(name)}" data-ini="${esc(init)}">`;
  }
  return `<span class="avatar ${sizeClass}" aria-hidden="true">${esc(init)}</span>`;
}
const fmtDate = (t) => { try { return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch { return ''; } };
const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const STATUS = { PENDING: 'Na fila', PROCESSING: 'Processando', READY: 'Treinada', FAILED: 'Falhou' };
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3400); }

async function api(path, { method = 'GET', body, form } = {}) {
  const opt = { method, headers: {}, credentials: 'same-origin' };
  if (form) opt.body = form;
  else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let r;
  try { r = await fetch('/api' + path, opt); } catch { throw Object.assign(new Error('Sem conexão com o servidor.'), { status: 0 }); }
  let data = {};
  try { data = await r.json(); } catch { /* sem corpo */ }
  if (!r.ok) {
    if (r.status === 401 && S.screen === 'app') { S.screen = 'auth'; S.auth = 'entrar'; render(); }
    throw Object.assign(new Error(data.error || `Erro ${r.status}`), { status: r.status, data });
  }
  return data;
}

// ---------- Estado ----------
const S = {
  screen: 'boot', auth: 'entrar', authEmail: '', authCode: '', authErr: '', authOk: '', authBusy: false,
  view: 'home', drawer: false, user: null,
  bancas: [], materias: [], niveis: [], sets: [], loaded: false,
  wiz: null, active: null, filter: { banca: '', materia: '' }, modal: null,
  provaBanca: 'fgv', adminTab: 'revisao', adminProvas: [], adminCounts: {}, monitor: null,
  cform: null, cBusy: false, cResults: [], minhas: [], quota: null,
  stars: null, feedback: {}, reportOpen: null,
  editais: [], activeEdital: null, editalUploading: false, editalErr: '', editalShowForm: false, editalMode: 'file',
  edForm: null, linkProvaId: null, linkBusy: false,
  cadernos: [], activeCaderno: null, cadernoBusy: false, cadernoNewOpen: false, cadForm: null,
  cadernoFeedTab: '', cadFeedBusy: false, cadFilter: { status: 'all', origem: 'all', materia: '', q: '' },
  cadNoteOpen: null, materiaisDisponiveis: [], provasDisponiveis: [], bancoTab: 'cadernos',
  conta: null, contaBusy: false, planosData: null, planoPeriodo: 'mensal',
  desempenho: null, desempBusy: false, desempEditalId: '',
};
const BANCA = () => Object.fromEntries(S.bancas.map((b) => [b.id, b]));
const isAdmin = () => S.user?.role === 'ADMIN';
const newWiz = () => ({ stage: '', step: 1, mode: 'file', uploading: false, err: '', warnings: [], material: null, materia: '', assunto: '', banca: S.activeEdital?.banca && S.bancas.some((b) => b.id === S.activeEdital.banca) ? S.activeEdital.banca : '', qtd: 10, nivel: 'Médio', generating: false, genCount: 0, genErr: '', editalId: S.activeEdital?.id || '', cadernoId: '', showEditalUpload: false, editalBusy: false });

// ---------- Render ----------
function render() {
  document.body.classList.toggle('drawer-open', S.drawer);
  const app = $('#app');
  if (S.screen === 'boot') { app.innerHTML = '<div class="progress-box" style="padding-top:30vh"><div class="spinner"></div><div class="hint">Carregando HelpConcurso…</div></div>'; return; }
  if (S.screen === 'auth') { app.innerHTML = viewAuth(); bindAuth(); return; }
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

// ---------- Autenticação ----------
function viewAuth() {
  const a = S.auth, busy = S.authBusy ? 'disabled' : '';
  const titles = {
    entrar: ['Bem-vindo de volta', 'Entre para continuar seus estudos.'],
    criar: ['Crie sua conta', 'Enviaremos um código para confirmar seu e-mail.'],
    verificar: ['Confirme seu e-mail', `Digite o código de 6 dígitos enviado para ${esc(S.authEmail)}.`],
    esqueci: ['Recuperar senha', 'Informe seu e-mail e enviaremos um código para criar uma nova senha.'],
    redefinir: ['Criar nova senha', `Digite o código enviado para ${esc(S.authEmail)} e sua nova senha.`],
  }[a];
  const tabs = (a === 'entrar' || a === 'criar') ? `<div class="tabs" role="tablist"><button type="button" class="${a === 'entrar' ? 'on' : ''}" data-auth="entrar">Entrar</button><button type="button" class="${a === 'criar' ? 'on' : ''}" data-auth="criar">Criar conta</button></div>` : '';
  let fields = '', submit = '', foot = '';
  if (a === 'entrar') {
    fields = `<div class="field"><label for="fEmail">E-mail</label><input class="input" id="fEmail" type="email" autocomplete="email" value="${esc(S.authEmail)}" placeholder="voce@email.com" required></div>
      <div class="field"><label for="fPass">Senha</label><input class="input" id="fPass" type="password" autocomplete="current-password" required></div>`;
    submit = 'Entrar'; foot = `<button type="button" class="link-btn" data-auth="esqueci">Esqueci minha senha</button>`;
  } else if (a === 'criar') {
    fields = `<div class="field"><label for="fName">Nome</label><input class="input" id="fName" autocomplete="name" placeholder="Seu nome" required></div>
      <div class="field"><label for="fEmail">E-mail</label><input class="input" id="fEmail" type="email" autocomplete="email" value="${esc(S.authEmail)}" placeholder="voce@email.com" required></div>
      <div class="field"><label for="fPass">Senha</label><input class="input" id="fPass" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required></div>`;
    submit = 'Criar conta';
  } else if (a === 'verificar') {
    fields = `<div class="field"><label for="fCode">Código</label><input class="input code-input" id="fCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="${esc(S.authCode)}" placeholder="000000" required></div>`;
    submit = 'Confirmar e entrar'; foot = `<button type="button" class="link-btn" id="resend">Reenviar código</button><button type="button" class="link-btn" data-auth="entrar">Voltar ao login</button>`;
  } else if (a === 'esqueci') {
    fields = `<div class="field"><label for="fEmail">E-mail</label><input class="input" id="fEmail" type="email" autocomplete="email" value="${esc(S.authEmail)}" required></div>`;
    submit = 'Enviar código'; foot = `<button type="button" class="link-btn" data-auth="entrar">Voltar ao login</button>`;
  } else {
    fields = `<div class="field"><label for="fCode">Código</label><input class="input code-input" id="fCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="${esc(S.authCode)}" placeholder="000000" required></div>
      <div class="field"><label for="fPass">Nova senha</label><input class="input" id="fPass" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required></div>`;
    submit = 'Salvar nova senha'; foot = `<button type="button" class="link-btn" data-auth="esqueci">Reenviar código</button><button type="button" class="link-btn" data-auth="entrar">Voltar ao login</button>`;
  }
  return `<div class="login">
    <aside class="login-side">
      <div class="logo"><span class="logo-mark">${ic('logo')}</span><span class="logo-txt">Help<b>Concurso</b></span></div>
      <div>
        <h1>Transforme seus resumos em questões no estilo da sua banca.</h1>
        <p>Envie seu material de estudo, escolha a banca e treine com questões inéditas feitas a partir do que você estudou.</p>
        <ul class="login-points">
          <li><span class="dot">${ic('upload', 'sm')}</span><span>Leitura de PDF, DOC e DOCX com identificação automática da matéria</span></li>
          <li><span class="dot">${ic('brain', 'sm')}</span><span>IA treinada com provas anteriores de FGV, CEBRASPE, FCC, VUNESP e Cesgranrio</span></li>
          <li><span class="dot">${ic('target', 'sm')}</span><span>Gabarito comentado com o trecho do seu material que fundamenta a resposta</span></li>
        </ul>
      </div>
      <div class="hint" style="color:#8D97A2">© HelpConcurso · versão 2.0</div>
    </aside>
    <main class="login-main">
      <form class="login-card" id="authForm" novalidate>
        <h2>${titles[0]}</h2><p class="sub">${titles[1]}</p>${tabs}${fields}
        ${S.authErr ? `<div class="err">${esc(S.authErr)}</div>` : ''}${S.authOk ? `<div class="ok-msg">${esc(S.authOk)}</div>` : ''}
        <button class="btn btn-primary btn-block" type="submit" ${busy}>${S.authBusy ? '<span class="spinner sm"></span>' : ''} ${submit}</button>
        ${foot ? `<div class="auth-foot">${foot}</div>` : ''}
      </form>
    </main>
  </div>`;
}
function setAuth(screen, extra = {}) { Object.assign(S, { auth: screen, authErr: '', authOk: '' }, extra); render(); const f = $('#authForm input'); f && f.focus(); }
function bindAuth() {
  document.querySelectorAll('[data-auth]').forEach((b) => (b.onclick = () => setAuth(b.dataset.auth)));
  const resend = $('#resend');
  if (resend) resend.onclick = async () => { try { await api('/auth/resend', { method: 'POST', body: { email: S.authEmail } }); S.authErr = ''; S.authOk = 'Enviamos um novo código.'; } catch (e) { S.authErr = e.message; } render(); };
  $('#authForm').onsubmit = async (ev) => {
    ev.preventDefault();
    // Lê todos os campos ANTES de redesenhar a tela (o render recria os inputs)
    const vals = Object.fromEntries(['#fName', '#fEmail', '#fPass', '#fCode'].map((id) => [id, $(id)?.value || '']));
    const v = (id) => vals[id].trim();
    const email = v('#fEmail') || S.authEmail;
    S.authBusy = true; S.authErr = ''; S.authOk = ''; if (email) S.authEmail = email; render();
    try {
      if (S.auth === 'entrar') {
        const r = await api('/auth/login', { method: 'POST', body: { email, password: vals['#fPass'] } }).catch((e) => {
          if (e.data?.needsVerification) { S.auth = 'verificar'; S.authOk = 'Enviamos um novo código para seu e-mail.'; return null; }
          throw e;
        });
        if (r) return await enterApp(r.user);
      } else if (S.auth === 'criar') {
        const r = await api('/auth/register', { method: 'POST', body: { name: v('#fName'), email, password: vals['#fPass'] } });
        S.auth = 'verificar'; S.authOk = r.aviso || 'Conta criada! Verifique sua caixa de entrada (e o spam).';
      } else if (S.auth === 'verificar') {
        const r = await api('/auth/verify', { method: 'POST', body: { email: S.authEmail, code: v('#fCode') } });
        toast('E-mail confirmado. Bem-vindo!'); return await enterApp(r.user);
      } else if (S.auth === 'esqueci') {
        await api('/auth/forgot', { method: 'POST', body: { email } });
        S.auth = 'redefinir'; S.authOk = 'Se o e-mail estiver cadastrado, você receberá um código.';
      } else if (S.auth === 'redefinir') {
        const r = await api('/auth/reset', { method: 'POST', body: { email: S.authEmail, code: v('#fCode'), password: vals['#fPass'] } });
        toast('Senha alterada com sucesso'); return await enterApp(r.user);
      }
    } catch (e) { S.authErr = e.message; }
    finally { S.authBusy = false; }
    S.authCode = ''; render();
  };
}

// ---------- Shell (header + menu sanduíche) ----------
function viewShell(body) {
  const u = S.user;
  const nav = [
    ['home', 'Início', 'home'],
    ['desempenho', 'Desempenho & Radar', 'chart'],
    ['gerar', 'Gerar questões', 'spark'],
    ['questoes', 'Cadernos de questões', 'book'],
    ['edital', 'Meu edital', 'target'],
    ['contribuir', 'Enviar provas', 'upload'],
    ['estrelas', 'Minhas estrelas', 'star'],
    ['bancas', 'Bancas e estilos', 'layers']
  ];
  const ativo = (v) => S.view === v || (v === 'questoes' && ['simulado', 'caderno'].includes(S.view));
  const item = ([v, l, i]) => `<button class="nav-item ${ativo(v) ? 'on' : ''}" data-go="${v}" ${ativo(v) ? 'aria-current="page"' : ''}>${ic(i)} <span>${l}</span>${v === 'questoes' && (S.cadernos.length || S.sets.length) ? `<span class="badge">${S.cadernos.length || S.sets.length}</span>` : ''}${v === 'edital' && S.activeEdital ? `<span class="badge brand">${S.activeEdital.resumo?.coberturaPct ?? 0}%</span>` : ''}</button>`;
  const navHtml = `${nav.map(item).join('')}
    <div class="nav-sep">Sua conta</div>${item(['conta', 'Minha conta', 'user'])}${item(['planos', 'Planos', 'crown'])}
    ${isAdmin() ? `<div class="nav-sep">Administração</div>${item(['provas', 'Base de provas (Treinar IA)', 'brain'])}` : ''}`;
  const plano = u.plano && !isAdmin() ? `<button class="plan-chip p-${esc(u.plano.id)}" data-go="planos" title="Seu plano: ${esc(u.plano.nome)}">${ic('crown', 'sm')}<span>${esc(u.plano.nome)}</span></button>` : '';
  const tabs = [['home', 'Início', 'home'], ['gerar', 'Gerar', 'spark'], ['questoes', 'Cadernos', 'book'], ['edital', 'Edital', 'target'], ['conta', 'Conta', 'user']];
  return `<header class="header"><div class="header-in">
      <div class="logo" data-go="home"><span class="logo-mark">${ic('logo')}</span><span class="logo-txt">Help<b>Concurso</b></span></div>
      <div class="spacer"></div>
      ${S.stars ? `<button class="star-chip" data-go="estrelas" title="${esc(S.stars.level.nome)} · ${S.stars.total} estrelas no total"><span class="star-ic" id="starIc">★</span><b>${S.stars.balance}</b><span class="lvl">${esc(S.stars.level.nome)}</span></button>` : ''}
      ${plano}
      <button class="user-chip" data-go="conta" title="Minha conta · ${esc(u.email)}">${renderAvatar(u)}<span class="nm">${esc(u.name)}</span></button>
      <button class="icon-btn menu-btn" id="openMenu" aria-label="Abrir menu">${ic('menu')}</button>
    </div></header>
    <div class="layout">
      <aside class="sidebar" aria-label="Navegação principal"><nav>${navHtml}</nav><div class="sidebar-foot"><button class="nav-item" data-logout>${ic('logout')} <span>Sair</span></button></div></aside>
      <main class="main" id="conteudo">${body}</main>
    </div>
    <div class="drawer-bg" data-close></div>
    <aside class="drawer" aria-label="Menu">
      <div class="drawer-head">${renderAvatar(u, 'lg')}<div style="min-width:0"><div style="font-weight:800">${esc(u.name)}${isAdmin() ? '<span class="admin-badge">ADMIN</span>' : ''}</div><div class="em">${esc(u.email)}</div></div><button class="icon-btn" style="margin-left:auto;width:36px;height:36px" data-close aria-label="Fechar menu">${ic('x', 'sm')}</button></div>
      <nav>${navHtml}</nav>
      <div class="drawer-foot"><button class="nav-item" data-logout>${ic('logout')} <span>Sair</span></button></div>
    </aside>
    <nav class="tabbar" aria-label="Atalhos">${tabs.map(([v, l, i]) => `<button class="${ativo(v) ? 'on' : ''}" data-go="${v}" ${ativo(v) ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
}

// ---------- Minha conta ----------
async function loadConta() {
  try {
    S.conta = await api('/me/conta');
    if (S.user) Object.assign(S.user, { name: S.conta.perfil.name, avatarUrl: S.conta.perfil.avatarUrl, plano: { id: S.conta.plano.id, nome: S.conta.plano.nome } });
  } catch (e) { toast(e.message); }
  if (['conta', 'planos'].includes(S.view)) render();
}
async function loadPlanos() {
  try { S.planosData = await api('/me/planos'); } catch (e) { toast(e.message); }
  await loadConta();
}
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const diasAte = (iso) => { if (!iso) return null; const d = Math.ceil((new Date(iso + 'T12:00:00') - new Date()) / 86400000); return d; };

async function showAvatarModal() {
  if (!S.avatarPresets) {
    try { const r = await api('/me/avatar/presets'); S.avatarPresets = r.presets; }
    catch { S.avatarPresets = []; }
  }
  const p = S.conta?.perfil || S.user || {};
  const curUrl = p.avatarUrl || '';
  const presetsHtml = (S.avatarPresets || []).map((av) => {
    const isCurrent = curUrl === av.url || curUrl.includes(av.id);
    return `<div class="avatar-preset-item ${isCurrent ? 'on' : ''}" data-choose-preset="${esc(av.id)}" title="${esc(av.nome)}">
      <img src="${esc(av.url)}" alt="${esc(av.nome)}" loading="lazy">
      <div class="av-name">${esc(av.nome)}</div>
      <div class="av-cat">${esc(av.categoria)}</div>
    </div>`;
  }).join('');

  S.modal = {
    title: 'Foto de perfil',
    html: `<div class="stack" style="gap:16px">
      <div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">1. Enviar sua própria foto</div>
        <div class="hint" style="margin-bottom:10px">Envie uma foto do seu computador ou celular (PNG, JPEG, WebP ou GIF até 4 MB).</div>
        <div class="avatar-upload-drop" id="avatarDropZone">
          <input type="file" id="avatarInput" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none">
          <div style="margin-bottom:8px">${ic('upload')}</div>
          <button type="button" class="btn btn-primary btn-sm" id="btnSelectAvatarFile">${ic('upload', 'sm')} Escolher arquivo</button>
          <div class="hint" style="margin-top:6px" id="avatarUploadStatus">Ou arraste e solte uma imagem aqui</div>
        </div>
      </div>
      <div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">2. Ou escolha um avatar temático</div>
        <div class="hint" style="margin-bottom:6px">Avatares exclusivos para o seu perfil de concurseiro:</div>
        <div class="avatar-presets-grid">${presetsHtml}</div>
      </div>
      <div class="row" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:12px">
        ${curUrl ? `<button type="button" class="btn btn-ghost danger-soft btn-sm" id="btnModalRemoveAvatar">${ic('trash', 'sm')} Remover foto (usar iniciais)</button>` : '<div></div>'}
        <button type="button" class="btn btn-quiet btn-sm" data-mclose2>Fechar</button>
      </div>
    </div>`,
  };
  render();
}

function viewConta() {
  const c = S.conta;
  if (!c) return '<div class="progress-box"><div class="spinner"></div><div class="hint">Carregando sua conta…</div></div>';
  const p = c.perfil, pl = c.plano, uso = c.uso;
  const faltam = diasAte(p.dataProva);
  const uso1 = (rotulo, usado, limite) => limite === null || limite === undefined
    ? `<div class="use-row"><div class="use-head"><span>${rotulo}</span><b>${usado} · sem limite</b></div></div>`
    : `<div class="use-row"><div class="use-head"><span>${rotulo}</span><b>${usado} de ${limite}</b></div><div class="use-track ${usado >= limite ? 'full' : ''}"><i style="width:${Math.min(100, Math.round((usado / Math.max(1, limite)) * 100))}%"></i></div></div>`;
  const bancas = S.bancas || [];
  return `<div class="profile-hero card">
      <div class="avatar-wrap">
        ${renderAvatar(p, 'xl')}
        <button type="button" class="avatar-edit-btn" id="openAvatarModal" title="Alterar foto de perfil" aria-label="Alterar foto de perfil">${ic('camera', 'sm')}</button>
      </div>
      <div class="ph-main">
        <div class="eyebrow">Minha conta</div>
        <h1 class="page-title" style="margin:2px 0">${esc(p.name)}</h1>
        <div class="hint">${esc(p.email)} · membro desde ${p.membroDesde ? new Date(p.membroDesde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'}</div>
        <div class="row" style="margin-top:8px;gap:8px">
          <button type="button" class="btn btn-ghost btn-xs" id="openAvatarModal2">${ic('camera', 'sm')} Alterar foto de perfil</button>
          ${p.avatarUrl ? `<button type="button" class="link-btn danger-soft" id="btnRemoverAvatar" style="font-size:12px">Remover foto</button>` : ''}
        </div>
      </div>
      <div class="ph-side">
        <span class="plan-pill p-${esc(pl.id)}">${ic('crown', 'sm')} Plano ${esc(pl.nome)}</span>
        ${faltam !== null ? `<div class="countdown ${faltam < 0 ? 'past' : ''}">${ic('calendar', 'sm')} ${faltam > 1 ? `Faltam <b>${faltam}</b> dias para a prova` : faltam === 1 ? 'A prova é <b>amanhã</b>' : faltam === 0 ? 'A prova é <b>hoje</b>. Boa prova!' : 'Data da prova já passou'}</div>` : ''}
      </div>
    </div>
    <div class="account-grid">
      <form class="card card-pad" id="contaForm" novalidate>
        <h3 class="card-title">${ic('user', 'sm')} Dados pessoais</h3>
        <div class="field"><label for="cNome">Nome</label><input class="input" id="cNome" maxlength="80" autocomplete="name" value="${esc(p.name)}" required></div>
        <div class="field"><label for="cEmail">E-mail</label><input class="input" id="cEmail" value="${esc(p.email)}" disabled><span class="hint">Para trocar o e-mail, fale com o suporte.</span></div>
        <div class="form-2">
          <div class="field"><label for="cTel">Telefone <span class="hint">(opcional)</span></label><input class="input" id="cTel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="(61) 99999-0000" value="${esc(p.telefone)}"></div>
          <div class="field"><label for="cMeta">Meta diária de questões</label><input class="input" id="cMeta" type="number" min="0" max="500" inputmode="numeric" placeholder="Ex.: 30" value="${p.metaDiaria ?? ''}"></div>
        </div>
        <div class="field"><label for="cAlvo">Concurso que você está mirando</label><input class="input" id="cAlvo" maxlength="120" placeholder="Ex.: TRF-1 · Técnico Judiciário" value="${esc(p.concursoAlvo)}"></div>
        <div class="form-2">
          <div class="field"><label for="cBanca">Banca preferida</label><select class="select" id="cBanca"><option value="">Nenhuma</option>${bancas.map((b) => `<option value="${b.id}" ${p.bancaPreferida === b.id ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></div>
          <div class="field"><label for="cData">Data da prova</label><input class="input" id="cData" type="date" value="${esc(p.dataProva)}"></div>
        </div>
        <button class="btn btn-primary" type="submit" ${S.contaBusy ? 'disabled' : ''}>${S.contaBusy ? '<span class="spinner sm"></span>' : ic('check', 'sm')} Salvar alterações</button>
      </form>
      <div class="stack">
        <div class="card card-pad plan-card-mini p-${esc(pl.id)}">
          <h3 class="card-title">${ic('crown', 'sm')} Seu plano: ${esc(pl.nome)}</h3>
          ${pl.ate ? `<div class="hint" style="margin:-6px 0 12px">Válido até ${new Date(pl.ate).toLocaleDateString('pt-BR')}</div>` : ''}
          ${uso1('Simulados hoje', uso.simuladosHoje, pl.limites.simuladosDia)}
          ${uso1('Difícil/Misto hoje', uso.dificeisHoje, pl.limites.dificeisDia)}
          ${uso1('Editais', uso.editais, pl.limites.editais)}
          ${uso1('Cadernos', uso.cadernos, pl.limites.cadernos)}
          ${uso.creditosExtras ? `<div class="hint" style="margin-top:8px">+ ${uso.creditosExtras} geração(ões) extra(s) por estrelas e provas aprovadas</div>` : ''}
          ${c.pedidoPendente ? `<div class="banner warn" style="margin:14px 0 0">${ic('info', 'sm')}<div>Pedido do plano <b>${esc(c.pedidoPendente.planoNome)}</b> (${esc(c.pedidoPendente.periodicidade)}, ${brl(c.pedidoPendente.valor)}) aguardando confirmação do pagamento. <button type="button" class="link-btn" id="cancelPedido">Cancelar pedido</button></div></div>`
            : pl.id !== 'aprovacao' && pl.id !== 'admin' ? `<button class="btn btn-accent btn-block" data-go="planos" style="margin-top:14px">${ic('crown', 'sm')} Ver planos e ampliar</button>` : ''}
        </div>
        <form class="card card-pad" id="senhaForm" novalidate>
          <h3 class="card-title">${ic('lock', 'sm')} Segurança</h3>
          <div class="field"><label for="sAtual">Senha atual</label><input class="input" id="sAtual" type="password" autocomplete="current-password" required></div>
          <div class="field"><label for="sNova">Nova senha</label><input class="input" id="sNova" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres" required></div>
          <button class="btn btn-ghost" type="submit">${ic('lock', 'sm')} Trocar senha</button>
        </form>
        <button class="btn btn-ghost btn-block danger-soft" data-logout>${ic('logout', 'sm')} Sair da conta</button>
      </div>
    </div>`;
}

// ---------- Planos ----------
function viewPlanos() {
  const d = S.planosData;
  if (!d) return '<div class="progress-box"><div class="spinner"></div><div class="hint">Carregando planos…</div></div>';
  const anual = S.planoPeriodo === 'anual';
  const ordem = d.planos.map((p) => p.id);
  const atual = d.atual;
  const pend = S.conta?.pedidoPendente;
  const lim = (v, un) => (v === null ? 'Ilimitado' : `${v}${un ? ' ' + un : ''}`);
  const preco = (p) => {
    if (!p.precoMensal) return '<div class="price"><span class="cur">R$</span><b>0</b><span class="per">para sempre</span></div>';
    if (!anual) return `<div class="price"><span class="cur">R$</span><b>${p.precoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b><span class="per">/mês</span></div>`;
    return `<div class="price"><span class="cur">R$</span><b>${(p.precoAnual / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b><span class="per">/mês</span></div><div class="price-note">${brl(p.precoAnual)} por ano · economize ${brl(p.precoMensal * 12 - p.precoAnual)}</div>`;
  };
  const cta = (p) => {
    if (atual === 'admin') return '<button class="btn btn-ghost btn-block" disabled>Acesso de administrador</button>';
    if (p.id === atual) return '<button class="btn btn-ghost btn-block" disabled>' + ic('check', 'sm') + ' Seu plano atual</button>';
    if (ordem.indexOf(p.id) < ordem.indexOf(atual)) return '<button class="btn btn-ghost btn-block" disabled>Incluído no seu plano</button>';
    if (pend && pend.plano === p.id) return `<button class="btn btn-ghost btn-block" disabled>Pedido enviado · aguardando pagamento</button><button type="button" class="link-btn" id="cancelPedido" style="margin-top:8px">Cancelar pedido</button>`;
    return `<button class="btn ${p.destaque ? 'btn-accent' : 'btn-primary'} btn-block" data-upgrade="${p.id}">Quero o ${esc(p.nome)}</button>`;
  };
  return `<div class="planos-head">
      <div class="eyebrow">Planos</div>
      <h1 class="page-title">Escolha o ritmo da sua aprovação</h1>
      <p class="page-sub">Todos os planos têm questões no estilo da banca, gabarito comentado com o trecho do seu material, questões reais por tópico do edital e revisão espaçada dos erros.</p>
      <div class="seg period" role="tablist" aria-label="Período"><button type="button" class="${!anual ? 'on' : ''}" data-periodo="mensal">Mensal</button><button type="button" class="${anual ? 'on' : ''}" data-periodo="anual">Anual <span class="save">2 meses grátis</span></button></div>
    </div>
    <div class="plan-grid">${d.planos.map((p) => `<article class="plan ${p.destaque ? 'featured' : ''} ${p.id === atual ? 'current' : ''}">
        ${p.destaque ? '<div class="ribbon">Mais escolhido</div>' : ''}
        <h3>${esc(p.nome)}</h3>
        <p class="plan-sub">${esc(p.resumo)}</p>
        ${preco(p)}
        ${cta(p)}
        <ul class="benefits">${p.beneficios.map((b) => `<li>${ic('check', 'sm')}<span>${esc(b)}</span></li>`).join('')}</ul>
      </article>`).join('')}</div>
    <div class="card card-pad compare">
      <h3 class="card-title">Compare os limites</h3>
      <table class="tbl cmp"><thead><tr><th></th>${d.planos.map((p) => `<th>${esc(p.nome)}</th>`).join('')}</tr></thead><tbody>
        <tr><td>Simulados por dia</td>${d.planos.map((p) => `<td>${lim(p.limites.simuladosDia)}</td>`).join('')}</tr>
        <tr><td>Simulados Difícil/Misto por dia</td>${d.planos.map((p) => `<td>${lim(p.limites.dificeisDia)}</td>`).join('')}</tr>
        <tr><td>Editais acompanhados</td>${d.planos.map((p) => `<td>${lim(p.limites.editais)}</td>`).join('')}</tr>
        <tr><td>Cadernos de questões</td>${d.planos.map((p) => `<td>${lim(p.limites.cadernos)}</td>`).join('')}</tr>
        <tr><td>Questões reais por tópico · revisão espaçada</td>${d.planos.map(() => `<td class="yes">${ic('check', 'sm')}</td>`).join('')}</tr>
      </tbody></table>
    </div>
    <div class="faq">
      <details class="card card-pad"><summary>Como funciona o pagamento?</summary><p>Ao pedir o plano, nossa equipe recebe o pedido e envia as instruções de pagamento para o seu e-mail. O plano é ativado assim que o pagamento é confirmado, e você recebe um aviso. O pagamento direto no app (Pix e cartão) chega em breve.</p></details>
      <details class="card card-pad"><summary>A assinatura renova sozinha?</summary><p>Não. O plano vale até o fim do período pago (1 mês ou 1 ano). Depois, se você não renovar, a conta volta para o plano Grátis sem perder nada do que já criou.</p></details>
      <details class="card card-pad"><summary>Ganho gerações extras sem pagar?</summary><p>Sim. Cada prova que você envia e é aprovada na base, e as estrelas que você acumula, viram simulados extras em qualquer plano.</p></details>
    </div>`;
}

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
// ---------- Hoje: meta diária, sequência de dias, revisões e tópicos fracos ----------
async function loadHoje() {
  try { S.hoje = await api('/me/hoje'); } catch { /* opcional */ }
  if (S.view === 'home') render();
}
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
function tarefasDeHoje() {
  const out = [];
  for (const c of S.cadernos || []) {
    if (c.revisaoHojeCount > 0) out.push(`<button class="hoje-task" data-hoje-revisar="${c.id}"><span class="ht-ic">🔔</span><span class="ht-main"><b>${c.revisaoHojeCount} revis${c.revisaoHojeCount === 1 ? 'ão' : 'ões'}</b> em ${esc(c.titulo)}<span class="hint">Questões que você errou voltam no dia certo para fixar</span></span>${ic('arrowR', 'sm')}</button>`);
  }
  const ed = S.activeEdital;
  if (ed?.disciplinas) {
    const tops = ed.disciplinas.flatMap((d) => (d.topicos || []).map((t) => ({ ...t, materia: d.materia })));
    const fracos = tops.filter((t) => t.status === 'praticado' && t.taxaAcerto != null && t.taxaAcerto < 70).sort((a, b) => a.taxaAcerto - b.taxaAcerto);
    const cai = tops.filter((t) => t.status === 'pendente' && t.incidenciaBanca === 'alta');
    const acao = (t) => (t.questoesNaBanca ? `data-treinar-reais="${t.id}"` : `data-train-topic="${esc(t.materia)}||${esc(t.nome)}"`);
    for (const t of fracos.slice(0, 3)) out.push(`<button class="hoje-task" ${acao(t)}><span class="ht-ic">🎯</span><span class="ht-main"><b>Reforçar:</b> ${esc(t.nome)}<span class="hint">${esc(t.materia)} · ${t.taxaAcerto}% de acerto${t.questoesNaBanca ? ' · treinar com questões reais (grátis)' : ''}</span></span>${ic('arrowR', 'sm')}</button>`);
    for (const t of cai.slice(0, Math.max(0, 2 - fracos.length))) out.push(`<button class="hoje-task" ${acao(t)}><span class="ht-ic">📌</span><span class="ht-main"><b>Começar:</b> ${esc(t.nome)}<span class="hint">${esc(t.materia)} · cai muito nesta banca e você ainda não estudou</span></span>${ic('arrowR', 'sm')}</button>`);
  }
  return out;
}
function viewHoje() {
  const h = S.hoje;
  if (!h) return '';
  const feitas = h.hoje.respondidas, meta = h.meta, pct = meta ? Math.min(100, Math.round((feitas / meta) * 100)) : 0;
  const seq = h.sequencia;
  const titulo = !meta ? 'Defina sua meta diária de questões'
    : h.hoje.metaBatida ? 'Meta de hoje batida! 🎉'
      : feitas ? `Faltam <b>${meta - feitas}</b> questões para sua meta` : `Sua meta de hoje: <b>${meta}</b> questões`;
  const semana = h.semana.map((d) => {
    const wd = new Date(`${d.dia}T12:00:00Z`).getUTCDay(), hojeCls = d.dia === h.dia ? ' today' : '';
    return `<span class="hd-day${d.respondidas ? ' on' : ''}${d.metaBatida ? ' meta' : ''}${hojeCls}" title="${new Date(`${d.dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', timeZone: 'UTC' })}: ${d.respondidas} questão(ões)${d.metaBatida ? ' · meta batida' : ''}"><i>${d.metaBatida ? '★' : d.respondidas ? '✓' : ''}</i><small>${DIAS_SEMANA[wd]}</small></span>`;
  }).join('');
  const tarefas = tarefasDeHoje();
  const prova = h.diasParaProva != null && h.diasParaProva >= 0
    ? `<div class="hoje-prova">${ic('calendar', 'sm')} ${h.diasParaProva === 0 ? '<b>A prova é hoje.</b> Boa prova!' : h.diasParaProva === 1 ? 'A prova é <b>amanhã</b>' : `Faltam <b>${h.diasParaProva}</b> dias para a prova`}</div>` : '';
  return `<section class="card hoje-card" aria-label="Seu dia de estudo">
    <div class="hoje-top">
      <div class="hoje-meta">
        ${meta ? donutSvg(pct, 84, h.hoje.metaBatida ? 'var(--accent)' : 'var(--brand)') : `<span class="li-icon" style="background:var(--brand);width:56px;height:56px">${ic('target')}</span>`}
        <div style="min-width:0">
          <div class="eyebrow" style="color:var(--brand)">Hoje</div>
          <div class="hoje-title">${titulo}</div>
          <div class="hint">${meta ? `${feitas} de ${meta} respondidas hoje${h.hoje.respondidas ? ` · ${h.hoje.acertos} acerto(s)` : ''}` : 'Com uma meta, você acompanha seu ritmo e mantém a sequência.'}</div>
          ${!meta ? '<button class="btn btn-primary btn-sm" data-go="conta" style="margin-top:8px">Definir minha meta</button>' : ''}
        </div>
      </div>
      <div class="hoje-streak">
        <div class="hs-fire ${seq.atual ? 'on' : ''}"><span>🔥</span><b>${seq.atual}</b></div>
        <div><b>${!seq.atual ? 'Comece sua sequência' : seq.atual === 1 ? '1 dia seguido' : `${seq.atual} dias seguidos`}</b><div class="hint">${!seq.atual ? (seq.recorde ? `Seu recorde: ${seq.recorde} dia(s). Responda 1 questão hoje` : 'Responda 1 questão por dia para acender o fogo') : !h.hoje.respondidas ? 'Responda 1 questão hoje para não perder a sequência' : `Recorde: ${seq.recorde} dia(s)`}</div></div>
        <div class="hd-week" aria-label="Últimos 7 dias">${semana}</div>
      </div>
    </div>
    ${prova}
    <div class="hoje-tasks">
      <div class="hint" style="font-weight:700;margin-bottom:6px">Para fazer hoje</div>
      ${tarefas.length ? tarefas.join('') : `<button class="hoje-task" data-go="gerar"><span class="ht-ic">✨</span><span class="ht-main"><b>Gerar um simulado</b> a partir do seu material<span class="hint">Nada pendente: avance em um tópico novo</span></span>${ic('arrowR', 'sm')}</button>`}
    </div>
  </section>`;
}

// Novidade: foto de perfil — aparece para todos (aluno e admin) até escolher uma foto ou dispensar
const avisoAvatarKey = () => `hc_aviso_avatar_${S.user?.id}`;
function avisoAvatarHtml() {
  if (!S.user || S.user.avatarUrl) return '';
  try { if (localStorage.getItem(avisoAvatarKey())) return ''; } catch { /* modo privado */ }
  return `<div class="card card-pad row avatar-news" style="justify-content:space-between;margin-bottom:18px">
    <div style="display:flex;gap:14px;align-items:center;min-width:0">
      <div class="avatar-news-pics" aria-hidden="true"><img src="/avatars/avatar-6.svg" alt=""><img src="/avatars/avatar-7.svg" alt=""><img src="/avatars/avatar-10.svg" alt=""></div>
      <div style="min-width:0"><div class="row" style="gap:6px"><span class="badge accent">Novidade</span><b>Coloque sua foto de perfil</b></div>
        <div class="hint">Envie uma foto sua ou escolha um dos 10 avatares de concurseiro.</div></div>
    </div>
    <div class="row" style="gap:8px"><button class="btn btn-primary btn-sm" data-aviso-avatar="abrir">${ic('camera', 'sm')} Escolher foto</button><button class="btn btn-quiet btn-sm" data-aviso-avatar="fechar">Agora não</button></div>
  </div>`;
}

function viewHome() {
  const st = stats(), h = new Date().getHours();
  return `<h1 class="page-title">${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(firstName(S.user.name))}</h1>
  <p class="page-sub">O que vamos estudar hoje?</p>
  ${avisoAvatarHtml()}
  ${viewHoje()}
  <div class="hero">
    <div class="hero-main">
      <div class="eyebrow">Gerador de questões</div>
      <h2>Envie seu resumo e receba questões no estilo da banca.</h2>
      <p>Identificamos a matéria do arquivo e criamos questões inéditas com gabarito comentado.</p>
      <button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Enviar material</button>
      <div class="hero-steps"><span>1 · Upload</span><span>2 · Matéria</span><span>3 · Banca</span><span>4 · Questões</span></div>
    </div>
    <div class="stats">
      <div class="card stat"><div class="v">${st.qs}</div><div class="l">Questões geradas</div></div>
      <div class="card stat"><div class="v">${st.taxa}</div><div class="l">Taxa de acerto</div></div>
      <div class="card stat"><div class="v">${st.feitos}</div><div class="l">Simulados concluídos</div></div>
      <div class="card stat"><div class="v">${st.provas}</div><div class="l">Provas na base da IA</div></div>
    </div>
  </div>
  <div class="section-h"><h3>Meu edital</h3><button class="btn btn-quiet" data-go="edital">${S.activeEdital ? 'Ver painel completo' : 'Enviar edital'} ${ic('arrowR', 'sm')}</button></div>
  ${S.activeEdital ? viewHomeEditalCard(S.activeEdital) : `<div class="card card-pad row" style="justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;gap:14px;align-items:center"><span class="li-icon" style="background:var(--brand);width:44px;height:44px">${ic('target')}</span>
      <div><div style="font-weight:800">Cruze seus estudos com o edital da sua prova</div><div class="hint">Envie o edital do seu concurso para ver quais tópicos cada resumo cobre, sua % de avanço e o vínculo de cada questão com o edital.</div></div></div>
    <button class="btn btn-ghost" data-go="edital">${ic('upload', 'sm')} Enviar meu edital</button></div>`}
  <div class="section-h"><h3>Meus Cadernos de Questões</h3><button class="btn btn-quiet" data-go="questoes">${S.cadernos.length ? 'Ver todos os cadernos' : 'Criar meu 1º caderno'} ${ic('arrowR', 'sm')}</button></div>
  ${S.cadernos.length ? `<div class="cad-grid" style="margin-bottom:8px">${S.cadernos.slice(0, 3).map(cadernoCardHtml).join('')}</div>` : `<div class="card card-pad row" style="justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;gap:14px;align-items:center"><span class="li-icon" style="background:var(--brand);width:44px;height:44px">${ic('book')}</span>
      <div><div style="font-weight:800">Crie um Caderno de Questões por banca, concurso ou edital</div><div class="hint">Alimente seu caderno continuamente com seus próprios conteúdos e com provas antigas da banca e revise todo o seu histórico de questões em um só lugar.</div></div></div>
    <button class="btn btn-primary" data-new-caderno-home="1">${ic('book', 'sm')} Criar caderno de questões</button></div>`}
  <div class="section-h"><h3>Bancas</h3><button class="btn btn-quiet" data-go="${isAdmin() ? 'provas' : 'contribuir'}">${isAdmin() ? 'Base de provas' : 'Enviar provas'} ${ic('arrowR', 'sm')}</button></div>
  <div class="banca-strip">${S.bancas.map((b) => `<button class="banca-tile" style="--c:${b.cor}" data-bancatile="${b.id}"><div class="bn">${b.nome}</div><div class="bf">${b.formato === 'ce' ? 'Certo ou Errado' : 'Múltipla escolha'}</div><div class="bc">${b.provasTreinadas} prova(s) treinada(s)</div></button>`).join('')}</div>
  <div class="section-h"><h3>Simulados recentes</h3>${S.sets.length ? `<button class="btn btn-quiet" data-go="questoes">Ver todos ${ic('arrowR', 'sm')}</button>` : ''}</div>
  <div class="card">${!S.loaded ? '<div class="empty"><span class="spinner sm"></span></div>' : S.sets.length ? `<div class="list">${S.sets.slice(0, 5).map(setRow).join('')}</div>` : `<div class="empty">${ic('clip')}<div>Nenhum simulado ainda.</div><div class="hint">Envie seu primeiro material para começar.</div></div>`}</div>`;
}
function setRow(s) {
  const b = BANCA()[s.banca] || { cor: '#999', nome: '?' };
  const { n, resp, ac } = placar(s);
  return `<button class="list-item" data-open="${s.id}"><span class="li-icon" style="background:${b.cor}">${esc(b.nome.slice(0, 4))}</span>
    <span class="li-main"><div class="li-title">${esc(s.materia)}${s.assunto ? ` · ${esc(s.assunto)}` : ''}</div><div class="li-meta">${n} questões · ${esc(s.arquivo || 'texto colado')} · ${fmtDate(s.createdAt)}</div></span>
    ${s.finalizado ? `<span class="badge brand">${ac}/${n} acertos</span>` : resp ? `<span class="badge accent">${resp}/${n} respondidas</span>` : '<span class="badge">Novo</span>'}
  </button>`;
}

// ---------- Gerar questões (wizard) ----------
function viewGerar() {
  const w = S.wiz || (S.wiz = newWiz());
  const steps = ['Material', 'Matéria', 'Banca', 'Questões'];
  return `<h1 class="page-title">Gerar questões</h1><p class="page-sub">Envie seu material de estudo e escolha em qual banca as questões devem se basear.</p>
  <div class="stepper">${steps.map((s, i) => `<div class="step ${w.step === i + 1 ? 'on' : w.step > i + 1 ? 'done' : ''}"><span class="n">${w.step > i + 1 ? ic('check', 'sm') : i + 1}</span><span class="lbl">${s}</span></div>`).join('')}</div>
  <div class="card card-pad">${[wizStep1, wizStep2, wizStep3, wizStep4][w.step - 1](w)}</div>`;
}
const FT = { pdf: '#B42318', docx: '#1D4ED8', doc: '#1D4ED8', txt: '#6B7684', md: '#6B7684' };
function wizEditalBox(w) {
  const list = S.editais || [];
  const selEd = list.find((e) => e.id === w.editalId);
  const selBanca = selEd?.banca && BANCA()[selEd.banca];
  if (w.editalBusy) {
    return `<div class="edital-box"><div class="row"><span class="spinner sm"></span><b>Lendo e verticalizando seu edital com a IA…</b><span class="hint">Extraindo disciplinas e tópicos do conteúdo programático.</span></div></div>`;
  }
  return `<div class="edital-box">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div style="display:flex;gap:10px;align-items:center">
        <span class="li-icon" style="background:var(--brand);width:36px;height:36px">${ic('target', 'sm')}</span>
        <div>
          <div style="font-weight:800;font-size:14px">Cruzar material com o Edital e Prova do concurso <span class="badge brand">Novo</span></div>
          <div class="hint">Relaciona seu material ao Edital, à Banca e às Provas cadastradas para calcular % de avanço e gerar questões fiéis.</div>
        </div>
      </div>
      <div class="row">
        ${list.length ? `<select class="select" id="wizEditalSel" style="width:auto;min-width:240px;padding:8px 11px;font-size:13.5px">
          <option value="">Sem edital vinculado</option>
          ${list.map((e) => { const b = e.banca && BANCA()[e.banca]; return `<option value="${e.id}" ${w.editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`; }).join('')}
        </select>` : ''}
        <button type="button" class="btn btn-ghost" id="wizToggleEditalUp" style="padding:8px 12px;font-size:13px">${ic('upload', 'sm')} ${w.showEditalUpload ? 'Cancelar' : list.length ? 'Novo edital' : 'Enviar edital'}</button>
      </div>
    </div>
    ${selEd ? `<div class="row" style="margin-top:8px;gap:8px;font-size:12.5px">
      ${selBanca ? `<span class="badge" style="background:${selBanca.cor};color:#fff">Banca: ${esc(selBanca.nome)}</span>` : ''}
      ${selEd.orgao ? `<span class="badge">Órgão: ${esc(selEd.orgao)}</span>` : ''}
      ${selEd.cargo ? `<span class="badge">Cargo: ${esc(selEd.cargo)}</span>` : ''}
      <span class="hint">A banca e as provas vinculadas a este edital serão priorizadas na geração das questões.</span>
    </div>` : ''}
    ${w.showEditalUpload ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">
      <div class="row" style="margin-bottom:10px;gap:10px">
        <div class="field" style="margin:0;min-width:200px"><label for="wizEdBanca">Banca deste edital</label>
          <select class="select" id="wizEdBanca"><option value="">Detectar automaticamente</option>${S.bancas.map((b) => `<option value="${b.id}" ${w.banca === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select>
        </div>
        ${(S.minhas || []).length ? `<div class="field" style="margin:0;flex:1;min-width:220px"><label for="wizEdProva">Vincular a uma prova enviada <span class="hint">(opcional)</span></label>
          <select class="select" id="wizEdProva"><option value="">Nenhuma prova selecionada</option>${(S.minhas || []).map((p) => `<option value="${p.id}">${esc(p.titulo)}</option>`).join('')}</select>
        </div>` : ''}
      </div>
      <label class="drop slim" id="wizEditalDrop" style="padding:18px">
        <input type="file" id="wizEditalFile" class="sr" accept=".pdf,.doc,.docx,.txt">
        <strong style="font-size:14px">${ic('upload', 'sm')} Escolha o arquivo do Edital (ou conteúdo programático)</strong>
        <span class="hint">PDF, DOCX, DOC ou TXT · A IA extrai automaticamente as matérias e tópicos</span>
      </label>
    </div>` : ''}
  </div>`;
}
function wizStep1(w) {
  if (w.uploading) return `<div class="progress-box"><div class="spinner"></div><b>Lendo seu material${w.editalId ? ' e cruzando com o edital' : ''}…</b><div class="hint">Verificando a segurança do arquivo, extraindo o texto, identificando a matéria${w.editalId ? ' e mapeando os tópicos do edital' : ''}.<br>PDFs escaneados podem levar até 1 minuto.</div></div>`;
  const m = w.material;
  if (m) {
    const ext = m.fileName ? m.fileName.split('.').pop().toLowerCase() : 'texto';
    return `${wizEditalBox(w)}<div class="file-card"><span class="ftype" style="background:${FT[ext] || 'var(--brand)'}">${esc(ext.toUpperCase())}</span>
      <div style="flex:1;min-width:0"><div class="li-title">${esc(m.fileName || 'Texto colado')}</div><div class="li-meta">${m.pages ? m.pages + ' páginas · ' : ''}${m.wordCount.toLocaleString('pt-BR')} palavras extraídas${m.editalMatch ? ` · <b style="color:var(--brand)">${m.editalMatch.cobertura_disciplina_pct}% da disciplina no edital</b>` : ''}</div></div>
      <button class="btn btn-quiet" id="resetFile">${ic('refresh', 'sm')} Trocar</button></div>
      ${(w.warnings || []).map((t) => `<div class="banner warn" style="margin:12px 0 0">${ic('alert', 'sm')}<div>${esc(t)}</div></div>`).join('')}
      <div class="preview">${esc(m.preview)}${m.wordCount > 220 ? '…' : ''}</div>
      <div class="wiz-foot"><span></span><button class="btn btn-primary" data-step="2">Continuar ${ic('arrowR', 'sm')}</button></div>`;
  }
  return `${w.err ? `<div class="banner bad">${ic('alert', 'sm')}<div>${esc(w.err)}</div></div>` : ''}
  ${wizEditalBox(w)}
  ${w.mode === 'file' ? `
    <label class="drop" id="drop"><input type="file" id="fileIn" class="sr" accept=".pdf,.doc,.docx,.txt,.md">
      <div class="big">${ic('upload', 'lg')}</div><strong>Arraste seu material de estudo aqui ou clique para escolher</strong><span class="hint">Resumos, anotações, exercícios, apostilas ou trechos de lei · até 25 MB</span>
      <div class="formats"><span class="badge">PDF</span><span class="badge">DOCX</span><span class="badge">DOC</span><span class="badge">TXT</span></div>
    </label>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-quiet" id="modePaste">Prefere colar o texto?</button></div>`
  : `<div class="field"><label for="pasteIn">Cole seu material de estudo</label><textarea class="textarea" id="pasteIn" placeholder="Cole aqui seu resumo, anotações ou o conteúdo da apostila…"></textarea><span class="hint">Mínimo de 60 palavras.</span></div>
    <div class="wiz-foot"><button class="btn btn-ghost" id="modeFile">${ic('arrowL', 'sm')} Enviar arquivo</button><button class="btn btn-primary" id="usePaste">Usar este texto ${ic('arrowR', 'sm')}</button></div>`}`;
}
function donutSvg(pct, size = 76, color = 'var(--brand)') {
  const r = 30, c = 2 * Math.PI * r, off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return `<svg width="${size}" height="${size}" viewBox="0 0 76 76" class="donut"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="8"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${Math.round(pct)}%</text></svg>`;
}
function wizStep2(w) {
  const d = w.material?.detect, em = w.material?.editalMatch;
  const opts = S.materias.map((m) => `<option ${m === w.materia ? 'selected' : ''}>${esc(m)}</option>`).join('');
  return `${d ? `<div class="detect"><span class="li-icon" style="background:var(--brand);width:48px;height:48px">${ic('spark')}</span>
     <div style="flex:1"><div class="eyebrow">${d.origem === 'palavras-chave' ? 'Sugestão por palavras-chave' : 'Matéria identificada pela IA'}</div>
       <div style="font-size:21px;font-weight:800;letter-spacing:-.01em">${esc(d.materia)}</div>
       <div class="conf"><i style="width:${Math.round((d.confianca || 0) * 100)}%"></i></div><div class="hint">Confiança de ${Math.round((d.confianca || 0) * 100)}%</div>
       ${d.resumo ? `<p style="margin:10px 0 0;color:var(--ink-2)">${esc(d.resumo)}</p>` : ''}
       ${(d.temas || []).length ? `<div class="chips" style="margin-top:10px">${d.temas.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
     </div></div>`
    : '<p style="margin-top:0">Não conseguimos identificar a matéria automaticamente. <b>Qual é a matéria deste material?</b></p>'}
  ${em ? `<div class="edital-match-card">
    <div class="row" style="justify-content:space-between;align-items:center;gap:16px">
      <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:240px">
        ${donutSvg(em.cobertura_disciplina_pct, 76, 'var(--brand)')}
        <div>
          <div class="eyebrow" style="color:var(--brand)">Cruzamento com seu Edital · ${esc(em.edital_titulo)}</div>
          <div style="font-size:17px;font-weight:800;margin:2px 0">Cobre ${em.cobertura_disciplina_pct}% de ${esc(em.disciplina_nome)} no edital</div>
          <div class="hint">${(em.topicos_cobertos || []).length} de ${em.total_topicos_disciplina || ((em.topicos_cobertos || []).length + (em.topicos_faltantes || []).length)} tópico(s) desta disciplina identificados no seu material</div>
        </div>
      </div>
      <button type="button" class="btn btn-quiet" data-go="edital">${ic('target', 'sm')} Ver edital completo</button>
    </div>
    ${em.analise ? `<p style="margin:12px 0 0;font-size:13.5px;color:var(--ink-2)">${esc(em.analise)}</p>` : ''}
    ${(em.topicos_cobertos || []).length ? `<div class="eyebrow" style="margin:14px 0 6px">Tópicos do edital abordados neste material</div>
      <div class="edital-topics-list">${em.topicos_cobertos.map((t) => `<div class="edital-topic-hit ${t.nivel_cobertura}">
        <div class="row" style="justify-content:space-between"><span style="font-weight:700;font-size:13.5px">${t.codigo ? `<b>${esc(t.codigo)}.</b> ` : ''}${esc(t.nome)}</span>
          <span class="badge ${t.nivel_cobertura === 'completo' ? 'brand' : 'accent'}">${t.nivel_cobertura === 'completo' ? '✓ Cobertura completa' : '◐ Cobertura parcial'}</span></div>
        ${t.resumo ? `<div class="hint" style="margin-top:3px">${esc(t.resumo)}</div>` : ''}
      </div>`).join('')}</div>` : ''}
    ${(em.topicos_faltantes || []).length ? `<details style="margin-top:10px"><summary>Faltam ${(em.topicos_faltantes || []).length} tópico(s) desta disciplina no edital (ver lacunas)</summary>
      <div class="chips" style="margin-top:8px">${em.topicos_faltantes.map((t) => `<span class="chip">${t.codigo ? esc(t.codigo) + '. ' : ''}${esc(t.nome)}</span>`).join('')}</div></details>` : ''}
  </div>` : ''}
  <hr style="border:0;border-top:1px solid var(--line-2);margin:22px 0">
  <div class="opts" style="margin-top:0">
    <div class="field"><label for="matSel">${d ? 'Confirme ou altere a matéria' : 'Matéria'}</label><select class="select" id="matSel"><option value="">Selecione…</option>${opts}</select></div>
    <div class="field"><label for="assIn">Assunto específico <span class="hint">(opcional)</span></label><input class="input" id="assIn" placeholder="Ex.: Atos administrativos" value="${esc(w.assunto)}"></div>
  </div>
  <div class="wiz-foot"><button class="btn btn-ghost" data-step="1">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="toStep3">Escolher banca ${ic('arrowR', 'sm')}</button></div>`;
}
function wizStep3(w) {
  const cadsForBanca = (S.cadernos || []).filter((c) => !w.banca || c.banca === w.banca);
  return `<div style="margin-bottom:14px"><div class="eyebrow">Matéria</div><b>${esc(w.materia)}${w.assunto ? ` · ${esc(w.assunto)}` : ''}</b></div>
  <div class="field" style="margin-bottom:8px"><label>Em qual banca as questões devem se basear?</label></div>
  <div class="banca-pick">${S.bancas.map((b) => `<button class="bp ${w.banca === b.id ? 'on' : ''}" style="--c:${b.cor}" data-banca="${b.id}">
     <div class="top"><span class="bdot" style="background:${b.cor}"></span><span class="bn">${b.nome}</span><span class="radio"></span></div>
     <div class="fmt">${b.formatoLabel}</div><p>${esc(b.resumo)}</p>
     <div class="tr">${b.provasTreinadas ? `${ic('brain', 'sm')} Aprendeu com ${b.provasTreinadas} prova(s) · ${b.questoesReais || 0} questões reais` : 'Usando o perfil base da banca'}</div></button>`).join('')}</div>
  <div class="opts">
    <div><div class="field" style="margin-bottom:8px"><label>Quantidade de questões</label></div><div class="seg">${[5, 10, 15, 20].map((n) => `<button data-qtd="${n}" class="${w.qtd === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div><div class="field" style="margin-bottom:8px"><label>Nível de dificuldade</label></div><div class="seg">${S.niveis.map((n) => `<button data-nivel="${n}" class="${w.nivel === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
  </div>
  ${(S.cadernos || []).length ? `<div class="edital-subbox" style="margin-top:16px">
    <div class="field" style="margin:0"><label for="wizCadSel">${ic('book', 'sm')} Alimentar qual Caderno de Questões com esta bateria? <span class="hint">(opcional)</span></label>
      <select class="select" id="wizCadSel">
        <option value="">Salvar apenas como simulado avulso</option>
        ${(cadsForBanca.length ? cadsForBanca : S.cadernos).map((c) => { const b = BANCA()[c.banca]; return `<option value="${c.id}" ${w.cadernoId === c.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(c.titulo)} (${c.totalQuestoes} questões)</option>`; }).join('')}
      </select>
    </div>
  </div>` : ''}
  ${S.quota && S.quota.remaining !== null ? `<div class="hint" style="margin-top:16px">${S.quota.remaining > 0 ? `Você ainda pode gerar ${S.quota.remaining} simulado(s) hoje${S.quota.bonus ? ` (inclui ${S.quota.bonus} crédito(s) extra(s))` : ''}.` : 'Você atingiu o limite de hoje. Envie provas para ganhar gerações extras.'}</div>` : ''}
  <div class="wiz-foot"><button class="btn btn-ghost" data-step="2">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="gen" ${w.banca ? '' : 'disabled'}>${ic('spark', 'sm')} Gerar ${w.qtd} questões</button></div>`;
}
function wizStep4(w) {
  if (w.genErr) return `<div class="banner bad">${ic('alert', 'sm')}<div>${esc(w.genErr)}</div></div><div class="wiz-foot"><button class="btn btn-ghost" data-step="3">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="gen">${ic('refresh', 'sm')} Tentar de novo</button></div>`;
  const b = BANCA()[w.banca], pct = Math.min(96, Math.round((w.genCount / w.qtd) * 100));
  const title = w.stage === 'revisando' ? 'Revisor automático conferindo cada questão…' : w.stage === 'refazendo' ? `Refazendo ${w.stageCount || ''} questão(ões) que não passaram na revisão…` : `Elaborando questões no estilo ${esc(b.nome)}…`;
  const sub = w.stage === 'revisando' ? 'Uma segunda IA resolve as questões sem ver o gabarito, usando só o seu material' : w.stage === 'refazendo' ? 'Para o seu caderno sair completo' : w.genCount ? `Questão ${Math.min(w.genCount, w.qtd)} de ${w.qtd}` : 'Analisando seu material e o estilo da banca';
  return `<div class="progress-box"><div class="spinner"></div><b>${title}</b>
    <div class="hint">${sub}</div>
    <div class="bar"><i style="width:${w.genCount ? pct : 4}%"></i></div><div class="hint" style="margin-top:14px">Isso costuma levar de 30 segundos a 2 minutos.</div></div>`;
}

async function uploadMaterial(payload) {
  const w = S.wiz; w.uploading = true; w.err = ''; render();
  try {
    if (payload instanceof FormData) { if (w.editalId) payload.append('editalId', w.editalId); }
    else if (payload && typeof payload === 'object' && w.editalId) payload.editalId = w.editalId;
    const r = payload instanceof FormData ? await api('/materials', { method: 'POST', form: payload }) : await api('/materials', { method: 'POST', body: payload });
    w.material = r.material; w.warnings = r.warnings || [];
    const d = r.material.detect, em = r.material.editalMatch;
    const suggestedMat = em?.disciplina_nome && S.materias.includes(em.disciplina_nome) ? em.disciplina_nome : d?.materia;
    w.materia = suggestedMat && S.materias.includes(suggestedMat) ? suggestedMat : (suggestedMat ? 'Outra' : '');
    if (suggestedMat && w.materia === 'Outra') w.assunto = suggestedMat;
    else if (em?.topicos_cobertos?.length === 1 && !w.assunto) w.assunto = em.topicos_cobertos[0].nome.slice(0, 100);
    if (w.editalId) refreshEditais({ silent: true });
  } catch (e) { w.err = e.message; }
  w.uploading = false; render();
}

async function generate() {
  const w = S.wiz; w.step = 4; w.generating = true; w.genErr = ''; w.genCount = 0; w.stage = ''; render();
  try {
    const res = await fetch('/api/sets', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId: w.material.id, materia: w.materia, assunto: w.assunto, banca: w.banca, qtd: w.qtd, nivel: w.nivel, cadernoId: w.cadernoId || null }) });
    if (!res.ok) { let d = {}; try { d = await res.json(); } catch {} throw new Error(d.error || `Erro ${res.status}`); }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', done = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === 'progress') { w.genCount = ev.count; if (S.view === 'gerar' && w.step === 4) render(); }
        else if (ev.type === 'stage') { w.stage = ev.stage; w.stageCount = ev.count; if (S.view === 'gerar' && w.step === 4) render(); }
        else if (ev.type === 'error') throw new Error(ev.message);
        else if (ev.type === 'done') done = ev;
      }
    }
    if (!done) throw new Error('A geração foi interrompida. Tente novamente.');
    S.sets.unshift(done.set);
    refreshCadernos({ silent: true });
    if (done.set.cadernoId) {
      S.wiz = null;
      await openCaderno(done.set.cadernoId);
    } else {
      S.wiz = null; S.active = done.set.id; go('simulado');
    }
    const rv = done.set.revisao;
    toast(`${done.set.questoes.length} questões adicionadas${done.set.cadernoId ? ' ao seu Caderno de Questões' : ''} (${BANCA()[done.set.banca].nome})${rv && rv.revisor === 'ok' ? ` · revisor conferiu todas${rv.descartadas ? `, descartou ${rv.descartadas} e refez ${rv.refeitas}` : ''}` : ''}`);
    api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {});
  } catch (e) { w.genErr = e.message; render(); }
  finally { w.generating = false; }
}

function formatTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

let modoProvaTimer = null;
function initModoProvaTimer(s) {
  if (modoProvaTimer) clearInterval(modoProvaTimer);
  if (!s || !s.modoProva || s.finalizado || !s.tempoLimiteMinutos) return;
  modoProvaTimer = setInterval(() => {
    if (S.view !== 'simulado' || S.active !== s.id || s.finalizado) {
      clearInterval(modoProvaTimer);
      return;
    }
    s.tempoGastoSegundos = (s.tempoGastoSegundos || 0) + 1;
    const totalSeg = s.tempoLimiteMinutos * 60;
    const restante = Math.max(0, totalSeg - s.tempoGastoSegundos);
    const el = $('#modoProvaCountdown');
    if (el) {
      el.textContent = formatTempo(restante);
      el.className = 'modo-prova-timer' + (restante <= 300 ? ' danger' : restante <= 900 ? ' warn' : '');
    }
    if (s.tempoGastoSegundos % 20 === 0) {
      saveSetSoon(s, { tempoGastoSegundos: s.tempoGastoSegundos });
    }
    if (restante <= 0) {
      clearInterval(modoProvaTimer);
      toast('Tempo limite atingido! Entregando a sua prova...');
      s.finalizado = true;
      api(`/sets/${s.id}`, { method: 'PATCH', body: { finalizado: true, respostas: s.respostas || {}, tempoGastoSegundos: s.tempoGastoSegundos } })
        .then((r) => { Object.assign(s, r.set); render(); })
        .catch(() => {});
    }
  }, 1000);
}

// ---------- Resolver simulado ----------
function viewPratica() {
  const s = S.sets.find((x) => x.id === S.active);
  if (!s) return `<div class="empty">Simulado não encontrado. <button class="btn btn-quiet" data-go="questoes">Voltar</button></div>`;
  const b = BANCA()[s.banca] || { nome: s.banca || 'Banca', cor: 'var(--brand)', formatoLabel: s.formato === 'ce' ? 'Certo / Errado' : 'Múltipla Escolha' };
  const r = s.respostas || {}, n = s.questoes.length;
  const { resp, ac, er, anuladas } = placar(s), ce = s.formato === 'ce';

  if (s.modoProva && !s.finalizado) {
    setTimeout(() => initModoProvaTimer(s), 50);
    const duvidas = s.duvidas || [];
    const restante = s.tempoLimiteMinutos ? Math.max(0, s.tempoLimiteMinutos * 60 - (s.tempoGastoSegundos || 0)) : null;

    return `<div class="row" style="gap:8px;margin:-6px 0 10px -10px">
      <button class="btn btn-quiet" data-go="questoes">${ic('arrowL', 'sm')} Sair da prova</button>
      ${s.cadernoId ? `<button class="btn btn-quiet" data-open-caderno="${s.cadernoId}">${ic('book', 'sm')} Caderno</button>` : ''}
    </div>
    <div class="modo-prova-header">
      <div>
        <div class="row" style="gap:8px;margin-bottom:4px">
          <span class="badge brand" style="font-weight:800">MODO PROVA OFICIAL</span>
          <span class="badge" style="background:${b.cor};color:#fff">${b.nome}</span>
          <span class="badge">${b.formatoLabel}</span>
        </div>
        <h2 style="margin:0;font-size:18px">${esc(s.materia)}</h2>
        <div class="hint">${esc(s.assunto || 'Simulado completo no padrão da banca')}</div>
      </div>
      <div class="modo-prova-timer-box">
        ${restante !== null ? `
          <div style="text-align:right">
            <div class="hint" style="font-size:11px;text-transform:uppercase;font-weight:700">Tempo restante</div>
            <div class="modo-prova-timer ${restante <= 300 ? 'danger' : restante <= 900 ? 'warn' : ''}" id="modoProvaCountdown">${formatTempo(restante)}</div>
          </div>
        ` : ''}
        <button class="btn btn-ghost" id="toggleNavGrid" style="padding:8px 12px">${ic('grid', 'sm')} Mapa (${resp}/${n})</button>
        <button class="btn btn-primary" id="finishProva">${ic('check', 'sm')} Entregar prova</button>
      </div>
    </div>

    <div class="card card-pad" id="navGridCard" style="${S.navGridOpen ? '' : 'display:none;'}margin-bottom:18px">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div style="font-weight:800;font-size:14px">Mapa de Questões / Cartão-Resposta</div>
        <div class="edital-legend" style="font-size:12px">
          <span><i style="background:var(--brand)"></i>Respondida (${resp})</span>
          <span><i style="background:#F59E0B"></i>Dúvida 🚩 (${duvidas.length})</span>
          <span><i style="background:var(--line-2)"></i>Em branco (${n - resp})</span>
        </div>
      </div>
      <div class="modo-prova-nav-grid">
        ${s.questoes.map((q, idx) => {
          const isAns = r[idx] != null;
          const isDuv = duvidas.includes(idx);
          return `<button type="button" class="q-nav-btn ${isAns ? 'ans' : ''} ${isDuv ? 'duvida' : ''}" data-goto-q="${idx}" title="Questão ${idx + 1}">${idx + 1}</button>`;
        }).join('')}
      </div>
    </div>

    ${ce ? `<div class="banner info">${ic('info', 'sm')}<div><b>Regra CEBRASPE ativa:</b> Cada item errado desconta 1 acerto. Deixar em branco (sem marcar) não desconta nem pontua. Para deixar em branco, basta clicar na alternativa marcada para desmarcar.</div></div>` : ''}

    ${s.questoes.map((q, i) => viewQModoProva(q, i, r[i], ce, duvidas.includes(i))).join('')}

    <div class="row no-print" style="justify-content:space-between;margin-top:24px">
      <div class="row"><button class="btn btn-ghost" id="copySet">${ic('copy', 'sm')} Copiar questões</button></div>
      <button class="btn btn-primary btn-lg" id="finishProva">${ic('check', 'sm')} Entregar prova oficial</button>
    </div>`;
  }

  // Se modoProva e finalizado:
  let resultadoHeader = '';
  if (s.modoProva && s.finalizado) {
    const rf = s.estatisticas?.resultadoFinal;
    const tempoGasto = s.tempoGastoSegundos || rf?.tempoGastoSegundos || 0;
    const disciplinas = rf?.disciplinas || [];

    resultadoHeader = `<div class="prova-resultado-card">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <span class="badge brand" style="font-weight:800">RESULTADO OFICIAL DO SIMULADO</span>
          <h2 style="margin:4px 0;font-size:22px">${esc(s.materia)}</h2>
          <div class="hint">Banca ${b.nome} · Formato ${b.formatoLabel}</div>
        </div>
        ${s.cadernoId ? `<button class="btn btn-primary" data-open-caderno="${s.cadernoId}">${ic('book', 'sm')} Revisar erros no Caderno</button>` : ''}
      </div>
      <div class="prova-score-main">
        <div class="prova-score-badge">
          <div class="score-val" style="color:${ce ? (ac - er >= 0 ? 'var(--brand)' : 'var(--bad)') : 'var(--brand)'}">
            ${ce ? `${ac - er > 0 ? '+' : ''}${ac - er}` : `${Math.round((ac / Math.max(1, n)) * 100)}%`}
          </div>
          <div class="score-lbl">${ce ? 'Pontos Líquidos' : `${ac} de ${n} acertos`}</div>
        </div>
        <div style="flex:1;min-width:220px">
          <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px">
            <div class="card stat"><div class="v" style="color:var(--ok)">+${ac}</div><div class="l">Acertos</div></div>
            <div class="card stat"><div class="v" style="color:var(--bad)">-${er}</div><div class="l">Erros</div></div>
            <div class="card stat"><div class="v">${n - resp}</div><div class="l">Em Branco (0)</div></div>
            <div class="card stat"><div class="v">${formatTempo(tempoGasto)}</div><div class="l">Tempo Gasto</div></div>
          </div>
        </div>
      </div>
      ${disciplinas.length ? `
        <div style="font-weight:800;font-size:14px;margin-bottom:8px">Desempenho por Disciplina do Edital</div>
        <div class="prova-disc-grid">
          ${disciplinas.map((d) => `
            <div class="prova-disc-item">
              <div class="row" style="justify-content:space-between;margin-bottom:4px;font-size:13px">
                <b>${esc(d.materia)}</b>
                <span>${d.acertos}/${d.total} (${d.taxaAcerto ?? Math.round((d.acertos / Math.max(1, d.total)) * 100)}%)</span>
              </div>
              <div class="edital-track"><i style="width:${Math.round((d.acertos / Math.max(1, d.total)) * 100)}%;background:${(d.acertos / Math.max(1, d.total)) >= 0.7 ? 'var(--ok)' : 'var(--accent)'}"></i></div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>`;
  }

  return `<div class="row" style="gap:8px;margin:-6px 0 10px -10px">
    <button class="btn btn-quiet" data-go="questoes">${ic('arrowL', 'sm')} Cadernos e simulados</button>
    ${s.cadernoId ? `<button class="btn btn-quiet" data-open-caderno="${s.cadernoId}">${ic('book', 'sm')} Abrir Caderno de Questões</button>` : ''}
  </div>
  ${resultadoHeader}
  ${!resultadoHeader ? `
  <div class="set-head">
    <div><div class="row" style="margin-bottom:6px"><span class="badge" style="background:${b.cor};color:#fff">${b.nome}</span><span class="badge">${esc(s.nivel)}</span><span class="badge">${b.formatoLabel}</span></div>
      <h1 class="page-title">${esc(s.materia)}${s.assunto ? ` <span style="color:var(--muted);font-weight:700">· ${esc(s.assunto)}</span>` : ''}</h1>
      <div class="hint">${n} questões · gerado de ${esc(s.arquivo || 'texto colado')} em ${fmtDate(s.createdAt)}</div>
      ${s.revisao ? `<div class="hint" style="margin-top:4px">${s.revisao.revisor === 'ok' ? `${ic('check', 'sm')} Revisão automática: ${s.revisao.aprovadas} aprovada(s)${s.revisao.descartadas ? `, ${s.revisao.descartadas} descartada(s) e ${s.revisao.refeitas} refeita(s)` : ''}` : s.revisao.revisor === 'indisponivel' ? '⚠ O revisor automático estava indisponível: confira as questões com atenção' : ''}</div>` : ''}</div>
    <div class="score-box"><div><b>${resp}/${n - anuladas}</b><span>Respondidas</span></div><div><b style="color:var(--ok)">${ac}</b><span>Acertos</span></div><div><b style="color:var(--bad)">${er}</b><span>Erros</span></div>${ce ? `<div><b>${ac - er}</b><span>Nota líquida</span></div>` : ''}</div>
  </div>` : ''}
  ${ce && !resultadoHeader ? `<div class="banner info">${ic('info', 'sm')}<div>No estilo CEBRASPE, cada item errado anula um certo. Na dúvida, você pode deixar o item em branco.</div></div>` : ''}
  ${!s.modoProva ? `<div class="banner info">${ic('info', 'sm')}<div>As questões seguem o conteúdo do <b>seu material</b>. Se ele estiver desatualizado (ex.: lei alterada), a questão também estará. Achou um erro? Use <b>Reportar erro</b> — se a IA confirmar, você ganha estrelas.</div></div>` : ''}
  ${s.questoes.map((q, i) => viewQ(q, i, r[i], ce, (S.feedback[s.id] || {})[i], s)).join('')}
  <div class="row no-print" style="justify-content:space-between;margin-top:20px">
    <div class="row"><button class="btn btn-ghost" id="copySet">${ic('copy', 'sm')} Copiar questões</button><button class="btn btn-ghost" id="printSet">${ic('download', 'sm')} Imprimir / PDF</button><button class="btn btn-danger" id="delSet">${ic('trash', 'sm')} Excluir</button></div>
    <div class="row">${resp ? `<button class="btn btn-ghost" id="resetSet">${ic('refresh', 'sm')} Refazer</button>` : ''}<button class="btn btn-primary" id="finish">${s.finalizado ? 'Ver resultado' : 'Finalizar simulado'}</button></div>
  </div>`;
}

function renderExplicacaoCard(expData) {
  if (!expData) return '';
  const exp = expData.explicacao || expData;
  const isCached = !!expData.cached;
  return `
    <div class="pq-card" role="region" aria-label="Explicação didática do erro">
      <div class="pq-header">
        <div class="pq-title-row">
          <span class="pq-badge-prof">👨‍🏫 Professor Descomplicado</span>
          <h4 class="pq-title">Por que você errou esta questão?</h4>
        </div>
        ${isCached
          ? `<span class="badge brand" title="Explicação reutilizada instantaneamente com custo US$ 0">⚡ Resposta Instantânea</span>`
          : `<span class="badge accent">✨ Nova Análise IA</span>`}
      </div>

      <div class="pq-body">
        <div class="pq-section pq-diagnostico">
          <div class="pq-sec-title">🎯 Onde seu raciocínio foi fisgado</div>
          <p class="pq-text">${esc(exp.diagnostico)}</p>
          ${exp.pegadinha ? `<div class="pq-pega-box">
            <span class="pq-pega-tag">🍌 Casca de banana da banca</span>
            <p class="pq-pega-text">${esc(exp.pegadinha)}</p>
          </div>` : ''}
        </div>

        ${exp.exemploCotidiano ? `
        <div class="pq-section pq-exemplo">
          <div class="pq-sec-title">🍕 Exemplo do Cotidiano (para não esquecer mais)</div>
          <div class="pq-cotidiano-box">
            <p class="pq-text pq-cotidiano-text">${esc(exp.exemploCotidiano)}</p>
          </div>
        </div>` : ''}

        ${exp.fundamentacao ? `
        <div class="pq-section pq-fundamentacao">
          <div class="pq-sec-title">⚖️ Embasamento Legal & Teórico</div>
          <div class="pq-law-box">
            <p class="pq-text pq-law-text">${esc(exp.fundamentacao)}</p>
          </div>
        </div>` : ''}

        ${exp.dicaOuro ? `
        <div class="pq-section pq-dica">
          <div class="pq-sec-title">🧠 Dica de Ouro</div>
          <div class="pq-gold-box">
            <p class="pq-gold-text"><b>💡 Macete:</b> ${esc(exp.dicaOuro)}</p>
          </div>
        </div>` : ''}

        ${exp.visualSvg ? `
        <div class="pq-section pq-visual">
          <div class="pq-sec-title">🎨 Diagrama Visual Conceitual</div>
          <div class="pq-svg-container">${exp.visualSvg}</div>
        </div>` : ''}
      </div>
    </div>
  `;
}

function viewQModoProva(q, i, ans, ce, isDuvida) {
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button type="button" class="alt ${ans === L ? 'selected-prova' : ''}" data-ans="${i}:${L}"><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${q.alternativas.map((a, j) => `<button type="button" class="alt ${ans === LETRAS[j] ? 'selected-prova' : ''}" data-ans="${i}:${LETRAS[j]}"><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;

  return `<article class="card q" id="q${i}">
    <div class="q-top">
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="q-num">${ce ? 'Item' : 'Questão'} ${i + 1}</span>
        ${q.materia ? `<span class="badge" style="background:var(--brand-soft);color:var(--brand);font-weight:700">${esc(q.materia)}</span>` : ''}
        ${q.tema && q.tema !== q.materia ? `<span class="badge">${esc(q.tema)}</span>` : ''}
        ${q.topico_edital ? `<span class="badge edital-tag">${ic('target', 'sm')} ${esc(q.topico_edital)}</span>` : ''}
      </div>
      <button type="button" class="btn btn-quiet btn-duvida ${isDuvida ? 'active' : ''}" data-toggle-duvida="${i}">
        ${isDuvida ? '🚩 Marcada como dúvida' : '⚐ Marcar dúvida'}
      </button>
    </div>
    <p class="q-text">${esc(q.enunciado)}</p>
    ${opts}
    <div class="q-prova-actions">
      <span class="hint">${ans ? `Marcada: <b>${ans === 'C' ? 'Certo' : ans === 'E' && ce ? 'Errado' : ans}</b>` : 'Não respondida'}</span>
      ${ce && ans ? `<button type="button" class="btn btn-quiet" data-clear-ans="${i}" style="font-size:12px;padding:4px 8px">Deixar em branco</button>` : ''}
    </div>
  </article>`;
}
function viewQ(q, i, ans, ce, fb, s = null) {
  const answered = ans != null, ok = ans === q.gabarito;
  const cls = (L) => (!answered ? '' : L === q.gabarito ? 'correct' : L === ans ? 'wrong' : '');
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button class="alt ${cls(L)}" data-ans="${i}:${L}" ${answered ? 'disabled' : ''}><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${q.alternativas.map((a, j) => `<button class="alt ${cls(LETRAS[j])}" data-ans="${i}:${LETRAS[j]}" ${answered ? 'disabled' : ''}><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;
  const setId = s?.id || S.activeSet?.id || '';
  const expKey = setId ? `set:${setId}:${i}` : null;
  const expData = expKey && S.explicacoes ? S.explicacoes[expKey] : null;
  const expLoading = expKey && S.explicacaoLoading ? S.explicacaoLoading[expKey] : false;

  return `<article class="card q" id="q${i}">
    <div class="q-top"><span class="q-num">${ce ? 'Item' : 'Questão'} ${i + 1}</span>${q.tema ? `<span class="badge">${esc(q.tema)}</span>` : ''}${q.topico_edital ? `<span class="badge edital-tag" title="Tópico do edital cobrado nesta questão">${ic('target', 'sm')} Edital: ${esc(q.topico_edital)}</span>` : ''}${q.nivel ? `<span class="badge">${esc(q.nivel)}</span>` : ''}${q.verificada ? `<span class="badge brand" title="Uma segunda IA resolveu sem ver o gabarito e chegou à mesma resposta">${ic('check', 'sm')} Verificada</span>` : ''}${q.contestada ? '<span class="sev high">Erro confirmado</span>' : ''}${q.anulada ? '<span class="badge sev high" title="A banca anulou esta questão no gabarito definitivo">Anulada pela banca — não conta</span>' : q.gabaritoAtualizado ? '<span class="badge accent" title="Gabarito conferido com o definitivo oficial">Gabarito atualizado (definitivo)</span>' : ''}</div>
    <p class="q-text">${esc(q.enunciado)}</p>${opts}
    ${answered ? `<div class="explain"><div class="verdict ${ok ? 'ok' : 'bad'}">${ic(ok ? 'check' : 'x', 'sm')} ${ok ? 'Você acertou' : 'Resposta incorreta'} · Gabarito: ${ce ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : q.gabarito}</div>
      <p>${esc(q.comentario)}</p>
      ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”<div class="hint" style="font-style:normal;margin-top:4px">${q.ancorada === false ? '⚠ Trecho não localizado exatamente no seu material — confira' : q.ancorada ? '✓ Trecho conferido no seu material' : 'Trecho do seu material'}</div></div>` : ''}
      ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
      ${!ok ? `<div class="row no-print" style="margin-top:12px;gap:8px">
        <button type="button" class="btn btn-ghost btn-pq-errei" data-pq-errei="${i}">
          ${expLoading ? `<span class="spinner sm" style="width:13px;height:13px;display:inline-block;vertical-align:-2px"></span> Analisando seu erro...` : `💡 Por que errei?`}
        </button>
      </div>
      ${expData ? renderExplicacaoCard(expData) : ''}` : ''}
      ${q.contestada ? `<div class="banner warn" style="margin:12px 0 0">${ic('alert', 'sm')}<div><b>Erro confirmado após reporte.</b> ${q.contestada.respostaCorreta ? `Resposta sustentada pelo material: <b>${esc(q.contestada.respostaCorreta)}</b>. ` : ''}${q.contestada.ambigua ? 'A questão é ambígua. ' : ''}${esc(q.contestada.explicacao)}</div></div>` : ''}</div>
    ${viewFeedbackBar(i, fb)}` : ''}
  </article>`;
}
function viewFeedbackBar(i, fb = {}) {
  const st = fb.reportStatus || 'none';
  const res = fb.result || {};
  let rep = '';
  if (S.reportOpen === i) rep = `<div class="report-box"><label class="hint" for="rep${i}">O que está errado nesta questão?</label><textarea class="textarea" id="rep${i}" maxlength="600" style="min-height:70px" placeholder="Ex.: o gabarito deveria ser C, porque o material diz que..."></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-quiet" data-repcancel>Cancelar</button><button class="btn btn-primary" data-repsend="${i}">${ic('flag', 'sm')} Enviar para verificação</button></div></div>`;
  else if (st === 'pending') rep = `<span class="hint"><span class="spinner sm" style="width:12px;height:12px"></span> Erro em verificação pela IA…</span>`;
  else if (st === 'confirmed') rep = `<span class="fb-ok">${ic('star', 'sm')} Erro confirmado${res.estrelas ? ` · +${res.estrelas} estrelas` : ''}. Obrigado!</span>`;
  else if (st === 'rejected') rep = `<div class="hint"><b>Reporte não confirmado:</b> ${esc(res.explicacao || '')}</div>`;
  else if (st === 'failed') rep = `<span class="hint">${esc(res.explicacao || 'Não foi possível verificar.')}</span> <button class="link-btn" data-repopen="${i}">Tentar de novo</button>`;
  else rep = `<button class="link-btn" data-repopen="${i}">${ic('flag', 'sm')} Reportar erro</button>`;
  return `<div class="fb-bar"><span class="hint">Esta questão foi boa?</span>
    <button class="fb-btn ${fb.rating === 1 ? 'on' : ''}" data-rate="${i}:1" aria-label="Gostei" title="Gostei">${ic('thumbUp', 'sm')}</button>
    <button class="fb-btn ${fb.rating === -1 ? 'on bad' : ''}" data-rate="${i}:-1" aria-label="Não gostei" title="Não gostei">${ic('thumbDown', 'sm')}</button>
    <span class="spacer"></span>${rep}</div>`;
}
let saveT;
function saveSetSoon(s, patch) { clearTimeout(saveT); saveT = setTimeout(() => api(`/sets/${s.id}`, { method: 'PATCH', body: patch }).catch(() => toast('Não foi possível salvar suas respostas.')), 700); }
function setText(s) {
  const b = BANCA()[s.banca];
  return `HelpConcurso · ${s.materia}${s.assunto ? ' · ' + s.assunto : ''} · estilo ${b.nome}\n\n` + s.questoes.map((q, i) => `${i + 1}. ${q.enunciado}\n${s.formato === 'ce' ? '( ) Certo  ( ) Errado' : q.alternativas.map((a, j) => `${LETRAS[j]}) ${a}`).join('\n')}`).join('\n\n') + '\n\nGABARITO\n' + s.questoes.map((q, i) => `${i + 1}-${q.gabarito}`).join('  ');
}

// ---------- Cadernos de Questões + Simulados + Caderno de Erros ----------
async function refreshCadernos({ silent = false } = {}) {
  try {
    const r = await api('/cadernos');
    S.cadernos = r.cadernos || [];
    S.materiaisDisponiveis = r.materiaisDisponiveis || [];
    S.provasDisponiveis = r.provasDisponiveis || [];
    if (!silent && S.screen === 'app') render();
  } catch { /* opcional */ }
}

async function openCaderno(id) {
  S.cadernoBusy = true;
  S.view = 'caderno';
  render();
  try {
    const r = await api(`/cadernos/${id}`);
    S.activeCaderno = r.caderno;
  } catch (e) {
    toast(e.message);
    S.view = 'questoes';
  }
  S.cadernoBusy = false;
  render();
  window.scrollTo({ top: 0 });
}

function cadernoCardHtml(c) {
  const b = BANCA()[c.banca] || { nome: c.banca, cor: '#0F6E56' };
  return `<div class="card card-pad cad-card" style="--c:${b.cor}">
    <div>
      <div class="row" style="gap:6px;margin-bottom:8px">
        <span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>
        ${c.orgao ? `<span class="badge">${esc(c.orgao)}</span>` : ''}
        ${c.cargo ? `<span class="badge">${esc(c.cargo)}</span>` : ''}
        ${c.ano ? `<span class="badge">${esc(c.ano)}</span>` : ''}
        ${c.editalTitulo ? `<span class="badge edital-tag" title="Edital vinculado">${ic('target', 'sm')} ${esc(c.editalTitulo)}</span>` : ''}
      </div>
      <div style="font-size:17px;font-weight:800;line-height:1.3;margin-bottom:4px">${esc(c.titulo)}</div>
      <div class="hint">${c.materiaisCount} conteúdo(s) seu(s) · ${c.provasCount} prova(s) antiga(s) da banca${c.favoritasCount ? ` · ★ ${c.favoritasCount} favorita(s)` : ''}</div>
    </div>
    <div class="cad-kpis">
      <div><b>${c.totalQuestoes}</b><span>Questões (${c.questoesIa} IA · ${c.questoesProvas} provas)</span></div>
      <div><b>${c.respondidas}/${c.totalQuestoes}</b><span>Respondidas</span></div>
      <div><b style="color:${(c.taxaAcerto ?? 0) >= 70 ? 'var(--ok)' : 'var(--ink)'}">${c.taxaAcerto != null ? c.taxaAcerto + '%' : '—'}</b><span>Taxa de acerto</span></div>
    </div>
    <div class="row" style="justify-content:space-between;gap:8px">
      <div class="row" style="gap:6px">
        <button type="button" class="btn btn-quiet" style="padding:6px 10px;font-size:12.5px" data-cad-feed-mat="${c.id}" title="Alimentar com mais conteúdo seu">+ Meu conteúdo</button>
        <button type="button" class="btn btn-quiet" style="padding:6px 10px;font-size:12.5px" data-cad-feed-prova="${c.id}" title="Alimentar com provas antigas da banca">+ Prova antiga</button>
      </div>
      <button type="button" class="btn btn-primary" style="padding:8px 14px;font-size:13px" data-open-caderno="${c.id}">${ic('book', 'sm')} Revisar caderno ${ic('arrowR', 'sm')}</button>
    </div>
  </div>`;
}

function getWrongQuestions() {
  const out = [];
  for (const s of S.sets || []) {
    const r = s.respostas || {};
    (s.questoes || []).forEach((q, i) => {
      if (!q.anulada && r[i] != null && r[i] !== q.gabarito) {
        out.push({ setId: s.id, setMateria: s.materia, setAssunto: s.assunto, banca: s.banca, formato: s.formato, createdAt: s.createdAt, idx: i, ans: r[i], q });
      }
    });
  }
  return out;
}

function viewBanco() {
  const f = S.filter, tab = S.bancoTab || 'cadernos';
  const mats = [...new Set(S.sets.map((s) => s.materia))].sort();
  const list = S.sets.filter((s) => (!f.banca || s.banca === f.banca) && (!f.materia || s.materia === f.materia));
  const allWrong = getWrongQuestions();
  const wrongList = allWrong.filter((w) => (!f.banca || w.banca === f.banca) && (!f.materia || w.setMateria === f.materia));
  const cads = (S.cadernos || []).filter((c) => !f.banca || c.banca === f.banca);
  const cf = S.cadForm || (S.cadForm = { banca: S.activeEdital?.banca || 'cebraspe', editalId: S.activeEdital?.id || '', orgao: S.activeEdital?.orgao || '', cargo: S.activeEdital?.cargo || '', ano: S.activeEdital?.ano || '', titulo: '', descricao: '', importarExistentes: true });
  const showNewForm = S.cadernoNewOpen || !(S.cadernos || []).length;

  return `<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:14px">
    <div>
      <h1 class="page-title">Cadernos de questões</h1>
      <p class="page-sub" style="margin-bottom:0">Crie um caderno para cada banca, concurso ou edital, alimente-o com mais conteúdos seus e com provas antigas da banca e revise seu histórico de questões.</p>
    </div>
    <div class="row">
      <button type="button" class="btn btn-ghost" id="btnToggleNewCad">${ic('book', 'sm')} ${S.cadernoNewOpen ? 'Fechar formulário' : '+ Novo caderno'}</button>
      <button type="button" class="btn btn-primary" data-go="gerar">${ic('spark', 'sm')} Gerar questões</button>
    </div>
  </div>

  <div class="tabs" style="max-width:620px;margin-bottom:16px">
    <button type="button" class="${tab === 'cadernos' ? 'on' : ''}" data-btab="cadernos">Meus cadernos (${(S.cadernos || []).length})</button>
    <button type="button" class="${tab === 'simulados' ? 'on' : ''}" data-btab="simulados">Baterias geradas (${S.sets.length})</button>
    <button type="button" class="${tab === 'erros' ? 'on' : ''}" data-btab="erros">Caderno de erros (${allWrong.length})</button>
  </div>

  ${tab === 'cadernos' && showNewForm ? `<form class="card card-pad" id="newCadForm" style="margin-bottom:18px" novalidate>
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div><h3 style="margin:0;font-size:17px">Criar novo Caderno de Questões</h3>
        <div class="hint">Configure o caderno para uma banca específica, um concurso (órgão/cargo) ou um edital cadastrado.</div></div>
      ${(S.cadernos || []).length ? `<button type="button" class="btn btn-quiet" id="btnCancelNewCad">${ic('x', 'sm')} Fechar</button>` : ''}
    </div>
    <div class="field" style="margin-bottom:8px"><label>1. Banca examinadora do caderno</label></div>
    <div class="banca-tabs" style="flex-wrap:wrap;margin-bottom:14px">
      ${S.bancas.map((b) => `<button type="button" class="btab ${cf.banca === b.id ? 'on' : ''}" data-cad-banca="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}
    </div>
    <div class="opts" style="margin-top:0;margin-bottom:12px">
      <div class="field" style="margin:0">
        <label for="cadEditalSel">2. Edital vinculado <span class="hint">(opcional — preenche órgão/cargo automaticamente)</span></label>
        <select class="select" id="cadEditalSel">
          <option value="">Sem edital específico (caderno geral da banca/concurso)</option>
          ${(S.editais || []).map((e) => { const b = e.banca && BANCA()[e.banca]; return `<option value="${e.id}" ${cf.editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`; }).join('')}
        </select>
      </div>
      <div class="field" style="margin:0">
        <label for="cadTitulo">Nome do caderno <span class="hint">(opcional — gerado automaticamente se vazio)</span></label>
        <input class="input" id="cadTitulo" maxlength="160" placeholder="Ex.: Caderno Reta Final BB — TI (Cesgranrio)" value="${esc(cf.titulo)}">
      </div>
    </div>
    <div class="up-grid" style="margin-bottom:14px">
      <div class="field" style="margin:0"><label for="cadOrgao">Concurso / Órgão <span class="hint">(opcional)</span></label><input class="input" id="cadOrgao" maxlength="120" placeholder="Ex.: Banco do Brasil, PF, TRF-1" value="${esc(cf.orgao)}"></div>
      <div class="field" style="margin:0"><label for="cadCargo">Cargo <span class="hint">(opcional)</span></label><input class="input" id="cadCargo" maxlength="120" placeholder="Ex.: Agente de Tecnologia" value="${esc(cf.cargo)}"></div>
      <div class="field" style="margin:0"><label for="cadAno">Ano <span class="hint">(opcional)</span></label><input class="input" id="cadAno" inputmode="numeric" maxlength="4" placeholder="Ex.: 2024" value="${esc(cf.ano)}"></div>
    </div>
    <label class="row" style="gap:8px;cursor:pointer;font-size:13.5px;margin-bottom:16px">
      <input type="checkbox" id="cadImportar" ${cf.importarExistentes ? 'checked' : ''}>
      <span>Reunir automaticamente neste caderno minhas questões já geradas, meus conteúdos e provas antigas desta banca/edital</span>
    </label>
    <div class="row" style="justify-content:flex-end">
      <button type="submit" class="btn btn-primary" ${S.cadernoBusy ? 'disabled' : ''}>${S.cadernoBusy ? '<span class="spinner sm"></span> Criando…' : `${ic('book', 'sm')} Criar Caderno de Questões`}</button>
    </div>
  </form>` : ''}

  ${tab === 'cadernos'
    ? cads.length
      ? `<div class="cad-grid">${cads.map(cadernoCardHtml).join('')}</div>`
      : `<div class="card"><div class="empty">${ic('book')}<div>Nenhum caderno criado ainda.</div><div class="hint">Use o formulário acima para criar seu primeiro Caderno de Questões por banca, concurso ou edital!</div></div></div>`
    : tab === 'simulados'
      ? `${S.sets.length ? `<div class="filters"><select class="select" id="fBanca"><option value="">Todas as bancas</option>${S.bancas.map((b) => `<option value="${b.id}" ${f.banca === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select>
          <select class="select" id="fMat"><option value="">Todas as matérias</option>${mats.map((m) => `<option ${f.materia === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>` : ''}
         <div class="card">${list.length ? `<div class="list">${list.map(setRow).join('')}</div>` : `<div class="empty">${ic('clip')}<div>${S.sets.length ? 'Nenhuma bateria com esses filtros.' : 'Você ainda não gerou questões.'}</div></div>`}</div>`
      : wrongList.length
        ? `<div class="contrib-stack">${wrongList.map((w) => {
            const b = BANCA()[w.banca] || { nome: w.banca, cor: '#666' };
            const q = w.q;
            const topico = q.topico_edital || q.tema || w.setAssunto || '';
            return `<article class="card q">
              <div class="row" style="justify-content:space-between;margin-bottom:10px">
                <div class="row" style="gap:6px">
                  <span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>
                  <span class="badge">${esc(w.setMateria)}</span>
                  ${topico ? `<span class="badge edital-tag">${ic('target', 'sm')} ${esc(topico)}</span>` : ''}
                </div>
                <div class="row" style="gap:8px">
                  <button type="button" class="btn btn-quiet" data-open="${w.setId}">Abrir bateria</button>
                  <button type="button" class="btn btn-primary" style="padding:7px 12px;font-size:12.5px" data-revanche="${esc(w.setMateria)}||${esc(topico)}||${esc(w.banca)}">${ic('spark', 'sm')} Gerar revanche IA neste tópico</button>
                </div>
              </div>
              <p class="q-text" style="margin-bottom:12px">${esc(q.enunciado)}</p>
              <div class="explain" style="margin-top:0">
                <div class="verdict bad">${ic('x', 'sm')} Você marcou ${esc(w.ans)} · Gabarito correto: <b>${esc(q.gabarito)}</b></div>
                <p>${esc(q.comentario)}</p>
                ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”</div>` : ''}
                ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
              </div>
            </article>`;
          }).join('')}</div>`
        : `<div class="card"><div class="empty">${ic('check')}<div>${allWrong.length ? 'Nenhum erro encontrado para esses filtros.' : 'Nenhum erro registrado ainda! Resolva suas questões para alimentar o Caderno de Erros.'}</div></div></div>`}`;
}

function viewCaderno() {
  if (S.cadernoBusy && !S.activeCaderno) return '<div class="progress-box"><div class="spinner"></div><b>Abrindo seu Caderno de Questões…</b></div>';
  const c = S.activeCaderno;
  if (!c) return `<div class="empty">Caderno não encontrado. <button class="btn btn-quiet" data-go="questoes">Voltar aos cadernos</button></div>`;
  const b = BANCA()[c.banca] || { nome: c.banca, cor: '#0F6E56', formatoLabel: '' };
  const f = S.cadFilter;
  const ft = S.cadernoFeedTab;
  const provasDaBanca = (S.provasDisponiveis || []).filter((p) => p.banca === c.banca && !(c.provas || []).some((cp) => cp.id === p.id));
  const matsDisp = S.materiaisDisponiveis || [];
  const setsSoltos = (S.sets || []).filter((s) => s.cadernoId !== c.id);

  // Filtra as questões do histórico do caderno
  const qNorm = String(f.q || '').trim().toLowerCase();
  const filtered = (c.questoes || []).filter((q) => {
    if (f.origem !== 'all' && q.origem !== f.origem) return false;
    if (f.materia && q.materia !== f.materia) return false;
    if (f.status === 'unanswered' && q.ans != null) return false;
    if (f.status === 'wrong' && (q.ans == null || q.ans === q.gabarito)) return false;
    if (f.status === 'correct' && (q.ans == null || q.ans !== q.gabarito)) return false;
    if (f.status === 'revisao_hoje' && (!q.revisao || !q.revisao.paraRevisarHoje)) return false;
    if (f.status === 'dominadas' && (!q.revisao || !q.revisao.dominada)) return false;
    if (f.status === 'fav' && !q.favorita) return false;
    if (f.status === 'notes' && !q.anotacao) return false;
    if (qNorm && !`${q.enunciado} ${q.materia} ${q.assunto} ${q.topico_edital} ${q.anotacao}`.toLowerCase().includes(qNorm)) return false;
    return true;
  });

  return `<div class="row no-print" style="justify-content:space-between;margin:-6px 0 10px -10px">
    <button class="btn btn-quiet" data-go="questoes">${ic('arrowL', 'sm')} Todos os Cadernos de Questões</button>
    <div class="row" style="gap:6px">
      ${c.editalId ? `<button class="btn btn-quiet" data-open-edital="${c.editalId}">${ic('target', 'sm')} Ver Edital vinculado</button>` : ''}
      <button class="btn btn-quiet" id="printCaderno">${ic('download', 'sm')} Imprimir / PDF</button>
      <button class="btn btn-quiet" id="delCaderno" style="color:var(--bad)">${ic('trash', 'sm')} Excluir caderno</button>
    </div>
  </div>

  <div class="set-head" style="border-top:4px solid ${b.cor}">
    <div style="flex:1;min-width:240px">
      <div class="row" style="gap:6px;margin-bottom:6px">
        <span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>
        ${c.orgao ? `<span class="badge">${esc(c.orgao)}</span>` : ''}
        ${c.cargo ? `<span class="badge">${esc(c.cargo)}</span>` : ''}
        ${c.ano ? `<span class="badge">${esc(c.ano)}</span>` : ''}
        ${c.editalTitulo ? `<span class="badge edital-tag">${ic('target', 'sm')} Edital: ${esc(c.editalTitulo)}</span>` : ''}
      </div>
      <h1 class="page-title">${esc(c.titulo)}</h1>
      <div class="hint">${c.totalQuestoes} questões acumuladas (${c.questoesIa} geradas do seu conteúdo · ${c.questoesProvas} de provas antigas da banca) · ${(c.materiais || []).length} conteúdo(s) · ${(c.provas || []).length} prova(s)</div>
    </div>
    <div class="score-box">
      <div><b>${c.totalQuestoes}</b><span>No caderno</span></div>
      <div><b>${c.respondidas}/${c.totalQuestoes}</b><span>Resolvidas</span></div>
      <div><b style="color:var(--ok)">${c.acertos}${c.taxaAcerto != null ? ` (${c.taxaAcerto}%)` : ''}</b><span>Acertos</span></div>
      <div><b style="color:var(--bad)">${c.erros}</b><span>Para revisar</span></div>
      <div><b style="color:var(--brand)">🔔 ${c.revisaoHojeCount || 0}</b><span>Revisar hoje</span></div>
      <div><b style="color:var(--ok)">✔ ${c.dominadasCount || 0}</b><span>Dominadas</span></div>
      <div><b style="color:#8A5A12">★ ${c.favoritasCount}</b><span>Favoritas</span></div>
    </div>
  </div>

  <div class="cad-feed-bar no-print">
    <button type="button" class="btn ${ft === 'material' ? 'btn-primary' : 'btn-ghost'}" data-cad-ftab="${ft === 'material' ? '' : 'material'}">${ic('upload', 'sm')} + Alimentar com meu conteúdo</button>
    <button type="button" class="btn ${ft === 'prova' ? 'btn-primary' : 'btn-ghost'}" data-cad-ftab="${ft === 'prova' ? '' : 'prova'}">${ic('brain', 'sm')} + Alimentar com provas antigas da ${esc(b.nome)}</button>
    ${setsSoltos.length ? `<button type="button" class="btn ${ft === 'simulado' ? 'btn-primary' : 'btn-ghost'}" data-cad-ftab="${ft === 'simulado' ? '' : 'simulado'}">${ic('list', 'sm')} + Anexar bateria já gerada (${setsSoltos.length})</button>` : ''}
  </div>

  ${ft === 'material' ? `<div class="cad-feed-panel no-print">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><b style="font-size:15px">📄 Alimentar caderno com mais conteúdo seu</b>
        <div class="hint">Envie um novo resumo/apostila ou escolha um material já enviado para gerar novas questões inéditas no estilo ${esc(b.nome)} direto neste caderno.</div></div>
      <button type="button" class="btn btn-quiet" data-cad-ftab="">${ic('x', 'sm')} Fechar</button>
    </div>
    <div class="opts" style="margin-top:8px">
      <div>
        <button type="button" class="btn btn-primary btn-block" id="cadGoWizNewMat">${ic('upload', 'sm')} Enviar novo arquivo ou texto e gerar questões neste caderno</button>
      </div>
      ${matsDisp.length ? `<div class="row" style="gap:8px;flex-wrap:nowrap">
        <select class="select" id="cadPickMat" style="flex:1">
          <option value="">Ou escolha um conteúdo que você já enviou…</option>
          ${matsDisp.map((m) => `<option value="${m.id}">${esc(m.fileName)}${m.materia ? ` (${esc(m.materia)})` : ''} · ${m.wordCount} palavras</option>`).join('')}
        </select>
        <button type="button" class="btn btn-ghost" id="cadUseExistingMat" ${S.cadFeedBusy ? 'disabled' : ''}>Gerar +questões</button>
      </div>` : ''}
    </div>
  </div>` : ''}

  ${ft === 'prova' ? `<div class="cad-feed-panel no-print">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><b style="font-size:15px">🏛️ Alimentar caderno com provas antigas da banca (${esc(b.nome)})</b>
        <div class="hint">Importe questões reais de provas anteriores da ${esc(b.nome)} para resolver no seu caderno e refinar ainda mais o estilo da IA neste concurso.</div></div>
      <button type="button" class="btn btn-quiet" data-cad-ftab="">${ic('x', 'sm')} Fechar</button>
    </div>
    <div class="opts" style="margin-top:8px;align-items:flex-end">
      <div>
        <label class="hint" for="cadPickProva" style="display:block;margin-bottom:6px">Escolher prova da ${esc(b.nome)} já disponível na base</label>
        <div class="row" style="gap:8px;flex-wrap:nowrap">
          <select class="select" id="cadPickProva" style="flex:1">
            <option value="">Selecione uma prova da ${esc(b.nome)}…</option>
            ${provasDaBanca.map((p) => `<option value="${p.id}">${esc(p.titulo)}${p.numQuestoes ? ` (${p.numQuestoes} questões)` : ` [${p.statusLabel}]`}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary" id="cadImportProvaBtn" ${S.cadFeedBusy || !provasDaBanca.length ? 'disabled' : ''}>${S.cadFeedBusy ? '<span class="spinner sm"></span>' : 'Importar p/ o caderno'}</button>
        </div>
      </div>
      <div>
        <label class="hint" for="cadUpProvaFile" style="display:block;margin-bottom:6px">Ou envie um novo PDF de prova antiga da ${esc(b.nome)}</label>
        <input type="file" id="cadUpProvaFile" class="input" accept=".pdf,.doc,.docx,.txt" ${S.cadFeedBusy ? 'disabled' : ''}>
      </div>
    </div>
  </div>` : ''}

  ${ft === 'simulado' ? `<div class="cad-feed-panel no-print">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><b style="font-size:15px">📚 Anexar bateria de questões já gerada</b>
        <div class="hint">Traga simulados que você gerou anteriormente para dentro do histórico deste caderno.</div></div>
      <button type="button" class="btn btn-quiet" data-cad-ftab="">${ic('x', 'sm')} Fechar</button>
    </div>
    <div class="row" style="gap:10px">
      <select class="select" id="cadPickSet" style="flex:1">
        <option value="">Escolha uma bateria de questões…</option>
        ${setsSoltos.map((s) => `<option value="${s.id}">[${esc(BANCA()[s.banca]?.nome || s.banca)}] ${esc(s.materia)}${s.assunto ? ` · ${esc(s.assunto)}` : ''} (${(s.questoes || []).length} questões)</option>`).join('')}
      </select>
      <button type="button" class="btn btn-primary" id="cadAttachSetBtn" ${S.cadFeedBusy ? 'disabled' : ''}>Adicionar ao caderno</button>
    </div>
  </div>` : ''}

  <div class="cad-sources no-print">
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <b style="font-size:14.5px">📄 Meus conteúdos que alimentam este caderno (${(c.materiais || []).length})</b>
        <button type="button" class="link-btn" style="font-size:12.5px" data-cad-ftab="material">+ Adicionar conteúdo</button>
      </div>
      ${(c.materiais || []).length ? `<div class="file-list">${c.materiais.map((m) => `<div class="chip" style="align-items:center;gap:8px">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 <b>${esc(m.fileName)}</b>${m.materia ? ` · ${esc(m.materia)}` : ''} <span class="hint">(${m.wordCount} pal.)</span></span>
        <button type="button" class="link-btn" style="font-size:12px;white-space:nowrap" data-cad-gen-from-mat="${m.id}">+ Gerar questões</button>
      </div>`).join('')}</div>` : `<div class="hint">Nenhum material vinculado ainda. Clique em <b>+ Alimentar com meu conteúdo</b> para enviar resumos ou anotações.</div>`}
    </div>
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <b style="font-size:14.5px">🏛️ Provas antigas da banca neste caderno (${(c.provas || []).length})</b>
        <button type="button" class="link-btn" style="font-size:12.5px" data-cad-ftab="prova">+ Adicionar prova</button>
      </div>
      ${(c.provas || []).length ? `<div class="file-list">${c.provas.map((p) => `<div class="chip" style="align-items:center;gap:8px">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🏛️ <b>${esc(p.titulo)}</b> ${p.numQuestoes ? `<span class="hint">(${p.numQuestoes} q.)</span>` : ''}</span>
        <span class="st ${ST_CLASS[p.status] || 'READY'}">${esc(p.statusLabel)}</span>
      </div>`).join('')}</div>` : `<div class="hint">Nenhuma prova antiga vinculada ainda. Clique em <b>+ Alimentar com provas antigas</b> para importar questões reais da ${esc(b.nome)}.</div>`}
    </div>
  </div>

  <div class="cad-toolbar no-print">
    <div class="row" style="gap:8px;flex:1">
      <select class="select" id="cadFStatus" style="width:auto;min-width:190px;padding:8px 11px;font-size:13px">
        <option value="all" ${f.status === 'all' ? 'selected' : ''}>Todas as questões (${(c.questoes || []).length})</option>
        <option value="revisao_hoje" ${f.status === 'revisao_hoje' ? 'selected' : ''}>🔔 Revisar hoje (${c.revisaoHojeCount || 0})</option>
        <option value="unanswered" ${f.status === 'unanswered' ? 'selected' : ''}>Não respondidas (${c.totalQuestoes - c.respondidas})</option>
        <option value="wrong" ${f.status === 'wrong' ? 'selected' : ''}>Erradas para revisar (${c.erros})</option>
        <option value="correct" ${f.status === 'correct' ? 'selected' : ''}>Acertadas (${c.acertos})</option>
        <option value="dominadas" ${f.status === 'dominadas' ? 'selected' : ''}>✔ Dominadas (${c.dominadasCount || 0})</option>
        <option value="fav" ${f.status === 'fav' ? 'selected' : ''}>★ Favoritas / Marcadas (${c.favoritasCount})</option>
        <option value="notes" ${f.status === 'notes' ? 'selected' : ''}>📝 Com anotações (${c.anotacoesCount})</option>
      </select>
      <select class="select" id="cadFOrigem" style="width:auto;min-width:185px;padding:8px 11px;font-size:13px">
        <option value="all" ${f.origem === 'all' ? 'selected' : ''}>Todas as origens</option>
        <option value="ia" ${f.origem === 'ia' ? 'selected' : ''}>📄 Meu conteúdo (IA) (${c.questoesIa})</option>
        <option value="prova" ${f.origem === 'prova' ? 'selected' : ''}>🏛️ Provas da banca (${c.questoesProvas})</option>
      </select>
      <select class="select" id="cadFMat" style="width:auto;min-width:170px;padding:8px 11px;font-size:13px">
        <option value="">Todas as matérias</option>
        ${(c.porMateria || []).map((m) => `<option value="${esc(m.materia)}" ${f.materia === m.materia ? 'selected' : ''}>${esc(m.materia)} (${m.total})</option>`).join('')}
      </select>
      <input class="input" id="cadFQ" placeholder="Buscar no caderno…" value="${esc(f.q)}" style="width:auto;min-width:170px;flex:1;padding:8px 11px;font-size:13px">
    </div>
    <div class="row" style="gap:6px">
      ${c.erros > 0 ? `<button type="button" class="btn btn-ghost" id="cadResetErros" style="padding:7px 11px;font-size:12.5px">${ic('refresh', 'sm')} Refazer erradas (${c.erros})</button>` : ''}
      ${c.respondidas > 0 ? `<button type="button" class="btn btn-quiet" id="cadResetAll" style="padding:7px 11px;font-size:12.5px">Limpar respostas</button>` : ''}
    </div>
  </div>

  ${filtered.length
    ? filtered.map((q, idx) => viewCadernoQ(q, idx)).join('')
    : `<div class="card"><div class="empty">${ic('book')}<div>${(c.questoes || []).length ? 'Nenhuma questão encontrada para esses filtros.' : 'Este caderno ainda não tem questões.'}</div><div class="hint">Use os botões acima para alimentar o caderno com seu conteúdo ou com provas antigas da banca!</div></div></div>`}`;
}

function viewCadernoQ(q, idx) {
  const ce = q.formato === 'ce';
  const answered = q.ans != null;
  const ok = answered && q.ans === q.gabarito;
  const cls = (L) => (!answered ? '' : L === q.gabarito ? 'correct' : L === q.ans ? 'wrong' : '');
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button type="button" class="alt ${cls(L)}" data-cad-ans="${esc(q.key)}:::${L}" ${answered ? 'disabled' : ''}><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${(q.alternativas || []).map((a, j) => `<button type="button" class="alt ${cls(LETRAS[j])}" data-cad-ans="${esc(q.key)}:::${LETRAS[j]}" ${answered ? 'disabled' : ''}><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;
  const noteOpen = S.cadNoteOpen === q.key;

  return `<article class="card q">
    <div class="q-top" style="justify-content:space-between">
      <div class="row" style="gap:6px">
        <span class="q-num">#${idx + 1}</span>
        <span class="badge ${q.origem === 'ia' ? 'brand' : 'accent'}" title="Fonte: ${esc(q.fonteTitulo)}">${q.origem === 'ia' ? '📄 Meu material' : '🏛️ Prova da banca'} · ${esc(q.fonteTitulo.slice(0, 32))}</span>
        <span class="badge">${esc(q.materia)}</span>
        ${q.assunto ? `<span class="badge">${esc(q.assunto)}</span>` : ''}
        ${q.topico_edital ? `<span class="badge edital-tag">${ic('target', 'sm')} Edital: ${esc(q.topico_edital)}</span>` : ''}
        ${q.anulada ? '<span class="badge sev high" title="A banca anulou esta questão no gabarito definitivo">Anulada pela banca — não conta</span>' : q.gabaritoAtualizado ? '<span class="badge accent" title="Gabarito conferido com o definitivo oficial">Gabarito atualizado (definitivo)</span>' : ''}
        ${q.revisao ? `<span class="badge ${q.revisao.dominada ? 'brand' : q.revisao.paraRevisarHoje ? 'accent' : ''}" title="Repetição Espaçada: ${q.revisao.rotulo}${q.revisao.paraRevisarHoje ? ' · Pendente para revisão hoje!' : ''}">${q.revisao.dominada ? '✔ Dominada' : q.revisao.paraRevisarHoje ? '🔔 Revisar hoje (' + q.revisao.rotulo + ')' : '⏳ ' + q.revisao.rotulo}</span>` : ''}
      </div>
      <div class="row no-print" style="gap:6px">
        <button type="button" class="fav-btn ${q.favorita ? 'on' : ''}" data-cad-fav="${esc(q.key)}" title="Marcar para revisão">${q.favorita ? '★ Favorita' : '☆ Favoritar'}</button>
        <button type="button" class="fav-btn ${q.anotacao ? 'on' : ''}" data-cad-note-toggle="${esc(q.key)}" title="Anotação de estudo">📝 ${q.anotacao ? 'Ver/editar nota' : 'Anotar'}</button>
      </div>
    </div>
    <p class="q-text">${esc(q.enunciado)}</p>
    ${opts}
    ${answered ? `<div class="explain">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
        <div class="verdict ${ok ? 'ok' : 'bad'}" style="margin-bottom:0">${ic(ok ? 'check' : 'x', 'sm')} ${ok ? 'Você acertou' : 'Resposta incorreta'} · Gabarito: ${ce ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : q.gabarito}</div>
        <div class="row no-print" style="gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-quiet" style="padding:4px 10px;font-size:12px" data-cad-clear="${esc(q.key)}">${ic('refresh', 'sm')} Resolver novamente</button>
          ${!ok ? `<button type="button" class="btn btn-ghost btn-pq-errei" style="padding:4px 10px;font-size:12px" data-pq-caderno="${esc(q.key)}">${(S.explicacaoLoading && S.explicacaoLoading['cad:' + q.key]) ? `<span class="spinner sm" style="width:12px;height:12px;display:inline-block;vertical-align:-1px"></span> Analisando...` : `💡 Por que errei?`}</button>` : ''}
          ${!ok ? `<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:12px" data-revanche="${esc(q.materia)}||${esc(q.topico_edital || q.assunto || '')}||${esc(q.banca)}">${ic('spark', 'sm')} Gerar +questões deste tema</button>` : ''}
        </div>
      </div>
      <p>${esc(q.comentario)}</p>
      ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”<div class="hint" style="font-style:normal;margin-top:4px">${q.ancorada ? '✓ Trecho conferido no seu material' : 'Trecho do seu material'}</div></div>` : ''}
      ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
      ${!ok && (S.explicacoes && S.explicacoes['cad:' + q.key]) ? renderExplicacaoCard(S.explicacoes['cad:' + q.key]) : ''}
    </div>` : ''}
    ${q.anotacao && !noteOpen ? `<div class="cad-note"><b>📝 Minha anotação:</b> ${esc(q.anotacao)}</div>` : ''}
    ${noteOpen ? `<div class="report-box no-print" style="margin-top:12px">
      <label class="hint" style="display:block;margin-bottom:4px">Sua anotação de revisão para esta questão:</label>
      <textarea class="textarea" id="cadNoteIn" maxlength="1500" style="min-height:74px" placeholder="Anote o artigo de lei, macete ou motivo do erro para revisar depois…">${esc(q.anotacao)}</textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px;gap:8px">
        <button type="button" class="btn btn-quiet" data-cad-note-cancel>Cancelar</button>
        <button type="button" class="btn btn-primary" data-cad-note-save="${esc(q.key)}">Salvar anotação</button>
      </div>
    </div>` : ''}
  </article>`;
}

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

// ---------- Enviar provas (todos os usuários) ----------
const PENDING_ST = ['CHECKING', 'QUEUED', 'PROCESSING', 'BATCH_PENDING'];
const ST_CLASS = {
  CHECKING: 'CHECKING',
  IN_REVIEW: 'IN_REVIEW',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  BATCH_PENDING: 'BATCH_PENDING',
  READY: 'READY',
  DUPLICATE: 'DUPLICATE',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
};
const stBadge = (p) => `<span class="st ${ST_CLASS[p.status] || 'PENDING'}">${PENDING_ST.includes(p.status) ? '<span class="spinner sm" style="width:12px;height:12px"></span>' : ''}${esc(p.statusLabel || p.status)}</span>`;
// Selo da fonte: confirmada = arquivo baixado pelo servidor do site oficial; informada = link digitado no envio (não verificado)
const fonteBadge = (x) => x.oficialConfirmado
  ? `<span class="badge" style="background:#047857;color:#fff" title="Arquivo baixado direto da fonte oficial">✔ Fonte oficial</span>`
  : x.officialUrl ? `<a class="badge" href="${esc(x.officialUrl)}" target="_blank" rel="noopener noreferrer" title="Link informado no envio — ainda não verificado">Link informado</a>` : '';
const SEV_LABEL = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo', info: 'Info' };

function viewContribuir() {
  const f = S.cform || (S.cform = { banca: '', orgao: '', cargo: '', ano: '', files: [], gabarito: null, editalId: '', editalFile: null, link: '' });
  const mine = S.minhas || [];
  const editais = S.editais || [];
  const editaisForBanca = f.banca ? editais.filter((e) => !e.banca || e.banca === f.banca) : editais;
  return `<h1 class="page-title">Enviar provas</h1>
  <p class="page-sub">Envie provas anteriores e o edital do concurso para a IA aprender o estilo da banca e cruzar a prova com os tópicos do edital e seus materiais de estudo.</p>
  <div class="contrib-stack">
    <div class="card">
      <div style="padding:18px 20px 12px;border-bottom:1px solid var(--line-2);justify-content:space-between" class="row">
        <div class="row"><h3 style="margin:0;font-size:17px">Minhas contribuições</h3><span class="badge">${mine.length}</span></div>
        <span class="hint">Cada prova aprovada na base vale estrelas e gerações extras</span>
      </div>
      ${mine.length ? mine.map((p) => {
        const b = BANCA()[p.banca];
        const isLinking = S.linkProvaId === p.id;
        return `<div class="prova">
          <div class="contrib-row">
            <div style="min-width:0;flex:1">
              <div class="li-title" style="white-space:normal;line-height:1.35">${esc(p.titulo)}</div>
              <div class="li-meta" style="margin-top:3px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ''}
                ${fonteBadge(p)}
                <span>${fmtDate(p.createdAt)}${p.numQuestoes ? ` · <b>${p.numQuestoes} questões na base</b>` : ''}</span>
                ${p.editalTitulo ? `<button type="button" class="badge edital-tag" data-open-edital="${p.editalId}" style="cursor:pointer" title="Abrir edital vinculado">${ic('target', 'sm')} Edital: ${esc(p.editalTitulo)}</button>` : ''}
                <button type="button" class="link-btn" style="font-size:12.5px" data-toggle-link-edital="${p.id}">${p.editalId ? 'Trocar edital' : '+ Vincular edital a esta prova'}</button>
              </div>
            </div>
            ${stBadge(p)}
          </div>
          ${p.motivo ? `<div class="hint" style="margin-top:6px">${esc(p.motivo)}</div>` : ''}
          ${isLinking ? `<div class="edital-subbox" style="margin-top:10px">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <b style="font-size:13.5px">${ic('target', 'sm')} Relacionar Edital a esta prova (${esc(b ? b.nome : p.banca)})</b>
              <button type="button" class="link-btn" data-toggle-link-edital="${p.id}">Fechar</button>
            </div>
            <div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
              ${editais.length ? `<div class="field" style="margin:0;flex:1;min-width:220px">
                <label for="lpEdSel">Escolher um edital já cadastrado</label>
                <select class="select" id="lpEdSel">
                  <option value="">Selecione um edital…</option>
                  ${editais.map((e) => `<option value="${e.id}" ${p.editalId === e.id ? 'selected' : ''}>${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`).join('')}
                </select>
              </div>
              <button type="button" class="btn btn-primary" data-save-link-edital="${p.id}" ${S.linkBusy ? 'disabled' : ''}>Vincular selecionado</button>` : ''}
              <div class="field" style="margin:0;flex:1;min-width:240px">
                <label for="lpEdFile">Ou envie o arquivo do Edital desta prova (PDF, DOCX, TXT)</label>
                <input type="file" id="lpEdFile" class="input" accept=".pdf,.doc,.docx,.txt" data-upload-link-edital="${p.id}" ${S.linkBusy ? 'disabled' : ''}>
              </div>
            </div>
            ${S.linkBusy ? `<div class="hint" style="margin-top:8px"><span class="spinner sm"></span> Lendo e verticalizando o edital com a IA e vinculando à prova…</div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('') : `<div class="empty" style="padding:28px">${ic('book')}<div>Você ainda não enviou provas.</div><div class="hint">Use o formulário abaixo para enviar sua primeira prova.</div></div>`}
    </div>

    <form class="card card-pad" id="cForm" novalidate>
      <div style="margin-bottom:14px">
        <h3 style="margin:0 0 4px;font-size:18px">Enviar nova prova</h3>
        <div class="hint">Preencha os dados abaixo para cadastrar a prova na base da banca e, se desejar, já vincular o edital do mesmo concurso.</div>
      </div>

      <div class="form-sec">
        <div class="form-sec-title"><span class="form-sec-num">1</span> Banca examinadora e concurso</div>
        <div class="hint" style="margin-bottom:10px">Escolha a banca organizadora e informe o órgão, cargo e ano da prova.</div>
        <div class="banca-tabs" style="flex-wrap:wrap;margin-bottom:14px">${S.bancas.map((b) => `<button type="button" class="btab ${f.banca === b.id ? 'on' : ''}" data-cb="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}</div>
        <div class="up-grid">
          <div class="field" style="margin-bottom:0"><label for="cOrgao">Órgão / Instituição</label><input class="input" id="cOrgao" maxlength="120" placeholder="Ex.: Banco do Brasil, TRF-1" value="${esc(f.orgao)}"></div>
          <div class="field" style="margin-bottom:0"><label for="cCargo">Cargo</label><input class="input" id="cCargo" maxlength="120" placeholder="Ex.: Agente de Tecnologia" value="${esc(f.cargo)}"></div>
          <div class="field" style="margin-bottom:0"><label for="cAno">Ano da prova</label><input class="input" id="cAno" inputmode="numeric" maxlength="4" placeholder="Ex.: 2024" value="${esc(f.ano)}"></div>
        </div>
      </div>

      <div class="form-sec">
        <div class="form-sec-title"><span class="form-sec-num">2</span> Arquivos da prova e gabarito</div>
        <div class="hint" style="margin-bottom:10px">Envie o caderno de questões (PDF, inclusive escaneado, DOCX, DOC ou TXT) e, se estiver em arquivo separado, o gabarito oficial.</div>
        <label class="drop slim" id="cDrop"><input type="file" id="cFiles" class="sr" multiple accept=".pdf,.doc,.docx,.txt">
          <div class="big" style="width:44px;height:44px">${ic('upload')}</div><strong style="font-size:15px">Arraste os arquivos das provas aqui ou clique para escolher</strong><span class="hint">PDF (inclusive escaneado), DOCX, DOC ou TXT · até 10 arquivos por vez</span></label>
        ${f.files.length ? `<div class="file-list">${f.files.map((x, i) => `<span class="chip"><span>📄 ${esc(x.name)}</span><button type="button" class="link-btn" data-rmc="${i}">remover</button></span>`).join('')}</div>` : ''}
        <div class="field" style="margin:14px 0 0"><label for="cGab">Gabarito separado <span class="hint">(opcional, disponível ao enviar 1 prova)</span></label><input type="file" id="cGab" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>${f.gabarito ? `<span class="hint">Selecionado: ${esc(f.gabarito.name)}</span>` : ''}</div>
        <div class="field" style="margin:14px 0 0"><label for="cLink">Link oficial da prova <span class="hint">(opcional — site da banca ou Diário Oficial)</span></label>
          <input class="input" id="cLink" maxlength="500" placeholder="https://conhecimento.fgv.br/.../prova.pdf" value="${esc(f.link)}">
          <span class="hint">Sem arquivo? Cole o link direto do PDF da prova: nós baixamos da fonte oficial e ela ganha o selo <b>✔ Fonte oficial</b>. Com arquivo, o link fica registrado como fonte informada.</span></div>
      </div>

      <div class="form-sec">
        <div class="form-sec-title"><span class="form-sec-num">3</span> Edital deste concurso <span class="badge brand">Conecta Banca + Prova + Estudo</span></div>
        <div class="hint" style="margin-bottom:12px">O edital está diretamente ligado à banca, à prova e ao seu material de estudo. Vincule um edital já enviado ou anexe o PDF do edital agora para a IA verticalizar os tópicos e relacionar com as questões desta prova.</div>
        <div class="edital-subbox">
          <div class="opts" style="margin-top:0">
            <div class="field" style="margin-bottom:0">
              <label for="cEditalSel">Usar edital já cadastrado <span class="hint">(opcional)</span></label>
              <select class="select" id="cEditalSel" ${f.editalFile ? 'disabled' : ''}>
                <option value="">Nenhum edital selecionado</option>
                ${editaisForBanca.map((e) => { const b = e.banca && BANCA()[e.banca]; return `<option value="${e.id}" ${f.editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`; }).join('')}
              </select>
            </div>
            <div class="field" style="margin-bottom:0">
              <label for="cEditalFile">Ou enviar arquivo do Edital junto com a prova <span class="hint">(PDF, DOCX, TXT)</span></label>
              <input type="file" id="cEditalFile" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>
              ${f.editalFile ? `<div class="row" style="justify-content:space-between;margin-top:4px"><span class="hint" style="color:var(--brand)">📋 Edital anexado: <b>${esc(f.editalFile.name)}</b></span><button type="button" class="link-btn" id="cRmEdital" style="font-size:12px">remover</button></div>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${(S.cResults || []).length ? `<div class="file-list" style="margin:16px 0">${S.cResults.map((r) => `<div class="banner ${r.ok ? 'info' : r.dup ? 'warn' : 'bad'}" style="margin:0">${ic(r.ok ? 'check' : 'alert', 'sm')}<div><b>${esc(r.name)}</b>: ${esc(r.msg)}</div></div>`).join('')}</div>` : ''}
      <div style="margin-top:20px">
        <button class="btn btn-primary btn-block" type="submit" ${S.cBusy || (!f.files.length && !f.link) || !f.banca ? 'disabled' : ''}>${S.cBusy ? `<span class="spinner sm"></span> Enviando ${S.cBusy}${f.editalFile ? ' e verticalizando edital' : ''}…` : !f.files.length && f.link ? `${ic('upload', 'sm')} Importar prova do link oficial` : `${ic('upload', 'sm')} Enviar ${f.files.length > 1 ? f.files.length + ' provas' : 'prova'}${f.editalFile ? ' + Edital' : f.editalId ? ' (vinculada ao Edital)' : ''}`}</button>
        <p class="hint" style="margin:10px 0 0;text-align:center">Arquivos com scripts, macros, anexos ou texto escondido com instruções são recusados automaticamente. Envios maliciosos repetidos pausam a conta.</p>
      </div>
    </form>
  </div>`;
}

// ---------- Base de provas (admin) ----------
function viewProvas() {
  const tab = S.adminTab || 'revisao', counts = S.adminCounts || {};
  const tabs = [['revisao', `Revisão${counts.IN_REVIEW ? ` (${counts.IN_REVIEW})` : ''}`], ['base', 'Base por banca'], ['monitor', 'Segurança e IA']];
  let body = '';
  if (tab === 'revisao') {
    const list = (S.adminProvas || []).filter((p) => p.status === 'IN_REVIEW');
    body = `<div class="card">${list.length ? list.map((p) => `<div class="prova"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
        <div style="min-width:0"><div class="li-title">${esc(p.titulo || p.fileName)}</div>
          <div class="li-meta">${esc(BANCA()[p.banca]?.nome || p.banca)}${p.bancaInformada && p.bancaInformada !== p.banca ? ` (informada: ${esc(BANCA()[p.bancaInformada]?.nome || p.bancaInformada)})` : ''} · ${p.uploader ? esc(p.uploader.name) : '—'} · ${fmtDate(p.createdAt)}${p.needsOcr ? ' · escaneada' : ''}</div>
          ${p.reviewNote ? `<div class="hint">${esc(p.reviewNote)}</div>` : ''}</div>
        ${p.securitySeverity && !['info', 'low'].includes(p.securitySeverity) ? `<span class="sev ${p.securitySeverity}">${SEV_LABEL[p.securitySeverity]}</span>` : '<span class="sev low">Sem alertas</span>'}</div>
        <div class="row" style="margin-top:8px"><button class="btn btn-primary" data-analisar="${p.id}">${ic('eye', 'sm')} Analisar</button></div></div>`).join('')
      : `<div class="empty">${ic('check')}<div>Nada aguardando revisão.</div></div>`}</div>`;
  } else if (tab === 'base') {
    const b = BANCA()[S.provaBanca], list = (S.adminProvas || []).filter((p) => p.banca === b.id);
    body = `<div class="banca-tabs">${S.bancas.map((x) => `<button class="btab ${x.id === b.id ? 'on' : ''}" data-pb="${x.id}"><span class="bdot" style="background:${x.cor}"></span>${x.nome}<span class="ct">${(S.adminProvas || []).filter((p) => p.banca === x.id && p.status === 'READY').length}</span></button>`).join('')}</div>
    <div class="card">${list.length ? list.map((p) => `<div class="prova">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div style="min-width:0">
        <div class="li-title">${esc(p.titulo || p.fileName)}</div>
        <div class="li-meta">${[p.ano, (p.materias || []).slice(0, 3).join(', '), p.numQuestoes != null ? p.numQuestoes + ' questões' : '', p.source === 'user' && p.uploader ? 'enviada por ' + p.uploader.name : 'admin', p.autoApproved ? 'aprovação automática' : ''].filter(Boolean).map(esc).join(' · ')} ${fonteBadge(p)}${p.gabaritoDefinitivo ? ' <span class="badge brand" style="font-size:11px">✔ Gabarito definitivo</span>' : ''}${p.consensoConcluido === false ? ' <span class="badge" style="background:#ef4444;color:#fff;font-size:11px" title="Houve divergência de gabarito entre modelos gratuitos">⚠ Divergência</span>' : ''}</div></div>${stBadge(p)}</div>
      ${p.error ? `<div class="hint" style="color:var(--bad);margin-top:6px">${esc(p.error)}</div>` : p.reviewNote && ['REJECTED', 'DUPLICATE'].includes(p.status) ? `<div class="hint" style="margin-top:6px">${esc(p.reviewNote)}</div>` : ''}
      <div class="row" style="margin-top:8px;gap:4px">
        <button class="btn btn-quiet" data-analisar="${p.id}">${ic('eye', 'sm')} Detalhes</button>
        ${p.status === 'READY' ? `<button class="btn btn-quiet" data-verq="${p.id}">${ic('list', 'sm')} Questões</button>` : ''}
        ${p.status === 'READY' ? `<button class="btn btn-quiet" data-gabdef="${p.id}">${ic('check', 'sm')} Gabarito definitivo</button>` : ''}
        <a class="btn btn-quiet" href="/api/admin/provas/${p.id}/arquivo">${ic('download', 'sm')} Arquivo</a>
        ${['READY', 'FAILED', 'QUEUED'].includes(p.status) ? `<button class="btn btn-quiet" data-reproc="${p.id}">${ic('refresh', 'sm')} Reprocessar</button>` : ''}
        <button class="btn btn-quiet" data-delprova="${p.id}" style="color:var(--bad)">${ic('trash', 'sm')} Remover</button>
      </div></div>`).join('') : `<div class="empty" style="padding:24px">${ic('book')}<div>Nenhuma prova da ${b.nome}.</div><button class="btn btn-quiet" data-go="contribuir">Enviar provas</button></div>`}</div>`;
  } else {
    const m = S.monitor;
    body = !m ? '<div class="empty"><span class="spinner sm"></span></div>' : `
    <div class="card card-pad" style="margin-bottom:16px"><h3 style="margin:0 0 4px;font-size:16px">IA por tarefa</h3>
      <p class="hint" style="margin:0 0 12px">${m.ia.mock ? '<b>Modo simulado (AI_MOCK=true)</b> — nenhuma chamada real. ' : ''}Treino: ${m.ia.trainingMode === 'batch' ? 'modo lote (mais barato)' : 'direto'}. Para trocar de fornecedor, altere AI_MODEL_&lt;TAREFA&gt; no .env.</p>
      <table class="tbl"><thead><tr><th>Tarefa</th><th>Principal</th><th>Reserva</th></tr></thead><tbody>${m.ia.routing.map((r) => `<tr><td>${esc(r.label)}</td><td><code>${esc(r.primary)}</code></td><td><code>${esc(r.fallback || '—')}</code></td></tr>`).join('')}</tbody></table></div>
    <div class="card card-pad" style="margin-bottom:16px">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h3 style="margin:0;font-size:16px">Uso e Custos da IA (30 dias)</h3>
        ${m.ia.custoTotal ? `<span class="badge brand" style="font-size:13px">Total estimado: R$ ${Number(m.ia.custoTotal.brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (US$ ${Number(m.ia.custoTotal.usd || 0).toFixed(4)})</span>` : ''}
        ${m.ia.limiteDia ? `<span class="${m.ia.limiteDia.atingido ? 'sev high' : 'badge'}" style="font-size:13px" title="AI_LIMITE_USD_DIA no .env (dia de Brasília)">Hoje: US$ ${Number(m.ia.limiteDia.gastoHojeUsd || 0).toFixed(4)}${m.ia.limiteDia.usd ? ` de US$ ${Number(m.ia.limiteDia.usd).toFixed(2)}${m.ia.limiteDia.atingido ? ' — limite atingido, IA pausada até amanhã' : ''}` : ' (sem limite diário)'}</span>` : ''}
      </div>
      ${m.ia.usage.length ? `<table class="tbl"><thead><tr><th>Tarefa</th><th>Modelo</th><th>Chamadas</th><th>Falhas</th><th>Reserva</th><th>Tokens entrada</th><th>Tokens saída</th><th>Cache</th><th>Tempo médio</th><th>Custo est.</th></tr></thead><tbody>${m.ia.usage.map((u) => `<tr><td>${esc(u.task)}</td><td><code>${esc(u.provider)}:${esc(u.model)}</code></td><td>${u.chamadas}</td><td>${u.falhas}</td><td>${u.reservas}</td><td>${Number(u.entrada).toLocaleString('pt-BR')}</td><td>${Number(u.saida).toLocaleString('pt-BR')}</td><td>${Number(u.cache).toLocaleString('pt-BR')}</td><td>${u.ms_medio != null ? (u.ms_medio / 1000).toFixed(1) + ' s' : '—'}</td><td><b>R$ ${Number(u.custoBrl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> <span class="hint">(US$ ${Number(u.custoUsd || 0).toFixed(4)})</span></td></tr>`).join('')}</tbody></table>` : '<p class="hint">Sem chamadas ainda.</p>'}
      ${m.ia.revisor && m.ia.revisor.geradas ? `<p class="hint" style="margin:10px 0 0">Revisor automático (30 dias): ${m.ia.revisor.geradas} questões geradas, ${m.ia.revisor.descartadas} descartadas por divergência/ambiguidade, ${m.ia.revisor.refeitas} refeitas.</p>` : ''}
      ${(m.ia.qualidade || []).length ? `<h3 style="margin:18px 0 8px;font-size:15px">Qualidade percebida pelos alunos</h3><table class="tbl"><thead><tr><th>Banca</th><th>👍</th><th>👎</th><th>Erros confirmados</th><th>Reportes não confirmados</th></tr></thead><tbody>${m.ia.qualidade.map((q) => `<tr><td>${esc(BANCA()[q.banca]?.nome || q.banca)}</td><td>${q.gostei}</td><td>${q.nao_gostei}</td><td>${q.erros_confirmados}</td><td>${q.erros_nao_confirmados}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="hint" style="margin:10px 0 0">Fila de tarefas: ${Object.entries(m.ia.jobs).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') || 'vazia'}</p></div>
    <div class="card card-pad"><h3 style="margin:0 0 12px;font-size:16px">Eventos de segurança</h3>
      ${m.sec.blockedUsers.length ? `<div class="banner warn">${ic('alert', 'sm')}<div>Envios pausados: ${m.sec.blockedUsers.map((u) => esc(u.name) + ' (' + esc(u.email) + ')').join(', ')}</div></div>` : ''}
      ${m.sec.events.length ? `<table class="tbl"><thead><tr><th>Quando</th><th>Tipo</th><th>Nível</th><th>Usuário</th><th>Arquivo</th><th>Motivos</th></tr></thead><tbody>${m.sec.events.slice(0, 80).map((e) => `<tr><td>${new Date(e.created_at).toLocaleString('pt-BR')}</td><td>${esc(e.kind)}</td><td><span class="sev ${e.severity}">${SEV_LABEL[e.severity] || esc(e.severity)}</span></td><td>${esc(e.name || '—')}</td><td>${esc(e.file_name || '—')}</td><td class="hint">${esc(((e.details?.findings || []).filter((f) => !['info', 'low'].includes(f.severity)).map((f) => f.message).concat(e.details?.reasons || [], e.details?.alertas || [])).slice(0, 3).join(' · '))}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Nenhum evento.</p>'}</div>`;
  }
  return `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1 class="page-title">Base de provas</h1><p class="page-sub">Revise as provas enviadas, acompanhe o treino da IA e monitore segurança e custos.</p></div><div class="row" style="gap:8px"><button class="btn btn-ghost" id="admPedidos" title="Pedidos de upgrade de plano">${ic('crown', 'sm')} Pedidos de plano</button><button class="btn btn-ghost" id="admDiverg" title="Questões em que os dois modelos discordaram do gabarito">${ic('alert', 'sm')} Divergências</button><button class="btn btn-ghost" id="admLote" title="Importa várias provas de links oficiais de uma vez">${ic('download', 'sm')} Importar em lote</button><button class="btn btn-ghost" id="admRotular" title="Completa tópico, comando e pegadinha das questões de provas antigas usando as IAs grátis (provas são públicas)">${ic('brain', 'sm')} Rotular provas antigas</button><button class="btn btn-primary" data-go="contribuir">${ic('upload', 'sm')} Enviar provas</button></div></div>${avisoAvatarHtml()}
  <div class="tabs" style="max-width:520px">${tabs.map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-atab="${k}">${l}</button>`).join('')}</div>${body}`;
}

function reviewHtml(p) {
  const sec = p.security || {}, cls = p.classification || {};
  const findings = (sec.findings || []).filter((f) => f.severity !== 'info');
  return `<div class="li-meta" style="margin-bottom:12px">${esc(p.fileName)} · ${p.pageCount ? p.pageCount + ' pág. · ' : ''}${p.uploader ? 'enviada por ' + esc(p.uploader.name) + ' (' + esc(p.uploader.email) + ')' : 'admin'} · ${stBadge(p)}</div>
  ${p.reviewNote ? `<div class="banner info">${ic('info', 'sm')}<div>${esc(p.reviewNote)}</div></div>` : ''}
  <div class="eyebrow" style="margin:6px 0">Checagem automática pela IA</div>
  <div class="chips" style="margin-bottom:12px">
    <span class="chip">É prova: <b>${cls.e_prova === undefined ? '—' : cls.e_prova ? 'sim' : 'não'}</b>${cls.confianca != null ? ` (${Math.round(cls.confianca * 100)}%)` : ''}</span>
    <span class="chip">Banca detectada: <b>${esc(cls.banca || '—')}</b></span>
    <span class="chip">Instruções para IA: <b>${cls.tentativa_de_instrucao ? 'SIM' : 'não'}</b></span>
    ${cls.orgao ? `<span class="chip">${esc(cls.orgao)}</span>` : ''}${cls.cargo ? `<span class="chip">${esc(cls.cargo)}</span>` : ''}${cls.ano ? `<span class="chip">${esc(cls.ano)}</span>` : ''}
  </div>
  <div class="eyebrow" style="margin:6px 0">Barreiras de segurança</div>
  ${findings.length ? `<div style="margin-bottom:12px">${findings.map((f) => `<div class="trait" style="display:block"><span class="sev ${f.severity}">${SEV_LABEL[f.severity]}</span> ${esc(f.message)} <span class="hint">(${esc(f.where || '')})</span>${f.sample ? `<div class="ex" style="margin-top:4px">${esc(f.sample)}</div>` : ''}</div>`).join('')}</div>` : '<p class="hint">Nenhum alerta.</p>'}
  <div class="eyebrow" style="margin:6px 0">Prévia do texto${p.needsOcr ? ' (PDF escaneado: o texto completo é lido após a aprovação)' : ''}</div>
  <div class="preview" style="max-height:260px">${esc(p.textPreview || '(sem texto extraído ainda)')}</div>
  ${p.status === 'IN_REVIEW' || ['REJECTED', 'FAILED', 'DUPLICATE'].includes(p.status) ? `
  <div class="opts" style="margin-top:18px">
    <div><div class="field"><label for="rvBanca">Banca</label><select class="select" id="rvBanca">${S.bancas.map((b) => `<option value="${b.id}" ${b.id === p.banca ? 'selected' : ''}>${b.nome}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-block" data-aprovar="${p.id}">${ic('check', 'sm')} Aprovar e treinar</button></div>
    <div><div class="field"><label for="rvMotivo">Motivo da recusa (enviado ao usuário)</label><input class="input" id="rvMotivo" maxlength="500" placeholder="Ex.: arquivo incompleto"></div>
      <button class="btn btn-danger btn-block" data-recusar="${p.id}">${ic('x', 'sm')} Recusar</button></div>
  </div>` : ''}
  <div class="row" style="margin-top:14px"><a class="btn btn-quiet" href="/api/admin/provas/${p.id}/arquivo">${ic('download', 'sm')} Baixar arquivo original</a></div>`;
}

let pollT;
function schedulePoll() {
  clearTimeout(pollT);
  const pendingMine = S.view === 'contribuir' && (S.minhas || []).some((p) => PENDING_ST.includes(p.status));
  const pendingAdmin = S.view === 'provas' && (S.adminProvas || []).some((p) => PENDING_ST.includes(p.status));
  if (!pendingMine && !pendingAdmin) return;
  pollT = setTimeout(async () => {
    try {
      if (S.view === 'contribuir') { S.minhas = (await api('/provas/minhas')).provas; refreshStars(); }
      if (S.view === 'provas') await loadAdmin(false);
      if (!S.modal) render(); else schedulePoll();
    } catch { schedulePoll(); }
  }, 4000);
}
async function loadAdmin(withMonitor) {
  const r = await api('/admin/provas'); S.adminProvas = r.provas; S.adminCounts = r.counts;
  if (withMonitor) { const [ia, sec] = await Promise.all([api('/admin/ia'), api('/admin/seguranca')]); S.monitor = { ia, sec }; }
}

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

// ---------- Meu Edital (verticalizado + gráficos de avanço) ----------
function viewHomeEditalCard(ed) {
  const rs = ed.resumo || {};
  const b = ed.banca && BANCA()[ed.banca];
  return `<div class="card card-pad edital-home-card">
    <div class="row" style="justify-content:space-between;align-items:center;gap:16px">
      <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:240px">
        ${donutSvg(rs.coberturaPct || 0, 74, 'var(--brand)')}
        <div style="min-width:0">
          <div class="row" style="gap:6px;margin-bottom:4px">
            <span class="eyebrow" style="color:var(--brand)">Edital ativo</span>
            ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ed.banca ? `<span class="badge">${esc(ed.banca)}</span>` : ''}
            ${ed.ano ? `<span class="badge">${esc(ed.ano)}</span>` : ''}
          </div>
          <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ed.titulo)}</div>
          <div class="hint">${rs.topicosEstudados || 0} de ${rs.totalTopicos || 0} tópicos estudados · ${rs.topicosPraticados || 0} praticados em questões${rs.taxaAcertoGeral != null ? ` · <b>${rs.taxaAcertoGeral}% de acerto</b>` : ''}</div>
        </div>
      </div>
      <div class="row">
        <button class="btn btn-ghost" data-go="edital">${ic('target', 'sm')} Ver avanço</button>
        <button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Estudar material</button>
      </div>
    </div>
  </div>`;
}

const TOPIC_STATUS = {
  dominado:  { label: 'Dominado ★', cls: 'READY' },
  praticado: { label: 'Praticado',  cls: 'PROCESSING' },
  estudado:  { label: 'Estudado',   cls: 'brand' },
  pendente:  { label: 'Pendente',   cls: 'PENDING' },
};

function viewEdital() {
  const ed = S.activeEdital;
  const list = S.editais || [];
  const mine = S.minhas || [];
  const efm = S.edForm || (S.edForm = { banca: '', orgao: '', cargo: '', ano: '', provaId: '' });
  const showUpload = S.editalShowForm || !ed;
  const uploadCard = showUpload ? `<div class="card card-pad" style="margin-bottom:18px">
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div><h3 style="margin:0;font-size:17px">${ed ? 'Enviar outro edital' : 'Envie o edital do seu concurso'}</h3>
        <div class="hint">Relacione o edital à banca, ao concurso/cargo e à prova para cruzar automaticamente com seus materiais e simulados.</div></div>
      ${ed ? `<button type="button" class="btn btn-quiet" id="edCancelForm">${ic('x', 'sm')} Fechar</button>` : ''}
    </div>
    ${S.editalErr ? `<div class="banner bad">${ic('alert', 'sm')}<div>${esc(S.editalErr)}</div></div>` : ''}
    ${S.editalUploading ? `<div class="progress-box" style="padding:32px 16px"><div class="spinner"></div><b>Analisando e verticalizando seu edital com a IA…</b><div class="hint">Extraindo disciplinas, pesos e tópicos do conteúdo programático e vinculando à banca e prova.</div></div>`
      : `<div class="form-sec" style="margin-bottom:14px">
        <div class="field" style="margin-bottom:8px"><label>Banca organizadora do edital</label></div>
        <div class="banca-tabs" style="flex-wrap:wrap;margin-bottom:12px">
          <button type="button" class="btab ${!efm.banca ? 'on' : ''}" data-edb="">Detectar pela IA</button>
          ${S.bancas.map((b) => `<button type="button" class="btab ${efm.banca === b.id ? 'on' : ''}" data-edb="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}
        </div>
        <div class="up-grid" style="margin-bottom:12px">
          <div class="field" style="margin-bottom:0"><label for="edOrgao">Órgão / Instituição <span class="hint">(opcional)</span></label><input class="input" id="edOrgao" maxlength="120" placeholder="Ex.: Banco do Brasil, TRF-1" value="${esc(efm.orgao)}"></div>
          <div class="field" style="margin-bottom:0"><label for="edCargo">Cargo foco <span class="hint">(opcional)</span></label><input class="input" id="edCargo" maxlength="120" placeholder="Ex.: Agente de Tecnologia" value="${esc(efm.cargo)}"></div>
          <div class="field" style="margin-bottom:0"><label for="edAno">Ano <span class="hint">(opcional)</span></label><input class="input" id="edAno" inputmode="numeric" maxlength="4" placeholder="Ex.: 2024" value="${esc(efm.ano)}"></div>
        </div>
        <div class="field" style="margin-bottom:12px"><label for="edLink">Link oficial do edital <span class="hint">(opcional — Diário Oficial, site da banca ou do órgão)</span></label>
          <div class="row" style="gap:8px"><input class="input" id="edLink" maxlength="500" style="flex:1" placeholder="https://www.in.gov.br/... ou link direto do PDF no site da banca" value="${esc(efm.link || '')}">
          <button type="button" class="btn btn-ghost" id="edImportLink">${ic('upload', 'sm')} Importar do link</button></div>
          <span class="hint">Com o link direto do arquivo, nós baixamos da fonte oficial e o edital ganha o selo <b>✔ Fonte oficial</b>. Se você enviar o arquivo ou colar o texto, o link fica registrado como fonte informada.</span></div>
        ${mine.length ? `<div class="field" style="margin-bottom:4px">
          <label for="edProvaSel">Vincular a uma prova já enviada <span class="hint">(opcional — conecta as questões reais da prova ao edital)</span></label>
          <select class="select" id="edProvaSel">
            <option value="">Nenhuma prova selecionada</option>
            ${mine.filter((p) => !efm.banca || p.banca === efm.banca).map((p) => `<option value="${p.id}" ${efm.provaId === p.id ? 'selected' : ''}>${esc(p.titulo)} (${p.numQuestoes || 0} questões)</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      ${S.editalMode === 'file' ? `
      <label class="drop slim" id="edDrop">
        <input type="file" id="edFileIn" class="sr" accept=".pdf,.doc,.docx,.txt">
        <div class="big">${ic('upload')}</div>
        <strong>Arraste o arquivo do Edital aqui ou clique para escolher</strong>
        <span class="hint">PDF (inclusive escaneado), DOCX, DOC ou TXT · Edital completo ou anexo de conteúdo programático</span>
      </label>
      <div style="text-align:center;margin-top:12px"><button type="button" class="btn btn-quiet" id="edModePaste">Prefere colar o conteúdo programático?</button></div>`
      : `<div class="field"><label for="edPasteIn">Cole o conteúdo programático do edital</label>
        <textarea class="textarea" id="edPasteIn" placeholder="Cole aqui as disciplinas e os tópicos do edital do seu concurso…"></textarea></div>
      <div class="wiz-foot"><button type="button" class="btn btn-ghost" id="edModeFile">${ic('arrowL', 'sm')} Enviar arquivo</button>
        <button type="button" class="btn btn-primary" id="edUsePaste">${ic('spark', 'sm')} Verticalizar edital</button></div>`}`}
  </div>` : '';

  if (!ed) {
    return `<h1 class="page-title">Meu edital</h1><p class="page-sub">Acompanhe visualmente sua cobertura do edital, o cruzamento com seus resumos, banca e provas, e seu desempenho por tópico.</p>${uploadCard}`;
  }

  const rs = ed.resumo || {};
  const b = ed.banca && BANCA()[ed.banca];
  const provasVinc = ed.provasVinculadas || [];
  const matVinc = ed.materiaisVinculados || [];
  const radar = rs.radar || {};
  const filter = S.editalTopicFilter || 'todos';

  const filterTopic = (t) => {
    if (filter === 'critica') return t.prioridade === 'critica';
    if (filter === 'reforco') return t.prioridade === 'reforco';
    if (filter === 'segura') return t.prioridade === 'segura';
    if (filter === 'quentes') return (t.questoesNaBanca || 0) > 0;
    return true;
  };

  const radarHtml = `
    <div class="radar-card" role="region" aria-label="Radar de Desempenho e Probabilidade da Banca">
      <div class="radar-head">
        <div class="radar-title-group">
          <div class="row" style="gap:6px;align-items:center">
            <span class="badge brand" style="font-weight:800">🎯 Radar de Prontidão</span>
            ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ''}
          </div>
          <h3 style="margin:2px 0 0;font-size:18px">Afinidade & Probabilidade da Prova Real</h3>
          <div class="hint">Cruzamento inteligente entre a frequência histórica da banca e seu aproveitamento real.</div>
        </div>
        <div class="row" style="gap:10px;align-items:center">
          <button class="btn btn-ghost btn-sm" data-go="desempenho" title="Ver gráficos completos de evolução, horas e produtividade">${ic('chart', 'sm')} Gráficos & Desempenho</button>
          <span class="badge" style="background:${radar.prontidaoCor || 'var(--brand)'};color:#fff;font-weight:800;font-size:12px;padding:4px 10px">
            ${esc(radar.prontidaoFaixa || 'Em Análise')}
          </span>
        </div>
      </div>

      <div class="radar-score-container">
        <div class="radar-score-row">
          <span><b>Índice de Prontidão da Prova:</b> <span class="radar-score-val" style="color:${radar.prontidaoCor || 'var(--brand)'}">${radar.indiceProntidao || 0}%</span></span>
          <span class="hint">${radar.totalQuestoesNaBanca ? `🔥 ${radar.totalQuestoesNaBanca} questões da banca catalogadas` : 'Sem questões de prova registradas'}</span>
        </div>
        <div class="radar-track" title="Prontidão da Prova: ${radar.indiceProntidao || 0}%">
          <i class="radar-bar" style="width:${Math.max(3, radar.indiceProntidao || 0)}%;background:${radar.prontidaoCor || 'var(--brand)'}"></i>
        </div>
      </div>

      <div class="radar-summary-grid">
        <div class="radar-sum-card critica">
          <span class="radar-sum-num" style="color:#B91C1C">${radar.distribuicaoPrioridades?.critica || 0}</span>
          <span class="radar-sum-lbl">🚨 Prioridade Máxima (Urgentes)</span>
        </div>
        <div class="radar-sum-card reforco">
          <span class="radar-sum-num" style="color:#B45309">${radar.distribuicaoPrioridades?.reforco || 0}</span>
          <span class="radar-sum-lbl">⚠️ Reforçar (< 75%)</span>
        </div>
        <div class="radar-sum-card segura">
          <span class="radar-sum-num" style="color:#15803D">${radar.distribuicaoPrioridades?.segura || 0}</span>
          <span class="radar-sum-lbl">✅ Zona Segura (Dominados)</span>
        </div>
        <div class="radar-sum-card secundaria">
          <span class="radar-sum-num" style="color:var(--ink-2)">${radar.distribuicaoPrioridades?.secundaria || 0}</span>
          <span class="radar-sum-lbl">☕ Secundários</span>
        </div>
      </div>

      ${(radar.topUrgentes || []).length ? `
      <div class="radar-urgentes-title">
        <span>🚨 Tópicos Críticos para Sua Aprovação</span>
        <span class="hint" style="font-weight:normal">(caem muito na banca e seu rendimento precisa subir)</span>
      </div>
      <div class="radar-urgentes-grid">
        ${radar.topUrgentes.map((t) => `
          <div class="radar-urgente-card">
            <div>
              <div class="row" style="justify-content:space-between;margin-bottom:4px">
                <span class="badge" style="background:var(--brand-soft);color:var(--brand);font-size:11px">${esc(t.materia)}</span>
                <span class="prio-badge prio-critica">Urgente</span>
              </div>
              <div style="font-weight:700;font-size:13.5px;color:var(--ink);line-height:1.35;margin-bottom:4px">${esc(t.nome)}</div>
              <div class="hint" style="font-size:12px">
                ${t.questoesNaBanca ? `🔥 <b>${t.questoesNaBanca} q. na banca</b> (${t.probBancaPct}% da matéria)` : 'Incidência relevante'} ·
                <span style="color:${t.taxaAcerto != null ? (t.taxaAcerto >= 70 ? 'var(--ok)' : 'var(--bad)') : 'var(--muted)'};font-weight:700">
                  ${t.taxaAcerto != null ? t.taxaAcerto + '% acerto' : 'Não praticado'}
                </span>
              </div>
            </div>
            <div class="row" style="gap:6px;margin-top:6px">
              ${t.questoesNaBanca ? `<button type="button" class="btn btn-primary" style="padding:5px 10px;font-size:12px;flex:1" data-treinar-reais="${t.id}">${ic('book', 'sm')} Resolver Reais</button>` : ''}
              <button type="button" class="btn btn-ghost" style="padding:5px 10px;font-size:12px;flex:1" data-train-topic="${esc(t.materia)}||${esc(t.nome)}">${ic('spark', 'sm')} Gerar Questões</button>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
    </div>
  `;
  return `<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:18px">
    <div>
      <div class="row" style="gap:8px;margin-bottom:4px">
        ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ed.banca ? `<span class="badge">${esc(ed.banca)}</span>` : ''}
        ${ed.orgao ? `<span class="badge">${esc(ed.orgao)}</span>` : ''}
        ${ed.cargo ? `<span class="badge">${esc(ed.cargo)}</span>` : ''}
        ${ed.ano ? `<span class="badge">${esc(ed.ano)}</span>` : ''}
        ${fonteBadge(ed)}
      </div>
      <h1 class="page-title">${esc(ed.titulo)}</h1>
      <p class="page-sub" style="margin-bottom:0">${rs.totalDisciplinas} disciplina(s) · ${rs.totalTopicos} tópicos mapeados pela IA · ${provasVinc.length} prova(s) e ${matVinc.length} material(is) vinculado(s)</p>
    </div>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" id="btnSimuladoProvaReal" style="display:inline-flex;align-items:center;gap:6px">${ic('timer', 'sm')} <b>Simulado Prova Real</b></button>
      ${list.length > 1 ? `<select class="select" id="edSwitch" style="width:auto;min-width:210px">${list.map((x) => `<option value="${x.id}" ${x.id === ed.id ? 'selected' : ''}>${esc(x.titulo)}</option>`).join('')}</select>` : ''}
      <button class="btn btn-ghost" id="edNewBtn">${ic('upload', 'sm')} Novo edital</button>
      <button class="btn btn-danger" id="edDelBtn" title="Remover edital">${ic('trash', 'sm')}</button>
    </div>
  </div>
  ${uploadCard}
  <div class="hero" style="grid-template-columns:1.15fr 1fr;margin-bottom:18px">
    <div class="card card-pad" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
      ${donutSvg(rs.coberturaPct || 0, 108, 'var(--brand)')}
      <div style="flex:1;min-width:200px">
        <div class="eyebrow" style="color:var(--brand)">Abrangência concluída do edital</div>
        <div style="font-size:24px;font-weight:800;margin:4px 0">${rs.coberturaPct || 0}% do conteúdo coberto</div>
        <p class="hint" style="margin:0 0 12px">Calculado pela IA cruzando seus materiais de estudo e simulados resolvidos com cada tópico do edital.</p>
        <div class="edital-legend">
          <span><i style="background:var(--ok)"></i>Dominados: <b>${rs.topicosDominados || 0}</b></span>
          <span><i style="background:var(--accent)"></i>Praticados: <b>${rs.topicosPraticados || 0}</b></span>
          <span><i style="background:var(--brand)"></i>Estudados: <b>${rs.topicosEstudados || 0}/${rs.totalTopicos || 0}</b></span>
        </div>
      </div>
    </div>
    <div class="stats">
      <div class="card stat"><div class="v">${rs.topicosEstudados || 0}/${rs.totalTopicos || 0}</div><div class="l">Tópicos nos materiais</div></div>
      <div class="card stat"><div class="v">${rs.praticadoPct || 0}%</div><div class="l">Tópicos com questões</div></div>
      <div class="card stat"><div class="v" style="color:var(--ok)">${rs.dominadoPct || 0}%</div><div class="l">Tópicos dominados (≥70%)</div></div>
      <div class="card stat"><div class="v">${rs.taxaAcertoGeral != null ? rs.taxaAcertoGeral + '%' : '—'}</div><div class="l">Taxa de acerto no edital</div></div>
    </div>
  </div>

  ${radarHtml}

  <div class="train-grid" style="margin-bottom:18px">
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div><h3 style="margin:0;font-size:16px">Provas vinculadas a este Edital (${provasVinc.length})</h3>
          <div class="hint">As questões reais destas provas guiam o estilo da IA ao gerar simulados para este edital.</div></div>
        <button type="button" class="btn btn-ghost" id="edSendProva" style="padding:7px 12px;font-size:13px">${ic('upload', 'sm')} Enviar prova</button>
      </div>
      ${provasVinc.length ? `<div class="file-list">${provasVinc.map((p) => `<div class="chip" style="align-items:center;gap:8px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📘 <b>${esc(p.titulo)}</b> ${p.numQuestoes ? `(${p.numQuestoes} questões)` : ''}</span></div>`).join('')}</div>`
        : `<div class="hint">Nenhuma prova vinculada ainda. Envie a prova deste concurso ou vincule uma prova existente em <b>Enviar provas</b>.</div>`}
    </div>
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div><h3 style="margin:0;font-size:16px">Materiais de estudo cruzados (${matVinc.length})</h3>
          <div class="hint">Resumos, apostilas e anotações analisados contra o conteúdo programático.</div></div>
        <button type="button" class="btn btn-primary" data-go="gerar" style="padding:7px 12px;font-size:13px">${ic('upload', 'sm')} Enviar material</button>
      </div>
      ${matVinc.length ? `<div class="file-list">${matVinc.slice(0, 5).map((m) => `<div class="chip" style="align-items:center;gap:8px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 <b>${esc(m.nome)}</b>${m.disciplina ? ` · ${esc(m.disciplina)}` : ''}</span>${m.coberturaDisciplinaPct != null ? `<span class="badge brand">${m.coberturaDisciplinaPct}%</span>` : ''}</div>`).join('')}</div>`
        : `<div class="hint">Nenhum material enviado ainda para este edital. Envie seu primeiro resumo para iniciar o acompanhamento!</div>`}
    </div>
  </div>

  <div class="card card-pad" style="margin-bottom:18px">
    <div class="row" style="justify-content:space-between;margin-bottom:14px">
      <div><h3 style="margin:0;font-size:16px">Gráfico de avanço por disciplina</h3>
        <div class="hint">Comparativo entre conteúdo estudado (materiais enviados) e taxa de acerto nas questões relacionadas.</div></div>
      <div class="edital-legend">
        <span><i style="background:var(--brand)"></i>% Conteúdo estudado</span>
        <span><i style="background:var(--accent)"></i>% Acerto em questões</span>
      </div>
    </div>
    <div class="edital-chart">
      ${(ed.disciplinas || []).map((d) => `<div class="edital-bar-row">
        <div class="edital-bar-head">
          <div><b>${esc(d.materia)}</b> <span class="hint">(${d.estudados}/${d.totalTopicos} tópicos · ${d.questoesRespondidas} questões resolvidas)</span></div>
          <div class="row" style="gap:10px;font-size:12.5px">
            <span style="color:var(--brand);font-weight:800">${d.coberturaPct}% estudado</span>
            <span style="color:#8A5A12;font-weight:800">${d.taxaAcerto != null ? d.taxaAcerto + '% acerto' : 'sem questões'}</span>
          </div>
        </div>
        <div class="edital-dual-bars">
          <div class="edital-track" title="Cobertura de estudo: ${d.coberturaPct}%"><i style="width:${Math.max(d.coberturaPct ? 3 : 0, d.coberturaPct)}%;background:var(--brand)"></i></div>
          <div class="edital-track" title="Taxa de acerto: ${d.taxaAcerto ?? 0}%"><i style="width:${d.taxaAcerto != null ? Math.max(3, d.taxaAcerto) : 0}%;background:${(d.taxaAcerto ?? 0) >= 70 ? 'var(--ok)' : 'var(--accent)'}"></i></div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section-h"><h3>Edital verticalizado tópico a tópico</h3>
    <button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Enviar resumo para avançar no edital</button></div>
  ${filterTabs}
  <div class="grid">
    ${(ed.disciplinas || []).map((d) => {
      const topicosFiltrados = (d.topicos || []).filter(filterTopic);
      if (filter !== 'todos' && !topicosFiltrados.length) return '';
      return `<div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div><h3 style="margin:0;font-size:17px">${esc(d.materia)}</h3>
          <div class="hint">${d.estudados} de ${d.totalTopicos} tópicos estudados · ${d.dominados} dominado(s)${d.questoesNaBanca ? ` · <b style="color:#B45309">🔥 ${d.questoesNaBanca} q. na prova da banca</b>` : ''}</div></div>
        <span class="badge ${d.coberturaPct >= 70 ? 'brand' : ''}">${d.coberturaPct}% concluído</span>
      </div>
      <div class="edital-topic-table">
        ${topicosFiltrados.map((t) => {
          const st = TOPIC_STATUS[t.status] || TOPIC_STATUS.pendente;
          return `<div class="edital-topic-row">
            <div style="flex:1;min-width:200px">
              <div class="row" style="gap:6px;align-items:baseline;flex-wrap:wrap">
                <span style="font-weight:700;font-size:14px"><span class="hint" style="margin-right:6px">${esc(t.codigo)}.</span>${esc(t.nome)}</span>
                <span class="prio-badge prio-${t.prioridade || 'secundaria'}">${esc(t.prioridadeLabel || 'Secundário')}</span>
              </div>
              ${t.resumo ? `<div class="hint" style="margin-top:2px">${esc(t.resumo)}</div>` : ''}
              ${(t.materiaisNomes || []).length ? `<div class="hint" style="margin-top:3px;color:var(--brand)">📄 Material: ${t.materiaisNomes.map(esc).join(', ')} (${t.cobertura === 'completo' ? 'completo' : 'parcial'})</div>` : ''}
            </div>
            <div class="row" style="gap:8px;flex-wrap:nowrap">
              ${t.questoesNaBanca ? `<span class="badge ${t.incidenciaBanca === 'alta' ? 'accent' : ''}" title="Questões reais das provas da banca neste tópico: ${t.questoesNaBanca} (${t.probBancaPct}% da matéria)">${t.incidenciaBanca === 'alta' ? '🔥 ' : '📌 '}${t.questoesNaBanca} na banca (${t.probBancaPct}%)</span>` : ''}
              ${t.questoesGeradas ? `<span class="badge" title="Questões resolvidas / geradas neste tópico">${t.questoesRespondidas}/${t.questoesGeradas} q.${t.taxaAcerto != null ? ` · ${t.taxaAcerto}%` : ''}</span>` : ''}
              <span class="st ${st.cls}">${st.label}</span>
              ${t.questoesNaBanca ? `<button type="button" class="btn btn-ghost" data-treinar-reais="${t.id}" title="Treinar com questões reais da banca neste tópico (custo US$ 0)">${ic('book', 'sm')} Reais (${t.questoesNaBanca})</button>` : ''}
              <button class="btn btn-quiet" data-train-topic="${esc(d.materia)}||${esc(t.nome)}" title="Gerar questões com IA focadas neste tópico">${ic('spark', 'sm')} Gerar</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    }).join('')}
    ${(ed.disciplinas || []).every((d) => !(d.topicos || []).filter(filterTopic).length) ? `<div class="card card-pad" style="text-align:center;padding:32px"><div class="empty">${ic('search')}<div>Nenhum tópico encontrado para o filtro selecionado.</div><div class="hint">Alterne para "Todos os Tópicos" para ver o edital completo.</div></div></div>` : ''}
  </div>`;
}

async function refreshEditais({ silent = false } = {}) {
  try {
    const r = await api('/editais');
    S.editais = r.editais || [];
    S.activeEdital = r.active || null;
    if (S.wiz && !S.wiz.material && !S.wiz.editalId && S.activeEdital) {
      S.wiz.editalId = S.activeEdital.id;
      if (!S.wiz.banca && S.activeEdital.banca && S.bancas.some((b) => b.id === S.activeEdital.banca)) S.wiz.banca = S.activeEdital.banca;
    }
    if (!silent && S.screen === 'app') render();
  } catch { /* opcional */ }
}

// ---------- Radar de Desempenho & Produtividade Visual ----------
async function loadDesempenho(editalId = null) {
  S.desempBusy = true;
  if (S.view === 'desempenho') render();
  try {
    const q = editalId ? `?editalId=${encodeURIComponent(editalId)}` : '';
    S.desempenho = await api('/me/desempenho' + q);
    if (!S.desempEditalId && S.desempenho?.editalAtivo?.id) {
      S.desempEditalId = S.desempenho.editalAtivo.id;
    }
  } catch (e) {
    toast(e.message || 'Erro ao carregar dados de desempenho.');
  } finally {
    S.desempBusy = false;
  }
  if (S.view === 'desempenho') render();
}

function renderGaugeSvg(pct = 0, cor = 'var(--brand)', faixa = '') {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const r = 70;
  const c = Math.PI * r;
  const offset = c * (1 - p / 100);
  return `
    <svg viewBox="0 0 200 110" class="gauge-svg" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto" aria-label="Prontidão ${p}%">
      <path d="M 30 85 A 70 70 0 0 1 170 85" fill="none" stroke="var(--line-2)" stroke-width="14" stroke-linecap="round"/>
      <path d="M 30 85 A 70 70 0 0 1 170 85" fill="none" stroke="${cor}" stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" style="transition:stroke-dashoffset 0.6s ease"/>
      <text x="100" y="78" text-anchor="middle" font-size="28" font-weight="900" fill="var(--ink)">${p}%</text>
      <text x="100" y="98" text-anchor="middle" font-size="12" font-weight="800" fill="${cor}">${esc(faixa || 'Em Análise')}</text>
    </svg>
  `;
}

function renderDonutDuploSvg(acertos = 0, erros = 0, pct = 0) {
  const total = acertos + erros;
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || (total > 0 ? (acertos / total) * 100 : 0))));
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  return `
    <svg viewBox="0 0 90 90" style="width:72px;height:72px;flex:none">
      <circle cx="45" cy="45" r="${r}" fill="none" stroke="#FCA5A5" stroke-width="8"/>
      <circle cx="45" cy="45" r="${r}" fill="none" stroke="#10B981" stroke-width="8"
              stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
              transform="rotate(-90 45 45)" stroke-linecap="round"/>
      <text x="45" y="49" text-anchor="middle" font-size="14" font-weight="900" fill="var(--ink)">${p}%</text>
    </svg>
  `;
}

function renderEvolucaoSvg(dias = []) {
  if (!dias.length) return '<div class="empty" style="padding:24px">Sem dados de evolução nos últimos dias.</div>';

  const w = 620, h = 230;
  const padLeft = 40, padRight = 30, padTop = 30, padBottom = 40;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const maxResp = Math.max(10, ...dias.map((d) => d.respondidas || 0));
  const n = dias.length;
  const colW = plotW / n;
  const barW = Math.max(8, Math.min(24, colW * 0.55));

  const y80 = padTop + plotH * (1 - 0.80);
  const y50 = padTop + plotH * (1 - 0.50);

  const linePoints = [];
  const barElements = [];

  dias.forEach((d, idx) => {
    const cx = padLeft + idx * colW + colW / 2;
    const resp = d.respondidas || 0;
    const ac = d.acertos || 0;
    const err = Math.max(0, resp - ac);

    const totalBarH = (resp / maxResp) * (plotH - 10);
    const acH = resp > 0 ? (ac / resp) * totalBarH : 0;
    const errH = totalBarH - acH;

    const barY = padTop + plotH - totalBarH;
    const barX = cx - barW / 2;

    const diaLabel = esc(d.label || '');
    const semLabel = esc(d.diaSemana || '');
    const taxa = d.taxaPct != null ? `${d.taxaPct}%` : '—';
    const tooltip = `${diaLabel} (${semLabel}): ${resp} questões, ${ac} acertos (${taxa})`;

    barElements.push(`
      <g class="chart-col" tabindex="0">
        <title>${tooltip}</title>
        ${err > 0 ? `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${errH.toFixed(1)}" rx="3" fill="#F87171" opacity="0.9"/>` : ''}
        ${ac > 0 ? `<rect x="${barX.toFixed(1)}" y="${(barY + errH).toFixed(1)}" width="${barW.toFixed(1)}" height="${acH.toFixed(1)}" rx="3" fill="#10B981"/>` : ''}
        <text x="${cx.toFixed(1)}" y="${(h - 18).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">${diaLabel}</text>
        <text x="${cx.toFixed(1)}" y="${(h - 6).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="600" fill="var(--muted)">${semLabel}</text>
      </g>
    `);

    if (d.taxaPct != null) {
      const ly = padTop + plotH * (1 - d.taxaPct / 100);
      linePoints.push({ x: cx, y: ly, taxa: d.taxaPct, dia: diaLabel });
    }
  });

  const polylineStr = linePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const pointsElements = linePoints.map((p) => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="var(--brand)" stroke="#FFFFFF" stroke-width="2">
      <title>${p.dia}: ${p.taxa}% de acerto</title>
    </circle>
  `).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" class="desemp-svg" role="img" aria-label="Gráfico de evolução dos últimos 14 dias">
      <line x1="${padLeft}" y1="${padTop}" x2="${w - padRight}" y2="${padTop}" stroke="var(--line-2)" stroke-width="1"/>
      <text x="${padLeft - 6}" y="${padTop + 4}" text-anchor="end" font-size="9.5" fill="var(--muted)">100%</text>

      <line x1="${padLeft}" y1="${y80.toFixed(1)}" x2="${w - padRight}" y2="${y80.toFixed(1)}" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="${w - padRight + 4}" y="${y80 + 3}" text-anchor="start" font-size="9" font-weight="800" fill="#D97706">Meta 80%</text>

      <line x1="${padLeft}" y1="${y50.toFixed(1)}" x2="${w - padRight}" y2="${y50.toFixed(1)}" stroke="var(--line-2)" stroke-width="1"/>
      <text x="${padLeft - 6}" y="${y50 + 4}" text-anchor="end" font-size="9.5" fill="var(--muted)">50%</text>

      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${w - padRight}" y2="${padTop + plotH}" stroke="var(--line)" stroke-width="1.5"/>
      <text x="${padLeft - 6}" y="${padTop + plotH + 4}" text-anchor="end" font-size="9.5" fill="var(--muted)">0%</text>

      ${barElements.join('')}
      ${polylineStr ? `<polyline points="${polylineStr}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${pointsElements}
    </svg>
  `;
}

function viewDesempenho() {
  if (!S.desempenho && S.desempBusy) {
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando painel de inteligência de desempenho…</div></div>';
  }
  if (!S.desempenho) {
    loadDesempenho(S.desempEditalId);
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando painel de inteligência de desempenho…</div></div>';
  }

  const d = S.desempenho;
  const res = d.resumo || {};
  const radar = d.radar || {};
  const evol = d.evolucao || [];
  const disc = d.disciplinas || [];
  const quad = radar.quadrantes || {};

  const editaisOpts = (S.editais || []).map((e) => `
    <option value="${e.id}" ${e.id === S.desempEditalId ? 'selected' : ''}>${esc(e.titulo || e.cargo || 'Edital')}</option>
  `).join('');

  return `
    <div class="desemp-header">
      <div>
        <h1 class="page-title">Radar de Desempenho & Produtividade</h1>
        <p class="page-sub">Seu centro de inteligência para aprovação: métricas de tempo, evolução diária e probabilidade da banca.</p>
      </div>
      <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
        ${(S.editais || []).length > 1 ? `
          <select class="select" id="selDesempEdital" style="width:auto;min-width:220px;padding:8px 12px;font-size:13px">
            <option value="">Todos os Editais (Visão Geral)</option>
            ${editaisOpts}
          </select>
        ` : ''}
        <button class="btn btn-ghost btn-sm" id="btnRefreshDesemp">${ic('refresh', 'sm')} Atualizar</button>
      </div>
    </div>

    <!-- Diagnóstico Pedagógico do Concurseiro -->
    <div class="card card-pad" style="background:linear-gradient(135deg,#FAFDFB 0%,#F3F9F6 100%);border-left:5px solid var(--brand);margin-bottom:22px">
      <div class="row" style="gap:14px;align-items:center">
        <span class="li-icon" style="background:var(--brand);width:44px;height:44px;color:#fff">${ic('award')}</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:15px;color:var(--brand-ink)">Diagnóstico de Inteligência do Concurseiro</div>
          <div style="font-size:13.5px;color:var(--ink-2);margin-top:2px;line-height:1.45">${esc(res.diagnostico || '')}</div>
        </div>
      </div>
    </div>

    <!-- Grid Cockpit de KPIs -->
    <div class="desemp-kpi-grid">
      <div class="desemp-kpi-card brand">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Índice de Prontidão</span>
          ${ic('target', 'sm')}
        </div>
        ${renderGaugeSvg(radar.indiceProntidao, radar.prontidaoCor, radar.prontidaoFaixa)}
        <div class="desemp-kpi-sub hint" style="text-align:center;margin-top:4px">
          ${radar.totalQuestoesNaBanca ? `🔥 <b>${radar.totalQuestoesNaBanca} questões</b> da banca catalogadas` : 'Sem questões oficiais vinculadas'}
        </div>
      </div>

      <div class="desemp-kpi-card accent">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Tempo & Velocidade</span>
          ${ic('clock', 'sm')}
        </div>
        <div>
          <div class="desemp-kpi-val" style="color:var(--brand)">${esc(res.tempoFormatado || '0s')}</div>
          <div class="hint" style="font-weight:700">Dedicados em simulados</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="row" style="justify-content:space-between;align-items:baseline">
            <span class="hint">Velocidade:</span>
            <b>${esc(res.mediaVelocidadeFormatada || '0s')} / questão</b>
          </div>
          <div class="row" style="justify-content:space-between;align-items:baseline;margin-top:4px">
            <span class="hint">Ritmo:</span>
            <b>${res.questoesPorHora || 0} q./hora</b>
          </div>
          <div style="margin-top:8px">
            ${res.ritmoIdeal ? '<span class="badge ok" style="font-size:11px">⚡ Ritmo Ideal para Prova</span>' : '<span class="badge accent" style="font-size:11px">⏱️ Ritmo Moderado</span>'}
          </div>
        </div>
      </div>

      <div class="desemp-kpi-card ok">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Aproveitamento Geral</span>
          ${ic('check', 'sm')}
        </div>
        <div class="row" style="gap:14px;align-items:center">
          ${renderDonutDuploSvg(res.totalAcertos, res.totalErros, res.taxaGeralPct)}
          <div>
            <div class="desemp-kpi-val" style="color:var(--ok)">${res.taxaGeralPct || 0}%</div>
            <div class="hint">Taxa de Acerto Global</div>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2);font-size:13px">
          <span style="color:var(--ok);font-weight:700">✓ ${res.totalAcertos || 0} acertos</span> ·
          <span style="color:var(--bad);font-weight:700">✗ ${res.totalErros || 0} erros</span>
          <div class="hint" style="margin-top:2px">${res.totalRespondidas || 0} questões respondidas</div>
        </div>
      </div>

      <div class="desemp-kpi-card brand">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Simulados & Formato Real</span>
          ${ic('book', 'sm')}
        </div>
        <div>
          <div class="desemp-kpi-val">${res.simuladosConcluidos || 0}</div>
          <div class="hint">Simulados concluídos</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="row" style="justify-content:space-between;align-items:baseline">
            <span class="hint">Modo Prova Real:</span>
            <b>${res.simuladosModoProva || 0} feitos</b>
          </div>
          <div class="row" style="justify-content:space-between;align-items:baseline;margin-top:4px">
            <span class="hint">Sequência atual:</span>
            <b>🔥 ${S.hoje?.sequencia?.atual || 0} dias</b>
          </div>
          <div style="margin-top:8px">
            <button class="btn btn-primary btn-block btn-sm" data-go="gerar">${ic('spark', 'sm')} Gerar Simulado</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico de Evolução Diária (14 Dias) -->
    <div class="desemp-chart-box">
      <div class="desemp-chart-head">
        <div>
          <h3 style="margin:0;font-size:17px">Evolução Diária de Rendimento & Volume de Questões</h3>
          <div class="hint">Acompanhe seu volume de prática e a tendência da taxa de acerto ao longo dos últimos 14 dias.</div>
        </div>
        <div class="desemp-chart-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#10B981"></span> Acertos</span>
          <span class="legend-item"><span class="legend-dot" style="background:#F87171"></span> Erros</span>
          <span class="legend-item"><span class="legend-line" style="background:var(--brand)"></span> Taxa Diária (%)</span>
          <span class="legend-item"><span class="legend-line" style="background:#D97706;border:1px dashed #D97706"></span> Meta (80%)</span>
        </div>
      </div>
      <div class="desemp-svg-wrap">
        ${renderEvolucaoSvg(evol)}
      </div>
      <div class="hint" style="margin-top:10px;text-align:right">Dica: passe o mouse ou toque sobre as colunas para ver detalhes diários.</div>
    </div>

    <!-- Gráfico Comparativo por Disciplina vs Linha de Corte (80%) -->
    <div class="desemp-chart-box">
      <div class="desemp-chart-head">
        <div>
          <h3 style="margin:0;font-size:17px">Desempenho por Matéria vs Linha de Corte de Aprovação (80%)</h3>
          <div class="hint">Identifique quais matérias já estão na zona segura e quais precisam de reforço imediato.</div>
        </div>
      </div>
      <div class="desemp-disc-list">
        ${disc.length ? disc.map((m) => {
          const taxa = m.taxaAcerto != null ? m.taxaAcerto : 0;
          const corBarra = taxa >= 80 ? 'var(--ok)' : taxa >= 65 ? 'var(--brand)' : 'var(--bad)';
          const badgeCorte = m.taxaAcerto == null
            ? '<span class="badge">Pendente de Treino</span>'
            : taxa >= 80
              ? `<span class="badge ok">✓ Zona de Corte (${taxa}%)</span>`
              : taxa >= 65
                ? `<span class="badge brand">⚡ Competitivo (${taxa}%)</span>`
                : `<span class="badge bad">🚨 Abaixo do Corte (${taxa}%)</span>`;

          return `
            <div class="desemp-disc-item">
              <div class="desemp-disc-head">
                <div class="row" style="gap:8px;align-items:center">
                  <b>${esc(m.materia)}</b>
                  ${m.peso > 1 ? `<span class="badge brand" style="font-size:11px">Peso ${m.peso}</span>` : ''}
                  ${m.questoesNaBanca ? `<span class="badge" style="background:#FEF3C7;color:#92400E;font-size:11px">🔥 ${m.questoesNaBanca} na banca</span>` : ''}
                </div>
                <div class="row" style="gap:8px;align-items:center">
                  <span class="hint">${m.questoesAcertos || 0}/${m.questoesRespondidas || 0} acertadas</span>
                  ${badgeCorte}
                </div>
              </div>
              <div class="desemp-bar-track" title="${taxa}% de aproveitamento">
                <div class="desemp-cut-line"></div>
                <div class="desemp-bar-fill" style="width:${Math.max(2, taxa)}%;background:${corBarra}"></div>
              </div>
            </div>
          `;
        }).join('') : '<div class="empty" style="padding:24px">Nenhuma matéria registrada ainda.</div>'}
      </div>
    </div>

    <!-- Matriz 2D de Relevância da Banca × Domínio do Aluno (Quadrantes da Aprovação) -->
    <div class="section-h" style="margin-top:24px">
      <div>
        <h3 style="margin:0;font-size:18px">Matriz de Pareto: Relevância da Banca × Domínio do Concurseiro</h3>
        <div class="hint">Mapeamento tático dos seus tópicos de estudo dividido em 4 quadrantes de decisão.</div>
      </div>
    </div>

    <div class="quadrantes-grid">
      <!-- Quadrante 1: Zona de Perigo -->
      <div class="quadrante-box danger">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:#B91C1C">🚨 Zona de Perigo (Urgente)</span>
            <span class="badge bad" style="font-weight:800">${(quad.perigo || []).length}</span>
          </div>
          <div class="quadrante-sub">Alta incidência na prova onde seu rendimento está baixo (< 60%). Máxima prioridade de estudo.</div>
          <div class="quadrante-items">
            ${(quad.perigo || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)} · ${t.questoesNaBanca ? `🔥 <b>${t.questoesNaBanca} q. na banca</b>` : 'Relevante'}</div>
                </div>
                <div class="row" style="gap:4px">
                  ${t.questoesNaBanca ? `<button type="button" class="btn btn-ghost btn-sm" data-treinar-reais="${t.id}" title="Resolver reais a custo US$ 0">${ic('book', 'sm')} Reais</button>` : ''}
                  <button type="button" class="btn btn-primary btn-sm" data-treinar-topico="${t.id}">${ic('spark', 'sm')}</button>
                </div>
              </div>
            `).join('')}
            ${!(quad.perigo || []).length ? '<div class="hint" style="padding:14px;text-align:center">Parabéns! Nenhum ponto cego crítico detectado.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Quadrante 2: Fortaleza -->
      <div class="quadrante-box fortaleza">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:#15803D">🏆 Fortaleza (Zona de Aprovação)</span>
            <span class="badge ok" style="font-weight:800">${(quad.fortaleza || []).length}</span>
          </div>
          <div class="quadrante-sub">Tópicos quentes da banca onde você tem domínio comprovado (≥ 75%). Aqui você garante seus pontos.</div>
          <div class="quadrante-items">
            ${(quad.fortaleza || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)} · <b style="color:var(--ok)">${t.taxaAcerto}% acerto</b></div>
                </div>
                <span class="badge ok" style="font-size:11px">Dominado</span>
              </div>
            `).join('')}
            ${!(quad.fortaleza || []).length ? '<div class="hint" style="padding:14px;text-align:center">Resolva mais simulados para consolidar sua fortaleza.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Quadrante 3: Atenção Moderada -->
      <div class="quadrante-box reforco">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:#B45309">⚠️ Atenção Moderada (Reforço)</span>
            <span class="badge accent" style="font-weight:800">${(quad.reforco || []).length}</span>
          </div>
          <div class="quadrante-sub">Tópicos com rendimento intermediário (60% a 74%). Suba para a zona de corte com revisões.</div>
          <div class="quadrante-items">
            ${(quad.reforco || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)} · <b>${t.taxaAcerto != null ? t.taxaAcerto + '%' : 'Pendente'}</b></div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" data-treinar-topico="${t.id}">${ic('spark', 'sm')} Praticar</button>
              </div>
            `).join('')}
            ${!(quad.reforco || []).length ? '<div class="hint" style="padding:14px;text-align:center">Nenhum tópico em reforço no momento.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Quadrante 4: Zona de Conforto -->
      <div class="quadrante-box conforto">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:var(--ink-2)">☕ Zona Secundária</span>
            <span class="badge" style="font-weight:800">${(quad.conforto || []).length}</span>
          </div>
          <div class="quadrante-sub">Tópicos com baixa incidência histórica nas provas anteriores da banca. Não gaste tempo excessivo aqui.</div>
          <div class="quadrante-items">
            ${(quad.conforto || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)}</div>
                </div>
                <span class="badge" style="font-size:11px">Baixa Cobrança</span>
              </div>
            `).join('')}
            ${!(quad.conforto || []).length ? '<div class="hint" style="padding:14px;text-align:center">Sem tópicos secundários listados.</div>' : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------- Modal ----------
function viewModal() {
  const m = S.modal;
  if (m.html) return `<div class="modal-bg" data-mclose><div class="modal wide" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h4 style="margin:0">${esc(m.title)}</h4><button class="icon-btn" data-mclose2 aria-label="Fechar">${ic('x', 'sm')}</button></div>${m.html}</div></div>`;
  return `<div class="modal-bg" data-mclose><div class="modal" role="dialog" aria-modal="true"><h4>${esc(m.title)}</h4><p>${esc(m.text)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-mclose2>Cancelar</button><button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" id="mOk">${esc(m.ok)}</button></div></div></div>`;
}
const confirmBox = (title, text, ok, danger, fn) => { S.modal = { title, text, ok, danger, fn }; render(); };

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
      modal('Simulado no Formato da Prova Real', `
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
          <button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnIniciarProvaReal">${ic('timer', 'sm')} Iniciar Prova Real</button>
        </div>
      `);

      on('#btnIniciarProvaReal', 'click', async (e) => {
        e.currentTarget.disabled = true;
        e.currentTarget.innerHTML = '<span class="spinner sm"></span> Montando prova...';
        try {
          const qtdTotal = Number(v('#prQtdTotal')) || 30;
          const tempoMinutos = Number(v('#prTempoMin')) || 120;
          const res = await api(`/editais/${ed.id}/simulado-prova-real`, {
            method: 'POST',
            body: { qtdTotal, tempoMinutos },
          });
          closeModal();
          S.sets.unshift(res.set);
          S.active = res.set.id;
          go('simulado');
          toast(`Simulado Prova Real iniciado (${res.count} questões). Boa prova!`);
        } catch (err) {
          toast(err.message || 'Não foi possível gerar a prova real.');
          e.currentTarget.disabled = false;
          e.currentTarget.textContent = 'Iniciar Prova Real';
        }
      });
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

// ---------- Inicialização ----------
async function enterApp(user) {
  S.user = user; S.screen = 'app';
  const h = location.hash.slice(1); S.view = ROUTES.includes(h) ? h : 'home';
  render();
  try {
    const [b, s] = await Promise.all([api('/bancas'), api('/sets')]);
    Object.assign(S, { bancas: b.bancas, materias: b.materias, niveis: b.niveis, sets: s.sets, loaded: true });
    await Promise.all([refreshStars({ silent: true }), refreshEditais({ silent: true }), refreshCadernos({ silent: true }), loadHoje()]);
    if (['provas', 'contribuir', 'gerar', 'edital', 'conta', 'planos', 'estrelas'].includes(S.view)) return go(S.view);
  } catch (e) { toast(e.message); }
  render();
}

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
