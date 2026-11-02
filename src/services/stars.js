// Estrelas: recompensa por contribuições VERIFICADAS (prova aprovada, erro confirmado, avaliação de questões).
// O extrato (star_events) tem chave única por contribuição: ninguém ganha duas vezes pela mesma coisa.
import crypto from 'node:crypto';
import { pool, one, many } from '../db.js';
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
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const ins = await c.query('INSERT INTO star_events(user_id,kind,stars,ref_id,note) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,kind,ref_id) DO NOTHING RETURNING id', [userId, kind, stars, String(refId), note?.slice(0, 200) || null]);
    if (!ins.rowCount) { await c.query('ROLLBACK'); return 0; }
    await c.query('UPDATE users SET stars_total=stars_total+$2, stars_balance=stars_balance+$2 WHERE id=$1', [userId, stars]);
    await c.query('COMMIT');
    return stars;
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); console.warn('[estrelas] falha ao conceder:', e.message); return 0; }
  finally { c.release(); }
}

/** Avaliar questões dá estrelas com teto diário (evita "farmar" estrelas clicando). */
export async function awardRating(userId, refId) {
  const r = await one("SELECT count(*)::int AS n FROM star_events WHERE user_id=$1 AND kind='avaliacao' AND created_at > date_trunc('day', now())", [userId]);
  if (r.n >= config.stars.avaliacoesPorDia) return 0;
  return award(userId, 'avaliacao', config.stars.avaliacao, refId, 'Avaliou uma questão');
}

export async function summary(userId) {
  const u = await one('SELECT stars_total, stars_balance, bonus_credits FROM users WHERE id=$1', [userId]);
  const history = await many('SELECT kind, stars, note, created_at FROM star_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [userId]);
  return { total: u.stars_total, balance: u.stars_balance, bonusCredits: u.bonus_credits, level: levelOf(u.stars_total), levels: LEVELS,
    regras: { provaAprovada: config.stars.provaAprovada, erroConfirmado: config.stars.erroConfirmado, avaliacao: config.stars.avaliacao, avaliacoesPorDia: config.stars.avaliacoesPorDia, porGeracao: config.stars.porGeracao },
    history };
}

/** Troca estrelas do saldo por gerações extras (o total acumulado, que define o nível, não diminui). */
export async function redeem(userId, geracoes) {
  const cost = geracoes * config.stars.porGeracao;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const u = await c.query('UPDATE users SET stars_balance=stars_balance-$2, bonus_credits=bonus_credits+$3 WHERE id=$1 AND stars_balance >= $2 RETURNING stars_balance', [userId, cost, geracoes]);
    if (!u.rowCount) { await c.query('ROLLBACK'); throw new HttpError(400, `Você precisa de ${cost} estrelas para trocar por ${geracoes} geração(ões).`); }
    await c.query('INSERT INTO star_events(user_id,kind,stars,ref_id,note) VALUES ($1,$2,$3,$4,$5)', [userId, 'troca', -cost, crypto.randomUUID(), `Trocou por ${geracoes} geração(ões) extra(s)`]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
  return summary(userId);
}
