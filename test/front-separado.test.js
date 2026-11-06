// A5 — Front separado da API. Com SERVIR_FRONT=false a API só responde /api; o front (Nginx/CDN) chama a API no mesmo
// domínio ou, em outro domínio, apenas a partir de origens listadas em CORS_ORIGINS.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { pool } from '../src/db.js';

const PORT = 3900 + Math.floor(Math.random() * 900), URL = `http://localhost:${PORT}`;
const FRONT = 'https://app.exemplo.com.br', ESTRANHA = 'https://golpe.exemplo.net';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv, log = '';

before(async () => {
  srv = spawn(process.execPath, ['src/server.js'], { env: {
    ...process.env, PORT: String(PORT), APP_URL: URL, AI_MOCK: 'true', S3_DISABLED: 'true', SMTP_HOST: '', PROCESS_ROLE: 'api',
    SERVIR_FRONT: 'false', CORS_ORIGINS: `${FRONT}/`,
  } });
  srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(URL + '/api/v1/health')).ok) break; } catch {} await sleep(200); }
});
after(() => srv?.kill());
after(() => pool.end());

test('A5: com SERVIR_FRONT=false a API não entrega o front (404 em JSON fora de /api)', async () => {
  for (const p of ['/', '/index.html', '/app.js', '/qualquer/rota']) {
    const r = await fetch(URL + p);
    assert.equal(r.status, 404, p);
    assert.match((await r.json()).error, /\/api\/v1/);
  }
  assert.equal((await fetch(URL + '/api/v1/health')).status, 200);
});

test('A5: CORS só para a origem liberada, com cookie (credentials)', async () => {
  const pre = await fetch(URL + '/api/v1/auth/login', { method: 'OPTIONS', headers: { origin: FRONT, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), FRONT);
  assert.equal(pre.headers.get('access-control-allow-credentials'), 'true');
  assert.match(pre.headers.get('access-control-allow-methods'), /PATCH/);

  const get = await fetch(URL + '/api/v1/auth/me', { headers: { origin: FRONT } });
  assert.equal(get.headers.get('access-control-allow-origin'), FRONT);
  assert.equal(get.headers.get('vary'), 'Origin');

  const outra = await fetch(URL + '/api/v1/auth/me', { headers: { origin: ESTRANHA } });
  assert.equal(outra.headers.get('access-control-allow-origin'), null, 'origem não liberada não recebe CORS');
});

test('A5: CSRF aceita a origem liberada e barra as outras', async () => {
  const ok = await fetch(URL + '/api/v1/auth/logout', { method: 'POST', headers: { origin: FRONT } });
  assert.equal(ok.status, 200);
  const barrada = await fetch(URL + '/api/v1/auth/logout', { method: 'POST', headers: { origin: ESTRANHA } });
  assert.equal(barrada.status, 403);
});
