// =====================================================================
// Sprint 5 — Testes automatizados: Simulado no Formato da Prova Real (F3)
// =====================================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, one, many, query } from '../src/db.js';
import { criarSimuladoProvaReal } from '../src/services/edital.js';

after(() => pool.end());

const RUN = Date.now().toString(36);

async function getOrCreateTestUser(role = 'USER') {
  const email = `aluno-prova-real-${RUN}@teste.com`;
  let u = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!u) {
    u = await one(
      `INSERT INTO users (name, email, password_hash, role, plano)
       VALUES ($1, $2, 'hash', $3, 'aprovacao') RETURNING *`,
      [`Aluno Prova Real ${RUN}`, email, role]
    );
  }
  return u;
}

test('F3: criarSimuladoProvaReal distribui questões entre matérias conforme o peso do edital', async () => {
  const user = await getOrCreateTestUser();

  // Edital com 2 matérias e pesos diferentes: Português peso 2, Constitucional peso 1
  const verticalizado = [
    {
      id: 'disc-1',
      materia: 'Língua Portuguesa',
      peso: 2,
      topicos: [{ id: 't1', codigo: '1', nome: 'Interpretação de Texto' }],
    },
    {
      id: 'disc-2',
      materia: 'Direito Constitucional',
      peso: 1,
      topicos: [{ id: 't2', codigo: '2', nome: 'Direitos Fundamentais' }],
    },
  ];

  const edital = await one(
    `INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count)
     VALUES ($1, $2, 'cebraspe', $3, 'Edital teste', 100) RETURNING *`,
    [user.id, `Edital Cebraspe ${RUN}`, JSON.stringify(verticalizado)]
  );

  // Prova Cebraspe vinculada com questões C/E das duas disciplinas
  const prova = await one(
    `INSERT INTO provas (banca, banca_informada, file_name, file_key, status, titulo, text, edital_id)
     VALUES ('cebraspe', 'cebraspe', 'cebraspe.pdf', 'c/p', 'READY', 'Prova Cebraspe Teste', 'texto', $1) RETURNING id`,
    [edital.id]
  );
  await one('INSERT INTO provas_editais (prova_id, edital_id, user_id) SELECT $1, id, user_id FROM editais WHERE id=$2 RETURNING prova_id', [prova.id, edital.id]); // vínculo por aluno (024)

  // Insere 6 questões de Português
  for (let i = 1; i <= 6; i++) {
    await query(
      `INSERT INTO prova_questoes (prova_id, banca, materia, numero, enunciado, alternativas, gabarito, topico)
       VALUES ($1, 'cebraspe', 'Língua Portuguesa', $2, $3, '[]'::jsonb, 'C', 'Interpretação de Texto')`,
      [prova.id, i, `Texto de Português item ${i} ${RUN}`]
    );
  }

  // Insere 4 questões de Constitucional
  for (let i = 1; i <= 4; i++) {
    await query(
      `INSERT INTO prova_questoes (prova_id, banca, materia, numero, enunciado, alternativas, gabarito, topico)
       VALUES ($1, 'cebraspe', 'Direito Constitucional', $2, $3, '[]'::jsonb, 'E', 'Direitos Fundamentais')`,
      [prova.id, 10 + i, `Artigo da CF item ${i} ${RUN}`]
    );
  }

  // Pede 6 questões no total: proporção 2:1 deve resultar em 4 de Português e 2 de Constitucional
  const res = await criarSimuladoProvaReal({
    user,
    edital,
    qtdTotal: 6,
    tempoMinutos: 90,
  });

  assert.equal(res.created, true);
  assert.equal(res.count, 6);
  assert.equal(res.formato, 'ce');
  assert.equal(res.tempoMinutos, 90);

  const qs = res.set.questoes;
  const countPort = qs.filter((q) => q.materia === 'Língua Portuguesa').length;
  const countConst = qs.filter((q) => q.materia === 'Direito Constitucional').length;

  assert.equal(countPort, 4, 'Português (peso 2) deve receber 4 das 6 questões');
  assert.equal(countConst, 2, 'Constitucional (peso 1) deve receber 2 das 6 questões');

  // Verifica que o modo_prova e campos de suporte foram gravados no banco
  const row = await one('SELECT modo_prova, tempo_limite_minutos, duvidas, estatisticas FROM question_sets WHERE id=$1', [res.set.id]);
  assert.equal(row.modo_prova, true);
  assert.equal(row.tempo_limite_minutos, 90);
  assert.deepEqual(row.duvidas, []);
  assert.ok(row.estatisticas.distribuicaoDisciplinas);
});

test('F3: criarSimuladoProvaReal bloqueia caderno de outro usuário (IDOR)', async () => {
  const user1 = await getOrCreateTestUser();
  const outroUser = await one(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Outro Aluno', 'outro-${RUN}@teste.com', 'hash', 'USER') RETURNING *`
  );

  const edital = await one(
    `INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count)
     VALUES ($1, 'Edital IDOR', 'cebraspe', '[{"id":"d1","materia":"Geral","peso":1,"topicos":[]}]'::jsonb, 't', 10) RETURNING *`,
    [user1.id]
  );

  const cadAlheio = await one(
    `INSERT INTO cadernos (user_id, banca, titulo) VALUES ($1, 'cebraspe', 'Caderno Alheio') RETURNING id`,
    [outroUser.id]
  );

  await assert.rejects(
    criarSimuladoProvaReal({ user: user1, edital, qtdTotal: 10, cadernoId: cadAlheio.id }),
    /Caderno não encontrado/
  );
});

test('F3: cálculo de nota Cebraspe (acertos - erros) e estatísticas por disciplina ao finalizar', async () => {
  const user = await getOrCreateTestUser();

  const qs = [
    { id: 'q1', materia: 'Língua Portuguesa', gabarito: 'C', enunciado: 'Item 1', alternativas: [] },
    { id: 'q2', materia: 'Língua Portuguesa', gabarito: 'E', enunciado: 'Item 2', alternativas: [] },
    { id: 'q3', materia: 'Direito Constitucional', gabarito: 'C', enunciado: 'Item 3', alternativas: [] },
    { id: 'q4', materia: 'Direito Constitucional', gabarito: 'E', enunciado: 'Item 4', alternativas: [] },
  ];

  const setRow = await one(
    `INSERT INTO question_sets (
       user_id, banca, materia, assunto, nivel, formato, arquivo, questoes,
       modo_prova, tempo_limite_minutos, tempo_gasto_segundos
     ) VALUES ($1, 'cebraspe', 'Simulado Cebraspe', 'Geral', 'Prova real', 'ce', 'arquivo.pdf', $2, true, 120, 0)
     RETURNING *`,
    [user.id, JSON.stringify(qs)]
  );

  // Aluno respondeu:
  // Q0 (Port): C (acertou)
  // Q1 (Port): C (errou, era E)
  // Q2 (Const): C (acertou)
  // Q3 (Const): em branco (não respondeu)
  // Resultado esperado: 2 acertos, 1 erro, 1 em branco
  // Nota líquida Cebraspe = 2 - 1 = +1 ponto líquido
  const respostas = { '0': 'C', '1': 'C', '2': 'C' };

  // Finaliza pelo serviço real (o mesmo que a rota PATCH /sets/:id usa)
  const { salvarProgresso } = await import('../src/services/simulados.js');
  const s = await salvarProgresso(user, setRow.id, { respostas, finalizado: true, tempoGastoSegundos: 600 });
  const rf = s.estatisticas.resultadoFinal;
  assert.equal(rf.acertos, 2);
  assert.equal(rf.erros, 1);
  assert.equal(rf.emBranco, 1);
  assert.equal(rf.notaLiquida, 1, 'Nota líquida deve ser 1 (2 acertos - 1 erro)');
  assert.equal(rf.tempoGastoSegundos, 600);
  const port = rf.disciplinas.find((d) => d.materia === 'Língua Portuguesa');
  assert.deepEqual([port.acertos, port.erros], [1, 1]);
});

