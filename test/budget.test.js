// Custo da IA e limite diário de gasto (AI_LIMITE_USD_DIA).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.AI_MOCK = 'false';
process.env.AI_MODEL_DETECT = 'mock:simulado';
process.env.AI_FALLBACK_DETECT = '';
process.env.AI_LIMITE_USD_DIA = '0.05';
const { pool, migrate, query } = await import('../src/db.js');
const { runJSON, _resetBudgetCache } = await import('../src/ai/index.js');
const { costUsd } = await import('../src/ai/pricing.js');
const { detectSchema } = await import('../src/ai/schemas.js');
const { config } = await import('../src/config.js');

await migrate();
after(() => pool.end());

test('custo usa os preços por modelo, com desconto de cache e de lote', () => {
  assert.equal(costUsd('claude-sonnet-5-5', 1_000_000, 0), 2);
  assert.equal(costUsd('claude-sonnet-5-5', 0, 1_000_000), 10);
  assert.equal(costUsd('claude-haiku-5-5', 1_000_000, 1_000_000), 0.6);
  // Anthropic: input_tokens já exclui o cache; leitura (0,1×) e escrita (1,25×) são parcelas à parte
  assert.equal(costUsd('claude-sonnet-5-5', 0, 0, 1_000_000), 0.2);                       // tudo lido do cache
  assert.equal(costUsd('claude-sonnet-5-5', 1_000_000, 0, 1_000_000), 2.2);               // não desconta a leitura da entrada
  assert.equal(costUsd('claude-sonnet-5-5', 0, 0, 0, false, 'anthropic', 1_000_000), 2.5); // escrita no cache = 1,25×
  assert.equal(costUsd('claude-sonnet-5-5', 0, 1_000_000, 0, true), 5);     // lote = metade
});

test('limite diário: abaixo do teto chama a IA; acima, bloqueia só modelos pagos (code=budget)', async () => {
  await query("DELETE FROM ai_usage WHERE task='teste_limite'");
  const ok = await runJSON('detect', { prompt: 'Material: atos administrativos e licitação.' }, detectSchema);
  assert.equal(ok.data.materia, 'Direito Administrativo');

  // US$ 0,10 gastos hoje (10 mil tokens de saída no Sonnet) > limite de US$ 0,05
  await query("INSERT INTO ai_usage(task,provider,model,input_tokens,output_tokens,ok) VALUES ('teste_limite','anthropic','claude-sonnet-5-5',0,10000,true)");
  try {
    _resetBudgetCache(); // o gasto do dia fica em cache por 60 s; força nova leitura

    // Modelo grátis (mock) continua atendendo mesmo acima do teto
    const gratis = await runJSON('detect', { prompt: 'Material: atos administrativos.' }, detectSchema);
    assert.equal(gratis.meta.provider, 'mock');
    // Modelo pago é bloqueado com code=budget
    Object.assign(config.ai.tasks.detect, { primary: 'anthropic:claude-haiku-5-5', fallback: null });
    await assert.rejects(runJSON('detect', { prompt: 'Material: atos administrativos.' }, detectSchema), (e) => e.code === 'budget');
  } finally {
    Object.assign(config.ai.tasks.detect, { primary: 'mock:simulado', fallback: null });
    await query("DELETE FROM ai_usage WHERE task='teste_limite'");
  }
});
