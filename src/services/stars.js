// Estrelas: recompensa por contribuições VERIFICADAS (prova aprovada, erro confirmado, avaliação de questões).
// O extrato (star_events) tem chave única por contribuição: ninguém ganha duas vezes pela mesma coisa.
import crypto from 'node:crypto';
import * as estrelasRepo from '../repositories/estrelas.js';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';

export const LEVELS = [
  { min: 0, nome: 'Iniciante', icone: '☆' },
  { min: 50, nome: 'Colaborador', icone: '★' },
  { min: 200, nome: 'Colaborador Ouro', icone: '🏅' },
  { min: 600, nome: 'Colaborador Diamante', icone: '💎' },
];
export function levelOf(total) {
  let i = 0; LEVELS.forEach((l, k) => { if (total >= l.min) i = k; });
  return { ...LEVELS[i], indice: i, proximo: LEVELS[i + 1] || null };
}

/** Concede estrelas (idempotente). Devolve as estrelas concedidas (0 se já tinha recebido). */
export async function award(userId, kind, stars, refId, note) {
  if (!userId || !stars) return 0;
  try {
    return (await estrelasRepo.registrarConquista(userId, kind, stars, refId, note)) ? stars : 0;
  } catch (e) { console.warn('[estrelas] falha ao conceder:', e.message); return 0; }
}

/** Avaliar questões dá estrelas com teto diário (evita "farmar" estrelas clicando). */
export async function awardRating(userId, refId) {
  if ((await estrelasRepo.avaliacoesHoje(userId)) >= config.stars.avaliacoesPorDia) return 0;
  return award(userId, 'avaliacao', config.stars.avaliacao, refId, 'Avaliou uma questão');
}

export async function summary(userId) {
  const [u, history] = await Promise.all([estrelasRepo.saldo(userId), estrelasRepo.extrato(userId)]);
  return { total: u.stars_total, balance: u.stars_balance, bonusCredits: u.bonus_credits, level: levelOf(u.stars_total), levels: LEVELS,
    regras: { provaAprovada: config.stars.provaAprovada, erroConfirmado: config.stars.erroConfirmado, avaliacao: config.stars.avaliacao, avaliacoesPorDia: config.stars.avaliacoesPorDia, porGeracao: config.stars.porGeracao },
    history };
}

/** Troca estrelas do saldo por gerações extras (o total acumulado, que define o nível, não diminui). */
export async function redeem(userId, geracoes) {
  const cost = geracoes * config.stars.porGeracao;
  const ok = await estrelasRepo.trocarPorGeracoes(userId, cost, geracoes, crypto.randomUUID(), `Trocou por ${geracoes} geração(ões) extra(s)`);
  if (!ok) throw new HttpError(400, `Você precisa de ${cost} estrelas para trocar por ${geracoes} geração(ões).`);
  return summary(userId);
}
