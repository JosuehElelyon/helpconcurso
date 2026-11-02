/* =========================================================
   HelpConcurso — front-end (SPA sem framework)
   Conversa com a API em /api. Estado em S, render() redesenha a tela.
   ========================================================= */

// ---------- Ícones ----------
const P = {
  logo: '<path d="M4 19V6a2 2 0 0 1 2-2h11l3 3v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
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
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => (n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';
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
};
const BANCA = () => Object.fromEntries(S.bancas.map((b) => [b.id, b]));
const isAdmin = () => S.user?.role === 'ADMIN';
const newWiz = () => ({ stage: '', step: 1, mode: 'file', uploading: false, err: '', warnings: [], material: null, materia: '', assunto: '', banca: '', qtd: 10, nivel: 'Médio', generating: false, genCount: 0, genErr: '' });

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
    case 'simulado': return viewPratica();
    case 'bancas': return viewBancas();
    case 'provas': return isAdmin() ? viewProvas() : viewHome();
    case 'contribuir': return viewContribuir();
    case 'estrelas': return viewEstrelas();
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
      <div class="logo"><span class="logo-mark">${ic('logo')}</span> HelpConcurso</div>
      <div>
        <h1>Transforme seus resumos em questões no estilo da sua banca.</h1>
        <p>Envie seu material de estudo, escolha a banca e treine com questões inéditas feitas a partir do que você estudou.</p>
        <ul class="login-points">
          <li><span class="dot">${ic('upload', 'sm')}</span><span>Leitura de PDF, DOC e DOCX com identificação automática da matéria</span></li>
          <li><span class="dot">${ic('brain', 'sm')}</span><span>IA treinada com provas anteriores de FGV, CEBRASPE, FCC, VUNESP e Cesgranrio</span></li>
          <li><span class="dot">${ic('target', 'sm')}</span><span>Gabarito comentado com o trecho do seu material que fundamenta a resposta</span></li>
        </ul>
      </div>
      <div class="hint" style="color:#8D97A2">Versão 1.1</div>
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
        await api('/auth/register', { method: 'POST', body: { name: v('#fName'), email, password: vals['#fPass'] } });
        S.auth = 'verificar'; S.authOk = 'Conta criada! Verifique sua caixa de entrada (e o spam).';
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
  const nav = [['home', 'Início', 'home'], ['gerar', 'Gerar questões', 'spark'], ['questoes', 'Meus simulados', 'list'], ['contribuir', 'Enviar provas', 'upload'], ['estrelas', 'Minhas estrelas', 'star'], ['bancas', 'Bancas e estilos', 'layers']];
  const item = ([v, l, i]) => `<button class="nav-item ${S.view === v || (v === 'questoes' && S.view === 'simulado') ? 'on' : ''}" data-go="${v}">${ic(i)} ${l}${v === 'questoes' && S.sets.length ? `<span class="badge">${S.sets.length}</span>` : ''}</button>`;
  return `<header class="header"><div class="header-in">
      <div class="logo" data-go="home"><span class="logo-mark">${ic('logo')}</span><span>HelpConcurso</span></div>
      <div class="spacer"></div>
      ${S.stars ? `<button class="star-chip" data-go="estrelas" title="${esc(S.stars.level.nome)} · ${S.stars.total} estrelas no total"><span class="star-ic" id="starIc">★</span><b>${S.stars.balance}</b><span class="lvl">${esc(S.stars.level.nome)}</span></button>` : ''}
      <div class="user-chip" title="${esc(u.email)}"><span class="avatar" aria-hidden="true">${esc(initials(u.name))}</span><span class="nm">${esc(u.name)}</span></div>
      <button class="icon-btn" id="openMenu" aria-label="Abrir menu">${ic('menu')}</button>
    </div></header>
    <div class="drawer-bg" data-close></div>
    <aside class="drawer" aria-label="Menu">
      <div class="drawer-head"><span class="avatar lg">${esc(initials(u.name))}</span><div style="min-width:0"><div style="font-weight:800">${esc(u.name)}${isAdmin() ? '<span class="admin-badge">ADMIN</span>' : ''}</div><div class="em">${esc(u.email)}</div></div><button class="icon-btn" style="margin-left:auto;width:36px;height:36px" data-close aria-label="Fechar menu">${ic('x', 'sm')}</button></div>
      <nav>${nav.map(item).join('')}
        ${isAdmin() ? `<div class="nav-sep">Administração</div>${item(['provas', 'Base de provas (Treinar IA)', 'brain'])}` : ''}
      </nav>
      <div class="drawer-foot"><button class="nav-item" id="logout">${ic('logout')} Sair</button></div>
    </aside>
    <main class="main">${body}</main>`;
}

// ---------- Home ----------
function stats() {
  const qs = S.sets.reduce((a, s) => a + (s.questoes || []).length, 0);
  let resp = 0, ac = 0;
  S.sets.forEach((s) => { const r = s.respostas || {}; (s.questoes || []).forEach((q, i) => { if (r[i] != null) { resp++; if (r[i] === q.gabarito) ac++; } }); });
  return { qs, feitos: S.sets.filter((s) => s.finalizado).length, taxa: resp ? Math.round((ac / resp) * 100) + '%' : '—', provas: S.bancas.reduce((a, b) => a + (b.provasTreinadas || 0), 0) };
}
function viewHome() {
  const st = stats(), h = new Date().getHours();
  return `<h1 class="page-title">${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(firstName(S.user.name))}</h1>
  <p class="page-sub">O que vamos estudar hoje?</p>
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
  <div class="section-h"><h3>Bancas</h3><button class="btn btn-quiet" data-go="${isAdmin() ? 'provas' : 'contribuir'}">${isAdmin() ? 'Base de provas' : 'Enviar provas'} ${ic('arrowR', 'sm')}</button></div>
  <div class="banca-strip">${S.bancas.map((b) => `<button class="banca-tile" style="--c:${b.cor}" data-bancatile="${b.id}"><div class="bn">${b.nome}</div><div class="bf">${b.formato === 'ce' ? 'Certo ou Errado' : 'Múltipla escolha'}</div><div class="bc">${b.provasTreinadas} prova(s) treinada(s)</div></button>`).join('')}</div>
  <div class="section-h"><h3>Simulados recentes</h3>${S.sets.length ? `<button class="btn btn-quiet" data-go="questoes">Ver todos ${ic('arrowR', 'sm')}</button>` : ''}</div>
  <div class="card">${!S.loaded ? '<div class="empty"><span class="spinner sm"></span></div>' : S.sets.length ? `<div class="list">${S.sets.slice(0, 5).map(setRow).join('')}</div>` : `<div class="empty">${ic('clip')}<div>Nenhum simulado ainda.</div><div class="hint">Envie seu primeiro material para começar.</div></div>`}</div>`;
}
function setRow(s) {
  const b = BANCA()[s.banca] || { cor: '#999', nome: '?' };
  const r = s.respostas || {}, n = (s.questoes || []).length, resp = Object.keys(r).length;
  const ac = (s.questoes || []).filter((q, i) => r[i] === q.gabarito).length;
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
function wizStep1(w) {
  if (w.uploading) return `<div class="progress-box"><div class="spinner"></div><b>Lendo seu material…</b><div class="hint">Verificando a segurança do arquivo, extraindo o texto e identificando a matéria.<br>PDFs escaneados podem levar até 1 minuto.</div></div>`;
  const m = w.material;
  if (m) {
    const ext = m.fileName ? m.fileName.split('.').pop().toLowerCase() : 'texto';
    return `<div class="file-card"><span class="ftype" style="background:${FT[ext] || 'var(--brand)'}">${esc(ext.toUpperCase())}</span>
      <div style="flex:1;min-width:0"><div class="li-title">${esc(m.fileName || 'Texto colado')}</div><div class="li-meta">${m.pages ? m.pages + ' páginas · ' : ''}${m.wordCount.toLocaleString('pt-BR')} palavras extraídas</div></div>
      <button class="btn btn-quiet" id="resetFile">${ic('refresh', 'sm')} Trocar</button></div>
      ${(w.warnings || []).map((t) => `<div class="banner warn" style="margin:12px 0 0">${ic('alert', 'sm')}<div>${esc(t)}</div></div>`).join('')}
      <div class="preview">${esc(m.preview)}${m.wordCount > 220 ? '…' : ''}</div>
      <div class="wiz-foot"><span></span><button class="btn btn-primary" data-step="2">Continuar ${ic('arrowR', 'sm')}</button></div>`;
  }
  return `${w.err ? `<div class="banner bad">${ic('alert', 'sm')}<div>${esc(w.err)}</div></div>` : ''}
  ${w.mode === 'file' ? `
    <label class="drop" id="drop"><input type="file" id="fileIn" class="sr" accept=".pdf,.doc,.docx,.txt,.md">
      <div class="big">${ic('upload', 'lg')}</div><strong>Arraste seu arquivo aqui ou clique para escolher</strong><span class="hint">Resumos, anotações, apostilas ou trechos de lei · até 25 MB</span>
      <div class="formats"><span class="badge">PDF</span><span class="badge">DOCX</span><span class="badge">DOC</span><span class="badge">TXT</span></div>
    </label>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-quiet" id="modePaste">Prefere colar o texto?</button></div>`
  : `<div class="field"><label for="pasteIn">Cole seu material de estudo</label><textarea class="textarea" id="pasteIn" placeholder="Cole aqui seu resumo, anotações ou o conteúdo da apostila…"></textarea><span class="hint">Mínimo de 60 palavras.</span></div>
    <div class="wiz-foot"><button class="btn btn-ghost" id="modeFile">${ic('arrowL', 'sm')} Enviar arquivo</button><button class="btn btn-primary" id="usePaste">Usar este texto ${ic('arrowR', 'sm')}</button></div>`}`;
}
function wizStep2(w) {
  const d = w.material?.detect;
  const opts = S.materias.map((m) => `<option ${m === w.materia ? 'selected' : ''}>${esc(m)}</option>`).join('');
  return `${d ? `<div class="detect"><span class="li-icon" style="background:var(--brand);width:48px;height:48px">${ic('spark')}</span>
     <div style="flex:1"><div class="eyebrow">${d.origem === 'palavras-chave' ? 'Sugestão por palavras-chave' : 'Matéria identificada pela IA'}</div>
       <div style="font-size:21px;font-weight:800;letter-spacing:-.01em">${esc(d.materia)}</div>
       <div class="conf"><i style="width:${Math.round((d.confianca || 0) * 100)}%"></i></div><div class="hint">Confiança de ${Math.round((d.confianca || 0) * 100)}%</div>
       ${d.resumo ? `<p style="margin:10px 0 0;color:var(--ink-2)">${esc(d.resumo)}</p>` : ''}
       ${(d.temas || []).length ? `<div class="chips" style="margin-top:10px">${d.temas.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
     </div></div><hr style="border:0;border-top:1px solid var(--line-2);margin:22px 0">`
    : '<p style="margin-top:0">Não conseguimos identificar a matéria automaticamente. <b>Qual é a matéria deste material?</b></p>'}
  <div class="opts" style="margin-top:0">
    <div class="field"><label for="matSel">${d ? 'Confirme ou altere a matéria' : 'Matéria'}</label><select class="select" id="matSel"><option value="">Selecione…</option>${opts}</select></div>
    <div class="field"><label for="assIn">Assunto específico <span class="hint">(opcional)</span></label><input class="input" id="assIn" placeholder="Ex.: Atos administrativos" value="${esc(w.assunto)}"></div>
  </div>
  <div class="wiz-foot"><button class="btn btn-ghost" data-step="1">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="toStep3">Escolher banca ${ic('arrowR', 'sm')}</button></div>`;
}
function wizStep3(w) {
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
    const r = payload instanceof FormData ? await api('/materials', { method: 'POST', form: payload }) : await api('/materials', { method: 'POST', body: payload });
    w.material = r.material; w.warnings = r.warnings || [];
    const d = r.material.detect;
    w.materia = d && S.materias.includes(d.materia) ? d.materia : (d?.materia ? 'Outra' : '');
    if (d?.materia && w.materia === 'Outra') w.assunto = d.materia;
  } catch (e) { w.err = e.message; }
  w.uploading = false; render();
}

async function generate() {
  const w = S.wiz; w.step = 4; w.generating = true; w.genErr = ''; w.genCount = 0; w.stage = ''; render();
  try {
    const res = await fetch('/api/sets', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId: w.material.id, materia: w.materia, assunto: w.assunto, banca: w.banca, qtd: w.qtd, nivel: w.nivel }) });
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
    S.wiz = null; S.active = done.set.id; go('simulado');
    const rv = done.set.revisao;
    toast(`${done.set.questoes.length} questões no estilo ${BANCA()[done.set.banca].nome}${rv && rv.revisor === 'ok' ? ` · revisor conferiu todas${rv.descartadas ? `, descartou ${rv.descartadas} e refez ${rv.refeitas}` : ''}` : ''}`);
    api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {});
  } catch (e) { w.genErr = e.message; render(); }
  finally { w.generating = false; }
}

// ---------- Resolver simulado ----------
function viewPratica() {
  const s = S.sets.find((x) => x.id === S.active);
  if (!s) return `<div class="empty">Simulado não encontrado. <button class="btn btn-quiet" data-go="questoes">Voltar</button></div>`;
  const b = BANCA()[s.banca], r = s.respostas || {}, n = s.questoes.length;
  const resp = Object.keys(r).length, ac = s.questoes.filter((q, i) => r[i] === q.gabarito).length, er = resp - ac, ce = s.formato === 'ce';
  return `<button class="btn btn-quiet" data-go="questoes" style="margin:-6px 0 10px -10px">${ic('arrowL', 'sm')} Meus simulados</button>
  <div class="set-head">
    <div><div class="row" style="margin-bottom:6px"><span class="badge" style="background:${b.cor};color:#fff">${b.nome}</span><span class="badge">${esc(s.nivel)}</span><span class="badge">${b.formatoLabel}</span></div>
      <h1 class="page-title">${esc(s.materia)}${s.assunto ? ` <span style="color:var(--muted);font-weight:700">· ${esc(s.assunto)}</span>` : ''}</h1>
      <div class="hint">${n} questões · gerado de ${esc(s.arquivo || 'texto colado')} em ${fmtDate(s.createdAt)}</div>
      ${s.revisao ? `<div class="hint" style="margin-top:4px">${s.revisao.revisor === 'ok' ? `${ic('check', 'sm')} Revisão automática: ${s.revisao.aprovadas} aprovada(s)${s.revisao.descartadas ? `, ${s.revisao.descartadas} descartada(s) e ${s.revisao.refeitas} refeita(s)` : ''}` : s.revisao.revisor === 'indisponivel' ? '⚠ O revisor automático estava indisponível: confira as questões com atenção' : ''}</div>` : ''}</div>
    <div class="score-box"><div><b>${resp}/${n}</b><span>Respondidas</span></div><div><b style="color:var(--ok)">${ac}</b><span>Acertos</span></div><div><b style="color:var(--bad)">${er}</b><span>Erros</span></div>${ce ? `<div><b>${ac - er}</b><span>Nota líquida</span></div>` : ''}</div>
  </div>
  ${ce ? `<div class="banner info">${ic('info', 'sm')}<div>No estilo CEBRASPE, cada item errado anula um certo. Na dúvida, você pode deixar o item em branco.</div></div>` : ''}
  <div class="banner info">${ic('info', 'sm')}<div>As questões seguem o conteúdo do <b>seu material</b>. Se ele estiver desatualizado (ex.: lei alterada), a questão também estará. Achou um erro? Use <b>Reportar erro</b> — se a IA confirmar, você ganha estrelas.</div></div>
  ${s.questoes.map((q, i) => viewQ(q, i, r[i], ce, (S.feedback[s.id] || {})[i])).join('')}
  <div class="row" style="justify-content:space-between;margin-top:20px">
    <div class="row"><button class="btn btn-ghost" id="copySet">${ic('copy', 'sm')} Copiar questões</button><button class="btn btn-danger" id="delSet">${ic('trash', 'sm')} Excluir</button></div>
    <div class="row">${resp ? `<button class="btn btn-ghost" id="resetSet">${ic('refresh', 'sm')} Refazer</button>` : ''}<button class="btn btn-primary" id="finish">${s.finalizado ? 'Ver resultado' : 'Finalizar simulado'}</button></div>
  </div>`;
}
function viewQ(q, i, ans, ce, fb) {
  const answered = ans != null, ok = ans === q.gabarito;
  const cls = (L) => (!answered ? '' : L === q.gabarito ? 'correct' : L === ans ? 'wrong' : '');
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button class="alt ${cls(L)}" data-ans="${i}:${L}" ${answered ? 'disabled' : ''}><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${q.alternativas.map((a, j) => `<button class="alt ${cls(LETRAS[j])}" data-ans="${i}:${LETRAS[j]}" ${answered ? 'disabled' : ''}><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;
  return `<article class="card q" id="q${i}">
    <div class="q-top"><span class="q-num">${ce ? 'Item' : 'Questão'} ${i + 1}</span>${q.tema ? `<span class="badge">${esc(q.tema)}</span>` : ''}${q.nivel ? `<span class="badge">${esc(q.nivel)}</span>` : ''}${q.verificada ? `<span class="badge brand" title="Uma segunda IA resolveu sem ver o gabarito e chegou à mesma resposta">${ic('check', 'sm')} Verificada</span>` : ''}${q.contestada ? '<span class="sev high">Erro confirmado</span>' : ''}</div>
    <p class="q-text">${esc(q.enunciado)}</p>${opts}
    ${answered ? `<div class="explain"><div class="verdict ${ok ? 'ok' : 'bad'}">${ic(ok ? 'check' : 'x', 'sm')} ${ok ? 'Você acertou' : 'Resposta incorreta'} · Gabarito: ${ce ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : q.gabarito}</div>
      <p>${esc(q.comentario)}</p>
      ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”<div class="hint" style="font-style:normal;margin-top:4px">${q.ancorada === false ? '⚠ Trecho não localizado exatamente no seu material — confira' : q.ancorada ? '✓ Trecho conferido no seu material' : 'Trecho do seu material'}</div></div>` : ''}
      ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
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

// ---------- Meus simulados ----------
function viewBanco() {
  const f = S.filter, mats = [...new Set(S.sets.map((s) => s.materia))].sort();
  const list = S.sets.filter((s) => (!f.banca || s.banca === f.banca) && (!f.materia || s.materia === f.materia));
  return `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1 class="page-title">Meus simulados</h1><p class="page-sub">Todas as questões geradas a partir dos seus materiais.</p></div><button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Novo material</button></div>
  ${S.sets.length ? `<div class="filters"><select class="select" id="fBanca"><option value="">Todas as bancas</option>${S.bancas.map((b) => `<option value="${b.id}" ${f.banca === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select>
    <select class="select" id="fMat"><option value="">Todas as matérias</option>${mats.map((m) => `<option ${f.materia === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>` : ''}
  <div class="card">${list.length ? `<div class="list">${list.map(setRow).join('')}</div>` : `<div class="empty">${ic('clip')}<div>${S.sets.length ? 'Nenhum simulado com esses filtros.' : 'Você ainda não gerou questões.'}</div></div>`}</div>`;
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
const ST_CLASS = { CHECKING: 'PROCESSING', IN_REVIEW: 'PENDING', QUEUED: 'PENDING', PROCESSING: 'PROCESSING', BATCH_PENDING: 'PROCESSING', READY: 'READY', DUPLICATE: 'PENDING', REJECTED: 'FAILED', FAILED: 'FAILED' };
const stBadge = (p) => `<span class="st ${ST_CLASS[p.status] || 'PENDING'}">${PENDING_ST.includes(p.status) ? '<span class="spinner sm" style="width:12px;height:12px"></span>' : ''}${esc(p.statusLabel || p.status)}</span>`;
const SEV_LABEL = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo', info: 'Info' };

function viewContribuir() {
  const f = S.cform || (S.cform = { banca: '', orgao: '', cargo: '', ano: '', files: [], gabarito: null });
  const mine = S.minhas || [];
  return `<h1 class="page-title">Enviar provas</h1>
  <p class="page-sub">Envie provas anteriores para a IA aprender o estilo de cada banca. Toda prova passa por verificações de segurança e, se preciso, por uma revisão. Cada prova aprovada vale gerações extras de questões para você.</p>
  <div class="train-grid">
    <form class="card card-pad" id="cForm" novalidate>
      <div class="field" style="margin-bottom:8px"><label>Banca</label></div>
      <div class="banca-tabs" style="flex-wrap:wrap">${S.bancas.map((b) => `<button type="button" class="btab ${f.banca === b.id ? 'on' : ''}" data-cb="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}</div>
      <div class="up-grid">
        <div class="field"><label for="cOrgao">Órgão</label><input class="input" id="cOrgao" maxlength="120" placeholder="Ex.: TRF-1" value="${esc(f.orgao)}"></div>
        <div class="field"><label for="cCargo">Cargo</label><input class="input" id="cCargo" maxlength="120" placeholder="Ex.: Analista" value="${esc(f.cargo)}"></div>
        <div class="field"><label for="cAno">Ano</label><input class="input" id="cAno" inputmode="numeric" maxlength="4" placeholder="2024" value="${esc(f.ano)}"></div>
      </div>
      <label class="drop slim" id="cDrop"><input type="file" id="cFiles" class="sr" multiple accept=".pdf,.doc,.docx,.txt">
        <div class="big" style="width:44px;height:44px">${ic('upload')}</div><strong style="font-size:15px">Arquivos das provas</strong><span class="hint">PDF (inclusive escaneado), DOCX, DOC ou TXT · até 10 por vez</span></label>
      ${f.files.length ? `<div class="file-list">${f.files.map((x, i) => `<span class="chip"><span>${esc(x.name)}</span><button type="button" class="link-btn" data-rmc="${i}">remover</button></span>`).join('')}</div>` : ''}
      <div class="field" style="margin-top:14px"><label for="cGab">Gabarito separado <span class="hint">(opcional, só com 1 prova)</span></label><input type="file" id="cGab" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>${f.gabarito ? `<span class="hint">Selecionado: ${esc(f.gabarito.name)}</span>` : ''}</div>
      ${(S.cResults || []).length ? `<div class="file-list" style="margin-bottom:14px">${S.cResults.map((r) => `<div class="banner ${r.ok ? 'info' : r.dup ? 'warn' : 'bad'}" style="margin:0">${ic(r.ok ? 'check' : 'alert', 'sm')}<div><b>${esc(r.name)}</b>: ${esc(r.msg)}</div></div>`).join('')}</div>` : ''}
      <button class="btn btn-primary btn-block" type="submit" ${S.cBusy || !f.files.length || !f.banca ? 'disabled' : ''}>${S.cBusy ? `<span class="spinner sm"></span> Enviando ${S.cBusy}…` : `${ic('upload', 'sm')} Enviar ${f.files.length > 1 ? f.files.length + ' provas' : 'prova'}`}</button>
      <p class="hint" style="margin:10px 0 0">Arquivos com scripts, macros, anexos ou texto escondido com instruções são recusados automaticamente. Envios maliciosos repetidos pausam a conta.</p>
    </form>
    <div class="card">
      <div style="padding:16px 18px 8px" class="row"><h3 style="margin:0;font-size:16px">Minhas contribuições</h3><span class="badge">${mine.length}</span></div>
      ${mine.length ? mine.map((p) => { const b = BANCA()[p.banca]; return `<div class="prova"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
          <div style="min-width:0"><div class="li-title">${esc(p.titulo)}</div><div class="li-meta">${b ? b.nome : ''} · ${fmtDate(p.createdAt)}${p.numQuestoes ? ` · ${p.numQuestoes} questões na base` : ''}</div></div>${stBadge(p)}</div>
          ${p.motivo ? `<div class="hint" style="margin-top:6px">${esc(p.motivo)}</div>` : ''}</div>`; }).join('')
        : `<div class="empty" style="padding:24px">${ic('book')}<div>Você ainda não enviou provas.</div></div>`}
    </div>
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
        <div class="li-meta">${[p.ano, (p.materias || []).slice(0, 3).join(', '), p.numQuestoes != null ? p.numQuestoes + ' questões' : '', p.source === 'user' && p.uploader ? 'enviada por ' + p.uploader.name : 'admin', p.autoApproved ? 'aprovação automática' : ''].filter(Boolean).map(esc).join(' · ')}</div></div>${stBadge(p)}</div>
      ${p.error ? `<div class="hint" style="color:var(--bad);margin-top:6px">${esc(p.error)}</div>` : p.reviewNote && ['REJECTED', 'DUPLICATE'].includes(p.status) ? `<div class="hint" style="margin-top:6px">${esc(p.reviewNote)}</div>` : ''}
      <div class="row" style="margin-top:8px;gap:4px">
        <button class="btn btn-quiet" data-analisar="${p.id}">${ic('eye', 'sm')} Detalhes</button>
        ${p.status === 'READY' ? `<button class="btn btn-quiet" data-verq="${p.id}">${ic('list', 'sm')} Questões</button>` : ''}
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
    <div class="card card-pad" style="margin-bottom:16px"><h3 style="margin:0 0 12px;font-size:16px">Uso da IA (30 dias)</h3>
      ${m.ia.usage.length ? `<table class="tbl"><thead><tr><th>Tarefa</th><th>Modelo</th><th>Chamadas</th><th>Falhas</th><th>Reserva</th><th>Tokens entrada</th><th>Tokens saída</th><th>Cache</th><th>Tempo médio</th></tr></thead><tbody>${m.ia.usage.map((u) => `<tr><td>${esc(u.task)}</td><td><code>${esc(u.provider)}:${esc(u.model)}</code></td><td>${u.chamadas}</td><td>${u.falhas}</td><td>${u.reservas}</td><td>${Number(u.entrada).toLocaleString('pt-BR')}</td><td>${Number(u.saida).toLocaleString('pt-BR')}</td><td>${Number(u.cache).toLocaleString('pt-BR')}</td><td>${u.ms_medio != null ? (u.ms_medio / 1000).toFixed(1) + ' s' : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Sem chamadas ainda.</p>'}
      ${m.ia.revisor && m.ia.revisor.geradas ? `<p class="hint" style="margin:10px 0 0">Revisor automático (30 dias): ${m.ia.revisor.geradas} questões geradas, ${m.ia.revisor.descartadas} descartadas por divergência/ambiguidade, ${m.ia.revisor.refeitas} refeitas.</p>` : ''}
      ${(m.ia.qualidade || []).length ? `<h3 style="margin:18px 0 8px;font-size:15px">Qualidade percebida pelos alunos</h3><table class="tbl"><thead><tr><th>Banca</th><th>👍</th><th>👎</th><th>Erros confirmados</th><th>Reportes não confirmados</th></tr></thead><tbody>${m.ia.qualidade.map((q) => `<tr><td>${esc(BANCA()[q.banca]?.nome || q.banca)}</td><td>${q.gostei}</td><td>${q.nao_gostei}</td><td>${q.erros_confirmados}</td><td>${q.erros_nao_confirmados}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="hint" style="margin:10px 0 0">Fila de tarefas: ${Object.entries(m.ia.jobs).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') || 'vazia'}</p></div>
    <div class="card card-pad"><h3 style="margin:0 0 12px;font-size:16px">Eventos de segurança</h3>
      ${m.sec.blockedUsers.length ? `<div class="banner warn">${ic('alert', 'sm')}<div>Envios pausados: ${m.sec.blockedUsers.map((u) => esc(u.name) + ' (' + esc(u.email) + ')').join(', ')}</div></div>` : ''}
      ${m.sec.events.length ? `<table class="tbl"><thead><tr><th>Quando</th><th>Tipo</th><th>Nível</th><th>Usuário</th><th>Arquivo</th><th>Motivos</th></tr></thead><tbody>${m.sec.events.slice(0, 80).map((e) => `<tr><td>${new Date(e.created_at).toLocaleString('pt-BR')}</td><td>${esc(e.kind)}</td><td><span class="sev ${e.severity}">${SEV_LABEL[e.severity] || esc(e.severity)}</span></td><td>${esc(e.name || '—')}</td><td>${esc(e.file_name || '—')}</td><td class="hint">${esc(((e.details?.findings || []).filter((f) => !['info', 'low'].includes(f.severity)).map((f) => f.message).concat(e.details?.reasons || [], e.details?.alertas || [])).slice(0, 3).join(' · '))}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Nenhum evento.</p>'}</div>`;
  }
  return `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1 class="page-title">Base de provas</h1><p class="page-sub">Revise as provas enviadas, acompanhe o treino da IA e monitore segurança e custos.</p></div><button class="btn btn-primary" data-go="contribuir">${ic('upload', 'sm')} Enviar provas</button></div>
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

// ---------- Modal ----------
function viewModal() {
  const m = S.modal;
  if (m.html) return `<div class="modal-bg" data-mclose><div class="modal wide" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h4 style="margin:0">${esc(m.title)}</h4><button class="icon-btn" data-mclose2 aria-label="Fechar">${ic('x', 'sm')}</button></div>${m.html}</div></div>`;
  return `<div class="modal-bg" data-mclose><div class="modal" role="dialog" aria-modal="true"><h4>${esc(m.title)}</h4><p>${esc(m.text)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-mclose2>Cancelar</button><button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" id="mOk">${esc(m.ok)}</button></div></div></div>`;
}
const confirmBox = (title, text, ok, danger, fn) => { S.modal = { title, text, ok, danger, fn }; render(); };

// ---------- Navegação e eventos ----------
const ROUTES = ['home', 'gerar', 'questoes', 'bancas', 'contribuir', 'estrelas', 'provas'];
function go(v) {
  S.view = v; S.drawer = false;
  if (ROUTES.includes(v)) { try { if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v); } catch {} }
  if (v === 'provas' && isAdmin()) loadAdmin(S.adminTab === 'monitor').then(() => { if (S.view === 'provas') render(); }).catch((e) => toast(e.message));
  if (v === 'estrelas') refreshStars({ silent: true });
  if (v === 'simulado' && S.active) loadFeedback(S.active);
  if (v === 'contribuir') api('/provas/minhas').then((r) => { S.minhas = r.provas; if (S.view === 'contribuir') render(); }).catch(() => {});
  if (v === 'gerar') api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {});
  render(); window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S.screen === 'app' && ROUTES.includes(h) && h !== S.view) go(h); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (S.drawer || S.modal)) { S.drawer = false; S.modal = null; render(); } });

function bindApp() {
  const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  on('[data-go]', 'click', (e) => go(e.currentTarget.dataset.go));
  on('#openMenu', 'click', () => { S.drawer = true; render(); });
  on('[data-close]', 'click', () => { S.drawer = false; render(); });
  on('#logout', 'click', async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); Object.assign(S, { screen: 'auth', auth: 'entrar', user: null, sets: [], drawer: false, loaded: false }); render(); });
  on('[data-open]', 'click', (e) => { S.active = e.currentTarget.dataset.open; go('simulado'); });
  on('[data-bancatile]', 'click', (e) => { if (isAdmin()) { S.provaBanca = e.currentTarget.dataset.bancatile; S.adminTab = 'base'; go('provas'); } else go('bancas'); });
  on('[data-mclose]', 'click', (e) => { if (e.target === e.currentTarget) { S.modal = null; render(); } });
  on('[data-mclose2]', 'click', () => { S.modal = null; render(); });
  on('#mOk', 'click', () => { const f = S.modal.fn; S.modal = null; f(); });

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
    on('#modePaste', 'click', () => { w.mode = 'paste'; w.err = ''; render(); });
    on('#modeFile', 'click', () => { w.mode = 'file'; render(); });
    on('#usePaste', 'click', () => uploadMaterial({ text: $('#pasteIn').value || '' }));
    on('#resetFile', 'click', () => { S.wiz = newWiz(); render(); });
    on('[data-step]', 'click', (e) => { w.step = +e.currentTarget.dataset.step; w.genErr = ''; render(); });
    const ms = $('#matSel'); if (ms) ms.onchange = () => { w.materia = ms.value; };
    const ai = $('#assIn'); if (ai) ai.oninput = () => { w.assunto = ai.value.trim(); };
    on('#toStep3', 'click', () => { if (!w.materia) return toast('Selecione a matéria do material.'); w.step = 3; render(); });
    on('[data-banca]', 'click', (e) => { w.banca = e.currentTarget.dataset.banca; render(); });
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
    on('[data-ans]', 'click', (e) => { const [i, L] = e.currentTarget.dataset.ans.split(':'); s.respostas = { ...(s.respostas || {}), [i]: L }; const y = window.scrollY; render(); window.scrollTo({ top: y }); saveSetSoon(s, { respostas: s.respostas }); });
    on('#copySet', 'click', async () => { try { await navigator.clipboard.writeText(setText(s)); toast('Questões copiadas com o gabarito'); } catch { toast('Não foi possível copiar'); } });
    on('#delSet', 'click', () => confirmBox('Excluir simulado?', 'As questões deste simulado serão removidas.', 'Excluir', true, async () => { await api(`/sets/${s.id}`, { method: 'DELETE' }).catch(() => {}); S.sets = S.sets.filter((x) => x.id !== s.id); go('questoes'); toast('Simulado excluído'); }));
    on('#resetSet', 'click', () => confirmBox('Refazer simulado?', 'Suas respostas serão apagadas para você resolver de novo.', 'Refazer', false, () => { s.respostas = {}; s.finalizado = false; api(`/sets/${s.id}`, { method: 'PATCH', body: { respostas: {}, finalizado: false } }).catch(() => {}); render(); window.scrollTo({ top: 0 }); }));
    on('#finish', 'click', () => {
      const n = s.questoes.length, r = s.respostas || {}, resp = Object.keys(r).length, ac = s.questoes.filter((q, i) => r[i] === q.gabarito).length;
      const fin = () => { s.finalizado = true; clearTimeout(saveT); api(`/sets/${s.id}`, { method: 'PATCH', body: { respostas: r, finalizado: true } }).catch(() => {}); render(); toast(`Resultado: ${ac} de ${n} (${Math.round((ac / n) * 100)}%)${s.formato === 'ce' ? ` · nota líquida ${ac - (resp - ac)}` : ''}`); };
      if (resp < n && !s.finalizado && s.formato !== 'ce') confirmBox('Finalizar com questões em branco?', `Você respondeu ${resp} de ${n}. As demais contam como erro.`, 'Finalizar', false, fin); else fin();
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
  }
  if (S.view === 'contribuir') {
    const f = S.cform;
    on('[data-cb]', 'click', (e) => { f.banca = e.currentTarget.dataset.cb; render(); });
    ['Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#c' + k); if (el) el.oninput = () => { f[k.toLowerCase()] = el.value; }; });
    const addFiles = (list) => { f.files = f.files.concat([...list]).slice(0, 10); if (f.files.length > 1) f.gabarito = null; S.cResults = []; render(); };
    const cf = $('#cFiles'), cd = $('#cDrop');
    if (cf) cf.onchange = () => addFiles(cf.files);
    if (cd) {
      ['dragenter', 'dragover'].forEach((t) => cd.addEventListener(t, (e) => { e.preventDefault(); cd.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((t) => cd.addEventListener(t, (e) => { e.preventDefault(); cd.classList.remove('over'); }));
      cd.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    }
    const cg = $('#cGab'); if (cg) cg.onchange = () => { f.gabarito = cg.files[0] || null; render(); };
    on('[data-rmc]', 'click', (e) => { f.files.splice(+e.currentTarget.dataset.rmc, 1); render(); });
    const form = $('#cForm');
    if (form) form.onsubmit = async (ev) => {
      ev.preventDefault();
      if (!f.banca) return toast('Escolha a banca.');
      if (f.ano && !/^\d{4}$/.test(f.ano)) return toast('Ano inválido.');
      S.cResults = [];
      const files = [...f.files];
      for (let i = 0; i < files.length; i++) {
        S.cBusy = `${i + 1}/${files.length}`; render();
        const fd = new FormData();
        fd.append('banca', f.banca); fd.append('orgao', f.orgao); fd.append('cargo', f.cargo); fd.append('ano', f.ano);
        fd.append('prova', files[i]);
        if (f.gabarito && files.length === 1) fd.append('gabarito', f.gabarito);
        try {
          const r = await api('/provas', { method: 'POST', form: fd });
          S.cResults.push(r.duplicate ? { name: files[i].name, dup: true, msg: r.message } : { name: files[i].name, ok: true, msg: 'Recebida. Em verificação.' });
        } catch (e) { S.cResults.push({ name: files[i].name, msg: e.message }); if (e.status === 429) break; }
      }
      S.cBusy = false; f.files = []; f.gabarito = null;
      try { S.minhas = (await api('/provas/minhas')).provas; } catch {}
      render();
    };
    schedulePoll();
  }
  if (S.view === 'provas' && isAdmin()) {
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
        S.modal = { title: `${questoes.length} questões extraídas · ${p.titulo || p.fileName}`, html: questoes.length ? questoes.map((q) => `<div class="qx"><div class="row" style="margin-bottom:6px">${q.numero ? `<span class="q-num">${q.numero}</span>` : ''}${q.materia ? `<span class="badge">${esc(q.materia)}</span>` : ''}${q.gabarito ? `<span class="badge brand">Gabarito: ${esc(q.gabarito)}</span>` : ''}${q.flagged ? '<span class="sev high">Descartada pela segurança</span>' : ''}</div><div class="ex">${esc(q.enunciado)}${(q.alternativas || []).length ? '\n' + q.alternativas.map((a, j) => `${LETRAS[j]}) ${esc(a)}`).join('\n') : ''}</div></div>`).join('') : '<p>Nenhuma questão extraída.</p>' };
        render();
      } catch (err) { toast(err.message); }
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
    await refreshStars({ silent: true });
    if (['provas', 'contribuir', 'gerar'].includes(S.view)) return go(S.view);
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
    S.screen = 'auth'; S.auth = acao === 'redefinir' ? 'redefinir' : 'verificar'; render(); return;
  }
  try {
    const { user } = await api('/auth/me');
    if (user && user.emailVerified) return enterApp(user);
    if (user) { S.authEmail = user.email; S.auth = 'verificar'; }
  } catch { /* offline */ }
  S.screen = 'auth'; render();
})();
