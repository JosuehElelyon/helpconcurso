// Repositório dos pedidos de plano (tabela plano_pedidos) e da ativação do plano no usuário. Só SQL.
import { one, many, query, transacao } from '../db.js';

export const listarPedidos = () => many(
  `SELECT pp.id, pp.plano, pp.periodicidade, pp.valor, pp.status, pp.gateway, pp.gateway_id, pp.pago_em, pp.pix_copia_cola, pp.created_at,
          u.id AS user_id, u.name, u.email, u.avatar_url, u.plano AS plano_atual, u.plano_ate
   FROM plano_pedidos pp JOIN users u ON u.id = pp.user_id
   ORDER BY (pp.status = 'pendente') DESC, pp.created_at DESC LIMIT 200`);

export const buscarPedido = (id) =>
  one(`SELECT pp.*, u.id AS user_id, u.name, u.email, u.plano AS plano_atual, u.plano_ate
       FROM plano_pedidos pp JOIN users u ON u.id = pp.user_id WHERE pp.id = $1`, [id]);

export const buscarPorGatewayId = (gatewayId) =>
  one(`SELECT pp.*, u.id AS user_id, u.name, u.email, u.plano AS plano_atual, u.plano_ate
       FROM plano_pedidos pp JOIN users u ON u.id = pp.user_id WHERE pp.gateway_id = $1`, [gatewayId]);

export const pedidoPendente = (id) => one("SELECT * FROM plano_pedidos WHERE id=$1 AND status='pendente'", [id]);

export const decidirPedido = (id, status, adminId) =>
  query('UPDATE plano_pedidos SET status=$2, decidido_por=$3, decidido_em=now() WHERE id=$1', [id, status, adminId]);

export const aprovarPedidoComGateway = (pedidoId, { gatewayId = null, gatewayRaw = null } = {}) =>
  one(`UPDATE plano_pedidos
       SET status='aprovado', decidido_em=now(), pago_em=now(),
           gateway_id=coalesce($2, gateway_id), gateway_raw=coalesce($3, gateway_raw)
       WHERE id=$1 AND status='pendente'
       RETURNING *`, [pedidoId, gatewayId, gatewayRaw ? JSON.stringify(gatewayRaw) : null]);

/** Aprovação e ativação atômica com idempotência para gateways e webhooks */
export const aprovarEAtivarPlano = (pedidoId, userId, plano, periodicidade, { gatewayId = null, gatewayRaw = null } = {}) =>
  transacao(async (c) => {
    const ped = await c.query(
      `UPDATE plano_pedidos
       SET status='aprovado', decidido_em=now(), pago_em=now(),
           gateway_id=coalesce($2, gateway_id), gateway_raw=coalesce($3, gateway_raw)
       WHERE id=$1 AND status='pendente'
       RETURNING *`,
      [pedidoId, gatewayId, gatewayRaw ? JSON.stringify(gatewayRaw) : null]
    );
    if (!ped.rowCount) return null;
    const usr = await c.query(
      `UPDATE users SET plano=$2,
         plano_ate = greatest(coalesce(CASE WHEN plano=$2 THEN plano_ate END, now()), now()) + (CASE WHEN $3='anual' THEN interval '1 year' ELSE interval '1 month' END),
         updated_at=now() WHERE id=$1 RETURNING *`,
      [userId, plano, periodicidade]
    );
    return { pedido: ped.rows[0], usuario: usr.rows[0] };
  });

export const atualizarDadosGateway = (pedidoId, { gateway, gatewayId, pixCopiaCola, pixQrCodeBase64, checkoutUrl, expiraEm, gatewayRaw }) =>
  one(`UPDATE plano_pedidos
       SET gateway=$2, gateway_id=$3, pix_copia_cola=$4, pix_qr_code_base64=$5,
           checkout_url=$6, expira_em=$7, gateway_raw=$8
       WHERE id=$1
       RETURNING *`,
    [pedidoId, gateway, gatewayId, pixCopiaCola, pixQrCodeBase64, checkoutUrl, expiraEm, gatewayRaw ? JSON.stringify(gatewayRaw) : null]);

/** Ativa o plano; renovação do mesmo plano soma ao período que ainda resta. */
export const ativarPlano = (userId, plano, periodicidade) => one(
  `UPDATE users SET plano=$2,
     plano_ate = greatest(coalesce(CASE WHEN plano=$2 THEN plano_ate END, now()), now()) + (CASE WHEN $3='anual' THEN interval '1 year' ELSE interval '1 month' END),
     updated_at=now() WHERE id=$1 RETURNING *`, [userId, plano, periodicidade]);

export const pendenteDoAluno = (userId) =>
  one(`SELECT id, plano, periodicidade, valor, status, gateway, gateway_id, pix_copia_cola, pix_qr_code_base64, checkout_url, expira_em, created_at
       FROM plano_pedidos WHERE user_id=$1 AND status='pendente'`, [userId]);

/** Cria o pedido de upgrade ou troca o pendente (um pendente por aluno). */
export const pedirUpgrade = (userId, plano, periodicidade, valor, {
  gateway = 'manual',
  gatewayId = null,
  pixCopiaCola = null,
  pixQrCodeBase64 = null,
  checkoutUrl = null,
  expiraEm = null,
  gatewayRaw = null,
} = {}) => one(
  `INSERT INTO plano_pedidos(user_id, plano, periodicidade, valor, gateway, gateway_id, pix_copia_cola, pix_qr_code_base64, checkout_url, expira_em, gateway_raw)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
   ON CONFLICT (user_id) WHERE status = 'pendente'
   DO UPDATE SET plano=EXCLUDED.plano, periodicidade=EXCLUDED.periodicidade, valor=EXCLUDED.valor,
                 gateway=EXCLUDED.gateway, gateway_id=EXCLUDED.gateway_id,
                 pix_copia_cola=EXCLUDED.pix_copia_cola, pix_qr_code_base64=EXCLUDED.pix_qr_code_base64,
                 checkout_url=EXCLUDED.checkout_url, expira_em=EXCLUDED.expira_em,
                 gateway_raw=EXCLUDED.gateway_raw, created_at=now()
   RETURNING *`,
  [userId, plano, periodicidade, valor, gateway, gatewayId, pixCopiaCola, pixQrCodeBase64, checkoutUrl, expiraEm, gatewayRaw ? JSON.stringify(gatewayRaw) : null]);

export const cancelarPendenteDoAluno = (userId) =>
  query("UPDATE plano_pedidos SET status='cancelado', decidido_em=now() WHERE user_id=$1 AND status='pendente'", [userId]);
