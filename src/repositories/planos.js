// Repositório dos pedidos de plano (tabela plano_pedidos) e da ativação do plano no usuário. Só SQL.
import { one, many, query } from '../db.js';

export const listarPedidos = () => many(
  `SELECT pp.id, pp.plano, pp.periodicidade, pp.valor, pp.status, pp.created_at, u.id AS user_id, u.name, u.email, u.avatar_url, u.plano AS plano_atual, u.plano_ate
   FROM plano_pedidos pp JOIN users u ON u.id = pp.user_id
   ORDER BY (pp.status = 'pendente') DESC, pp.created_at DESC LIMIT 200`);

export const pedidoPendente = (id) => one("SELECT * FROM plano_pedidos WHERE id=$1 AND status='pendente'", [id]);

export const decidirPedido = (id, status, adminId) =>
  query('UPDATE plano_pedidos SET status=$2, decidido_por=$3, decidido_em=now() WHERE id=$1', [id, status, adminId]);

/** Ativa o plano; renovação do mesmo plano soma ao período que ainda resta. */
export const ativarPlano = (userId, plano, periodicidade) => one(
  `UPDATE users SET plano=$2,
     plano_ate = greatest(coalesce(CASE WHEN plano=$2 THEN plano_ate END, now()), now()) + (CASE WHEN $3='anual' THEN interval '1 year' ELSE interval '1 month' END),
     updated_at=now() WHERE id=$1 RETURNING *`, [userId, plano, periodicidade]);

export const pendenteDoAluno = (userId) =>
  one("SELECT id, plano, periodicidade, valor, status, created_at FROM plano_pedidos WHERE user_id=$1 AND status='pendente'", [userId]);

/** Cria o pedido de upgrade ou troca o pendente (um pendente por aluno). */
export const pedirUpgrade = (userId, plano, periodicidade, valor) => one(
  `INSERT INTO plano_pedidos(user_id, plano, periodicidade, valor) VALUES ($1,$2,$3,$4)
   ON CONFLICT (user_id) WHERE status = 'pendente'
   DO UPDATE SET plano=EXCLUDED.plano, periodicidade=EXCLUDED.periodicidade, valor=EXCLUDED.valor, created_at=now()
   RETURNING *`, [userId, plano, periodicidade, valor]);

export const cancelarPendenteDoAluno = (userId) =>
  query("UPDATE plano_pedidos SET status='cancelado', decidido_em=now() WHERE user_id=$1 AND status='pendente'", [userId]);
