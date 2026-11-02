// Adaptador para qualquer API compatível com OpenAI (OpenAI, Gemini, Groq, Together, DeepSeek...).
// Sem PDF nativo: tarefas de OCR caem automaticamente no modelo reserva (fallback).
import { AiError, AiAbortError, AiCapabilityError, fromHttp } from '../errors.js';

export function createOpenAICompat({ name, apiKey, baseUrl, timeoutMs }) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}/chat/completions`;
  const newTokenParam = name === 'openai'; // modelos novos da OpenAI usam max_completion_tokens

  return {
    name,
    capabilities: { pdf: false, batch: false, stream: true, cache: false },

    async generate({ model, system, messages, maxTokens, temperature, signal, onText }) {
      if (messages.some((m) => m.content.some((c) => c.type === 'pdf'))) throw new AiCapabilityError(`O provedor ${name} não lê PDF diretamente.`);
      const body = {
        model,
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages.map((m) => ({ role: m.role, content: m.content.map((c) => c.text).join('\n\n') }))],
        [newTokenParam ? 'max_completion_tokens' : 'max_tokens']: maxTokens,
        stream: !!onText,
      };
      if (onText) body.stream_options = { include_usage: true };
      if (temperature !== undefined) body.temperature = temperature;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
      const onAbort = () => ctrl.abort(new Error('aborted'));
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        let res;
        try {
          res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body), signal: ctrl.signal });
        } catch (e) {
          if (signal?.aborted) throw new AiAbortError();
          if (ctrl.signal.aborted) throw new AiError('Tempo esgotado ao consultar a IA.', { retryable: true, code: 'timeout' });
          throw new AiError('Falha de conexão com a IA.', { retryable: true, code: 'network', cause: e });
        }
        if (!res.ok) { let msg = ''; try { msg = (await res.json())?.error?.message || ''; } catch {} throw fromHttp(res.status, msg); }
        if (!onText) {
          const j = await res.json();
          return { text: j.choices?.[0]?.message?.content || '', usage: { input: j.usage?.prompt_tokens || 0, output: j.usage?.completion_tokens || 0, cacheRead: 0 }, stopReason: j.choices?.[0]?.finish_reason };
        }
        // Streaming SSE
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = '', text = '', usage = { input: 0, output: 0, cacheRead: 0 }, stopReason;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const j = JSON.parse(data);
              const d = j.choices?.[0]?.delta?.content;
              if (d) { text += d; onText(text); }
              if (j.choices?.[0]?.finish_reason) stopReason = j.choices[0].finish_reason;
              if (j.usage) usage = { input: j.usage.prompt_tokens || 0, output: j.usage.completion_tokens || 0, cacheRead: 0 };
            } catch { /* linha parcial/ruído */ }
          }
        }
        return { text, usage, stopReason };
      } catch (e) {
        if (signal?.aborted) throw new AiAbortError();
        throw e;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
