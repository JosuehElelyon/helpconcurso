// =====================================================================
// Camada de IA do HelpConcurso — ponto único para TODAS as chamadas.
// • Cada tarefa tem um "provedor:modelo" principal e um reserva (src/config.js / .env)
// • Retentativas com espera exponencial, troca automática para o modelo reserva,
//   disjuntor (circuit breaker) por modelo, timeout, cancelamento e registro de uso/custo.
// Para trocar de fornecedor: mude AI_MODEL_<TAREFA> no .env, ex. AI_MODEL_OCR=gemini:gemini-2.5-flash
// =====================================================================
import { config } from '../config.js';
import { query } from '../db.js';
import { AiError, AiAbortError, AiOutputError } from './errors.js';
import { createAnthropic } from './providers/anthropic.js';
import { createOpenAICompat } from './providers/openai-compat.js';
import { createMock } from './providers/mock.js';
import { SECURITY_RULES } from './guard.js';

const providers = new Map();
function getProvider(name) {
  if (config.ai.mock) name = 'mock';
  if (providers.has(name)) return providers.get(name);
  let p;
  if (name === 'mock') p = createMock();
  else if (name === 'anthropic') {
    if (!config.ai.keys.anthropic) throw new AiError('ANTHROPIC_API_KEY não configurada.', { code: 'not_configured', fallback: true });
    p = createAnthropic({ apiKey: config.ai.keys.anthropic, timeoutMs: config.ai.timeoutMs });
  } else if (name in config.ai.baseUrls) {
    if (!config.ai.keys[name] || !config.ai.baseUrls[name]) throw new AiError(`${name.toUpperCase()}_API_KEY não configurada.`, { code: 'not_configured', fallback: true });
    p = createOpenAICompat({ name, apiKey: config.ai.keys[name], baseUrl: config.ai.baseUrls[name], timeoutMs: config.ai.timeoutMs });
  } else throw new AiError(`Provedor de IA desconhecido: ${name}`, { code: 'not_configured', fallback: true });
  providers.set(name, p);
  return p;
}
const parseSpec = (spec) => { const i = spec.indexOf(':'); return { provider: spec.slice(0, i), model: spec.slice(i + 1) }; };
export function routeFor(task) {
  const t = config.ai.tasks[task];
  if (!t) throw new AiError(`Tarefa de IA desconhecida: ${task}`, { code: 'not_configured', fallback: false });
  return [t.primary, t.fallback].filter(Boolean).map(parseSpec);
}

// ---------- Disjuntor: depois de 5 falhas seguidas, pula o modelo por 60 s ----------
const breaker = new Map();
const isOpen = (k) => { const b = breaker.get(k); return b && b.failures >= 5 && Date.now() - b.since < 60000; };
const fail = (k) => { const b = breaker.get(k) || { failures: 0, since: 0 }; b.failures++; if (b.failures === 5) b.since = Date.now(); breaker.set(k, b); };
const succeed = (k) => breaker.delete(k);

const sleep = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new AiAbortError()); }, { once: true }); });

async function logUsage(row) {
  try {
    await query(`INSERT INTO ai_usage(task,provider,model,input_tokens,output_tokens,cache_read_tokens,duration_ms,ok,fallback,batch,error,user_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [row.task, row.provider, row.model, row.usage?.input ?? null, row.usage?.output ?? null, row.usage?.cacheRead ?? null, row.ms ?? null, row.ok, !!row.fallback, !!row.batch, row.error ? String(row.error).slice(0, 300) : null, row.userId || null]);
  } catch (e) { console.warn('[ai] falha ao registrar uso:', e.message); }
}

/**
 * Executa uma tarefa de IA e devolve o texto.
 * @param {string} task  chave de AI_TASKS
 * @param {{system?:string, prompt:string, pdf?:string, maxTokens?:number, temperature?:number,
 *          onText?:(s:string)=>void, signal?:AbortSignal, userId?:string, cacheSystem?:boolean}} req
 */
export async function runText(task, req) {
  const routes = routeFor(task);
  const content = [...(req.pdf ? [{ type: 'pdf', data: req.pdf }] : []), { type: 'text', text: req.prompt }];
  const system = [SECURITY_RULES, req.system].filter(Boolean).join('\n\n');
  let lastErr;
  for (let r = 0; r < routes.length; r++) {
    const { provider: pName, model } = routes[r];
    const key = `${pName}:${model}`;
    if (isOpen(key) && r < routes.length - 1) { lastErr = new AiError('Modelo temporariamente desativado (disjuntor).', { code: 'unavailable' }); continue; }
    let provider;
    try { provider = getProvider(pName); } catch (e) { lastErr = e; continue; }
    for (let attempt = 1; attempt <= config.ai.maxRetries; attempt++) {
      if (req.signal?.aborted) throw new AiAbortError();
      const t0 = Date.now();
      try {
        const out = await provider.generate({ task, model, system, messages: [{ role: 'user', content }], maxTokens: req.maxTokens || 4096, temperature: req.temperature, onText: req.onText, signal: req.signal, cacheSystem: req.cacheSystem });
        succeed(key);
        logUsage({ task, provider: provider.name, model, usage: out.usage, ms: Date.now() - t0, ok: true, fallback: r > 0, userId: req.userId });
        if (out.stopReason === 'max_tokens' || out.stopReason === 'length') out.truncated = true;
        return { ...out, provider: provider.name, model, fallback: r > 0 };
      } catch (e) {
        const err = e instanceof AiError ? e : Object.assign(new AiError(e?.message || 'erro', { retryable: e?.retryable ?? true, code: e?.code || 'network' }), { cause: e });
        logUsage({ task, provider: provider.name, model, ms: Date.now() - t0, ok: false, fallback: r > 0, error: `${err.code}: ${err.message}`, userId: req.userId });
        if (err instanceof AiAbortError || req.signal?.aborted) throw new AiAbortError();
        lastErr = err;
        fail(key);
        if (!err.retryable || attempt === config.ai.maxRetries) break;
        const wait = Math.min(20000, 800 * 2 ** (attempt - 1)) + Math.random() * 400; // espera exponencial + jitter
        console.warn(`[ai] ${task} ${key} falhou (${err.code}), nova tentativa em ${Math.round(wait)}ms`);
        await sleep(wait, req.signal);
      }
    }
    if (lastErr && lastErr.fallback === false) break;
    if (r < routes.length - 1) console.warn(`[ai] ${task}: trocando para o modelo reserva ${routes[r + 1].provider}:${routes[r + 1].model}`);
  }
  throw lastErr || new AiError('Nenhum modelo de IA disponível.', { code: 'not_configured' });
}

// ---------- JSON ----------
export function extractJSON(text) {
  const s = String(text).replace(/```(?:json)?/gi, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new AiOutputError('A IA não devolveu JSON.');
  try { return JSON.parse(s.slice(a, b + 1)); } catch { throw new AiOutputError('JSON inválido na resposta da IA.'); }
}

/**
 * Executa a tarefa, interpreta o JSON e valida com um schema zod.
 * Se falhar: 1) tenta consertar o JSON com a tarefa json_repair; 2) repete a tarefa uma vez.
 */
export async function runJSON(task, req, schema) {
  let lastErr;
  for (let round = 0; round < 2; round++) {
    const out = await runText(task, { ...req, prompt: req.prompt + '\n\nResponda APENAS com JSON válido, sem markdown e sem texto fora do JSON.' });
    let obj;
    try { obj = extractJSON(out.text); }
    catch (e) {
      lastErr = e;
      try {
        const fixed = await runText('json_repair', { prompt: `Corrija o conteúdo abaixo para que seja um JSON válido, sem alterar os dados e sem acrescentar nada. Se estiver cortado no fim, feche as estruturas abertas descartando o item incompleto. Responda só com o JSON.\n\n${out.text.slice(0, 120000)}`, maxTokens: Math.min(16000, (req.maxTokens || 4096) + 500), userId: req.userId, signal: req.signal });
        obj = extractJSON(fixed.text);
      } catch (e2) { lastErr = e2; if (e2 instanceof AiAbortError) throw e2; continue; }
    }
    const v = schema ? schema.safeParse(obj) : { success: true, data: obj };
    if (v.success) return { data: v.data, meta: { provider: out.provider, model: out.model, fallback: out.fallback, truncated: out.truncated } };
    lastErr = new AiOutputError('Resposta da IA fora do formato esperado: ' + v.error.issues.slice(0, 2).map((i) => `${i.path.join('.')} ${i.message}`).join('; '));
  }
  throw lastErr;
}

// ---------- Modo lote ----------
export function batchSupported(task) {
  if (config.ai.trainingMode !== 'batch') return false;
  try { const { provider } = routeFor(task)[0]; return !!getProvider(provider).batch; } catch { return false; }
}
/** Envia vários pedidos de uma tarefa em lote. items: [{id, prompt, system?, maxTokens?}] */
export async function submitBatch(task, items) {
  const { provider: pName, model } = routeFor(task)[0];
  const p = getProvider(pName);
  const system = (s) => [SECURITY_RULES, s].filter(Boolean).join('\n\n');
  const id = await p.batch.submit(items.map((it) => ({ id: it.id, task, model, system: system(it.system), maxTokens: it.maxTokens || 4096,
    messages: [{ role: 'user', content: [{ type: 'text', text: it.prompt + '\n\nResponda APENAS com JSON válido, sem markdown e sem texto fora do JSON.' }] }] })));
  return `${pName}|${model}|${id}`;
}
export async function pollBatch(task, batchRef) {
  const [pName, model, id] = batchRef.split('|');
  const r = await getProvider(pName).batch.poll(id);
  if (r.state === 'ended') for (const v of r.results.values()) logUsage({ task, provider: pName, model, usage: v.usage, ok: !v.error, batch: true, error: v.error });
  return r;
}

export function describeRouting() {
  return Object.entries(config.ai.tasks).map(([task, t]) => ({ task, label: t.label, primary: config.ai.mock ? 'mock' : t.primary, fallback: config.ai.mock ? null : t.fallback }));
}
