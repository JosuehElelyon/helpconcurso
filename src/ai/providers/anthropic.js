// Adaptador Anthropic (Claude) e proxy compatível com protocolo Anthropic Messages (ex.: Free Claude Code / fcc-server).
// Suporta PDF nativo (OCR), streaming, cache de prompt, rotação de múltiplas chaves e modo lote.
import Anthropic from '@anthropic-ai/sdk';
import { AiError, AiAbortError, AiCapabilityError, fromHttp } from '../errors.js';

// Raciocínio dos modelos Claude 5.x: ligado por padrão, conta dentro do max_tokens e é cobrado como saída.
// esforco = 'low' | 'medium' | 'high' liga o raciocínio com esse esforço e soma uma reserva ao max_tokens (senão a
// resposta visível é cortada); esforco vazio desliga — Haiku: {type:'disabled'}; Sonnet: {type:'between_tools'}
// ({type:'disabled'} dá 400 no Sonnet 5.5); Opus 5.5 não desliga: esforço 'low'.
const RESERVA_RACIOCINIO = { low: 2000, medium: 6000, high: 10000 };
const isClaude5 = (model) => /^claude-(haiku|sonnet|opus)-5/.test(String(model || ''));

export function paramsClaude({ model, system, messages, maxTokens, temperature, cacheSystem, esforco }, { raciocinio = true } = {}) {
  const p = {
    model, max_tokens: maxTokens,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content.map((c) => c.type === 'pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: c.data } }
        : { type: 'text', text: c.text }),
    })),
  };
  if (system) p.system = cacheSystem ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : system;
  if (temperature !== undefined) p.temperature = temperature;
  if (raciocinio && isClaude5(model)) {
    if (esforco && RESERVA_RACIOCINIO[esforco]) {
      p.output_config = { effort: esforco };
      p.max_tokens = maxTokens + RESERVA_RACIOCINIO[esforco];
    } else if (/^claude-opus/.test(model)) {
      p.output_config = { effort: 'low' };
      p.max_tokens = maxTokens + RESERVA_RACIOCINIO.low;
    } else {
      p.thinking = { type: /^claude-sonnet/.test(model) ? 'between_tools' : 'disabled' };
    }
  }
  return p;
}

export function createAnthropic({ apiKey, baseUrl, timeoutMs, name = 'anthropic', allowPdf = true }) {
  const keys = String(apiKey || '').split(',').map((k) => k.trim()).filter(Boolean);
  let keyIndex = 0;
  const cleanBaseUrl = baseUrl ? String(baseUrl).replace(/\/v1\/?$/, '').replace(/\/$/, '') : undefined;
  const makeClient = (k) => new Anthropic({ apiKey: k, ...(cleanBaseUrl ? { baseURL: cleanBaseUrl } : {}), maxRetries: 0, timeout: timeoutMs });
  const clients = keys.map(makeClient);
  const nextClient = () => {
    const c = clients[keyIndex % clients.length];
    keyIndex = (keyIndex + 1) % Math.max(1, clients.length);
    return c;
  };

  // Proxies (ex.: fcc) traduzem para outros modelos: não recebem parâmetros de raciocínio da Anthropic
  const toParams = (req) => paramsClaude(req, { raciocinio: name === 'anthropic' });
  const usageOf = (u = {}) => ({ input: u.input_tokens || 0, output: u.output_tokens || 0, cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0 });
  const textOf = (msg) => (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const mapErr = (e) => {
    if (e?.name === 'APIUserAbortError' || e?.name === 'AbortError') return new AiAbortError();
    if (e?.name === 'APIConnectionTimeoutError') return new AiError('Tempo esgotado ao consultar a IA.', { retryable: true, code: 'timeout', cause: e });
    if (e?.name === 'APIConnectionError') return new AiError('Falha de conexão com a IA.', { retryable: true, code: 'network', cause: e });
    if (e?.status === 529) return new AiError('IA sobrecarregada.', { status: 529, retryable: true, code: 'unavailable', cause: e });
    if (typeof e?.status === 'number') return fromHttp(e.status, e.message, e, e.headers);
    return e instanceof AiError ? e : new AiError(e?.message || 'Erro na IA.', { retryable: true, code: 'network', cause: e });
  };

  const isFcc = name === 'fcc';
  return {
    name,
    capabilities: { pdf: allowPdf, batch: !isFcc, stream: true, cache: !isFcc },

    async generate(req) {
      if (!allowPdf && req.messages?.some((m) => m.content?.some((c) => c.type === 'pdf'))) {
        throw new AiCapabilityError(`O provedor ${name} não lê PDF binário diretamente neste modo; usando fallback.`);
      }
      const params = toParams({ ...req, cacheSystem: isFcc ? false : req.cacheSystem });
      const client = nextClient();
      try {
        if (req.onText) {
          const stream = client.messages.stream(params, { signal: req.signal });
          stream.on('text', (_d, snapshot) => req.onText(snapshot));
          const msg = await stream.finalMessage();
          return { text: textOf(msg), usage: usageOf(msg.usage), stopReason: msg.stop_reason };
        }
        const msg = await client.messages.create(params, { signal: req.signal });
        return { text: textOf(msg), usage: usageOf(msg.usage), stopReason: msg.stop_reason };
      } catch (e) { throw mapErr(e); }
    },

    ...(isFcc ? {} : {
      batch: {
        async submit(items) { // items: [{id, ...req}]
          const client = nextClient();
          try {
            const b = await client.messages.batches.create({ requests: items.map((it) => ({ custom_id: it.id, params: toParams(it) })) });
            return b.id;
          } catch (e) { throw mapErr(e); }
        },
        async poll(batchId) {
          const client = nextClient();
          try {
            const b = await client.messages.batches.retrieve(batchId);
            if (b.processing_status !== 'ended') return { state: 'in_progress' };
            const results = new Map();
            for await (const r of await client.messages.batches.results(batchId)) {
              if (r.result?.type === 'succeeded') results.set(r.custom_id, { text: textOf(r.result.message), usage: usageOf(r.result.message.usage), stopReason: r.result.message.stop_reason });
              else results.set(r.custom_id, { error: r.result?.type || 'erro' });
            }
            return { state: 'ended', results };
          } catch (e) { throw mapErr(e); }
        },
      },
    }),
  };
}
