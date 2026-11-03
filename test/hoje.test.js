// Tela "Hoje" (sequência de dias, contagem de respostas novas) e situação oficial em lote
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularSequencia, contarNovas } from '../src/services/atividade.js';
import { migrate, one } from '../src/db.js';

test('calcularSequencia: conta até hoje, ou até ontem se hoje ainda não estudou; recorde é a maior corrida', () => {
  assert.deepEqual(calcularSequencia([], '2026-11-03'), { atual: 0, recorde: 0 });
  assert.deepEqual(calcularSequencia(['2026-11-03', '2026-11-02', '2026-11-01'], '2026-11-03'), { atual: 3, recorde: 3 });
  // hoje ainda sem estudo: a sequência de ontem continua valendo
  assert.deepEqual(calcularSequencia(['2026-11-02', '2026-11-01'], '2026-11-03'), { atual: 2, recorde: 2 });
  // furou anteontem: zera, mas o recorde fica
  assert.deepEqual(calcularSequencia(['2026-11-01', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'], '2026-11-03'), { atual: 0, recorde: 4 });
  // virada de mês
  assert.equal(calcularSequencia(['2026-12-01', '2026-11-30', '2026-11-29'], '2026-12-01').atual, 3);
});

test('contarNovas: só respostas novas contam; acerto pelo gabarito da questão', () => {
  const qs = [{ gabarito: 'A' }, { gabarito: 'B' }, { gabarito: 'C' }];
  assert.deepEqual(contarNovas(qs, {}, { 0: 'A', 1: 'C' }), { respondidas: 2, acertos: 1 });
  assert.deepEqual(contarNovas(qs, { 0: 'A' }, { 0: 'A', 2: 'C' }), { respondidas: 1, acertos: 1 });
  assert.deepEqual(contarNovas(qs, { 0: 'A' }, {}), { respondidas: 0, acertos: 0 });
});

test('carregarSituacaoOficial: uma consulta para várias listas marca anulada e gabarito definitivo', async () => {
  await migrate();
  const { carregarSituacaoOficial } = await import('../src/services/situacao-oficial.js');
  const p = await one(`INSERT INTO provas(banca, banca_informada, file_name, file_key, status, titulo, text)
                       VALUES ('fgv','fgv','hoje.pdf','hoje/x','READY','Prova Hoje','texto') RETURNING id`);
  const a = await one(`INSERT INTO prova_questoes(prova_id, banca, enunciado, alternativas, gabarito, anulada) VALUES ($1,'fgv','Q anulada','["a","b"]','A',true) RETURNING id`, [p.id]);
  const b = await one(`INSERT INTO prova_questoes(prova_id, banca, enunciado, alternativas, gabarito, gabarito_definitivo) VALUES ($1,'fgv','Q definitiva','["a","b"]','B',true) RETURNING id`, [p.id]);
  const lista1 = [{ id: a.id, gabarito: 'A' }, { enunciado: 'da IA', gabarito: 'C' }];
  const lista2 = [{ id: b.id, gabarito: 'A' }];
  const aplicar = await carregarSituacaoOficial([lista1, lista2, null]);
  assert.equal(aplicar(lista1)[0].anulada, true);
  assert.equal(aplicar(lista1)[1].anulada, undefined);
  assert.equal(aplicar(lista2)[0].gabarito, 'B');
  assert.equal(aplicar(lista2)[0].gabaritoAtualizado, true);
  assert.deepEqual(aplicar(null), []);
});
