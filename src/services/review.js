// Revisor automático: uma segunda IA resolve cada questão SEM ver o gabarito, olhando só o material.
// Passa: resposta igual ao gabarito, não ambígua e respondível pelo material. O resto é descartado.
import { runJSON } from '../ai/index.js';
import { reviewSchema } from '../ai/schemas.js';
import { promptReview } from '../lib/prompts.js';
import { AiAbortError } from '../ai/errors.js';

const GROUP = 10;

/**
 * @returns {{ available: boolean, verdicts: Array<{ok:boolean, motivo?:string}> }}
 *   available=false quando o revisor falhou (as questões seguem sem o selo, em vez de travar o aluno)
 */
export async function reviewQuestions({ questoes, formato, text, userId, signal }) {
  const verdicts = [];
  try {
    for (let g = 0; g < questoes.length; g += GROUP) {
      const group = questoes.slice(g, g + GROUP);
      const { data } = await runJSON('review', { ...promptReview({ questoes: group, formato, text }), maxTokens: 300 * group.length + 400, userId, signal }, reviewSchema);
      group.forEach((q, i) => {
        const r = data.respostas.find((x) => x.indice === i + 1) || data.respostas[i];
        if (!r) return verdicts.push({ ok: false, motivo: 'O revisor não conseguiu resolver a questão.' });
        const resp = String(r.resposta || '').trim().toUpperCase().charAt(0);
        if (!r.respondivel_pelo_material) return verdicts.push({ ok: false, motivo: 'Não dá para responder só com o material.' });
        if (r.ambigua) return verdicts.push({ ok: false, motivo: r.problema || 'Questão ambígua.' });
        if (resp !== q.gabarito) return verdicts.push({ ok: false, motivo: `O revisor chegou a ${resp || '—'}, mas o gabarito era ${q.gabarito}.` });
        verdicts.push({ ok: true });
      });
    }
    return { available: true, verdicts };
  } catch (e) {
    if (e instanceof AiAbortError) throw e;
    console.warn('[revisor] indisponível, questões seguem sem verificação:', e.message);
    return { available: false, verdicts: questoes.map(() => ({ ok: true, unverified: true })) };
  }
}
