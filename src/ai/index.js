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
import { costUsd, spentTodayUsd, isFreeModel } from './pricing.js';
import { PROMPT_VERSAO } from '../lib/prompts.js';

const providers = new Map();
function getProvider(name) {
  if (config.ai.mock) name = 'mock';
  if (providers.has(name)) return providers.get(name);
  let p;
  if (name === 'mock') p = createMock();
  else if (name === 'anthropic') {
    if (!config.ai.keys.anthropic) throw new AiError('ANTHROPIC_API_KEY não configurada.', { code: 'not_configured', fallback: true });
    p = createAnthropic({ apiKey: config.ai.keys.anthropic, timeoutMs: config.ai.timeoutMs });
  } else if (name === 'fcc') {
    if (!config.ai.keys.fcc || !config.ai.baseUrls.fcc) throw new AiError('FCC_API_KEY / FCC_BASE_URL não configurada.', { code: 'not_configured', fallback: true });
    p = createAnthropic({ name: 'fcc', apiKey: config.ai.keys.fcc, baseUrl: config.ai.baseUrls.fcc, timeoutMs: config.ai.timeoutMs, allowPdf: false });
  } else if (name in config.ai.baseUrls) {
    if (!config.ai.keys[name] || !config.ai.baseUrls[name]) throw new AiError(`${name.toUpperCase()}_API_KEY não configurada.`, { code: 'not_configured', fallback: true });
    p = createOpenAICompat({ name, apiKey: config.ai.keys[name], baseUrl: config.ai.baseUrls[name], timeoutMs: config.ai.timeoutMs });
  } else throw new AiError(`Provedor de IA desconhecido: ${name}`, { code: 'not_configured', fallback: true });
  providers.set(name, p);
  return p;
}
const parseSpec = (spec) => { const i = spec.indexOf(':'); return { provider: spec.slice(0, i), model: spec.slice(i + 1) }; };
const splitSpecs = (val) => (val ? String(val).split(',').map((s) => s.trim()).filter(Boolean) : []);

/**
 * Fila de modelos de uma tarefa. Conteúdo do aluno (dados='aluno') só vai para AI_PROVEDORES_PRIVADOS;
 * conteúdo público (provas, editais) pode usar a cascata grátis. opts.dados sobrescreve (json_repair herda da tarefa-mãe).
 */
export function routeFor(task, opts = {}) {
  const t = config.ai.tasks[task];
  if (!t) throw new AiError(`Tarefa de IA desconhecida: ${task}`, { code: 'not_configured', fallback: false });
  const dados = opts.dados || t.dados || 'aluno';
  const permitido = (provider) => dados === 'publico' || provider === 'mock' || config.ai.privateProviders.includes(provider);
  const all = [...splitSpecs(t.primary), ...splitSpecs(t.fallback)];
  // Modelo forçado no .env (AI_MODEL_<TAREFA>) é decisão explícita do administrador: vale como está.
  const base = t.explicitPrimary ? all : all.filter((s) => permitido(parseSpec(s).provider));
  let freeSpecs = [];
  if (config.ai.freeCascade && !t.explicitPrimary && task !== 'ocr') {
    const useFreeFirst = t.tier === 'fast' || config.ai.freeGenerate || !config.ai.keys.anthropic;
    if (useFreeFirst) {
      // Preferidos na ordem da lista; os demais depois, na ordem do catálogo (sort estável)
      const pos = (p) => { const i = (t.preferred || []).indexOf(p); return i === -1 ? 99 : i; };
      freeSpecs = (config.ai.freeCatalog || [])
        .filter((a) => !!config.ai.keys[a.provider] && permitido(a.provider))
        .sort((a, b) => pos(a.provider) - pos(b.provider))
        .map((a) => `${a.provider}:${t.tier === 'strong' ? a.strong : a.fast}`);
    }
  }
  const specs = t.pagoPrimeiro && base.length
    ? [base[0], ...freeSpecs, ...base.slice(1)]   // ex.: análise de estilo da banca — Sonnet primeiro, grátis como reserva
    : [...freeSpecs, ...base];
  const seen = new Set();
  return specs.filter((s) => { if (seen.has(s)) return false; seen.add(s); return true; }).map(parseSpec);
}

// ---------- Disjuntor: depois de 5 falhas seguidas ou rate-limit, pula o modelo ----------
const breaker = new Map();
export const isOpen = (k) => {
  const b = breaker.get(k);
  if (!b) return false;
  if (b.openUntil && Date.now() < b.openUntil) return true;
  return b.failures >= 5 && Date.now() - b.since < 60000;
};
export const tripBreaker = (k, durationMs = 60000) => {
  const b = breaker.get(k) || { failures: 5, since: Date.now() };
  b.failures = Math.max(b.failures, 5);
  b.since = Date.now();
  b.openUntil = Date.now() + durationMs;
  breaker.set(k, b);
};
const fail = (k) => { const b = breaker.get(k) || { failures: 0, since: 0 }; b.failures++; if (b.failures === 5) b.since = Date.now(); breaker.set(k, b); };
const succeed = (k) => breaker.delete(k);
export const _resetBreakers = () => breaker.clear();

const sleep = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(new AiAbortError()); }, { once: true }); });

// ---------- Limite diário de gasto (AI_LIMITE_USD_DIA) ----------
// O gasto do dia vem do banco a cada 60 s; entre uma leitura e outra, somamos o custo de cada chamada concluída.
const budget = { day: '', usd: 0, at: 0 };
const todayBR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
async function assertBudget(task) {
  const limit = config.ai.limiteUsdDia;
  if (!limit || config.ai.mock) return;
  const day = todayBR();
  if (budget.day !== day || Date.now() - budget.at > 60000) {
    try { budget.usd = await spentTodayUsd(); budget.day = day; budget.at = Date.now(); }
    catch (e) { console.warn('[ai] não foi possível ler o gasto do dia:', e.message); return; }
  }
  if (budget.usd >= limit) {
    console.error(`[ERRO-IA] [LIMITE-DIARIO] tarefa=${task} gasto_hoje=US$${budget.usd.toFixed(4)} limite=US$${limit}`);
    throw new AiError(`Limite diário de gasto com IA atingido (US$ ${limit}).`, { code: 'budget', retryable: false, fallback: false });
  }
}

export const _resetBudgetCache = () => { budget.at = 0; }; // para testes

async function logUsage(row) {
  if (row.ok && row.usage && row.provider !== 'mock' && budget.day === todayBR()) {
    budget.usd += costUsd(row.model, row.usage.input, row.usage.output, row.usage.cacheRead, row.batch, row.provider);
  }
  try {
    await query(`INSERT INTO ai_usage(task,provider,model,input_tokens,output_tokens,cache_read_tokens,duration_ms,ok,fallback,batch,error,user_id,prompt_versao)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [row.task, row.provider, row.model, row.usage?.input ?? null, row.usage?.output ?? null, row.usage?.cacheRead ?? null, row.ms ?? null, row.ok, !!row.fallback, !!row.batch, row.error ? String(row.error).slice(0, 300) : null, row.userId || null, PROMPT_VERSAO[row.task] || null]);
  } catch (e) { console.warn('[ai] falha ao registrar uso:', e.message); }
}

/**
 * Executa uma tarefa de IA e devolve o texto.
 * @param {string} task  chave de AI_TASKS
 * @param {{system?:string, prompt:string, pdf?:string, maxTokens?:number, temperature?:number,
 *          onText?:(s:string)=>void, signal?:AbortSignal, userId?:string, cacheSystem?:boolean,
 *          avoid?:{provider:string, model?:string}, dados?:'aluno'|'publico'}} req
 *   avoid: revisão independente — o mesmo modelo vai para o fim da fila e o mesmo provedor (outro modelo) logo antes dele
 */
export async function runText(task, req) {
  let routes = routeFor(task, { dados: req.dados });
  if (req.avoid?.provider) {
    const peso = (r) => (r.provider !== req.avoid.provider ? 0 : r.model === req.avoid.model ? 2 : 1);
    routes = [...routes].sort((a, b) => peso(a) - peso(b));
  }
  if (req.preferFallback && routes.length > 1) routes = [routes[1], routes[0]];
  // Limite diário atingido: bloqueia só os modelos pagos — os grátis da fila continuam atendendo
  let overBudget = null;
  try { await assertBudget(task); } catch (e) { if (e.code !== 'budget') throw e; overBudget = e; }
  const content = [...(req.pdf ? [{ type: 'pdf', data: req.pdf }] : []), { type: 'text', text: req.prompt }];
  const system = [SECURITY_RULES, req.system].filter(Boolean).join('\n\n');
  let lastErr;
  for (let r = 0; r < routes.length; r++) {
    const { provider: pName, model } = routes[r];
    const key = `${pName}:${model}`;
    if (isOpen(key) && r < routes.length - 1) {
      console.warn(`[ERRO-IA] [DISJUNTOR-ABERTO] tarefa=${task} modelo=${key} — pulando para modelo reserva`);
      lastErr = new AiError('Modelo temporariamente desativado (disjuntor).', { code: 'unavailable' });
      continue;
    }
    if (overBudget && !isFreeModel(model, pName)) { lastErr = overBudget; continue; }
    let provider;
    try { provider = getProvider(pName); } catch (e) {
      console.error(`[ERRO-IA] [CONFIG] tarefa=${task} provedor=${pName} msg="${e.message}"`);
      lastErr = e;
      continue;
    }
    for (let attempt = 1; attempt <= config.ai.maxRetries; attempt++) {
      if (req.signal?.aborted) throw new AiAbortError();
      const t0 = Date.now();
      try {
        const out = await provider.generate({ task, model, system, messages: [{ role: 'user', content }], maxTokens: req.maxTokens || 4096, temperature: req.temperature, onText: req.onText, signal: req.signal, cacheSystem: req.cacheSystem });
        const ms = Date.now() - t0;
        succeed(key);
        const isFallback = r > 0 || !!req.preferFallback;
        logUsage({ task, provider: provider.name, model, usage: out.usage, ms, ok: true, fallback: isFallback, userId: req.userId });
        if (out.stopReason === 'max_tokens' || out.stopReason === 'length') out.truncated = true;
        console.log(`[IA] [OK] tarefa=${task} modelo=${provider.name}:${model}${isFallback ? ' (reserva)' : ''} tempo=${ms}ms tokens_in=${out.usage?.input ?? 0} tokens_out=${out.usage?.output ?? 0}${out.truncated ? ' [TRUNCADO]' : ''}`);
        return { ...out, provider: provider.name, model, fallback: isFallback };
      } catch (e) {
        const ms = Date.now() - t0;
        const err = e instanceof AiError ? e : Object.assign(new AiError(e?.message || 'erro', { retryable: e?.retryable ?? true, code: e?.code || 'network' }), { cause: e });
        logUsage({ task, provider: provider.name, model, ms, ok: false, fallback: r > 0, error: `${err.code}: ${err.message}`, userId: req.userId });
        console.error(`[ERRO-IA] [FALHA-CHAMADA] tarefa=${task} modelo=${key} codigo=${err.code} tentativa=${attempt}/${config.ai.maxRetries} tempo=${ms}ms msg="${err.message}"`);
        if (err instanceof AiAbortError || req.signal?.aborted) throw new AiAbortError();
        lastErr = err;
        fail(key);
        // D2: se o provedor atingiu limite de uso (rate limit / 429), pausa o modelo pelo tempo indicado
        // (ou 30 s padrão) e, se houver próximo modelo na fila, avança imediatamente sem gastar retentativas.
        if (err.code === 'rate_limit') {
          const pauseMs = err.retryAfterMs || 30000;
          tripBreaker(key, pauseMs);
          if (r < routes.length - 1) {
            console.warn(`[ERRO-IA] [LIMITE-ATINGIDO] modelo=${key} pausado por ${Math.round(pauseMs / 1000)}s — pulando retentativas e avançando para modelo reserva`);
            break;
          }
        }
        if (!err.retryable || attempt === config.ai.maxRetries) break;
        const wait = Math.min(20000, 800 * 2 ** (attempt - 1)) + Math.random() * 400; // espera exponencial + jitter
        console.warn(`[ERRO-IA] [RETRY] tarefa=${task} modelo=${key} aguardando ${Math.round(wait)}ms para nova tentativa`);
        await sleep(wait, req.signal);
      }
    }
    if (lastErr && lastErr.fallback === false) break;
    if (r < routes.length - 1) console.warn(`[ERRO-IA] [FALLBACK] tarefa=${task}: trocando para modelo reserva ${routes[r + 1].provider}:${routes[r + 1].model}`);
  }
  throw lastErr || new AiError('Nenhum modelo de IA disponível.', { code: 'not_configured' });
}

// ---------- JSON ----------
// Prévia da resposta nos logs de erro: curta, e nenhuma em produção (pode conter trecho do material do aluno)
const logPreview = (t) => (config.env === 'production' ? '(oculto em produção)' : String(t || '').slice(0, 120).replace(/\s+/g, ' '));

export function extractJSON(text) {
  const s = String(text).replace(/```(?:json)?/gi, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new AiOutputError('A IA não devolveu JSON.');
  try { return JSON.parse(s.slice(a, b + 1)); } catch { throw new AiOutputError('JSON inválido na resposta da IA.'); }
}

/**
 * Executa a tarefa, interpreta o JSON e valida com um schema zod.
 * Se falhar: 1) tenta consertar o JSON com a tarefa json_repair; 2) repete a tarefa uma vez (usando modelo reserva se disponível).
 */
export async function runJSON(task, req, schema) {
  let lastErr, schemaFeedback = '';
  for (let round = 0; round < 2; round++) {
    const extraRule = schemaFeedback
      ? `\n\nATENÇÃO — CORREÇÃO OBRIGATÓRIA: Sua tentativa anterior falhou na validação (${schemaFeedback}). Corrija e preencha todos os campos obrigatórios do JSON sem deixá-los vazios.\nResponda APENAS com JSON válido, sem markdown e sem texto fora do JSON.`
      : '\n\nResponda APENAS com JSON válido, sem markdown e sem texto fora do JSON.';
    const out = await runText(task, { ...req, preferFallback: round > 0, prompt: req.prompt + extraRule });
    let obj;
    try { obj = extractJSON(out.text); }
    catch (e) {
      lastErr = e;
      const preview = logPreview(out.text);
      console.warn(`[ERRO-IA] [JSON-INVALIDO] tarefa=${task} modelo=${out.provider}:${out.model} rodada=${round + 1}/2 msg="${e.message}" previa="${preview}"`);
      try {
        const fixed = await runText('json_repair', { dados: req.dados || config.ai.tasks[task]?.dados, prompt: `Corrija o conteúdo abaixo para que seja um JSON válido, sem alterar os dados e sem acrescentar nada. Se estiver cortado no fim, feche as estruturas abertas descartando o item incompleto. Responda só com o JSON.\n\n${out.text.slice(0, 120000)}`, maxTokens: Math.min(16000, (req.maxTokens || 4096) + 500), userId: req.userId, signal: req.signal });
        obj = extractJSON(fixed.text);
      } catch (e2) { lastErr = e2; if (e2 instanceof AiAbortError) throw e2; continue; }
    }
    const v = schema ? schema.safeParse(obj) : { success: true, data: obj };
    if (v.success) return { data: v.data, meta: { provider: out.provider, model: out.model, fallback: out.fallback, truncated: out.truncated } };
    const issues = v.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
    const preview = logPreview(out.text);
    console.error(`[ERRO-IA] [SCHEMA-INVALIDO] tarefa=${task} modelo=${out.provider}:${out.model} rodada=${round + 1}/2 motivo="${issues}" previa_resposta="${preview}"`);
    logUsage({ task, provider: out.provider, model: out.model, ok: false, fallback: out.fallback, error: `bad_output: ${issues}`, userId: req.userId });
    schemaFeedback = issues;
    lastErr = new AiOutputError('Resposta da IA fora do formato esperado: ' + issues);
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
  await assertBudget(task);
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
  return Object.entries(config.ai.tasks).map(([task, t]) => {
    const chain = config.ai.mock ? ['mock:simulado'] : routeFor(task).map((r) => `${r.provider}:${r.model}`);
    return {
      task,
      label: t.label,
      primary: config.ai.mock ? 'mock' : chain[0] || t.primary,
      fallback: config.ai.mock ? null : chain.slice(1).join(' → ') || t.fallback,
      chain,
    };
  });
}
