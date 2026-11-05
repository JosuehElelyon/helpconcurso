// =====================================================================
// Sprint 5 — Testes: Bateria de Revanche da IA ("Destruir Ponto Cego")
// =====================================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, one } from '../src/db.js';
import { promptRevanche } from '../src/lib/prompts.js';
import { aplicarVitoriaRevanche } from '../src/services/revanche.js';

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

test('aplicarVitoriaRevanche avança só as questões-base, com estado coerente da revisão espaçada', async () => {
  const user = await getOrCreateTestUser();
  const hoje = new Date().toISOString();
  const caderno = await one(
    `INSERT INTO cadernos (user_id, titulo, banca, revisao_espacada) VALUES ($1, 'Caderno Revanche', 'fgv', $2) RETURNING *`,
    [user.id, JSON.stringify({
      'set:orig-123:0': { fase: 1, intervaloDias: 1, acertosSeguidos: 0, proximaRevisao: hoje, dominada: false },
      'set:orig-123:1': { fase: 1, intervaloDias: 1, acertosSeguidos: 0, proximaRevisao: hoje, dominada: false },
    })]
  );

  const n = await aplicarVitoriaRevanche({ userId: user.id, cadernoId: caderno.id, keys: ['set:orig-123:0'] });
  assert.equal(n, 1);
  const { revisao_espacada: m } = await one('SELECT revisao_espacada FROM cadernos WHERE id=$1', [caderno.id]);
  const q = m['set:orig-123:0'];
  assert.equal(q.revancheVencida, true);
  assert.equal(q.fase, 2);
  assert.equal(q.intervaloDias, 3, 'a fase 2 revisa em 3 dias');
  assert.equal(q.acertosSeguidos, 1);
  assert.ok(new Date(q.proximaRevisao) > new Date(Date.now() + 2 * 86400000), 'próxima revisão empurrada para frente');
  assert.equal(m['set:orig-123:1'].fase, 1, 'questão que não era base da revanche não muda');

  // Caderno de outro aluno não é tocado
  const n2 = await aplicarVitoriaRevanche({ userId: '00000000-0000-0000-0000-000000000000', cadernoId: caderno.id, keys: ['set:orig-123:1'] });
  assert.equal(n2, 0);
});
