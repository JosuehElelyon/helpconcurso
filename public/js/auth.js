// Front do HelpConcurso — Autenticação.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { ic } from './icones.js';
import { abrirModalTermos } from './modal.js';
import { render } from './render.js';
import { enterApp } from './sessao.js';
import { $, api, esc, toast } from './util.js';

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
      <div class="field"><label for="fPass">Senha</label><input class="input" id="fPass" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" required></div>
      <label class="row" style="gap:8px;align-items:flex-start;font-size:13px;margin:4px 0 10px;cursor:pointer"><input type="checkbox" id="fTermos" required style="margin-top:3px"> <span>Li e aceito os <button type="button" class="link-btn" data-open-termos style="font-size:13px;text-decoration:underline">Termos de Uso e a Política de Privacidade</button>.</span></label>`;
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
        <div style="font-size:11.5px;color:var(--muted);text-align:center;margin-top:14px;line-height:1.4">
          <button type="button" class="link-btn" data-open-termos style="font-size:11.5px;text-decoration:underline">Termos de Uso e Política de Privacidade (LGPD)</button>
        </div>
      </form>
    </main>
  </div>`;
}
function setAuth(screen, extra = {}) { Object.assign(S, { auth: screen, authErr: '', authOk: '', authRascunho: null }, extra); render(); const f = $('#authForm input'); f && f.focus(); }
function bindAuth() {
  document.querySelectorAll('[data-auth]').forEach((b) => (b.onclick = () => setAuth(b.dataset.auth)));
  // Abrir/fechar o modal redesenha a tela: guarda o que já foi digitado e devolve aos campos
  const CAMPOS = ['#fName', '#fEmail', '#fPass'];
  if (S.authRascunho) {
    for (const id of CAMPOS) if ($(id) && S.authRascunho[id]) $(id).value = S.authRascunho[id];
    if ($('#fTermos')) $('#fTermos').checked = !!S.authRascunho.termos;
  }
  document.querySelectorAll('[data-open-termos]').forEach((b) => (b.onclick = () => {
    S.authRascunho = { ...Object.fromEntries(CAMPOS.map((id) => [id, $(id)?.value || ''])), termos: !!$('#fTermos')?.checked };
    abrirModalTermos();
  }));
  // Modal dos termos também na tela de login/cadastro
  document.querySelectorAll('[data-mclose]').forEach((b) => (b.onclick = (e) => { if (e.target === e.currentTarget) { S.modal = null; render(); } }));
  document.querySelectorAll('[data-mclose2]').forEach((b) => (b.onclick = () => { S.modal = null; render(); }));
  const resend = $('#resend');
  if (resend) resend.onclick = async () => { try { await api('/auth/resend', { method: 'POST', body: { email: S.authEmail } }); S.authErr = ''; S.authOk = 'Enviamos um novo código.'; } catch (e) { S.authErr = e.message; } render(); };
  $('#authForm').onsubmit = async (ev) => {
    ev.preventDefault();
    // Lê todos os campos ANTES de redesenhar a tela (o render recria os inputs)
    const vals = Object.fromEntries(['#fName', '#fEmail', '#fPass', '#fCode'].map((id) => [id, $(id)?.value || '']));
    const aceitouTermos = !!$('#fTermos')?.checked;
    S.authRascunho = null;
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
        if (!aceitouTermos) throw new Error('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
        const r = await api('/auth/register', { method: 'POST', body: { name: v('#fName'), email, password: vals['#fPass'], aceitouTermos } });
        S.auth = 'verificar'; S.authOk = r.aviso || 'Conta criada! Verifique sua caixa de entrada (e o spam).';
      } else if (S.auth === 'verificar') {
        const r = await api('/auth/verify', { method: 'POST', body: { email: S.authEmail, code: v('#fCode') } }).catch((e) => {
          if (e.data?.jaConfirmado) { S.auth = 'entrar'; S.authOk = 'Seu e-mail já está confirmado. Entre com sua senha.'; return null; }
          throw e;
        });
        if (r) { toast('E-mail confirmado. Bem-vindo!'); return await enterApp(r.user); }
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

export { viewAuth, setAuth, bindAuth };
