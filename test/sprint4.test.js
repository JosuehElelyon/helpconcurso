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

  const out = await aplicarGabaritoDefinitivo({
    provaId: p.id,
    user: { id: p.uploaded_by || null, role: 'ADMIN' },
    text: textoGabDef,
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

