// Testes de Metas & Planejamento de Estudos (GET/PATCH /me/metas)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { one, pool } from '../src/db.js';
import { hashPassword } from '../src/lib/auth.js';

const PORT = 3900 + Math.floor(Math.random() * 900);
const URL = `http://localhost:${PORT}`;
const RUN = Date.now().toString(36);
const SENHA = 'senha-forte-1';
let srv, log = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const jar = { cookie: '' };
  return async function call(path, { method = 'GET', body } = {}) {
    const headers = { cookie: jar.cookie };
    if (body) headers['content-type'] = 'application/json';
    const r = await fetch(URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    if (sc) jar.cookie = sc.split(';')[0];
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, headers: r.headers };
  };
}

async function criarAluno(nome) {
  const email = `${nome}-${RUN}@teste.com`;
  const u = await one(
    `INSERT INTO users (name, email, password_hash, role, plano, email_verified_at)
     VALUES ($1,$2,$3,'USER','aprovacao', now()) RETURNING *`,
    [nome, email, await hashPassword(SENHA)]
  );
  return {
    u,
    email,
    entrar: async () => {
      const c = client();
      const r = await c('/api/v1/auth/login', { method: 'POST', body: { email, password: SENHA } });
      assert.equal(r.status, 200);
      return c;
    },
  };
}

before(async () => {
  srv = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      APP_URL: URL,
      AI_MOCK: 'true',
      AI_TRAINING_MODE: 'direct',
      S3_DISABLED: 'true',
      SMTP_HOST: '',
      REGISTRATION_MODE: 'open',
    },
  });
  srv.stdout.on('data', (d) => (log += d));
  srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(URL + '/api/v1/health')).ok) break;
    } catch {}
    await sleep(200);
  }
});

after(() => srv?.kill());
after(() => pool.end());

test('Metas: consulta e atualização de metas diárias e concurso alvo', async () => {
  const a = await criarAluno('alunometas1');
  const c = await a.entrar();

  // Consulta inicial
  const rGet1 = await c('/api/v1/me/metas');
  assert.equal(rGet1.status, 200);
  assert.equal(rGet1.data.metaDiaria, null);

  // Atualiza metas
  const rPatch = await c('/api/v1/me/metas', {
    method: 'PATCH',
    body: {
      metaDiaria: 25,
      concursoAlvo: 'Banco do Brasil - Escriturário',
      bancaPreferida: 'cesgranrio',
      dataProva: '2026-12-20',
    },
  });
  assert.equal(rPatch.status, 200);
  assert.equal(rPatch.data.metaDiaria, 25);
  assert.equal(rPatch.data.concursoAlvo, 'Banco do Brasil - Escriturário');
  assert.equal(rPatch.data.bancaPreferida, 'cesgranrio');
  assert.equal(rPatch.data.dataProva, '2026-12-20');
  assert.ok(rPatch.data.diasParaProva > 0);

  // Consulta após atualização
  const rGet2 = await c('/api/v1/me/metas');
  assert.equal(rGet2.status, 200);
  assert.equal(rGet2.data.metaDiaria, 25);
  assert.equal(rGet2.data.concursoAlvo, 'Banco do Brasil - Escriturário');
});

test('Metas: validação de limites (meta inválida e banca desconhecida)', async () => {
  const a = await criarAluno('alunometas2');
  const c = await a.entrar();

  // Meta acima do teto de 500
  const rMax = await c('/api/v1/me/metas', {
    method: 'PATCH',
    body: { metaDiaria: 999 },
  });
  assert.equal(rMax.status, 400);

  // Banca inexistente
  const rBanca = await c('/api/v1/me/metas', {
    method: 'PATCH',
    body: { bancaPreferida: 'banca_inexistente_xyz' },
  });
  assert.equal(rBanca.status, 400);
});
