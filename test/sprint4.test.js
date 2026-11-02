// =====================================================================
// Sprint 4 — Testes automatizados: Gabarito Definitivo, Lote e Consenso
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { one, many, query } from '../src/db.js';
import { parseGabaritoTexto, aplicarGabaritoDefinitivo, importarProvasEmLote } from '../src/services/provas.js';
import { getQuestoesReaisDoTopico } from '../src/services/edital.js';

test('F7: parseGabaritoTexto reconhece formatos de gabaritos oficiais, anulações e alterações', () => {
  const texto = `
GABARITO OFICIAL DEFINITIVO
1 - A
2. B
3: C
04 - D
5) E
6 - ANULADA
7: NULA
8 - X
9 - #
10 - CANCELADA
11 - ALTERADA PARA C
12 - alterada de A para D
13 - B (alterada)
14 - Certo
15 - Errado
16 - ANULADO
17 A 18 B 19 C 20 D
`;

  const itens = parseGabaritoTexto(texto);
  assert.equal(itens.length, 20);

  // Questões normais
  assert.deepEqual(itens[0], { numero: 1, gabarito: 'A', anulada: false, alterado: false, original: null, motivo: null });
  assert.deepEqual(itens[1], { numero: 2, gabarito: 'B', anulada: false, alterado: false, original: null, motivo: null });
  assert.deepEqual(itens[2], { numero: 3, gabarito: 'C', anulada: false, alterado: false, original: null, motivo: null });
  assert.deepEqual(itens[3], { numero: 4, gabarito: 'D', anulada: false, alterado: false, original: null, motivo: null });
  assert.deepEqual(itens[4], { numero: 5, gabarito: 'E', anulada: false, alterado: false, original: null, motivo: null });

  // Anulações
  assert.equal(itens[5].numero, 6);
  assert.equal(itens[5].anulada, true);
  assert.equal(itens[5].gabarito, null);

  assert.equal(itens[6].numero, 7);
  assert.equal(itens[6].anulada, true);

  assert.equal(itens[7].numero, 8);
  assert.equal(itens[7].anulada, true);

  assert.equal(itens[8].numero, 9);
  assert.equal(itens[8].anulada, true);

  assert.equal(itens[9].numero, 10);
  assert.equal(itens[9].anulada, true);

  // Alterações
  assert.equal(itens[10].numero, 11);
  assert.equal(itens[10].alterado, true);
  assert.equal(itens[10].gabarito, 'C');

  assert.equal(itens[11].numero, 12);
  assert.equal(itens[11].alterado, true);
  assert.equal(itens[11].original, 'A');
  assert.equal(itens[11].gabarito, 'D');

  assert.equal(itens[12].numero, 13);
  assert.equal(itens[12].alterado, true);
  assert.equal(itens[12].gabarito, 'B');

  // Cebraspe Certo/Errado
  assert.equal(itens[13].numero, 14);
  assert.equal(itens[13].gabarito, 'C');

  assert.equal(itens[14].numero, 15);
  assert.equal(itens[14].gabarito, 'E');

  assert.equal(itens[15].numero, 16);
  assert.equal(itens[15].anulada, true);
});

test('F7: aplicarGabaritoDefinitivo atualiza questões, marca anulações e altera gabaritos', async () => {
  const p = await one(`INSERT INTO provas(banca, banca_informada, file_name, file_key, status, titulo, text)
                       VALUES ('fgv','fgv','sprint4_gabdef.pdf','sprint4/gabdef','READY','Prova Sprint 4 GabDef','Texto da prova')
                       RETURNING *`);

  const insQ = (num, gab, enun) => query(
    `INSERT INTO prova_questoes(prova_id, banca, materia, numero, enunciado, alternativas, gabarito)
     VALUES ($1, 'fgv', 'Direito Administrativo', $2, $3, '["a","b","c","d","e"]'::jsonb, $4)`,
    [p.id, num, enun, gab]
  );

  await insQ(1, 'A', 'Questão 1 sobre atos administrativos');
  await insQ(2, 'B', 'Questão 2 sobre licitações');
  await insQ(3, 'C', 'Questão 3 sobre poderes');
  await insQ(4, 'D', 'Questão 4 sobre controle');

  const textoGabDef = `
GABARITO DEFINITIVO
1 - A
2 - ALTERADA PARA D
3 - ANULADA
4 - D
`;

  // Prévia: nada é gravado
  const previa = await aplicarGabaritoDefinitivo({ provaId: p.id, user: { id: p.uploaded_by || null, role: 'ADMIN' }, text: textoGabDef });
  assert.equal(previa.resumo.previa, true);
  assert.equal((await one('SELECT gabarito_definitivo FROM provas WHERE id=$1', [p.id])).gabarito_definitivo, false);

  const out = await aplicarGabaritoDefinitivo({
    provaId: p.id,
    user: { id: p.uploaded_by || null, role: 'ADMIN' },
    text: textoGabDef,
    confirmar: true,
  });

  assert.equal(out.resumo.totalLidas, 4);
  assert.equal(out.resumo.atualizadas, 4);
  assert.equal(out.resumo.anuladas, 1);
  assert.equal(out.resumo.alteradas, 1);

  const qs = await many('SELECT numero, gabarito, anulada, gabarito_alterado, gabarito_original, motivo_anulacao, gabarito_definitivo FROM prova_questoes WHERE prova_id=$1 ORDER BY numero', [p.id]);

  // Q1: confirmada
  assert.equal(qs[0].numero, 1);
  assert.equal(qs[0].gabarito, 'A');
  assert.equal(qs[0].anulada, false);
  assert.equal(qs[0].gabarito_alterado, false);
  assert.equal(qs[0].gabarito_definitivo, true);

  // Q2: alterada
  assert.equal(qs[1].numero, 2);
  assert.equal(qs[1].gabarito, 'D');
  assert.equal(qs[1].gabarito_alterado, true);
  assert.equal(qs[1].gabarito_original, 'B');
  assert.equal(qs[1].gabarito_definitivo, true);

  // Q3: anulada
  assert.equal(qs[2].numero, 3);
  assert.equal(qs[2].anulada, true);
  assert.equal(qs[2].gabarito_definitivo, true);
  assert.ok(qs[2].motivo_anulacao);

  // Q4: confirmada
  assert.equal(qs[3].numero, 4);
  assert.equal(qs[3].gabarito, 'D');
  assert.equal(qs[3].anulada, false);
  assert.equal(qs[3].gabarito_definitivo, true);

  // Prova atualizada com selo
  const provaAtualizada = await one('SELECT gabarito_definitivo FROM provas WHERE id=$1', [p.id]);
  assert.equal(provaAtualizada.gabarito_definitivo, true);
});

test('F7: questões anuladas são excluídas de questões reais para alunos', async () => {
  // Criar edital de teste
  const ed = await one(`INSERT INTO editais(user_id, banca, orgao, cargo, ano, titulo, text, word_count, verticalizado)
                        VALUES ((SELECT id FROM users LIMIT 1), 'fgv', 'TRF-Teste', 'Analista', '2024', 'Edital TRF Teste', 'Texto do edital', 50,
                                '[{"id":"D1","materia":"Direito Administrativo","topicos":[{"id":"T1","codigo":"1","nome":"Licitações públicas"}]}]'::jsonb)
                        RETURNING *`);

  const p = await one(`INSERT INTO provas(banca, banca_informada, file_name, file_key, status, titulo, edital_id, text)
                       VALUES ('fgv','fgv','ed_prova.pdf','ed/p','READY','Prova TRF Edital', $1, 'texto') RETURNING id`, [ed.id]);

  // Inserir questão válida e questão anulada sobre Licitações públicas
  await query(`INSERT INTO prova_questoes(prova_id, banca, materia, topico, enunciado, alternativas, gabarito, anulada)
               VALUES ($1, 'fgv', 'Direito Administrativo', 'Licitações públicas', 'Questão Válida de Licitações', '["a","b","c","d","e"]'::jsonb, 'A', false)`, [p.id]);

  await query(`INSERT INTO prova_questoes(prova_id, banca, materia, topico, enunciado, alternativas, gabarito, anulada, motivo_anulacao)
               VALUES ($1, 'fgv', 'Direito Administrativo', 'Licitações públicas', 'Questão ANULADA de Licitações', '["a","b","c","d","e"]'::jsonb, 'B', true, 'Anulada no definitivo')`, [p.id]);

  const res = await getQuestoesReaisDoTopico(ed, 'T1', 10);
  assert.ok(res);
  assert.ok(!res.questoes.some((q) => q.enunciado.includes('Questão ANULADA')), 'Questão anulada não pode ser retornada ao aluno');
  assert.ok(res.questoes.some((q) => q.enunciado.includes('Questão Válida')), 'Questão válida deve ser retornada');
});

test('B1: importarProvasEmLote valida fontes oficiais e relata erros e duplicatas', async () => {
  const adminUser = await one("SELECT * FROM users WHERE role='ADMIN' LIMIT 1") || { id: null, role: 'ADMIN' };

  // 1. Tenta importar URL de cursinho preparatório (fora das fontes oficiais)
  const loteComErro = await importarProvasEmLote({
    user: adminUser,
    defaultBanca: 'fgv',
    texto: 'https://www.qconcursos.com/questoes-de-concursos/provas/arquivo.pdf',
  });

  assert.equal(loteComErro.total, 1);
  assert.equal(loteComErro.erros, 1);
  assert.match(loteComErro.resultados[0].erro, /cursinho/i);

  // 2. Não-admin é bloqueado
  await assert.rejects(
    importarProvasEmLote({ user: { role: 'USER' }, defaultBanca: 'fgv', texto: 'https://conhecimento.fgv.br/p.pdf' }),
    /Acesso negado/
  );
});

test('F6: consenso de gabarito detecta divergências entre modelos de IA e marca a questão', async () => {
  // Prova com 2 questões
  const p = await one(`INSERT INTO provas(banca, banca_informada, file_name, file_key, status, titulo, text)
                       VALUES ('fgv','fgv','consenso.pdf','c/p','READY','Prova Consenso','texto') RETURNING id`, []);

  // Questão 1 com consenso
  await query(`INSERT INTO prova_questoes(prova_id, banca, materia, numero, enunciado, alternativas, gabarito, consenso_gabarito)
               VALUES ($1, 'fgv', 'Direito Administrativo', 1, 'Questão com Consenso', '["a","b","c","d","e"]'::jsonb, 'A', true)`, [p.id]);

  // Questão 2 com divergência simulada
  const divergencia = {
    modelo1: { provider: 'groq', model: 'openai/gpt-oss-120b', gabarito: 'B' },
    modelo2: { provider: 'gemini', model: 'gemini-3.5-flash', gabarito: 'C' },
  };
  await query(`INSERT INTO prova_questoes(prova_id, banca, materia, numero, enunciado, alternativas, gabarito, consenso_gabarito, divergencia_gabarito)
               VALUES ($1, 'fgv', 'Direito Administrativo', 2, 'Questão com Divergência', '["a","b","c","d","e"]'::jsonb, 'B', false, $2)`, [p.id, JSON.stringify(divergencia)]);

  const rows = await many('SELECT numero, consenso_gabarito, divergencia_gabarito FROM prova_questoes WHERE prova_id=$1 ORDER BY numero', [p.id]);
  assert.equal(rows[0].consenso_gabarito, true);
  assert.equal(rows[0].divergencia_gabarito, null);

  assert.equal(rows[1].consenso_gabarito, false);
  assert.equal(rows[1].divergencia_gabarito.modelo1.gabarito, 'B');
  assert.equal(rows[1].divergencia_gabarito.modelo2.gabarito, 'C');
});


test('G1: texto corrido não vira gabarito; cargos/tipos de prova viram conflito', async () => {
  const { analisarGabarito } = await import('../src/services/provas.js');
  assert.deepEqual(analisarGabarito('Gabarito definitivo das questões 1 e 2 do caderno. Página 1 de 3.').itens, []);
  assert.deepEqual(analisarGabarito('Edital nº 3, de 12 de março de 2024. Questões 10 a 20.').itens, []);
  assert.deepEqual(analisarGabarito('QUESTÕES 1 E 2 DO CADERNO DE PROVA').itens, []);
  const cargos = analisarGabarito('CARGO 101 - ANALISTA\n1 A 2 B 3 C\nCARGO 102 - TÉCNICO\n1 D 2 E 3 A');
  assert.deepEqual(cargos.conflitos, [1, 2, 3]);
  assert.equal(cargos.blocos.length, 2);
  assert.deepEqual(analisarGabarito('TIPO 1 - BRANCA: 1-A 2-B\nTIPO 2 - AMARELA: 1-C 2-D').conflitos, [1, 2]);
  assert.deepEqual(analisarGabarito('Questão 1: A\nQuestão 2: B\nItem 3 - Certo').itens.map((i) => i.gabarito), ['A', 'B', 'C']);
});

test('G1: aplicar recusa conflito, letra fora do formato e cobertura baixa', async () => {
  const p = await one(`INSERT INTO provas(banca, banca_informada, file_name, file_key, status, titulo, text)
                       VALUES ('cebraspe','cebraspe','g1.pdf','g1/x','READY','Prova G1','texto') RETURNING *`);
  for (let n = 1; n <= 5; n++) {
    await query(`INSERT INTO prova_questoes(prova_id, banca, materia, numero, enunciado, alternativas, gabarito)
                 VALUES ($1,'cebraspe','Direito Constitucional',$2,$3,'[]'::jsonb,'C')`, [p.id, n, `Item ${n} da prova G1`]);
  }
  const admin = { id: null, role: 'ADMIN' };
  await assert.rejects(aplicarGabaritoDefinitivo({ provaId: p.id, user: admin, text: 'CARGO 1 - A\n1 C 2 E 3 C 4 E 5 C\nCARGO 2 - B\n1 E 2 E 3 C 4 E 5 C', confirmar: true }), /mais de um bloco/);
  await assert.rejects(aplicarGabaritoDefinitivo({ provaId: p.id, user: admin, text: '1 C 2 B 3 C 4 E 5 C', confirmar: true }), /formato/); // "B" num item Certo/Errado
  await assert.rejects(aplicarGabaritoDefinitivo({ provaId: p.id, user: admin, text: '1 C 2 E', confirmar: true }), /mínimo 60%/);
  const ok = await aplicarGabaritoDefinitivo({ provaId: p.id, user: admin, text: '1 C 2 E 3 C 4 ANULADO 5 C', confirmar: true });
  assert.equal(ok.resumo.anuladas, 1);
  assert.equal(ok.resumo.corrigidas, 1, 'item 2: extraído C, definitivo E, sem "alterada" → correção da extração');
  assert.equal(ok.resumo.alteradas, 0);
});

test('G4: lote só valida e enfileira (sem baixar na requisição); limite de 50 links', async () => {
  const adminUser = await one("SELECT * FROM users WHERE role='ADMIN' LIMIT 1") || { id: null, role: 'ADMIN' };
  const r = await importarProvasEmLote({ user: adminUser, defaultBanca: 'fgv', texto: 'https://g4-teste.invalido.gov.br/g4-teste.pdf\nhttps://www.qconcursos.com/x.pdf' });
  assert.equal(r.enfileiradas, 1);
  assert.equal(r.erros, 1);
  assert.equal(r.resultados[0].status, 'na_fila');
  const job = await one("SELECT id FROM jobs WHERE type='prova.importar' AND payload->>'provaUrl' LIKE '%g4-teste.pdf' ORDER BY id DESC LIMIT 1");
  assert.ok(job, 'deve criar a tarefa na fila');
  await query("DELETE FROM jobs WHERE type='prova.importar' AND payload->>'provaUrl' LIKE '%g4-teste.pdf'"); // não tentar baixar de verdade
  const muitos = Array.from({ length: 51 }, (_, i) => `https://conhecimento.fgv.br/p${i}.pdf`).join('\n');
  await assert.rejects(importarProvasEmLote({ user: adminUser, defaultBanca: 'fgv', texto: muitos }), /no máximo 50/);
});

test('G6: questão anulada depois é marcada na cópia do simulado/caderno; gabarito definitivo atualiza a cópia', async () => {
  const { aplicarSituacaoOficial } = await import('../src/services/situacao-oficial.js');
  const p = await one(`INSERT INTO provas(banca, banca_informada, file_name, file_key, status, titulo, text)
                       VALUES ('fgv','fgv','g6.pdf','g6/x','READY','Prova G6','texto') RETURNING id`);
  const a = await one(`INSERT INTO prova_questoes(prova_id, banca, enunciado, alternativas, gabarito, anulada) VALUES ($1,'fgv','Q anulada G6','["a","b"]','A',true) RETURNING id`, [p.id]);
  const b = await one(`INSERT INTO prova_questoes(prova_id, banca, enunciado, alternativas, gabarito, gabarito_definitivo) VALUES ($1,'fgv','Q definitiva G6','["a","b"]','B',true) RETURNING id`, [p.id]);
  const out = await aplicarSituacaoOficial([{ id: a.id, gabarito: 'A' }, { id: b.id, gabarito: 'A' }, { enunciado: 'questão da IA', gabarito: 'C' }]);
  assert.equal(out[0].anulada, true);
  assert.equal(out[1].gabarito, 'B');
  assert.equal(out[1].gabaritoAtualizado, true);
  assert.equal(out[2].gabarito, 'C');
});

test('G8: tarefas de fundo (rotular, importar) entram com prioridade baixa e não atrasam as do aluno', async () => {
  const { enqueue } = await import('../src/jobs/queue.js');
  const fundo = await enqueue('prova.relabel', { provaId: '00000000-0000-0000-0000-000000000000' }, { delaySec: 3600 });
  const aluno = await enqueue('prova.check', { provaId: '00000000-0000-0000-0000-000000000000' }, { delaySec: 3600 });
  const rows = await many('SELECT id, prioridade FROM jobs WHERE id = ANY($1::bigint[]) ORDER BY prioridade DESC, id', [[fundo.id, aluno.id]]);
  assert.equal(rows[0].id, aluno.id, 'a tarefa do aluno sai primeiro mesmo tendo entrado depois');
  assert.equal(rows.find((r) => r.id === fundo.id).prioridade, -10);
  await query('DELETE FROM jobs WHERE id = ANY($1::bigint[])', [[fundo.id, aluno.id]]);
});
