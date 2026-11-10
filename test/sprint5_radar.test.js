// =====================================================================
// Sprint 5 — Testes automatizados: Radar de Desempenho e Probabilidade da Banca (F6)
// =====================================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, one, query } from '../src/db.js';
import { buildEditalDashboard } from '../src/services/edital.js';

after(() => pool.end());

const RUN = Date.now().toString(36);

async function getOrCreateTestUser(role = 'USER') {
  const email = `aluno-radar-${RUN}@teste.com`;
  let u = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!u) {
    u = await one(
      `INSERT INTO users (name, email, password_hash, role, plano)
       VALUES ($1, $2, 'hash', $3, 'aprovacao') RETURNING *`,
      [`Aluno Radar ${RUN}`, email, role]
    );
  }
  return u;
}

test('F6: buildEditalDashboard calcula probabilidade na banca, prioridade de estudo e índice de prontidão', async () => {
  const user = await getOrCreateTestUser();

  const verticalizado = [
    {
      id: 'disc-1',
      materia: 'Direito Administrativo',
      peso: 2,
      topicos: [
        { id: 't1', codigo: '1', nome: 'Atos Administrativos' },
        { id: 't2', codigo: '2', nome: 'Licitações e Contratos' },
        { id: 't3', codigo: '3', nome: 'Responsabilidade Civil' },
      ],
    },
    {
      id: 'disc-2',
      materia: 'Direito Constitucional',
      peso: 1,
      topicos: [
        { id: 't4', codigo: '1', nome: 'Direitos Fundamentais' },
      ],
    },
  ];

  const edital = await one(
    `INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count)
     VALUES ($1, $2, 'fgv', $3, 'Edital com Radar', 150) RETURNING *`,
    [user.id, `Edital Radar ${RUN}`, JSON.stringify(verticalizado)]
  );

  // Prova FGV vinculada
  const prova = await one(
    `INSERT INTO provas (banca, banca_informada, file_name, file_key, status, titulo, text, edital_id)
     VALUES ('fgv', 'fgv', 'fgv.pdf', 'fgv/p', 'READY', 'Prova FGV Radar', 'texto', $1) RETURNING id`,
    [edital.id]
  );
  await one('INSERT INTO provas_editais (prova_id, edital_id, user_id) SELECT $1, id, user_id FROM editais WHERE id=$2 RETURNING prova_id', [prova.id, edital.id]); // vínculo por aluno (024)

  // Insere 6 questões de "Atos Administrativos" (t1) -> Alta incidência
  for (let i = 1; i <= 6; i++) {
    await query(
      `INSERT INTO prova_questoes (prova_id, banca, materia, numero, enunciado, alternativas, gabarito, topico)
       VALUES ($1, 'fgv', 'Direito Administrativo', $2, $3, '[]'::jsonb, 'A', 'Atos Administrativos')`,
      [prova.id, i, `Enunciado sobre Atos Administrativos item ${i} ${RUN}`]
    );
  }

  // Insere 2 questões de "Licitações" (t2)
  for (let i = 1; i <= 2; i++) {
    await query(
      `INSERT INTO prova_questoes (prova_id, banca, materia, numero, enunciado, alternativas, gabarito, topico)
       VALUES ($1, 'fgv', 'Direito Administrativo', $2, $3, '[]'::jsonb, 'B', 'Licitações')`,
      [prova.id, 10 + i, `Enunciado sobre Licitações item ${i} ${RUN}`]
    );
  }

  // 1) Dashboard antes de o aluno responder qualquer questão:
  // Tópicos com muitas questões na banca que o aluno não respondeu -> Prioridade 'critica'
  const dash1 = await buildEditalDashboard(edital, user.id);
  assert.ok(dash1.resumo.radar, 'Deve incluir objeto radar no resumo');
  const radar1 = dash1.resumo.radar;

  assert.ok(radar1.distribuicaoPrioridades.critica >= 1, 'Deve identificar ao menos 1 tópico com prioridade crítica');
  assert.ok(radar1.topUrgentes.length >= 2, 'Deve listar tópicos urgentes ordenados por questões da banca');
  assert.ok(radar1.topUrgentes[0].questoesNaBanca >= radar1.topUrgentes[1].questoesNaBanca, 'Deve ordenar decrescente por frequência na banca');
  assert.equal(radar1.topUrgentes[0].prioridade, 'critica');
  assert.equal(radar1.indiceProntidao, 0, 'Sem estudo nem questões resolvidas, prontidão deve ser 0%');
  assert.equal(radar1.prontidaoFaixa, 'Risco Alto');

  // 2) Aluno resolve simulado com questões de Atos Administrativos (t1) e acerta 80% (4 de 5)
  const qsAtos = Array.from({ length: 5 }, (_, i) => ({
    enunciado: `Questão Simulado Atos Administrativos ${i}`,
    alternativas: ['A', 'B', 'C', 'D', 'E'],
    gabarito: 'A',
    topico_edital: 'Atos Administrativos',
    materia: 'Direito Administrativo',
  }));
  const resps = { '0': 'A', '1': 'A', '2': 'A', '3': 'A', '4': 'B' }; // 4 acertos, 1 erro = 80%

  await query(
    `INSERT INTO question_sets (user_id, edital_id, banca, materia, nivel, questoes, respostas, finalizado, formato)
     VALUES ($1, $2, 'fgv', 'Direito Administrativo', 'Médio', $3, $4, true, 'me')`,
    [user.id, edital.id, JSON.stringify(qsAtos), JSON.stringify(resps)]
  );

  const dash2 = await buildEditalDashboard(edital, user.id);
  const radar2 = dash2.resumo.radar;

  assert.ok(radar2.indiceProntidao > 0, 'Prontidão deve subir após simulado resolvido com alto acerto');
  const t1 = dash2.disciplinas[0].topicos.find((t) => t.id === 't1');
  assert.equal(t1.taxaAcerto, 80);
  assert.equal(t1.status, 'dominado');
  assert.equal(t1.prioridade, 'segura', 'Tópico com 80% de acerto deve migrar para zona segura');
});

test('F6: edital sem questões na banca calcula distribuição uniforme sem erro ou divisão por zero', async () => {
  const user = await getOrCreateTestUser();

  const verticalizado = [
    {
      id: 'disc-x',
      materia: 'Língua Inglesa',
      peso: 1,
      topicos: [
        { id: 'tx1', codigo: '1', nome: 'Reading Comprehension' },
        { id: 'tx2', codigo: '2', nome: 'Grammar and Vocabulary' },
      ],
    },
  ];

  const editalVazio = await one(
    `INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count)
     VALUES ($1, $2, 'banca_inexistente', $3, 'Edital Sem Provas', 50) RETURNING *`,
    [user.id, `Edital Sem Provas ${RUN}`, JSON.stringify(verticalizado)]
  );

  const dash = await buildEditalDashboard(editalVazio, user.id);
  assert.ok(dash.resumo.radar);
  assert.equal(dash.resumo.radar.totalQuestoesNaBanca, 0);
  assert.equal(dash.resumo.radar.indiceProntidao, 0);
  assert.ok(Number.isFinite(dash.resumo.radar.indiceProntidao));

  const t = dash.disciplinas[0].topicos[0];
  assert.ok(Number.isFinite(t.probBancaPct), 'Probabilidade deve ser um número finito (distribuição uniforme)');
  assert.equal(t.probBancaPct, 50, 'Com 2 tópicos e 0 questões, probabilidade estimada uniforme deve ser 50%');
});
