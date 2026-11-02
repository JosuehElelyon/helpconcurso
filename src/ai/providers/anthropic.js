// Adaptador Anthropic (Claude) e proxy compatível com protocolo Anthropic Messages (ex.: Free Claude Code / fcc-server).
// Suporta PDF nativo (OCR), streaming, cache de prompt, rotação de múltiplas chaves e modo lote.
import Anthropic from '@anthropic-ai/sdk';
import { AiError, AiAbortError, AiCapabilityError, fromHttp } from '../errors.js';

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

  const toParams = ({ model, system, messages, maxTokens, temperature, cacheSystem }) => {
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
    return p;
  };
  const usageOf = (u = {}) => ({ input: u.input_tokens || 0, output: u.output_tokens || 0, cacheRead: u.cache_read_input_tokens || 0 });
  const textOf = (msg) => (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const mapErr = (e) => {
    if (e?.name === 'APIUserAbortError' || e?.name === 'AbortError') return new AiAbortError();
    if (e?.name === 'APIConnectionTimeoutError') return new AiError('Tempo esgotado ao consultar a IA.', { retryable: true, code: 'timeout', cause: e });
    if (e?.name === 'APIConnectionError') return new AiError('Falha de conexão com a IA.', { retryable: true, code: 'network', cause: e });
    if (e?.status === 529) return new AiError('IA sobrecarregada.', { status: 529, retryable: true, code: 'unavailable', cause: e });
    if (typeof e?.status === 'number') return fromHttp(e.status, e.message, e);
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
