// Cotas por usuário (controlam o custo de IA). Créditos extras vêm de provas aprovadas.
import { one, query } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';

export async function generationQuota(user) {
  const r = await one("SELECT count(*)::int AS n FROM question_sets WHERE user_id=$1 AND created_at > date_trunc('day', now())", [user.id]);
  const u = await one('SELECT bonus_credits FROM users WHERE id=$1', [user.id]);
  const limit = user.role === 'ADMIN' ? Infinity : config.quota.generationsPerDay;
  return { usedToday: r.n, dailyLimit: limit === Infinity ? null : limit, bonus: u?.bonus_credits || 0, remaining: limit === Infinity ? null : Math.max(0, limit - r.n) + (u?.bonus_credits || 0) };
}

/** Garante que o usuário pode gerar; se a cota diária acabou, consome 1 crédito extra. */
export async function consumeGeneration(user) {
  const q = await generationQuota(user);
  if (q.dailyLimit === null || q.usedToday < q.dailyLimit) return { usedBonus: false };
  const r = await one('UPDATE users SET bonus_credits=bonus_credits-1 WHERE id=$1 AND bonus_credits > 0 RETURNING bonus_credits', [user.id]);
  if (!r) throw new HttpError(429, `Você atingiu o limite de ${q.dailyLimit} gerações por hoje. Envie provas para a base e ganhe gerações extras, ou volte amanhã.`, { quota: q });
  return { usedBonus: true };
}
export async function refundGeneration(user, used) { if (used?.usedBonus) await query('UPDATE users SET bonus_credits=bonus_credits+1 WHERE id=$1', [user.id]); }

export async function assertCanUpload(user, kind) {
  const u = await one('SELECT uploads_blocked_until FROM users WHERE id=$1', [user.id]);
  if (u?.uploads_blocked_until && new Date(u.uploads_blocked_until) > new Date()) throw new HttpError(429, 'Seus envios foram pausados por 24 horas porque vários arquivos recentes foram bloqueados pela segurança. Se acha que é um engano, fale com o suporte.');
  if (kind === 'material' && user.role !== 'ADMIN') {
    const r = await one("SELECT count(*)::int AS n FROM materials WHERE user_id=$1 AND created_at > now() - interval '24 hours'", [user.id]);
    if (r.n >= config.quota.materialsPerDay) throw new HttpError(429, `Limite de ${config.quota.materialsPerDay} materiais por dia atingido.`);
  }
}
