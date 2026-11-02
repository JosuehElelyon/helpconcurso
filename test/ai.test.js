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
const { runJSON, runText, routeFor, isOpen, tripBreaker, _resetBreakers } = await import('../src/ai/index.js');
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
  const prevOr = config.ai.keys.openrouter;
  config.ai.keys.openrouter = undefined;
  try {
    // edital_parse prefere gemini → groq → openrouter; os demais grátis vêm depois, na ordem do catálogo
    const chain = routeFor('edital_parse');
    assert.equal(chain[0].provider, 'groq');
    assert.equal(chain[1].provider, 'fcc');
    assert.equal(chain[2].provider, 'nvidia');
    assert.equal(isFreeModel(chain[0].model, chain[0].provider), true);
    assert.equal(costUsd(chain[1].model, 500_000, 100_000, 0, false, chain[1].provider), 0);
    assert.equal(costUsd('openrouter/free', 500_000, 100_000, 0, false, 'openrouter'), 0);
    assert.equal(costUsd('gemini-2.5-flash', 500_000, 100_000, 0, false, 'gemini'), 0);
  } finally {
    config.ai.keys.fcc = undefined;
    config.ai.keys.nvidia = undefined;
    config.ai.keys.groq = undefined;
    config.ai.keys.gemini = prevGemini;
    config.ai.keys.openrouter = prevOr;
  }
});

test('dados do aluno só vão para provedores privados; provas e editais usam a cascata grátis', () => {
  config.ai.keys.gemini = 'gemini-test-key';
  config.ai.keys.groq = 'groq-test-key';
  const prevOr = config.ai.keys.openrouter;
  config.ai.keys.openrouter = undefined;
  try {
    // Público: triagem rápida no Groq, extração no Gemini, análise de estilo com Sonnet primeiro (pagoPrimeiro)
    const check = routeFor('prova_check');
    assert.deepEqual(check.slice(0, 2).map((r) => `${r.provider}:${r.model}`), ['groq:openai/gpt-oss-20b', 'gemini:gemini-3.5-flash-lite']);
    assert.equal(routeFor('prova_extract')[0].provider, 'gemini');
    const analysis = routeFor('prova_analysis');
    assert.equal(`${analysis[0].provider}:${analysis[0].model}`, 'anthropic:claude-sonnet-5-5');
    assert.equal(analysis[1].provider, 'gemini');
    assert.equal(routeFor('edital_parse')[0].provider, 'gemini');

    // Aluno: só Claude — o barato escreve, o forte confere
    // (detect fica de fora: neste arquivo ele foi forçado no .env — AI_MODEL_DETECT — e escolha explícita vale como está)
    for (const task of ['generate', 'review', 'edital_match', 'report_check', 'json_repair']) {
      assert.ok(routeFor(task).every((r) => r.provider === 'anthropic'), `${task} não pode usar provedor grátis`);
    }
    assert.equal(routeFor('generate')[0].model, 'claude-haiku-5-5');
    assert.equal(routeFor('review')[0].model, 'claude-sonnet-5-5');
    // json_repair herda: conserto de JSON de prova pública pode usar o grátis
    assert.equal(routeFor('json_repair', { dados: 'publico' })[0].provider, 'groq');

    // Com faturamento no Google, basta autorizar o gemini
    config.ai.privateProviders = ['anthropic', 'gemini'];
    assert.equal(routeFor('generate')[0].provider, 'gemini');
  } finally {
    config.ai.privateProviders = ['anthropic'];
    config.ai.keys.gemini = undefined;
    config.ai.keys.groq = undefined;
    config.ai.keys.openrouter = prevOr;
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

test('revisor usa outro modelo que o gerador (avoid)', async () => {
  // detect: groq (sem chave) → nvidia (sem chave) → mock. Evitando "mock", ele vai para o fim, mas ainda atende se for o único
  const out = await runText('detect', { prompt: 'Material: licitação.', avoid: { provider: 'mock', model: 'simulado' }, maxTokens: 50 });
  assert.equal(out.provider, 'mock');
  // Haiku gerou → Sonnet revisa; Sonnet gerou (reserva) → Haiku revisa
  const ordem = (gen) => {
    const peso = (r) => (r.provider !== gen.provider ? 0 : r.model === gen.model ? 2 : 1);
    return [...routeFor('review')].sort((a, b) => peso(a) - peso(b))[0].model;
  };
  assert.equal(ordem({ provider: 'anthropic', model: 'claude-haiku-5-5' }), 'claude-sonnet-5-5');
  assert.equal(ordem({ provider: 'anthropic', model: 'claude-sonnet-5-5' }), 'claude-haiku-5-5');
});

test('D2: rate_limit abre o disjuntor temporariamente e pula o modelo', () => {
  _resetBreakers();
  const key = 'groq:openai/gpt-oss-20b';
  assert.equal(isOpen(key), false);
  tripBreaker(key, 15000);
  assert.equal(isOpen(key), true);
  _resetBreakers();
  assert.equal(isOpen(key), false);
});

test('D2: 429 e 503 pulam para o próximo modelo sem gastar tentativas; 429 pausa o modelo pelo retry-after', async () => {
  // detect: groq:modelo-inexistente → nvidia (sem chave) → mock. O fetch do Groq é simulado.
  const prevFetch = globalThis.fetch, prevRetries = config.ai.maxRetries, prevGroq = config.ai.keys.groq;
  config.ai.maxRetries = 3;
  config.ai.keys.groq = 'gsk-teste';
  const chamadas = { groq: 0 };
  try {
    for (const [status, headers] of [[429, { 'retry-after': '7' }], [503, {}]]) {
      _resetBreakers();
      chamadas.groq = 0;
      globalThis.fetch = async (url) => {
        if (String(url).includes('groq')) { chamadas.groq++; return new Response(JSON.stringify({ error: { message: 'x' } }), { status, headers }); }
        return prevFetch(url);
      };
      const out = await runText('detect', { prompt: 'Material: licitação.', maxTokens: 50 });
      assert.equal(out.provider, 'mock', `status ${status}: deveria cair no reserva`);
      assert.equal(chamadas.groq, 1, `status ${status}: não pode repetir no mesmo modelo`);
      assert.equal(isOpen('groq:modelo-inexistente'), status === 429, `status ${status}: pausa só no 429`);
    }
  } finally {
    globalThis.fetch = prevFetch;
    config.ai.maxRetries = prevRetries;
    config.ai.keys.groq = prevGroq;
    _resetBreakers();
  }
});

test('retry-after fica entre 1 s e 1 h', async () => {
  const { fromHttp } = await import('../src/ai/errors.js');
  const h = (v) => new Headers({ 'retry-after': v });
  assert.equal(fromHttp(429, '', null, h('-5')).retryAfterMs, 1000);
  assert.equal(fromHttp(429, '', null, h('86400')).retryAfterMs, 3_600_000);
  assert.equal(fromHttp(429, '', null, h('lixo')).retryAfterMs, null);
  assert.equal(fromHttp(429, '', null, h('12')).retryAfterMs, 12000);
});

test('gerador por nível: Fácil/Médio no Haiku, Difícil/Misto no Sonnet — revisor é sempre o outro modelo', () => {
  assert.equal(routeFor('generate')[0].model, 'claude-haiku-5-5');
  const dificil = routeFor('generate_dificil');
  assert.equal(dificil[0].model, 'claude-sonnet-5-5');
  assert.ok(dificil.every((r) => r.provider === 'anthropic'), 'material do aluno só no Claude');
});
