-- =========================================================
-- HelpConcurso — 025: Pagamentos e assinaturas via Mercado Pago (Pix e Cartão)
-- =========================================================

ALTER TABLE plano_pedidos
  ADD COLUMN IF NOT EXISTS gateway              text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS gateway_id           text,
  ADD COLUMN IF NOT EXISTS pix_copia_cola       text,
  ADD COLUMN IF NOT EXISTS pix_qr_code_base64   text,
  ADD COLUMN IF NOT EXISTS checkout_url         text,
  ADD COLUMN IF NOT EXISTS expira_em            timestamptz,
  ADD COLUMN IF NOT EXISTS pago_em              timestamptz,
  ADD COLUMN IF NOT EXISTS gateway_raw          jsonb;

CREATE INDEX IF NOT EXISTS plano_pedidos_gateway_id ON plano_pedidos(gateway_id) WHERE gateway_id IS NOT NULL;
