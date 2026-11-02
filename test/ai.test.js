// Camada de IA: troca automática para o modelo reserva quando o principal falha/não está configurado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.AI_MOCK = 'false';
process.env.ANTHROPIC_API_KEY = '';
process.env.AI_MODEL_DETECT = 'groq:modelo-inexistente';   // sem GROQ_API_KEY → falha
process.env.AI_FALLBACK_DETECT = 'mock:simulado';          // reserva
process.env.AI_MAX_RETRIES = '1';
const { runJSON, routeFor } = await import('../src/ai/index.js');
const { detectSchema } = await import('../src/ai/schemas.js');

test('usa o modelo reserva quando o principal não está disponível', async () => {
  assert.deepEqual(routeFor('detect').map((r) => r.provider), ['groq', 'mock']);
  const { data, meta } = await runJSON('detect', { prompt: 'Material: atos administrativos e licitação na administração pública.' }, detectSchema);
  assert.equal(meta.fallback, true);
  assert.equal(meta.provider, 'mock');
  assert.equal(data.materia, 'Direito Administrativo');
});
