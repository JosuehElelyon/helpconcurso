// A1 — API e worker em processos separados. A API (papel "api") só enfileira; o worker (src/worker.js) executa.
// A fila aguenta vários workers: tarefa com batimento recente nunca é "roubada"; tarefa de worker que caiu volta.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fx from './fixtures.js';
import { one, pool } from '../src/db.js';
import { hashPassword } from '../src/lib/auth.js';

const PORT = 3900 + Math.floor(Math.random() * 900), URL = `http://localhost:${PORT}`;
const SAUDE = PORT + 1000;
const RUN = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENV = { ...process.env, APP_URL: URL, AI_MOCK: 'true', AI_TRAINING_MODE: 'direct', S3_DISABLED: 'true', SMTP_HOST: '' };
let api, worker, logApi = '', logWorker = '', cookie = '', orfa, viva;

function sobe(arquivo, env, onLog) {
  const p = spawn(process.execPath, [arquivo], { env });
  p.stdout.on('data', (d) => onLog(String(d))); p.stderr.on('data', (d) => onLog(String(d)));
  return p;
}
async function esperar(cond, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await cond()) return true; await sleep(300); }
  return false;
}

before(async () => {
  // Tarefas "de outro worker": uma sem batimento há 10 min (órfã) e uma com batimento agora (viva)
  orfa = await one(`INSERT INTO jobs(type, payload, status, locked_at, attempts) VALUES ('teste.orfa', '{}', 'running', now() - interval '10 minutes', 1) RETURNING id`);
  viva = await one(`INSERT INTO jobs(type, payload, status, locked_at, attempts) VALUES ('teste.viva', '{}', 'running', now(), 1) RETURNING id`);

  api = sobe('src/server.js', { ...ENV, PORT: String(PORT), PROCESS_ROLE: 'api' }, (d) => (logApi += d));
  assert.ok(await esperar(async () => { try { return (await fetch(URL + '/api/health')).ok; } catch { return false; } }), 'API não subiu: ' + logApi);

  const email = `arq-${RUN}@teste.com`;
  await one(`INSERT INTO users (name, email, password_hash, role, plano, email_verified_at) VALUES ('Arq', $1, $2, 'USER', 'aprovacao', now()) RETURNING id`,
    [email, await hashPassword('senha-forte-1')]);
  const r = await fetch(URL + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'senha-forte-1' }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
});
after(async () => {
  api?.kill(); worker?.kill();
  await pool.query("DELETE FROM jobs WHERE type IN ('teste.orfa','teste.viva')").catch(() => {});
  await pool.end();
});

test('A1: com PROCESS_ROLE=api o processo da API não roda a fila', async () => {
  assert.match(logApi, /papel api/);
  assert.doesNotMatch(logApi, /\[fila\] worker .* ativo/);
});

test('A1: worker separado processa a tarefa enfileirada pela API', async () => {
  const form = new FormData();
  form.append('banca', 'fgv');
  form.append('prova', new Blob([Buffer.from(fx.randomProva())]), `arq-${RUN}.txt`);
  const r = await fetch(URL + '/api/provas', { method: 'POST', headers: { cookie }, body: form });
  const data = await r.json();
  assert.equal(r.status, 202, JSON.stringify(data));
  const provaId = data.prova.id;

  worker = sobe('src/worker.js', { ...ENV, WORKER_HEALTH_PORT: String(SAUDE) }, (d) => (logWorker += d));
  assert.ok(await esperar(async () => {
    const p = await one('SELECT status FROM provas WHERE id=$1', [provaId]);
    return p && p.status !== 'CHECKING';
  }), 'a prova não saiu de CHECKING: ' + logWorker);
});

test('A1: worker expõe saúde', async () => {
  // Na suíte completa outro worker pode ter processado a prova antes deste terminar de subir
  assert.ok(await esperar(async () => { try { return (await fetch(`http://localhost:${SAUDE}/health`)).ok; } catch { return false; } }), 'worker não subiu: ' + logWorker);
  const r = await fetch(`http://localhost:${SAUDE}/health`);
  const s = await r.json();
  assert.equal(r.status, 200);
  assert.equal(s.ok, true);
  assert.equal(s.ativo, true);
});

test('A1: tarefa órfã (worker caiu) volta para a fila; tarefa com batimento recente não é roubada', async () => {
  const o = await one('SELECT status, locked_at FROM jobs WHERE id=$1', [orfa.id]);
  assert.ok(o.status !== 'running' || new Date(o.locked_at) > new Date(Date.now() - 60_000), 'órfã continuou presa');
  const v = await one('SELECT status FROM jobs WHERE id=$1', [viva.id]);
  assert.equal(v.status, 'running', 'tarefa de outro worker vivo não pode voltar para a fila');
});
