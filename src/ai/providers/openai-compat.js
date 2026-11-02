// Adaptador para qualquer API compatível com OpenAI (NVIDIA NIM, OpenRouter, Gemini, Groq, Cerebras, SambaNova, Mistral, Together, DeepSeek, Ollama...).
// Suporta rotação automática de múltiplas chaves de API (separadas por vírgula) e limpeza de blocos <think>.
// Sem PDF nativo: tarefas de OCR caem automaticamente no modelo reserva (fallback).
import { AiError, AiAbortError, AiCapabilityError, fromHttp } from '../errors.js';

const stripThink = (s) => String(s || '').replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();

export function createOpenAICompat({ name, apiKey, baseUrl, timeoutMs }) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}/chat/completions`;
  const newTokenParam = name === 'openai'; // modelos novos da OpenAI usam max_completion_tokens
  const keys = String(apiKey || '').split(',').map((k) => k.trim()).filter(Boolean);
  let keyIndex = 0;
  const nextKey = () => {
    if (!keys.length) return '';
    const k = keys[keyIndex % keys.length];
    keyIndex = (keyIndex + 1) % keys.length;
    return k;
  };

  return {
    name,
    capabilities: { pdf: false, batch: false, stream: true, cache: false },

    async generate({ model, system, messages, maxTokens, temperature, signal, onText }) {
      if (messages.some((m) => m.content.some((c) => c.type === 'pdf'))) throw new AiCapabilityError(`O provedor ${name} não lê PDF diretamente.`);
      // Modelos de raciocínio (ex.: Groq gpt-oss) gastam tokens internos de pensamento; garantimos teto de pelo menos 2048 para não truncar o JSON de saída
      const tokenLimit = name === 'groq' ? Math.max(maxTokens || 4096, 2048) : maxTokens;
      const body = {
        model,
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages.map((m) => ({ role: m.role, content: m.content.map((c) => c.text).join('\n\n') }))],
        [newTokenParam ? 'max_completion_tokens' : 'max_tokens']: tokenLimit,
        stream: !!onText,
      };
      if (onText && !['nvidia', 'cerebras', 'sambanova'].includes(name)) body.stream_options = { include_usage: true };
      if (temperature !== undefined) body.temperature = temperature;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
      const onAbort = () => ctrl.abort(new Error('aborted'));
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        let res, lastHttpErr;
        const maxKeyAttempts = Math.max(1, keys.length);
        for (let kTry = 0; kTry < maxKeyAttempts; kTry++) {
          const currentKey = nextKey();
          const headers = {
            'content-type': 'application/json',
            authorization: `Bearer ${currentKey}`,
            ...(name === 'openrouter' ? { 'HTTP-Referer': 'https://helpconcurso.com.br', 'X-Title': 'HelpConcurso' } : {}),
          };
          try {
            res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
          } catch (e) {
            if (signal?.aborted) throw new AiAbortError();
            if (ctrl.signal.aborted) throw new AiError('Tempo esgotado ao consultar a IA.', { retryable: true, code: 'timeout' });
            throw new AiError('Falha de conexão com a IA.', { retryable: true, code: 'network', cause: e });
          }
          if (res.ok) { lastHttpErr = null; break; }
          let msg = '';
          try { msg = (await res.json())?.error?.message || ''; } catch {}
          lastHttpErr = fromHttp(res.status, msg, null, res.headers);
          // Se houver mais chaves cadastradas e o erro for cota/rate-limit (429) ou chave (401/402/403), tenta a próxima chave imediatamente
          if (kTry < maxKeyAttempts - 1 && [401, 402, 403, 429].includes(res.status)) continue;
          break;
        }
        if (lastHttpErr) throw lastHttpErr;
        if (!onText) {
          const j = await res.json();
          const rawText = j.choices?.[0]?.message?.content || '';
          return { text: stripThink(rawText), usage: { input: j.usage?.prompt_tokens || 0, output: j.usage?.completion_tokens || 0, cacheRead: 0 }, stopReason: j.choices?.[0]?.finish_reason };
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
              if (d) { text += d; onText(stripThink(text)); }
              if (j.choices?.[0]?.finish_reason) stopReason = j.choices[0].finish_reason;
              if (j.usage) usage = { input: j.usage.prompt_tokens || 0, output: j.usage.completion_tokens || 0, cacheRead: 0 };
            } catch { /* linha parcial/ruído */ }
          }
        }
        return { text: stripThink(text), usage, stopReason };
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
