import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRevisao, paraRevisarHoje, rotuloFase, resumoRevisao } from '../src/lib/revisao-espacada.js';
import { promptGenerate } from '../src/lib/prompts.js';

test('revisao-espacada: acerto na 1ª vez sem histórico de erro não entra no ciclo de revisão', () => {
  const r = calcularRevisao({ estadoAnterior: null, acerto: true });
  assert.equal(r, null);
});

test('revisao-espacada: erro na 1ª vez entra na Fase 1 com intervalo de 1 dia', () => {
  const t0 = new Date('2026-11-02T12:00:00Z');
  const r = calcularRevisao({ estadoAnterior: null, acerto: false, data: t0 });

  assert.equal(r.fase, 1);
  assert.equal(r.intervaloDias, 1);
  assert.equal(r.dominada, false);
  assert.equal(r.acertosSeguidos, 0);
  assert.equal(r.vezesErrada, 1);
  assert.equal(r.proximaRevisao, new Date('2026-11-03T12:00:00Z').toISOString());
});

test('revisao-espacada: ciclo de acertos avança 1d -> 3d -> 7d -> 15d -> Dominada', () => {
  const t0 = new Date('2026-11-02T12:00:00Z');
  // Erro inicial (Fase 1, 1d)
  const e1 = calcularRevisao({ estadoAnterior: null, acerto: false, data: t0 });
  assert.equal(e1.fase, 1);

  // 1º acerto na revisão (Fase 2, 3d)
  const t1 = new Date('2026-11-03T12:00:00Z');
  const e2 = calcularRevisao({ estadoAnterior: e1, acerto: true, data: t1 });
  assert.equal(e2.fase, 2);
  assert.equal(e2.intervaloDias, 3);
  assert.equal(e2.acertosSeguidos, 1);
  assert.equal(e2.proximaRevisao, new Date('2026-11-06T12:00:00Z').toISOString());

  // 2º acerto (Fase 3, 7d)
  const t2 = new Date('2026-11-06T12:00:00Z');
  const e3 = calcularRevisao({ estadoAnterior: e2, acerto: true, data: t2 });
  assert.equal(e3.fase, 3);
  assert.equal(e3.intervaloDias, 7);
  assert.equal(e3.acertosSeguidos, 2);
  assert.equal(e3.proximaRevisao, new Date('2026-11-13T12:00:00Z').toISOString());

  // 3º acerto (Fase 4, 15d)
  const t3 = new Date('2026-11-13T12:00:00Z');
  const e4 = calcularRevisao({ estadoAnterior: e3, acerto: true, data: t3 });
  assert.equal(e4.fase, 4);
  assert.equal(e4.intervaloDias, 15);
  assert.equal(e4.acertosSeguidos, 3);
  assert.equal(e4.proximaRevisao, new Date('2026-11-28T12:00:00Z').toISOString());

  // 4º acerto (Fase 5, Dominada)
  const t4 = new Date('2026-11-28T12:00:00Z');
  const e5 = calcularRevisao({ estadoAnterior: e4, acerto: true, data: t4 });
  assert.equal(e5.fase, 5);
  assert.equal(e5.dominada, true);
  assert.equal(e5.intervaloDias, null);
  assert.equal(e5.proximaRevisao, null);
  assert.equal(e5.acertosSeguidos, 4);
});

test('revisao-espacada: erro durante o ciclo reinicia para Fase 1 (1 dia)', () => {
  const t0 = new Date('2026-11-02T12:00:00Z');
  const e1 = calcularRevisao({ estadoAnterior: null, acerto: false, data: t0 });
  const e2 = calcularRevisao({ estadoAnterior: e1, acerto: true, data: new Date('2026-11-03T12:00:00Z') }); // Fase 2
  assert.equal(e2.fase, 2);

  // Errou na revisão da Fase 2: volta imediatamente para Fase 1
  const tRecaida = new Date('2026-11-06T12:00:00Z');
  const recaida = calcularRevisao({ estadoAnterior: e2, acerto: false, data: tRecaida });
  assert.equal(recaida.fase, 1);
  assert.equal(recaida.intervaloDias, 1);
  assert.equal(recaida.acertosSeguidos, 0);
  assert.equal(recaida.vezesErrada, 2);
  assert.equal(recaida.proximaRevisao, new Date('2026-11-07T12:00:00Z').toISOString());
});

test('revisao-espacada: paraRevisarHoje e rotuloFase', () => {
  const passado = { dominada: false, proximaRevisao: '2026-11-01T00:00:00Z' };
  const futuro = { dominada: false, proximaRevisao: '2026-11-10T00:00:00Z' };
  const dominada = { dominada: true, proximaRevisao: null };
  const hoje = new Date('2026-11-02T12:00:00Z');

  assert.equal(paraRevisarHoje(passado, hoje), true);
  assert.equal(paraRevisarHoje(futuro, hoje), false);
  assert.equal(paraRevisarHoje(dominada, hoje), false);

  assert.equal(rotuloFase(1, 1), 'Fase 1 (1d)');
  assert.equal(rotuloFase(3, 7), 'Fase 3 (7d)');
  assert.equal(rotuloFase(5, null), '✔ Dominada');
});

test('revisao-espacada: resumoRevisao totaliza ativas, pendentes hoje e dominadas', () => {
  const mapa = {
    'set:1:0': { fase: 1, dominada: false, proximaRevisao: '2026-11-01T00:00:00Z' },
    'set:1:1': { fase: 2, dominada: false, proximaRevisao: '2026-11-10T00:00:00Z' },
    'set:1:2': { fase: 5, dominada: true, proximaRevisao: null },
  };
  const hoje = new Date('2026-11-02T12:00:00Z');
  const res = resumoRevisao(mapa, hoje);

  assert.equal(res.ativas, 2);
  assert.equal(res.hoje, 1);
  assert.equal(res.dominadas, 1);
});

test('Q3: promptGenerate injeta pegadinhas, comandos e leis reais da base no system prompt', () => {
  const mockKnowledge = {
    provas: 4,
    caracteristicas: ['enunciados longos'],
    padroes: ['situação hipotética'],
    pegadinhas: ['troca de prazo'],
    pegadinhasReais: ['inversao_sujeito', 'regra_x_excecao'],
    comandosReais: ['Julgue o item a seguir', 'Assinale a opção correta'],
    dispositivosReais: ['CF art. 5º', 'Lei 8.112/90'],
    exemplos: [],
  };

  const p = promptGenerate({
    banca: 'cebraspe',
    materia: 'Direito Constitucional',
    assunto: 'Direitos Fundamentais',
    nivel: 'Médio',
    qtd: 3,
    knowledge: mockKnowledge,
    text: 'Art. 5º Todos são iguais perante a lei...',
  });

  assert.ok(p.system.includes('COMO A BANCA ARMA AS PEGADINHAS NESTA MATÉRIA'));
  assert.ok(p.system.includes('inversao_sujeito'));
  assert.ok(p.system.includes('COMANDOS DE QUESTÃO MAIS USADOS PELA BANCA'));
  assert.ok(p.system.includes('Julgue o item a seguir'));
  assert.ok(p.system.includes('LEIS E DISPOSITIVOS MAIS COBRADOS'));
  assert.ok(p.system.includes('CF art. 5º'));
  // Texto extraído de provas enviadas por usuários entra isolado por untrusted() (regra do projeto)
  assert.match(p.system, /LEIS E DISPOSITIVOS MAIS COBRADOS[^\n]*\n<<INICIO-[a-f0-9]+>>[\s\S]*CF art\. 5º[\s\S]*<<FIM-[a-f0-9]+>>/);
});

test('C4: revisão vence por dia (Brasília) e erro antigo sem ciclo entra na Fase 1', async () => {
  const { estadoEfetivo } = await import('../src/lib/revisao-espacada.js');
  // Errou às 20h (Brasília) de 02/11 → revisão 03/11 às 20h; às 08h do dia 03 já aparece (conta por dia)
  const e1 = calcularRevisao({ estadoAnterior: null, acerto: false, data: new Date('2026-11-02T23:00:00Z') });
  assert.equal(paraRevisarHoje(e1, new Date('2026-11-03T11:00:00Z')), true);
  assert.equal(paraRevisarHoje(e1, new Date('2026-11-02T23:30:00Z')), false);
  // Erro antigo, sem estado gravado
  const ef = estadoEfetivo(null, 'B', 'A');
  assert.equal(ef.fase, 1);
  assert.equal(paraRevisarHoje(ef), true);
  assert.equal(estadoEfetivo(null, 'A', 'A'), null);
  assert.equal(estadoEfetivo(null, null, 'A'), null);
  // Acertar na revisão uma questão que vinha de erro antigo avança para a Fase 2
  assert.equal(calcularRevisao({ estadoAnterior: ef, acerto: true }).fase, 2);
});
