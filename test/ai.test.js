// Camada de IA: troca automática para o modelo reserva quando o principal falha/não está configurado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.AI_MOCK = 'false';
process.env.ANTHROPIC_API_KEY = '';
process.env.AI_MODEL_DETECT = 'groq:modelo-inexistente';   // sem GROQ_API_KEY → falha
process.env.AI_FALLBACK_DETECT = 'nvidia:modelo-inexistente,mock:simulado'; // múltiplos reservas em cadeia
process.env.AI_MAX_RETRIES = '1';
process.env.AI_FREE_CASCADE = 'true';                       // desligada por padrão; aqui ligamos de propósito
process.env.AI_FREE_GENERATE = 'true';
process.env.AI_PROVEDORES_GRATIS = 'nvidia,groq,gemini';
const { runJSON, runText, routeFor } = await import('../src/ai/index.js');
const { costUsd, isFreeModel } = await import('../src/ai/pricing.js');
const { config } = await import('../src/config.js');
const { detectSchema } = await import('../src/ai/schemas.js');

test('usa a cadeia de múltiplos modelos reserva quando os anteriores não estão disponíveis', async () => {
  assert.deepEqual(routeFor('detect').map((r) => r.provider), ['groq', 'nvidia', 'mock']);
  const { data, meta } = await runJSON('detect', { prompt: 'Material: atos administrativos e licitação na administração pública.' }, detectSchema);
  assert.equal(meta.fallback, true);
  assert.equal(meta.provider, 'mock');
  assert.equal(data.materia, 'Direito Administrativo');
});

test('cascata multi-agente gratuita prioriza provedores gratuitos configurados e tem custo US$ 0', () => {
  const prevGemini = config.ai.keys.gemini;
  config.ai.keys.gemini = undefined;
  config.ai.keys.fcc = 'token-fcc-local';
  config.ai.keys.nvidia = 'nvapi-1,nvapi-2';
  config.ai.keys.groq = 'gsk-1';
  try {
    const chain = routeFor('edital_parse');
    assert.equal(chain[0].provider, 'fcc');
    assert.equal(chain[1].provider, 'nvidia');
    assert.equal(chain[2].provider, 'groq');
    assert.equal(isFreeModel(chain[0].model, chain[0].provider), true);
    assert.equal(costUsd(chain[1].model, 500_000, 100_000, 0, false, chain[1].provider), 0);
    assert.equal(costUsd('openrouter/free', 500_000, 100_000, 0, false, 'openrouter'), 0);
    assert.equal(costUsd('gemini-2.5-flash', 500_000, 100_000, 0, false, 'gemini'), 0);
  } finally {
    config.ai.keys.fcc = undefined;
    config.ai.keys.nvidia = undefined;
    config.ai.keys.groq = undefined;
    config.ai.keys.gemini = prevGemini;
  }
});

test('orquestração multi-agente Groq + Gemini: tarefas rápidas vão para Groq, tarefas profundas vão para Gemini', () => {
  config.ai.keys.gemini = 'gemini-test-key';
  config.ai.keys.groq = 'groq-test-key';
  try {
    const checkChain = routeFor('prova_check');
    assert.equal(checkChain[0].provider, 'groq');
    assert.equal(checkChain[0].model, 'openai/gpt-oss-20b');
    assert.equal(checkChain[1].provider, 'gemini');
    assert.equal(checkChain[1].model, 'gemini-3.5-flash-lite');

    const generateChain = routeFor('generate');
    assert.equal(generateChain[0].provider, 'gemini');
    assert.equal(generateChain[0].model, 'gemini-3.5-flash');
    assert.equal(generateChain[1].provider, 'groq');
    assert.equal(generateChain[1].model, 'openai/gpt-oss-120b');

    const reviewChain = routeFor('review');
    assert.equal(reviewChain[0].provider, 'groq');
    assert.equal(reviewChain[1].provider, 'gemini');

    const provaAnalysisChain = routeFor('prova_analysis');
    assert.equal(provaAnalysisChain[0].provider, 'gemini');
    assert.equal(provaAnalysisChain[1].provider, 'groq');
  } finally {
    config.ai.keys.gemini = undefined;
    config.ai.keys.groq = undefined;
  }
});

test('gratuidade é declarada: provedor fora de AI_PROVEDORES_GRATIS é cobrado (preço padrão, conservador)', () => {
  const prev = config.ai.freeProviders;
  config.ai.freeProviders = ['groq'];
  try {
    assert.equal(costUsd('openai/gpt-oss-20b', 1_000_000, 0, 0, false, 'groq'), 0);
    assert.equal(isFreeModel('gemini-3.5-flash', 'gemini'), false);          // chave Gemini paga não fica invisível
    assert.equal(costUsd('gemini-3.5-flash', 1_000_000, 0, 0, false, 'gemini'), 2);
    assert.equal(costUsd('meta-llama/llama-3.3-70b-instruct:free', 1_000_000, 0, 0, false, 'openrouter'), 0);
    assert.equal(costUsd('qualquer', 1_000_000, 0, 0, false, 'mock'), 0);
  } finally { config.ai.freeProviders = prev; }
});

test('revisor evita o provedor que gerou as questões (avoidProvider)', async () => {
  // detect: groq (sem chave) → nvidia (sem chave) → mock. Evitando "mock", ele vai para o fim, mas ainda atende se for o único
  const out = await runText('detect', { prompt: 'Material: licitação.', avoidProvider: 'mock', maxTokens: 50 });
  assert.equal(out.provider, 'mock');
  config.ai.keys.gemini = 'gemini-test-key';
  config.ai.keys.groq = 'groq-test-key';
  try {
    assert.equal(routeFor('review')[0].model, 'openai/gpt-oss-120b'); // revisor no modelo forte
  } finally {
    config.ai.keys.gemini = undefined;
    config.ai.keys.groq = undefined;
  }
});
