// Cotas por usuário (controlam o custo de IA). Os limites vêm do PLANO do aluno (src/lib/planos.js);
// créditos extras vêm de provas aprovadas e de estrelas. Simulado de questões reais (origem 'prova_real') não gasta IA e não conta.
import { one, query } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';
import { planoDoUsuario, NIVEIS_DIFICEIS } from '../lib/planos.js';

const HOJE_BR = "date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'";

export async function generationQuota(user) {
  const plano = planoDoUsuario(user);
  const r = await one(`SELECT count(*)::int AS n, count(*) FILTER (WHERE nivel = ANY($2::text[]))::int AS dif
                       FROM question_sets WHERE user_id=$1 AND origem='ia' AND created_at >= ${HOJE_BR}`, [user.id, NIVEIS_DIFICEIS]);
  const u = await one('SELECT bonus_credits FROM users WHERE id=$1', [user.id]);
  const limit = plano.limites.simuladosDia;
  const bonus = u?.bonus_credits || 0;
  return {
    plano: plano.id, planoNome: plano.nome,
    usedToday: r.n, dailyLimit: limit, bonus,
    remaining: limit === null ? null : Math.max(0, limit - r.n) + bonus,
    dificeisHoje: r.dif, dificeisLimite: plano.limites.dificeisDia,
  };
}

const upgradeMsg = (plano) => (plano.id === 'aprovacao' || plano.id === 'admin' ? '' : ' Veja os planos em "Meu plano" para ampliar.');

/** Garante que o usuário pode gerar; se a cota diária acabou, consome 1 crédito extra. Nível Difícil/Misto tem limite próprio. */
export async function consumeGeneration(user, nivel = '') {
  const q = await generationQuota(user);
  const plano = planoDoUsuario(user);
  if (NIVEIS_DIFICEIS.includes(nivel) && q.dificeisLimite !== null && q.dificeisHoje >= q.dificeisLimite) {
    throw new HttpError(403, `Seu plano ${plano.nome} inclui ${q.dificeisLimite} simulado(s) Difícil/Misto por dia, e você já usou hoje. Escolha outro nível ou volte amanhã.${upgradeMsg(plano)}`, { quota: q, code: 'plano' });
  }
  if (q.dailyLimit === null || q.usedToday < q.dailyLimit) return { usedBonus: false };
  const r = await one('UPDATE users SET bonus_credits=bonus_credits-1 WHERE id=$1 AND bonus_credits > 0 RETURNING bonus_credits', [user.id]);
  if (!r) throw new HttpError(429, `Você atingiu o limite de ${q.dailyLimit} simulados por hoje do plano ${plano.nome}. Envie provas para a base e ganhe gerações extras, ou volte amanhã.${upgradeMsg(plano)}`, { quota: q, code: 'plano' });
  return { usedBonus: true };
}
export async function refundGeneration(user, used) { if (used?.usedBonus) await query('UPDATE users SET bonus_credits=bonus_credits+1 WHERE id=$1', [user.id]); }

/** Limite de itens do plano (editais, cadernos). */
export async function assertLimitePlano(user, recurso) {
  const plano = planoDoUsuario(user);
  const limite = plano.limites[recurso];
  if (limite === null || limite === undefined) return;
  const tabela = { editais: 'editais', cadernos: 'cadernos' }[recurso];
  const r = await one(`SELECT count(*)::int AS n FROM ${tabela} WHERE user_id=$1`, [user.id]);
  if (r.n >= limite) {
    const nome = recurso === 'editais' ? 'editais' : 'cadernos';
    throw new HttpError(403, `Seu plano ${plano.nome} permite até ${limite} ${nome}. Exclua um que não usa mais ou amplie o plano.${upgradeMsg(plano)}`, { code: 'plano' });
  }
}

export async function assertCanUpload(user, kind) {
  const u = await one('SELECT uploads_blocked_until FROM users WHERE id=$1', [user.id]);
  if (u?.uploads_blocked_until && new Date(u.uploads_blocked_until) > new Date()) throw new HttpError(429, 'Seus envios foram pausados por 24 horas porque vários arquivos recentes foram bloqueados pela segurança. Se acha que é um engano, fale com o suporte.');
  if (kind === 'material' && user.role !== 'ADMIN') {
    const r = await one("SELECT count(*)::int AS n FROM materials WHERE user_id=$1 AND created_at > now() - interval '24 hours'", [user.id]);
    if (r.n >= config.quota.materialsPerDay) throw new HttpError(429, `Limite de ${config.quota.materialsPerDay} materiais por dia atingido.`);
  }
}
