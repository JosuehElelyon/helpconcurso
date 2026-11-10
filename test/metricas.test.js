// Sprint 6 (medir): cada simulado guarda versão do prompt e modelo do revisor; o painel admin mostra qualidade por
// modelo/prompt e custo médio por funcionalidade. Testado pela rota HTTP.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fx from './fixtures.js';
import { one, pool } from '../src/db.js';
import { hashPassword } from '../src/lib/auth.js';
import { PROMPT_VERSAO } from '../src/lib/prompts.js';

const PORT = 3900 + Math.floor(Math.random() * 900), URL = `http://localhost:${PORT}`;
const RUN = Date.now().toString(36);
const SENHA = 'senha-forte-1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv, log = '';

function client() {
  const jar = { cookie: '' };
  return async function call(path, { method = 'GET', body } = {}) {
    const headers = { cookie: jar.cookie };
    if (body) headers['content-type'] = 'application/json';
    const r = await fetch(URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) jar.cookie = sc.split(';')[0];
    const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, text };
  };
}
async function entrar(nome, role = 'USER') {
  const email = `${nome}-${RUN}@teste.com`;
  const u = await one(`INSERT INTO users (name, email, password_hash, role, plano, email_verified_at) VALUES ($1,$2,$3,$4,'aprovacao',now()) RETURNING *`, [nome, email, await hashPassword(SENHA), role]);
  const c = client();
  assert.equal((await c('/api/v1/auth/login', { method: 'POST', body: { email, password: SENHA } })).status, 200);
  return { u, c };
}

before(async () => {
  srv = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(PORT), APP_URL: URL, AI_MOCK: 'true', AI_TRAINING_MODE: 'direct', S3_DISABLED: 'true', SMTP_HOST: '', MOCK_REVIEW_DISAGREE: 'true' } });
  srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(URL + '/api/v1/health')).ok) break; } catch {} await sleep(200); }
});
after(() => srv?.kill());
after(() => pool.end());

test('Sprint 6: simulado gerado guarda a versão do prompt e o modelo do revisor', async () => {
  const { u, c } = await entrar('medir-aluno');
  const m = await one('INSERT INTO materials (user_id, file_name, text, word_count) VALUES ($1,$2,$3,60) RETURNING id', [u.id, 'material.txt', fx.MATERIAL_TXT]);
  const r = await c('/api/v1/sets', { method: 'POST', body: { materialId: m.id, materia: 'Direito Administrativo', banca: 'fgv', qtd: 3, nivel: 'Médio' } });
  const fim = r.text.trim().split('\n').map((l) => JSON.parse(l)).find((e) => e.type === 'done' || e.type === 'error');
  assert.equal(fim.type, 'done', JSON.stringify(fim));
  const s = await one('SELECT prompt_versao, review_stats FROM question_sets WHERE id=$1', [fim.set.id]);
  assert.equal(s.prompt_versao, `generate:${PROMPT_VERSAO.generate}`);
  assert.match(s.review_stats.revisorModelo, /^mock:/);
  assert.ok(s.review_stats.geradas >= 3);
});

test('Sprint 6: painel admin mostra qualidade por modelo/prompt e custo médio por funcionalidade', async () => {
  const { c: admin } = await entrar('medir-admin', 'ADMIN');
  const { u: aluno } = await entrar('medir-aluno2');
  const gerador = `teste:gerador-${RUN}`;
  // 2 simulados desse gerador: 10 geradas, 4 descartadas; avaliações: 2 👍, 1 👎 e 1 erro confirmado
  const ids = [];
  for (const rs of [{ geradas: 6, descartadas: 3, revisorModelo: 'teste:revisor' }, { geradas: 4, descartadas: 1, revisorModelo: 'teste:revisor' }]) {
    ids.push((await one(`INSERT INTO question_sets (user_id, banca, materia, nivel, formato, questoes, model, prompt_versao, review_stats)
      VALUES ($1,'fgv','X','Médio','me','[{},{},{}]',$2,'generate:vTeste',$3) RETURNING id`, [aluno.id, gerador, JSON.stringify(rs)])).id);
  }
  for (const [setId, idx, rating, status] of [[ids[0], 0, 1, 'none'], [ids[0], 1, 1, 'none'], [ids[1], 0, -1, 'confirmed']]) {
    await one(`INSERT INTO question_feedback (set_id, q_index, user_id, banca, rating, report_status) VALUES ($1,$2,$3,'fgv',$4,$5) RETURNING id`, [setId, idx, aluno.id, rating, status]);
  }
  // Uso de IA "real" (não-mock) para o custo por funcionalidade
  await one(`INSERT INTO ai_usage (task, provider, model, input_tokens, output_tokens, cache_read_tokens, ok) VALUES ('explain_mistake','anthropic','claude-haiku-5-5',1000,500,3000,true) RETURNING id`);

  const r = await admin('/api/v1/admin/ia?dias=7');
  assert.equal(r.status, 200);
  assert.equal(r.data.periodoDias, 7);
  const q = r.data.qualidadePorModelo.find((x) => x.gerador === gerador);
  assert.ok(q, 'linha do gerador de teste');
  assert.deepEqual(
    [q.prompt_versao, q.revisor, q.simulados, q.geradas, q.descartadas, q.descartePct, q.gostei, q.nao_gostei, q.aprovacaoAlunosPct, q.erros_confirmados],
    ['generate:vTeste', 'teste:revisor', 2, 10, 4, 40, 2, 1, 67, 1]);

  const exp = r.data.custoPorFuncionalidade.find((f) => /Por que errei/.test(f.funcionalidade));
  assert.ok(exp && exp.custoUsd > 0, 'custo do "Por que errei?" aparece');
  const sim = r.data.custoPorFuncionalidade.find((f) => /Simulados/.test(f.funcionalidade));
  if (sim?.usos && sim.custoUsd) assert.equal(sim.custoMedioUsd, Number((sim.custoUsd / sim.usos).toFixed(4)));
  const uso = r.data.usage.find((u) => u.task === 'explain_mistake' && u.provider === 'anthropic');
  assert.ok(uso.cachePct > 0 && uso.cachePct <= 100, 'cache em %');

  assert.equal((await admin('/api/v1/admin/ia?dias=0')).status, 400, 'período validado');
  const { c: naoAdmin } = await entrar('medir-curioso');
  assert.equal((await naoAdmin('/api/v1/admin/ia')).status, 403);
});
