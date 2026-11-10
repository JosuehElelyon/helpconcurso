// Revisão do commit 591d977: R12 pela rota (troca e redefinição de senha derrubam outras sessões), R10 pelo serviço
// (disciplinas não se misturam; inéditas primeiro) e LGPD (termos gerados da configuração, aceite, exportação, exclusão).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { one, pool } from '../src/db.js';
import { hashPassword } from '../src/lib/auth.js';
import { criarSimuladoProvaReal } from '../src/services/edital.js';

const PORT = 3900 + Math.floor(Math.random() * 900), URL = `http://localhost:${PORT}`;
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
    const sc = r.headers.get('set-cookie'); if (sc) jar.cookie = sc.split(';')[0];
    const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, headers: r.headers };
  };
}
const ultimoCodigo = (email) => [...log.matchAll(new RegExp(`Para: ${email.replace(/[.+]/g, '\\$&')}[\\s\\S]*?(\\d{6}) é o seu código`, 'g'))].at(-1)?.[1];

async function criarAluno(nome, extra = {}) {
  const email = `${nome}-${RUN}@teste.com`;
  const u = await one(`INSERT INTO users (name, email, password_hash, role, plano, email_verified_at) VALUES ($1,$2,$3,$4,'aprovacao', now()) RETURNING *`,
    [nome, email, await hashPassword(SENHA), extra.role || 'USER']);
  return { u, email, entrar: async () => { const c = client(); const r = await c('/api/v1/auth/login', { method: 'POST', body: { email, password: SENHA } }); assert.equal(r.status, 200); return c; } };
}

before(async () => {
  srv = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(PORT), APP_URL: URL, AI_MOCK: 'true', AI_TRAINING_MODE: 'direct', S3_DISABLED: 'true', SMTP_HOST: '', REGISTRATION_MODE: 'open' } });
  srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) { try { if ((await fetch(URL + '/api/v1/health')).ok) break; } catch {} await sleep(200); }
});
after(() => srv?.kill());
after(() => pool.end());

// ---------- R12 pela rota ----------

test('R12: trocar a senha (rota) mantém esta sessão e derruba as outras', async () => {
  const a = await criarAluno('r12senha');
  const aqui = await a.entrar(), outroAparelho = await a.entrar();
  const r = await aqui('/api/v1/me/conta/senha', { method: 'POST', body: { senhaAtual: SENHA, novaSenha: 'senha-nova-123' } });
  assert.equal(r.status, 200);
  assert.equal((await aqui('/api/v1/sets')).status, 200, 'a sessão que trocou a senha continua');
  assert.equal((await outroAparelho('/api/v1/sets')).status, 401, 'outra sessão caiu');
});

test('R12: redefinir a senha pelo código (rota) derruba as sessões abertas', async () => {
  const a = await criarAluno('r12reset');
  const sessaoAntiga = await a.entrar();
  const novo = client();
  await novo('/api/v1/auth/forgot', { method: 'POST', body: { email: a.email } });
  await sleep(150);
  const code = ultimoCodigo(a.email);
  assert.ok(code, 'código de redefinição no e-mail simulado');
  const r = await novo('/api/v1/auth/reset', { method: 'POST', body: { email: a.email, code, password: 'senha-redefinida-1' } });
  assert.equal(r.status, 200);
  assert.equal((await novo('/api/v1/sets')).status, 200);
  assert.equal((await sessaoAntiga('/api/v1/sets')).status, 401);
});

// ---------- R10 pelo serviço ----------

test('R10: Simulado Prova Real não mistura disciplinas e traz primeiro as questões que o aluno ainda não fez', async () => {
  const a = await criarAluno('r10');
  const penal = `Direito Penal ${RUN}`, adm = `Direito Administrativo ${RUN}`;
  const edital = await one(`INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count) VALUES ($1,'Edital R10','fgv',$2,'t',10) RETURNING *`,
    [a.u.id, JSON.stringify([{ id: 'd1', materia: penal, peso: 1, topicos: [] }])]);
  const prova = await one(`INSERT INTO provas (banca, file_name, file_key, status, titulo) VALUES ('fgv','r10.pdf',$1,'READY','Prova R10') RETURNING id`, [`r10-${RUN}`]);
  for (const [mat, n] of [[penal, 4], [adm, 4]]) {
    for (let i = 1; i <= n; i++) {
      await one(`INSERT INTO prova_questoes (prova_id, banca, materia, numero, enunciado, alternativas, gabarito) VALUES ($1,'fgv',$2,$3,$4,$5,'A') RETURNING id`,
        [prova.id, mat, i, `${mat} questão ${i}`, JSON.stringify(['a', 'b', 'c', 'd', 'e'])]);
    }
  }
  const s1 = await criarSimuladoProvaReal({ user: a.u, edital, qtdTotal: 2, tempoMinutos: 0 });
  const s2 = await criarSimuladoProvaReal({ user: a.u, edital, qtdTotal: 2, tempoMinutos: 0 });
  const ids1 = s1.set.questoes.map((q) => q.id), ids2 = s2.set.questoes.map((q) => q.id);
  for (const q of [...s1.set.questoes, ...s2.set.questoes]) assert.match(q.enunciado, /Direito Penal/, 'só a disciplina do edital (antes "%Direito%" puxava Administrativo)');
  assert.equal(ids1.length, 2);
  assert.equal(ids2.filter((id) => ids1.includes(id)).length, 0, 'o 2º simulado traz as 2 questões ainda não feitas');
});

// ---------- LGPD ----------

test('LGPD: termos gerados da configuração real (sem modelos inventados) e com as seções obrigatórias', async () => {
  const r = await client()('/api/v1/termos');
  assert.equal(r.status, 200);
  const t = r.data, texto = JSON.stringify(t);
  assert.match(t.versao, /^\d{4}-\d{2}-\d{2}\.[0-9a-f]{8}$/);
  for (const proibido of ['Claude 3.5', 'Gemini 1.5', 'GPT-4o', 'retenção zero', 'ponta a ponta']) assert.ok(!texto.includes(proibido), proibido);
  const titulos = t.secoes.map((s) => s.titulo).join(' | ');
  for (const sec of ['base legal', 'compartilhado', 'Transferência internacional', 'quanto tempo', 'direitos']) assert.match(titulos, new RegExp(sec, 'i'));
  for (const o of t.operadoresIA) assert.ok(o.fornecedor && o.recebe && o.privacidade, JSON.stringify(o));
  assert.ok(t.encarregado?.nome);
});

test('LGPD: cadastro exige aceite e registra a versão; aceite posterior atualiza', async () => {
  const c = client(), email = `aceite-${RUN}@teste.com`;
  let r = await c('/api/v1/auth/register', { method: 'POST', body: { name: 'Aceite', email, password: SENHA } });
  assert.equal(r.status, 400, 'sem aceite não cria conta');
  r = await c('/api/v1/auth/register', { method: 'POST', body: { name: 'Aceite', email, password: SENHA, aceitouTermos: true } });
  assert.equal(r.status, 201);
  const { versao } = (await c('/api/v1/termos')).data;
  const u = await one('SELECT termos_versao, termos_aceitos_em FROM users WHERE email=$1', [email]);
  assert.equal(u.termos_versao, versao);
  assert.ok(u.termos_aceitos_em);

  const b = await criarAluno('aceite2');
  const sb = await b.entrar();
  assert.equal((await sb('/api/v1/auth/me')).data.user.termosVersao, null);
  r = await sb('/api/v1/me/termos/aceite', { method: 'POST' });
  assert.equal(r.data.user.termosVersao, versao);
});

test('LGPD: exportar traz só os dados do próprio aluno', async () => {
  const a = await criarAluno('exporta'), outro = await criarAluno('exporta-outro');
  await one(`INSERT INTO question_sets (user_id, banca, materia, nivel, formato, questoes) VALUES ($1,'fgv','Meu simulado','Médio','me','[]') RETURNING id`, [a.u.id]);
  await one(`INSERT INTO question_sets (user_id, banca, materia, nivel, formato, questoes) VALUES ($1,'fgv','Simulado alheio','Médio','me','[]') RETURNING id`, [outro.u.id]);
  const s = await a.entrar();
  const r = await s('/api/v1/me/exportar');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="helpconcurso-meus-dados-/);
  assert.equal(r.data.perfil.email, a.email);
  assert.equal(r.data.perfil.password_hash, undefined, 'hash da senha não sai na exportação');
  assert.deepEqual(r.data.simulados.map((x) => x.materia), ['Meu simulado']);
});

test('LGPD: excluir a conta pede senha e confirmação, apaga os dados e mantém a prova na base sem autoria', async () => {
  const a = await criarAluno('exclui');
  const set = await one(`INSERT INTO question_sets (user_id, banca, materia, nivel, formato, questoes) VALUES ($1,'fgv','X','Médio','me','[]') RETURNING id`, [a.u.id]);
  const prova = await one(`INSERT INTO provas (banca, file_name, file_key, status, uploaded_by) VALUES ('fgv','p.pdf',$1,'READY',$2) RETURNING id`, [`exclui-${RUN}`, a.u.id]);
  const s = await a.entrar();
  assert.equal((await s('/api/v1/me/conta', { method: 'DELETE', body: { senha: 'errada', confirmacao: 'EXCLUIR' } })).status, 400);
  assert.equal((await s('/api/v1/me/conta', { method: 'DELETE', body: { senha: SENHA, confirmacao: 'sim' } })).status, 400);
  const r = await s('/api/v1/me/conta', { method: 'DELETE', body: { senha: SENHA, confirmacao: 'EXCLUIR' } });
  assert.equal(r.status, 200);
  assert.equal(await one('SELECT id FROM users WHERE id=$1', [a.u.id]), null);
  assert.equal(await one('SELECT id FROM question_sets WHERE id=$1', [set.id]), null);
  assert.equal((await one('SELECT uploaded_by FROM provas WHERE id=$1', [prova.id])).uploaded_by, null, 'prova fica na base, sem autoria');
  assert.equal((await s('/api/v1/auth/me')).data.user, null, 'sessão encerrada');

  const admin = await criarAluno('exclui-admin', { role: 'ADMIN' });
  const sa = await admin.entrar();
  assert.equal((await sa('/api/v1/me/conta', { method: 'DELETE', body: { senha: SENHA, confirmacao: 'EXCLUIR' } })).status, 403);
});

test('A4/R10: "Praticar questões reais" de edital sem banca não força cebraspe; nome com % não vira curinga', async () => {
  const { criarSimuladoQuestoesReais } = await import('../src/services/edital.js');
  const { escaparLike } = await import('../src/repositories/provas.js');
  assert.equal(escaparLike('100% a_b'), String.raw`100\% a\_b`);

  const a = await criarAluno('reais-sem-banca');
  const mat = `Penal ${RUN}`, top = `Crimes contra a pessoa ${RUN}`;
  const edital = await one(`INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count) VALUES ($1,'Edital sem banca',NULL,$2,'t',10) RETURNING *`,
    [a.u.id, JSON.stringify([{ id: 'd1', materia: mat, peso: 1, topicos: [{ id: 'd1-t1', codigo: '1', nome: top }] }])]);
  const prova = await one(`INSERT INTO provas (banca, file_name, file_key, status, titulo, edital_id) VALUES ('cebraspe','r.pdf',$1,'READY','Prova vinculada',$2) RETURNING id`, [`reais-${RUN}`, edital.id]);
  await one('INSERT INTO provas_editais (prova_id, edital_id, user_id) SELECT $1, id, user_id FROM editais WHERE id=$2 RETURNING prova_id', [prova.id, edital.id]);
  await one(`INSERT INTO prova_questoes (prova_id, banca, materia, topico, numero, enunciado, alternativas, gabarito) VALUES ($1,'cebraspe',$2,$3,1,'Item sobre crimes contra a pessoa','[]','C') RETURNING id`, [prova.id, mat, top]);
  const out = await criarSimuladoQuestoesReais({ user: a.u, edital, topicoIdOrCode: 'd1-t1', limite: 5 });
  assert.equal(out.created, true, JSON.stringify(out));
  assert.equal(out.set.banca, null, 'antes gravava cebraspe');
  assert.equal(out.set.questoes.length, 1);
});

test('Item 7: a mesma prova fica ligada ao edital de cada aluno, sem um vínculo sobrescrever o outro', async () => {
  const ana = await criarAluno('vinc-ana'), bia = await criarAluno('vinc-bia');
  const ca = await ana.entrar(), cb = await bia.entrar();
  const novoEdital = (u, titulo) => one(`INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count) VALUES ($1,$2,'fgv','[]','t',10) RETURNING id`, [u.id, titulo]);
  const edAna = await novoEdital(ana.u, 'Edital da Ana'), edBia = await novoEdital(bia.u, 'Edital da Bia');
  // Prova enviada pela Ana e já pronta na base compartilhada
  const prova = await one(`INSERT INTO provas (banca, file_name, file_key, status, titulo, uploaded_by) VALUES ('fgv','v.pdf',$1,'READY','Prova compartilhada',$2) RETURNING id`, [`vinc-${RUN}`, ana.u.id]);

  assert.equal((await ca(`/api/v1/provas/${prova.id}/edital`, { method: 'POST', body: { editalId: edAna.id } })).status, 200);
  // A Bia não enviou a prova, mas ela está pronta na base: liga ao edital DELA (antes: 404, e a coluna única seria sobrescrita)
  assert.equal((await cb(`/api/v1/provas/${prova.id}/edital`, { method: 'POST', body: { editalId: edBia.id } })).status, 200);
  const links = await pool.query('SELECT edital_id FROM provas_editais WHERE prova_id=$1 ORDER BY created_at', [prova.id]);
  assert.deepEqual(links.rows.map((r) => r.edital_id).sort(), [edAna.id, edBia.id].sort(), 'os dois vínculos coexistem');

  // Edital alheio continua barrado
  assert.equal((await cb(`/api/v1/provas/${prova.id}/edital`, { method: 'POST', body: { editalId: edAna.id } })).status, 404);

  // "Minhas provas" da Ana mostra o edital DELA; o painel do edital de cada uma traz a prova
  const minhas = await ca('/api/v1/provas/minhas');
  assert.equal(minhas.data.provas.find((p) => p.id === prova.id).editalTitulo, 'Edital da Ana');
  for (const [c, ed] of [[ca, edAna], [cb, edBia]]) {
    const painel = await c(`/api/v1/editais/${ed.id}`);
    assert.ok(JSON.stringify(painel.data).includes(prova.id), 'painel do edital traz a prova ligada');
  }

  // Ana desvincula: o vínculo da Bia continua
  await ca(`/api/v1/provas/${prova.id}/edital`, { method: 'POST', body: {} });
  const resta = await pool.query('SELECT edital_id FROM provas_editais WHERE prova_id=$1', [prova.id]);
  assert.deepEqual(resta.rows.map((r) => r.edital_id), [edBia.id]);
});
