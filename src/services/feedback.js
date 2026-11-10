// Avaliações e reportes de erro das questões geradas.
// Os dados ficam no NOSSO banco: são a base para medir e melhorar a qualidade, independentemente do fornecedor de IA.
import * as feedbackRepo from '../repositories/feedback.js';
import * as simuladosRepo from '../repositories/simulados.js';
import * as materiaisRepo from '../repositories/materiais.js';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';
import { runJSON } from '../ai/index.js';
import { reportCheckSchema } from '../ai/schemas.js';
import { promptReportCheck } from '../lib/prompts.js';
import { enqueue, registerJob } from '../jobs/queue.js';
import { scanText, SEV } from '../security/text-scan.js';
import { award, awardRating } from './stars.js';

async function loadQuestion(userId, setId, i) {
  const s = await simuladosRepo.buscar(setId, userId);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');
  if (!Number.isInteger(i) || i < 0 || i >= s.questoes.length) throw new HttpError(404, 'Questão não encontrada.');
  return s;
}
const view = (f) => f && ({ q: f.q_index, rating: f.rating, reportStatus: f.report_status, reportReason: f.report_reason, result: f.report_result });

export async function rate(user, setId, i, rating) {
  const s = await loadQuestion(user.id, setId, i);
  const f = await feedbackRepo.avaliar(setId, i, user.id, s.banca, s.materia, rating === 0 ? null : rating);
  const stars = rating === 0 ? 0 : await awardRating(user.id, `${setId}:${i}`);
  return { feedback: view(f), stars };
}

export async function report(user, setId, i, motivo) {
  const s = await loadQuestion(user.id, setId, i);
  const m = String(motivo || '').trim();
  if (m.length < 5) throw new HttpError(400, 'Explique em poucas palavras qual é o erro.');
  if (SEV[scanText(m).severity] >= SEV.high) throw new HttpError(422, 'O motivo contém conteúdo não permitido.');
  if ((await feedbackRepo.reportesNas24h(user.id)) >= 15) throw new HttpError(429, 'Você já reportou muitos erros hoje. Obrigado! Tente amanhã.');
  const prev = await feedbackRepo.situacaoDoReporte(setId, i, user.id);
  if (prev && ['pending', 'confirmed', 'rejected'].includes(prev.report_status)) throw new HttpError(409, 'Você já reportou esta questão.');
  const f = await feedbackRepo.registrarReporte(setId, i, user.id, s.banca, s.materia, m.slice(0, 600));
  await enqueue('question.report_check', { feedbackId: f.id });
  return { feedback: view(f) };
}

export async function listFeedback(user, setId) {
  await loadQuestion(user.id, setId, 0).catch((e) => { if (e.message.startsWith('Simulado')) throw e; });
  return (await feedbackRepo.doSimulado(setId, user.id)).map(view);
}

// Tarefa em segundo plano: a IA verifica o erro reportado
async function checkReport({ feedbackId }) {
  const f = await feedbackRepo.buscar(feedbackId);
  if (!f || f.report_status !== 'pending') return;
  const s = await simuladosRepo.buscarParaTarefa(f.set_id);
  const q = s?.questoes?.[f.q_index];
  const textoMaterial = s?.material_id ? await materiaisRepo.textoParaTarefa(s.material_id) : null;
  if (!q || textoMaterial == null) {
    await feedbackRepo.concluirReporte(f.id, 'failed', { explicacao: 'O material de origem foi removido, então não foi possível verificar.' });
    return;
  }
  const { data } = await runJSON('report_check', { ...promptReportCheck({ q, formato: s.formato, text: textoMaterial, motivo: f.report_reason }), maxTokens: 900, userId: f.user_id }, reportCheckSchema);
  const resp = data.resposta_correta.trim().toUpperCase().charAt(0);
  const confirmed = !data.gabarito_correto || data.ambigua;
  const result = { confirmado: confirmed, respostaCorreta: confirmed && resp && resp !== q.gabarito ? resp : null, ambigua: data.ambigua, explicacao: data.explicacao };
  if (confirmed) {
    const qs = s.questoes.map((x, k) => (k === f.q_index ? { ...x, contestada: { respostaCorreta: result.respostaCorreta, ambigua: data.ambigua, explicacao: data.explicacao } } : x));
    await simuladosRepo.definirQuestoes(s.id, qs);
    result.estrelas = await award(f.user_id, 'erro_confirmado', config.stars.erroConfirmado, f.id, 'Encontrou um erro numa questão');
  }
  await feedbackRepo.concluirReporte(f.id, confirmed ? 'confirmed' : 'rejected', result);
}
registerJob('question.report_check', {
  run: checkReport, maxAttempts: 4,
  onDead: async ({ feedbackId }) => { await feedbackRepo.concluirReporte(feedbackId, 'failed', { explicacao: 'Não conseguimos verificar agora. Tente reportar de novo mais tarde.' }); },
});
