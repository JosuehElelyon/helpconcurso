// =====================================================================
// Sprint 5 — Testes: Radar de Desempenho Visual, Produtividade e Horas Estudadas
// =====================================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, one, query } from '../src/db.js';
import { obterDesempenhoCompleto, formatarTempo, formatarVelocidade } from '../src/services/desempenho.js';

after(() => pool.end());

const RUN = Date.now().toString(36);

async function getOrCreateTestUser(role = 'USER') {
  const email = `aluno-desemp-${RUN}@teste.com`;
  let u = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!u) {
    u = await one(
      `INSERT INTO users (name, email, password_hash, role, plano, meta_diaria, concurso_alvo)
       VALUES ($1, $2, 'hash', $3, 'aprovacao', 20, 'Analista Judiciário') RETURNING *`,
      [`Aluno Visual ${RUN}`, email, role]
    );
  }
  return u;
}

test('Formatadores de tempo e velocidade funcionam com precisão', () => {
  assert.equal(formatarTempo(0), '0s');
  assert.equal(formatarTempo(45), '45s');
  assert.equal(formatarTempo(135), '2min 15s');
  assert.equal(formatarTempo(3660), '1h 1min');
  assert.equal(formatarTempo(7325), '2h 2min');

  assert.equal(formatarVelocidade(0), '0s');
  assert.equal(formatarVelocidade(50), '50s');
  assert.equal(formatarVelocidade(105), '1m 45s');
  assert.equal(formatarVelocidade(180), '3m 0s');
});

test('obterDesempenhoCompleto retorna estrutura completa mesmo para usuário sem dados (zero-safe)', async () => {
  const user = await getOrCreateTestUser();
  const d = await obterDesempenhoCompleto(user);

  assert.ok(d.resumo);
  assert.equal(d.resumo.totalRespondidas >= 0, true);
  assert.equal(d.resumo.totalAcertos >= 0, true);
  assert.equal(d.resumo.totalErros >= 0, true);
  assert.equal(typeof d.resumo.tempoFormatado, 'string');
  assert.equal(typeof d.resumo.mediaVelocidadeFormatada, 'string');
  assert.equal(typeof d.resumo.diagnostico, 'string');

  assert.ok(Array.isArray(d.evolucao));
  assert.equal(d.evolucao.length, 14); // 14 dias
  assert.ok(d.evolucao[0].label);

  assert.ok(Array.isArray(d.disciplinas));
  assert.ok(d.radar);
  assert.ok(d.radar.quadrantes);
  assert.ok(Array.isArray(d.radar.quadrantes.perigo));
  assert.ok(Array.isArray(d.radar.quadrantes.fortaleza));
});

test('obterDesempenhoCompleto consolida tempo gasto, taxa de acerto e evolução diária', async () => {
  const user = await getOrCreateTestUser();

  // Insere atividade diária para hoje e ontem
  await query(
    `INSERT INTO atividade_diaria (user_id, dia, respondidas, acertos)
     VALUES ($1, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 15, 12)
     ON CONFLICT (user_id, dia) DO UPDATE SET respondidas = 15, acertos = 12`,
    [user.id]
  );

  await query(
    `INSERT INTO atividade_diaria (user_id, dia, respondidas, acertos)
     VALUES ($1, (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1, 10, 8)
     ON CONFLICT (user_id, dia) DO UPDATE SET respondidas = 10, acertos = 8`,
    [user.id]
  );

  // Insere um simulado com tempo gasto registrado
  const questoes = [
    { numero: 1, materia: 'Direito Constitucional', enunciado: 'Q1', alternativas: ['A', 'B'], gabarito: 'A' },
    { numero: 2, materia: 'Direito Constitucional', enunciado: 'Q2', alternativas: ['A', 'B'], gabarito: 'B' },
    { numero: 3, materia: 'Direito Administrativo', enunciado: 'Q3', alternativas: ['A', 'B'], gabarito: 'A' },
  ];

  await query(
    `INSERT INTO question_sets (
       user_id, banca, materia, assunto, nivel, formato, questoes, respostas, finalizado,
       modo_prova, tempo_limite_minutos, tempo_gasto_segundos
     ) VALUES (
       $1, 'fgv', 'Direito Constitucional', 'Direitos Fundamentais', 'Médio', 'me', $2, $3, true,
       true, 60, 360
     )`,
    [user.id, JSON.stringify(questoes), JSON.stringify({ 0: 'A', 1: 'B', 2: 'B' })] // 2 acertos, 1 erro
  );

  const d = await obterDesempenhoCompleto(user);

  assert.ok(d.resumo.totalRespondidas >= 25);
  assert.ok(d.resumo.totalAcertos >= 20);
  assert.ok(d.resumo.totalTempoSegundos >= 360);
  assert.ok(d.resumo.simuladosConcluidos >= 1);
  assert.ok(d.resumo.simuladosModoProva >= 1);
  assert.ok(d.resumo.mediaSegundosPorQuestao > 0);

  // Verifica que o dia de hoje tem 15 respondidas e 12 acertos
  const hojeItem = d.evolucao[d.evolucao.length - 1];
  assert.equal(hojeItem.respondidas, 15);
  assert.equal(hojeItem.acertos, 12);
  assert.equal(hojeItem.taxaPct, 80);

  // Verifica disciplinas consolidadas
  assert.ok(d.disciplinas.length > 0);
  const dc = d.disciplinas.find((x) => x.materia.includes('Constitucional'));
  assert.ok(dc, 'Deve conter Direito Constitucional');
  assert.ok(dc.questoesRespondidas >= 2);
  assert.ok(dc.questoesAcertos >= 2);
});

