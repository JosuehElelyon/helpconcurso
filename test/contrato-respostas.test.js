// Item 8 — as RESPOSTAS reais da API batem com o contrato OpenAPI (src/openapi.js). Cada rota com resposta documentada
// é chamada no servidor de verdade e o corpo é validado com o esquema do contrato (ajv, JSON Schema 2020-12).
// Rota documentada que não for exercitada aqui precisa estar em NAO_EXERCITADAS, com o motivo — sem buracos silenciosos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { one, pool } from '../src/db.js';
import { hashPassword } from '../src/lib/auth.js';
import { especificacaoOpenApi, rotasComRespostaDocumentada } from '../src/openapi.js';

const PORT = 3900 + Math.floor(Math.random() * 900), URL = `http://localhost:${PORT}`;
const RUN = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAO_EXERCITADAS = {
  'post /auth/verify': 'exige o código do e-mail de uma conta nova (fluxo testado em v1.test.js)',
  'post /auth/reset': 'exige o código de redefinição (fluxo testado em lgpd-e-pendencias.test.js)',
};
let srv, log = '', cookie = '', ids = {};

const ESPEC_ID = 'https://helpconcurso.local/openapi.json';
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
ajv.addSchema({ ...especificacaoOpenApi(), $id: ESPEC_ID });
const validadorDe = (metodo, caminho) => {
  const ptr = encodeURIComponent(caminho.replace(/~/g, '~0').replace(/\//g, '~1'));
  return ajv.compile({ $ref: `${ESPEC_ID}#/paths/${ptr}/${metodo}/responses/200/content/application~1json/schema` });
};

const exercitadas = new Set();
async function conferir(metodo, caminhoDoContrato, url, body) {
  const r = await fetch(URL + '/api/v1' + url, {
    method: metodo.toUpperCase(), headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  const dados = await r.json();
  assert.ok(r.status >= 200 && r.status < 300, `${metodo} ${url} → ${r.status}: ${JSON.stringify(dados).slice(0, 200)}`);
  const validar = validadorDe(metodo, caminhoDoContrato);
  const ok = validar(dados);
  assert.ok(ok, `${metodo.toUpperCase()} ${caminhoDoContrato} não bate com o contrato:\n${ajv.errorsText(validar.errors, { separator: '\n' })}`);
  exercitadas.add(`${metodo} ${caminhoDoContrato}`);
  return dados;
}

before(async () => {
  srv = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(PORT), APP_URL: URL, AI_MOCK: 'true', S3_DISABLED: 'true', SMTP_HOST: '' } });
  srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(URL + '/api/v1/health')).ok) break; } catch {} await sleep(200); }

  const email = `contrato-${RUN}@teste.com`;
  const u = await one(`INSERT INTO users (name, email, password_hash, role, plano, email_verified_at) VALUES ('Contrato', $1, $2, 'USER', 'aprovacao', now()) RETURNING id`,
    [email, await hashPassword('senha-forte-1')]);
  ids.edital = (await one(`INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count, active) VALUES ($1,'Edital Contrato','fgv',$2,'t',10,true) RETURNING id`,
    [u.id, JSON.stringify([{ id: 'd1', materia: 'Direito Administrativo', peso: 1, topicos: [{ id: 'd1-t1', codigo: '1', nome: 'Atos administrativos' }] }])])).id;
  ids.caderno = (await one(`INSERT INTO cadernos (user_id, titulo, banca, edital_id) VALUES ($1,'Caderno Contrato','fgv',$2) RETURNING id`, [u.id, ids.edital])).id;
  ids.set = (await one(`INSERT INTO question_sets (user_id, caderno_id, edital_id, banca, materia, nivel, formato, questoes, respostas, model, review_stats)
    VALUES ($1,$2,$3,'fgv','Direito Administrativo','Médio','me',$4,$5,'anthropic:claude-haiku-5-5',$6) RETURNING id`,
  [u.id, ids.caderno, ids.edital, JSON.stringify([{ enunciado: 'Enunciado de teste do contrato', alternativas: ['a', 'b', 'c', 'd', 'e'], gabarito: 'A', comentario: 'c', tema: 't', topico_edital: '', verificada: true, ancorada: true }]),
    JSON.stringify({}), JSON.stringify({ geradas: 1, aprovadas: 1, descartadas: 0 })])).id;
  await one(`INSERT INTO provas (banca, file_name, file_key, status, titulo, uploaded_by) VALUES ('fgv','c.pdf',$1,'READY','Prova do contrato',$2) RETURNING id`, [`contrato-${RUN}`, u.id]);

  const r = await fetch(URL + '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'senha-forte-1' }) });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
  ids.email = email;
});
after(() => srv?.kill());
after(() => pool.end());

test('Item 8: respostas das rotas principais batem com o contrato OpenAPI', async () => {
  await conferir('get', '/health', '/health');
  await conferir('get', '/termos', '/termos');
  await conferir('post', '/auth/login', '/auth/login', { email: ids.email, password: 'senha-forte-1' });
  await conferir('get', '/auth/me', '/auth/me');
  await conferir('post', '/me/termos/aceite', '/me/termos/aceite');
  await conferir('get', '/bancas', '/bancas');
  await conferir('get', '/sets/cota', '/sets/cota');
  await conferir('get', '/sets', '/sets');
  await conferir('get', '/sets/{id}', `/sets/${ids.set}`);
  await conferir('patch', '/sets/{id}', `/sets/${ids.set}`, { respostas: { 0: 'B' }, finalizado: true, tempoGastoSegundos: 30 });
  await conferir('get', '/cadernos', '/cadernos');
  await conferir('get', '/cadernos/{id}', `/cadernos/${ids.caderno}`);
  await conferir('patch', '/cadernos/{id}/interagir', `/cadernos/${ids.caderno}/interagir`, { key: `set:${ids.set}:0`, favorita: true });
  await conferir('post', '/cadernos', '/cadernos', { banca: 'fgv', titulo: 'Outro caderno', importarExistentes: false });
  await conferir('get', '/editais', '/editais');
  await conferir('get', '/editais/{id}', `/editais/${ids.edital}`);
  await conferir('post', '/editais/{id}/ativar', `/editais/${ids.edital}/ativar`);
  await conferir('get', '/provas/minhas', '/provas/minhas');
  await conferir('get', '/me/conta', '/me/conta');
  await conferir('patch', '/me/conta', '/me/conta', { name: 'Contrato Atualizado', metaDiaria: 20 });
  await conferir('get', '/me/hoje', '/me/hoje');
  await conferir('get', '/me/desempenho', '/me/desempenho');
  await conferir('get', '/me/estrelas', '/me/estrelas');
  await conferir('get', '/me/planos', '/me/planos');
});

test('Item 8: toda rota com resposta documentada foi conferida (ou tem motivo para não ser)', () => {
  const faltando = rotasComRespostaDocumentada().filter((r) => !exercitadas.has(r) && !NAO_EXERCITADAS[r]);
  assert.deepEqual(faltando, [], 'rotas com esquema de resposta sem teste de conformidade');
});

test('Item 8: o teste pega resposta fora do contrato', () => {
  const validar = validadorDe('get', '/sets/{id}');
  assert.equal(validar({ set: { id: 'x' } }), false, 'campos obrigatórios faltando são recusados');
  assert.equal(validar({ outra: 1 }), false);
});
