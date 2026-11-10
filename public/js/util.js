// Front do HelpConcurso — Utilidades.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { render } from './render.js';

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
// Endereço da API REST (contrato em <API>/openapi.json): vem de /config.js; padrão /api/v1 no mesmo domínio
const API = String(window.HC_CONFIG?.apiUrl || '/api/v1').replace(/\/$/, '');
// Origem da API quando ela está em outro domínio (para URLs relativas que a API devolve, como /api/v1/users/:id/avatar)
const API_ORIGEM = /^https?:\/\//.test(API) ? new URL(API).origin : '';
const urlDaApi = (u) => (API_ORIGEM && typeof u === 'string' && u.startsWith('/api/') ? API_ORIGEM + u : u);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => (n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';
function renderAvatar(u, sizeClass = '') {
  if (!u) return `<span class="avatar ${sizeClass}">?</span>`;
  const name = u.name || '';
  const init = initials(name);
  const url = urlDaApi(u.avatarUrl || u.avatar_url);
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
  const opt = { method, headers: {}, credentials: API_ORIGEM ? 'include' : 'same-origin' };
  if (form) opt.body = form;
  else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let r;
  try { r = await fetch(API + path, opt); } catch { throw Object.assign(new Error('Sem conexão com o servidor.'), { status: 0 }); }
  let data = {};
  try { data = await r.json(); } catch { /* sem corpo */ }
  if (!r.ok) {
    if (r.status === 401 && S.screen === 'app') { S.screen = 'auth'; S.auth = 'entrar'; render(); }
    throw Object.assign(new Error(data.error || `Erro ${r.status}`), { status: r.status, data });
  }
  return data;
}

export { $, API, API_ORIGEM, urlDaApi, esc, initials, firstName, renderAvatar, fmtDate, LETRAS, STATUS, toastT, toast, api };
