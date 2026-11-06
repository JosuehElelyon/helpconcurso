import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { query, one } from '../src/db.js';
import { config } from '../src/config.js';
import { setSession, loadUser, hashPassword } from '../src/lib/auth.js';
import { obterDesempenhoCompleto } from '../src/services/desempenho.js';
import { criarSimuladoProvaReal } from '../src/services/edital.js';
import * as editaisRepo from '../src/repositories/editais.js';

test('R12: trocar senha incrementa sessao_versao e invalida tokens antigos', async () => {
  const email = `teste_r12_${Date.now()}@teste.com`;
  const senhaAntigaHash = await hashPassword('SenhaAntiga123!');
  const u = await one(
    'INSERT INTO users (name, email, password_hash, email_verified_at, sessao_versao) VALUES ($1, $2, $3, now(), 1) RETURNING *',
    ['Aluno R12', email, senhaAntigaHash]
  );

  // Gera token antigo com sessao_versao = 1
  const tokenAntigo = jwt.sign({ sub: u.id, role: u.role, sv: 1 }, config.jwtSecret, { expiresIn: '7d' });

  // Simula requisição com o token antigo antes da troca de senha
  let reqMock = { cookies: { hc_session: tokenAntigo } };
  await new Promise((resolve) => loadUser(reqMock, {}, resolve));
  assert.equal(reqMock.user?.id, u.id, 'Antes da troca de senha, o token antigo é aceito');

  // Aluno troca a senha: incrementa sessao_versao para 2
  const senhaNovaHash = await hashPassword('SenhaNova456!');
  const atualizado = await one(
    'UPDATE users SET password_hash=$2, sessao_versao=COALESCE(sessao_versao, 1) + 1, updated_at=now() WHERE id=$1 RETURNING *',
    [u.id, senhaNovaHash]
  );
  assert.equal(atualizado.sessao_versao, 2, 'sessao_versao foi incrementada para 2');

  // Nova requisição tentando usar o token antigo (de outra sessão ou dispositivo)
  let reqAntiga = { cookies: { hc_session: tokenAntigo } };
  await new Promise((resolve) => loadUser(reqAntiga, {}, resolve));
  assert.equal(reqAntiga.user, undefined, 'Token antigo é recusado após a troca de senha (derrubou outras sessões)');

  // Nova sessão com a versão 2 é aceita
  const resMock = { cookie: (_name, val) => { resMock._token = val; } };
  setSession(resMock, atualizado);
  let reqNova = { cookies: { hc_session: resMock._token } };
  await new Promise((resolve) => loadUser(reqNova, {}, resolve));
  assert.equal(reqNova.user?.id, u.id, 'Nova sessão emitida após a troca de senha é aceita normalmente');

  // Limpeza
  await query('DELETE FROM users WHERE id=$1', [u.id]);
});

test('R13 e R14: validação de editalId, busca por edital ativo e repositório de desempenho', async () => {
  const email = `teste_r13_${Date.now()}@teste.com`;
  const u = await one(
    'INSERT INTO users (name, email, password_hash, email_verified_at) VALUES ($1, $2, $3, now()) RETURNING *',
    ['Aluno R13', email, 'hash']
  );

  // 1) Teste R13: editalId inválido (não-UUID) deve lançar HttpError 400 em vez de 500 do banco
  await assert.rejects(
    async () => {
      await obterDesempenhoCompleto(u, 'id-invalido-xyz');
    },
    (err) => err.status === 400 && err.message.includes('ID de edital inválido')
  );

  // 2) Cria dois editais: um inativo mais recente e um ativo anterior
  const editalAtivo = await one(
    `INSERT INTO editais (user_id, titulo, orgao, cargo, text, word_count, active, updated_at)
     VALUES ($1, 'Edital Ativo', 'PF', 'Agente', 'Conteúdo do edital ativo', 100, true, now() - interval '2 days')
     RETURNING *`,
    [u.id]
  );
  const editalInativoRecente = await one(
    `INSERT INTO editais (user_id, titulo, orgao, cargo, text, word_count, active, updated_at)
     VALUES ($1, 'Edital Recente Inativo', 'PRF', 'Policial', 'Conteúdo do edital inativo', 100, false, now())
     RETURNING *`,
    [u.id]
  );

  // Teste R13: sem editalId, buscaAtivoOuRecente deve priorizar o ativo
  const selecionado = await editaisRepo.buscarAtivoOuRecente(u.id);
  assert.equal(selecionado.id, editalAtivo.id, 'Prioriza o edital com active=true sobre o mais recente inativo');

  // 3) Teste R14: obterDesempenhoCompleto roda com a consulta agregada de question_sets
  const res = await obterDesempenhoCompleto(u);
  assert.ok(res.resumo, 'Retorna resumo de desempenho');
  assert.equal(res.resumo.simuladosConcluidos, 0);
  assert.ok(Array.isArray(res.evolucao));
  assert.equal(res.evolucao.length, 14);

  // Limpeza
  await query('DELETE FROM editais WHERE user_id=$1', [u.id]);
  await query('DELETE FROM users WHERE id=$1', [u.id]);
});

test('R10: Simulado Prova Real não força banca cebraspe em edital sem banca e prioriza questões não feitas', async () => {
  const email = `teste_r10_${Date.now()}@teste.com`;
  const u = await one(
    'INSERT INTO users (name, email, password_hash, email_verified_at) VALUES ($1, $2, $3, now()) RETURNING *',
    ['Aluno R10', email, 'hash']
  );

  // Cria edital sem banca informada (banca = null)
  const edital = await one(
    `INSERT INTO editais (user_id, titulo, orgao, cargo, text, word_count, verticalizado)
     VALUES ($1, 'Concurso Geral', 'Prefeitura', 'Analista', 'Texto do edital geral', 100, $2)
     RETURNING *`,
    [
      u.id,
      JSON.stringify([
        { id: 'mat-1', materia: 'Língua Portuguesa', peso: 1, topicos: [{ nome: 'Ortografia' }] },
      ])
    ]
  );

  // Prova e questões vinculadas ao edital (mesmo sem banca declarada no edital)
  const prova = await one(
    `INSERT INTO provas (uploaded_by, edital_id, titulo, file_name, file_key, status, banca)
     VALUES ($1, $2, 'Prova Teste', 'prova.pdf', 'k-prova', 'READY', 'FCC') RETURNING *`,
    [u.id, edital.id]
  );

  const q1 = await one(
    `INSERT INTO prova_questoes (prova_id, banca, materia, enunciado, gabarito, alternativas)
     VALUES ($1, 'FCC', 'Língua Portuguesa', 'Enunciado Q1 sobre Ortografia', 'A', '["A","B","C","D"]') RETURNING *`,
    [prova.id]
  );
  const q2 = await one(
    `INSERT INTO prova_questoes (prova_id, banca, materia, enunciado, gabarito, alternativas)
     VALUES ($1, 'FCC', 'Língua Portuguesa', 'Enunciado Q2 sobre Ortografia', 'B', '["A","B","C","D"]') RETURNING *`,
    [prova.id]
  );

  // Cria simulado prova real
  const res1 = await criarSimuladoProvaReal({
    user: u,
    edital,
    qtdTotal: 1,
    tempoMinutos: 60,
  });

  assert.equal(res1.created, true);
  // Confere que não forçou banca 'cebraspe' quando o edital não tem banca
  assert.equal(res1.set.banca, null, 'Edital sem banca grava banca como null em question_sets');

  // Limpeza
  await query('DELETE FROM question_sets WHERE user_id=$1', [u.id]);
  await query('DELETE FROM prova_questoes WHERE prova_id=$1', [prova.id]);
  await query('DELETE FROM provas WHERE id=$1', [prova.id]);
  await query('DELETE FROM editais WHERE user_id=$1', [u.id]);
  await query('DELETE FROM users WHERE id=$1', [u.id]);
});
