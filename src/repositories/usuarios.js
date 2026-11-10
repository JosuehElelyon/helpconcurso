// Repositório de usuários (tabela users) — leituras e contadores usados pelos serviços. Só SQL.
import { one, query } from '../db.js';

export const buscar = (id) => one('SELECT * FROM users WHERE id=$1', [id]);

/** Prova aprovada: conta a contribuição e dá gerações de bônus a quem enviou. */
export const creditarContribuicao = (id, bonus) =>
  query('UPDATE users SET approved_contribs=approved_contribs+1, bonus_credits=bonus_credits+$2 WHERE id=$1', [id, bonus]);

/** Prova recusada na revisão: conta contra a confiança de quem enviou. */
export const registrarRecusa = (id) => query('UPDATE users SET rejected_contribs=rejected_contribs+1 WHERE id=$1', [id]);

export const creditosExtras = async (id) => (await one('SELECT bonus_credits FROM users WHERE id=$1', [id]))?.bonus_credits || 0;

/** Gasta 1 crédito extra; false se não havia crédito. */
export const consumirCredito = async (id) => !!(await one('UPDATE users SET bonus_credits=bonus_credits-1 WHERE id=$1 AND bonus_credits > 0 RETURNING bonus_credits', [id]));

export const devolverCredito = (id) => query('UPDATE users SET bonus_credits=bonus_credits+1 WHERE id=$1', [id]);

export const enviosBloqueadosAte = async (id) => (await one('SELECT uploads_blocked_until FROM users WHERE id=$1', [id]))?.uploads_blocked_until || null;

export const metaEDataDaProva = (id) => one('SELECT meta_diaria, data_prova FROM users WHERE id=$1', [id]);
