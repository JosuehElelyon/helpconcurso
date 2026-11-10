-- =========================================================
-- HelpConcurso — 027: Cartões salvos para cobrança recorrente (somente metadados não-sensíveis / tokenização)
-- Nunca armazena PAN completo nem CVV/CVC (PCI-DSS).
-- =========================================================

CREATE TABLE IF NOT EXISTS user_payment_methods (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gateway              text NOT NULL DEFAULT 'mercadopago',
  gateway_customer_id  text,
  gateway_card_id      text,
  brand                text NOT NULL,
  last4                text NOT NULL CHECK (char_length(last4) = 4),
  exp_month            int NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year             int NOT NULL CHECK (exp_year BETWEEN 2024 AND 2100),
  holder_name          text NOT NULL,
  doc_last4            text,
  is_default           boolean NOT NULL DEFAULT true,
  recorrente_ativo     boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_payment_methods_user_idx ON user_payment_methods(user_id);
