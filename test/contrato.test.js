// A3 — Contrato da API v1: toda rota montada está no OpenAPI e vice-versa; /api/v1 é a versão atual e /api é apelido.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { pool } from '../src/db.js';
import { MODULOS } from '../src/routes/index.js';
import { rotasDoContrato, especificacaoOpenApi } from '../src/openapi.js';

const PORT = 3900 + Math.floor(Math.random() * 900), URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv, log = '';

before(async () => {
  srv = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(PORT), APP_URL: URL, AI_MOCK: 'true', S3_DISABLED: 'true', SMTP_HOST: '', PROCESS_ROLE: 'api' } });
  srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(URL + '/api/v1/health')).ok) break; } catch {} await sleep(200); }
});
after(() => srv?.kill());
after(() => pool.end());

function rotasMontadas() {
  const out = [];
  for (const [prefixo, router] of MODULOS) {
    for (const l of router.stack.filter((x) => x.route)) {
      const p = (prefixo + (l.route.path === '/' ? '' : l.route.path)).replace(/:(\w+)/g, '{$1}') || '/';
      for (const m of Object.keys(l.route.methods)) out.push(`${m.toUpperCase()} ${p}`);
    }
  }
  return out;
}

test('A3: toda rota montada está no contrato OpenAPI e toda rota do contrato existe', () => {
  const montadas = new Set(rotasMontadas());
  const contrato = new Set(rotasDoContrato());
  const faltamNoContrato = [...montadas].filter((r) => !contrato.has(r));
  const naoExistem = [...contrato].filter((r) => !montadas.has(r));
  assert.deepEqual(faltamNoContrato, [], 'rotas sem documentação em src/openapi.js');
  assert.deepEqual(naoExistem, [], 'rotas documentadas que não existem');
  assert.equal(montadas.size, contrato.size);
});

test('A3: contrato é OpenAPI 3.1 válido no essencial', () => {
  const s = especificacaoOpenApi();
  assert.equal(s.openapi, '3.1.0');
  assert.equal(s.servers[0].url, '/api/v1');
  const ids = new Set();
  for (const [caminho, ops] of Object.entries(s.paths)) {
    for (const op of Object.values(ops)) {
      assert.ok(op.summary && op.tags?.length && op.responses?.[200], caminho);
      assert.ok(!ids.has(op.operationId), `operationId repetido: ${op.operationId}`);
      ids.add(op.operationId);
      const params = [...caminho.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      assert.deepEqual((op.parameters || []).map((p) => p.name), params, caminho);
    }
  }
});

test('A3: /api/v1 responde e serve o contrato; /api é apelido marcado como obsoleto', async () => {
  const v1 = await fetch(URL + '/api/v1/health');
  assert.equal(v1.status, 200);
  assert.equal(v1.headers.get('x-api-versao'), 'v1');
  assert.equal(v1.headers.get('deprecation'), null);

  const spec = await (await fetch(URL + '/api/v1/openapi.json')).json();
  assert.equal(spec.info.title, 'HelpConcurso API');

  const antigo = await fetch(URL + '/api/health');
  assert.equal(antigo.status, 200);
  assert.equal(antigo.headers.get('deprecation'), 'true');
  assert.match(antigo.headers.get('link'), /\/api\/v1/);

  const nada = await fetch(URL + '/api/v1/nao-existe');
  assert.equal(nada.status, 404);
  assert.deepEqual(Object.keys(await nada.json()), ['error']);

  const semLogin = await fetch(URL + '/api/v1/sets');
  assert.equal(semLogin.status, 401);
});
