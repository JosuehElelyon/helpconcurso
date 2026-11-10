// Testes de integração de Pagamentos (Mercado Pago: Pix, Webhooks e Ativação Automática)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { one, pool } from '../src/db.js';
import { hashPassword } from '../src/lib/auth.js';
import * as pagamentosService from '../src/services/pagamentos.js';
import * as planosRepo from '../src/repositories/planos.js';

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

async function criarAluno(nome, plano = 'gratis') {
  const email = `${nome}-${RUN}@teste.com`;
  const u = await one(
    `INSERT INTO users (name, email, password_hash, role, plano, email_verified_at)
     VALUES ($1,$2,$3,'USER',$4, now()) RETURNING *`,
    [nome, email, await hashPassword(SENHA), plano]
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

test('Pagamentos: criar pedido de upgrade manual e consultar status', async () => {
  const a = await criarAluno('alunopag1');
  const c = await a.entrar();

  // Pedido de upgrade
  const resPost = await c('/api/v1/me/conta/upgrade', {
    method: 'POST',
    body: { plano: 'aprovacao', periodicidade: 'mensal' },
  });
  assert.equal(resPost.status, 201);
  assert.equal(resPost.data.pedido.plano, 'aprovacao');
  assert.equal(resPost.data.pedido.status, 'pendente');

  // Consulta do pedido pendente
  const resGet = await c('/api/v1/me/conta/upgrade');
  assert.equal(resGet.status, 200);
  assert.equal(resGet.data.pedido.id, resPost.data.pedido.id);
  assert.equal(resGet.data.pedido.plano, 'aprovacao');

  // Cancelamento
  const resDel = await c('/api/v1/me/conta/upgrade', { method: 'DELETE' });
  assert.equal(resDel.status, 200);

  const resGetApos = await c('/api/v1/me/conta/upgrade');
  assert.equal(resGetApos.status, 200);
  assert.equal(resGetApos.data.pedido, null);
});

test('Pagamentos: webhook do Mercado Pago valida GET e responde OK no ping', async () => {
  const r = await fetch(URL + '/api/v1/webhooks/mercadopago');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.ok, true);
});

test('Pagamentos: ativação atômica via aprovarEAtivarPlano com idempotência', async () => {
  const a = await criarAluno('alunopag2', 'gratis');
  const pedido = await planosRepo.pedirUpgrade(a.u.id, 'aprovacao', 'mensal', 49.9, {
    gateway: 'mercadopago',
    gatewayId: 'mp-test-999',
    pixCopiaCola: '00020126580014br.gov.bcb.pix0136test',
  });

  // Primeira ativação
  const ativ1 = await planosRepo.aprovarEAtivarPlano(pedido.id, a.u.id, 'aprovacao', 'mensal', {
    gatewayId: 'mp-test-999',
  });
  assert.ok(ativ1);
  assert.equal(ativ1.pedido.status, 'aprovado');
  assert.equal(ativ1.usuario.plano, 'aprovacao');
  assert.ok(ativ1.usuario.plano_ate);

  // Segunda ativação (idempotência: webhook recebido 2x)
  const ativ2 = await planosRepo.aprovarEAtivarPlano(pedido.id, a.u.id, 'aprovacao', 'mensal', {
    gatewayId: 'mp-test-999',
  });
  assert.equal(ativ2, null, 'idempotência não reaplica pedido já aprovado');
});

test('Cartões recorrentes: PCI-safe (rejeita PAN/CVV), cria, pausa recorrência, isola dono e remove', async () => {
  const a = await criarAluno('cartaouser1');
  const b = await criarAluno('cartaouser2');
  const ca = await a.entrar();
  const cb = await b.entrar();

  // Visão da conta inclui gamificação e lista vazia de cartões
  const contaIni = await ca('/api/v1/me/conta');
  assert.equal(contaIni.status, 200);
  assert.ok(contaIni.data.gamificacao && typeof contaIni.data.gamificacao.xp === 'number');
  assert.deepEqual(contaIni.data.cartoes, []);

  // Rejeita envio de número completo ou CVV em claro (PCI-safe via .strict)
  const panReject = await ca('/api/v1/me/conta/cartoes', {
    method: 'POST',
    body: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, holderName: 'Aluno Teste', cardNumber: '4242424242424242', cvv: '123' },
  });
  assert.equal(panReject.status, 400);

  // Rejeita validade vencida
  const vencido = await ca('/api/v1/me/conta/cartoes', {
    method: 'POST',
    body: { brand: 'visa', last4: '4242', expMonth: 1, expYear: 2024, holderName: 'Aluno Teste' },
  });
  assert.equal(vencido.status, 400);

  // Salva cartão 1 e cartão 2
  const add1 = await ca('/api/v1/me/conta/cartoes', {
    method: 'POST',
    body: { brand: 'visa', last4: '4242', expMonth: 10, expYear: 2030, holderName: 'ALUNO E2E', docLast4: '8900', recorrenteAtivo: true },
  });
  assert.equal(add1.status, 201);
  assert.equal(add1.data.cartao.last4, '4242');
  assert.equal(add1.data.cartao.isDefault, true);
  assert.equal(add1.data.cartao.recorrenteAtivo, true);

  const add2 = await ca('/api/v1/me/conta/cartoes', {
    method: 'POST',
    body: { brand: 'mastercard', last4: '5555', expMonth: 8, expYear: 2031, holderName: 'ALUNO E2E', recorrenteAtivo: true },
  });
  assert.equal(add2.status, 201);
  assert.equal(add2.data.cartao.isDefault, true);

  // Pausa recorrência no cartão 2 e define cartão 1 como principal
  const pauseRes = await ca(`/api/v1/me/conta/cartoes/${add2.data.cartao.id}`, {
    method: 'PATCH',
    body: { recorrenteAtivo: false },
  });
  assert.equal(pauseRes.status, 200);
  assert.equal(pauseRes.data.cartao.recorrenteAtivo, false);

  // Isolamento: usuário B não altera nem remove cartão de A
  assert.equal((await cb(`/api/v1/me/conta/cartoes/${add1.data.cartao.id}`, { method: 'PATCH', body: { recorrenteAtivo: false } })).status, 404);
  assert.equal((await cb(`/api/v1/me/conta/cartoes/${add1.data.cartao.id}`, { method: 'DELETE' })).status, 404);

  // Remove cartão 2 (padrão) -> cartão 1 volta a ser principal automaticamente
  const del2 = await ca(`/api/v1/me/conta/cartoes/${add2.data.cartao.id}`, { method: 'DELETE' });
  assert.equal(del2.status, 200);
  assert.equal(del2.data.conta.cartoes.length, 1);
  assert.equal(del2.data.conta.cartoes[0].id, add1.data.cartao.id);
  assert.equal(del2.data.conta.cartoes[0].isDefault, true);
});
