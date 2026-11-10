// Repositório de estrelas (tabela star_events e saldo em users). Só SQL.
import { one, many, transacao } from '../db.js';

/** Registra a conquista e soma ao saldo, numa transação. false se já tinha recebido por esta contribuição (chave única). */
export const registrarConquista = (userId, tipo, estrelas, refId, nota) => transacao(async (c) => {
  const ins = await c.query('INSERT INTO star_events(user_id,kind,stars,ref_id,note) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,kind,ref_id) DO NOTHING RETURNING id',
    [userId, tipo, estrelas, String(refId), nota?.slice(0, 200) || null]);
  if (!ins.rowCount) return false;
  await c.query('UPDATE users SET stars_total=stars_total+$2, stars_balance=stars_balance+$2 WHERE id=$1', [userId, estrelas]);
  return true;
});

export const avaliacoesHoje = async (userId) =>
  (await one("SELECT count(*)::int AS n FROM star_events WHERE user_id=$1 AND kind='avaliacao' AND created_at > date_trunc('day', now())", [userId])).n;

export const saldo = (userId) => one('SELECT stars_total, stars_balance, bonus_credits FROM users WHERE id=$1', [userId]);

export const extrato = (userId, limite = 50) =>
  many('SELECT kind, stars, note, created_at FROM star_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limite]);

/** Troca estrelas do saldo por gerações extras, numa transação. false se o saldo não basta. */
export const trocarPorGeracoes = (userId, custo, geracoes, refId, nota) => transacao(async (c) => {
  const u = await c.query('UPDATE users SET stars_balance=stars_balance-$2, bonus_credits=bonus_credits+$3 WHERE id=$1 AND stars_balance >= $2 RETURNING stars_balance', [userId, custo, geracoes]);
  if (!u.rowCount) return false;
  await c.query('INSERT INTO star_events(user_id,kind,stars,ref_id,note) VALUES ($1,$2,$3,$4,$5)', [userId, 'troca', -custo, refId, nota]);
  return true;
});
