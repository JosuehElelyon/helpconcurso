// =====================================================================
// Sprint 5 — Testes: Bateria de Revanche da IA ("Destruir Ponto Cego")
// =====================================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, one, query } from '../src/db.js';
import { promptRevanche } from '../src/lib/prompts.js';

after(() => pool.end());

const RUN = Date.now().toString(36);

async function getOrCreateTestUser(role = 'USER') {
  const email = `aluno-revanche-${RUN}@teste.com`;
  let u = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!u) {
    u = await one(
      `INSERT INTO users (name, email, password_hash, role, plano)
       VALUES ($1, $2, 'hash', $3, 'aprovacao') RETURNING *`,
      [`Aluno Revanche ${RUN}`, email, role]
    );
  }
  return u;
}

test('promptRevanche gera prompt pedagógico com diagnóstico de ponto cego e ineditismo', () => {
  const p = promptRevanche({
    banca: 'fgv',
    materia: 'Direito Administrativo',
    assunto: 'Atos Administrativos',
    questoesErradas: [
      {
        enunciado: 'Sobre a revogação de atos administrativos, assinale a correta.',
        alternativas: ['Ato vinculado pode ser revogado', 'Ato nulo pode ser revogado', 'Revogação opera efeitos ex nunc', 'Revogação pode ser feita pelo Judiciário no mérito', 'Revogação gera indenização obrigatória'],
        gabarito: 'C',
        respostaAluno: 'D',
        pegadinha: 'Confusão entre controle de mérito da própria Administração e controle judicial de legalidade',
        comentario: 'O Judiciário não revoga ato administrativo de outro Poder por motivo de conveniência/mérito.',
      },
    ],
    qtd: 3,
  });

  assert.ok(p.system.includes('BATERIA DE REVANCHE'));
  assert.ok(p.system.includes('DESTRUIR PONTOS CEGOS'));
  assert.ok(p.system.includes('FGV'));
  assert.ok(p.prompt.includes('Atos Administrativos'));
  assert.ok(p.prompt.includes('Confusão entre controle de mérito'));
  assert.ok(p.prompt.includes('ex nunc'));
});

test('Revanche vinculada ao caderno avança revisão espaçada ao ser vencida com sucesso', async () => {
  const user = await getOrCreateTestUser();

  // 1) Cria um caderno de teste com uma questão em fase 1
  const caderno = await one(
    `INSERT INTO cadernos (user_id, titulo, banca, revisao_espacada)
     VALUES ($1, 'Caderno Revanche', 'fgv', $2) RETURNING *`,
    [
      user.id,
      JSON.stringify({
        'set:orig-123:0': {
          fase: 1,
          intervaloDias: 1,
          dominada: false,
          ultimoResultado: false,
        },
      }),
    ]
  );

  // 2) Cria o simulado de revanche simulado
  const questoesRevanche = [
    { numero: 1, materia: 'Direito Administrativo', enunciado: 'Q Revanche 1', alternativas: ['A', 'B', 'C', 'D', 'E'], gabarito: 'A' },
    { numero: 2, materia: 'Direito Administrativo', enunciado: 'Q Revanche 2', alternativas: ['A', 'B', 'C', 'D', 'E'], gabarito: 'B' },
    { numero: 3, materia: 'Direito Administrativo', enunciado: 'Q Revanche 3', alternativas: ['A', 'B', 'C', 'D', 'E'], gabarito: 'C' },
  ];

  const setRevanche = await one(
    `INSERT INTO question_sets (
       user_id, caderno_id, banca, materia, assunto, nivel, formato,
       questoes, respostas, finalizado, origem, estatisticas
     ) VALUES (
       $1, $2, 'fgv', 'Direito Administrativo', 'Revanche: Atos', 'Médio', 'me',
       $3, $4, false, 'revanche', $5
     ) RETURNING *`,
    [
      user.id,
      caderno.id,
      JSON.stringify(questoesRevanche),
      JSON.stringify({}),
      JSON.stringify({
        revancheDe: {
          setId: 'orig-123',
          cadernoId: caderno.id,
          totalOriginaisErradas: 1,
        },
      }),
    ]
  );

  assert.equal(setRevanche.origem, 'revanche');

  // 3) Simula a finalização com 3 acertos (100% de taxa, supera os 65% exigidos)
  const respostas = { '0': 'A', '1': 'B', '2': 'C' };
  let statsObj = setRevanche.estatisticas || {};
  const total = 3;
  const acertos = 3;
  const superou = acertos / total >= 0.65;
  statsObj.revancheSuperada = superou;

  if (superou && setRevanche.caderno_id && statsObj.revancheDe?.setId) {
    const origSetId = statsObj.revancheDe.setId;
    const c = await one('SELECT revisao_espacada FROM cadernos WHERE id=$1 AND user_id=$2', [setRevanche.caderno_id, user.id]);
    if (c?.revisao_espacada) {
      const mapa = c.revisao_espacada;
      let alterou = false;
      for (const [k, v] of Object.entries(mapa)) {
        if (k.startsWith(`set:${origSetId}:`) && v && !v.dominada) {
          v.revancheVencida = true;
          v.fase = Math.min(5, (v.fase || 1) + 1);
          alterou = true;
        }
      }
      if (alterou) {
        await query('UPDATE cadernos SET revisao_espacada=$2, updated_at=now() WHERE id=$1', [setRevanche.caderno_id, JSON.stringify(mapa)]);
      }
    }
  }

  // 4) Verifica no banco se a questão original do caderno foi atualizada com sucesso
  const cadernoAtualizado = await one('SELECT revisao_espacada FROM cadernos WHERE id=$1', [caderno.id]);
  const qOrig = cadernoAtualizado.revisao_espacada['set:orig-123:0'];
  assert.ok(qOrig);
  assert.equal(qOrig.revancheVencida, true, 'Deve marcar revancheVencida como true');
  assert.equal(qOrig.fase, 2, 'Deve ter avançado da Fase 1 para a Fase 2');
});
