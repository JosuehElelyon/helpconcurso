// Repositório de métodos de pagamento (cartões tokenizados para cobrança recorrente). Só SQL.
import { one, many, transacao } from '../db.js';

export const listarPorUsuario = (userId) => many(
  `SELECT id, gateway, gateway_customer_id, gateway_card_id, brand, last4, exp_month, exp_year,
          holder_name, doc_last4, is_default, recorrente_ativo, created_at, updated_at
   FROM user_payment_methods
   WHERE user_id=$1
   ORDER BY is_default DESC, created_at DESC`,
  [userId],
);

export const buscarDoUsuario = (id, userId) => one(
  `SELECT id, gateway, gateway_customer_id, gateway_card_id, brand, last4, exp_month, exp_year,
          holder_name, doc_last4, is_default, recorrente_ativo, created_at, updated_at
   FROM user_payment_methods
   WHERE id=$1 AND user_id=$2`,
  [id, userId],
);

export const adicionarComoPadrao = (userId, {
  gateway = 'mercadopago',
  gatewayCustomerId = null,
  gatewayCardId = null,
  brand,
  last4,
  expMonth,
  expYear,
  holderName,
  docLast4 = null,
  recorrenteAtivo = true,
}) => transacao(async (c) => {
  await c.query('UPDATE user_payment_methods SET is_default=false, updated_at=now() WHERE user_id=$1', [userId]);
  const r = await c.query(
    `INSERT INTO user_payment_methods
       (user_id, gateway, gateway_customer_id, gateway_card_id, brand, last4, exp_month, exp_year, holder_name, doc_last4, is_default, recorrente_ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)
     RETURNING id, gateway, gateway_customer_id, gateway_card_id, brand, last4, exp_month, exp_year,
               holder_name, doc_last4, is_default, recorrente_ativo, created_at, updated_at`,
    [userId, gateway, gatewayCustomerId, gatewayCardId, brand, last4, expMonth, expYear, holderName, docLast4, recorrenteAtivo],
  );
  return r.rows[0];
});

export const atualizar = (id, userId, { isDefault, recorrenteAtivo }) => transacao(async (c) => {
  if (isDefault === true) {
    await c.query('UPDATE user_payment_methods SET is_default=false, updated_at=now() WHERE user_id=$1', [userId]);
  }
  const r = await c.query(
    `UPDATE user_payment_methods
     SET is_default = coalesce($3, is_default),
         recorrente_ativo = coalesce($4, recorrente_ativo),
         updated_at = now()
     WHERE id=$1 AND user_id=$2
     RETURNING id, gateway, gateway_customer_id, gateway_card_id, brand, last4, exp_month, exp_year,
               holder_name, doc_last4, is_default, recorrente_ativo, created_at, updated_at`,
    [id, userId, isDefault ?? null, recorrenteAtivo ?? null],
  );
  return r.rows[0] || null;
});

export const remover = (id, userId) => transacao(async (c) => {
  const del = await c.query(
    `DELETE FROM user_payment_methods
     WHERE id=$1 AND user_id=$2
     RETURNING id, gateway, gateway_customer_id, gateway_card_id, is_default`,
    [id, userId],
  );
  if (!del.rowCount) return null;
  if (del.rows[0].is_default) {
    await c.query(
      `UPDATE user_payment_methods SET is_default=true, updated_at=now()
       WHERE id = (SELECT id FROM user_payment_methods WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)`,
      [userId],
    );
  }
  return del.rows[0];
});
