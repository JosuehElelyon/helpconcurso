-- =========================================================
-- HelpConcurso — 012: planos (Grátis / Essencial / Aprovação) e perfil do aluno
-- =========================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plano          text NOT NULL DEFAULT 'gratis',
  ADD COLUMN IF NOT EXISTS plano_ate      timestamptz,          -- fim do período pago (null = sem vencimento, ex.: liberado pelo admin)
  ADD COLUMN IF NOT EXISTS telefone       text,
  ADD COLUMN IF NOT EXISTS concurso_alvo  text,
  ADD COLUMN IF NOT EXISTS banca_preferida text,
  ADD COLUMN IF NOT EXISTS data_prova     date,
  ADD COLUMN IF NOT EXISTS meta_diaria    integer;

-- Pedidos de upgrade: o aluno escolhe o plano; o admin confirma o pagamento e ativa (sem gateway por enquanto)
CREATE TABLE IF NOT EXISTS plano_pedidos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plano          text NOT NULL,
  periodicidade  text NOT NULL CHECK (periodicidade IN ('mensal', 'anual')),
  valor          numeric(10,2) NOT NULL,
  status         text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
  decidido_por   uuid REFERENCES users(id) ON DELETE SET NULL,
  decidido_em    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plano_pedidos_pendentes ON plano_pedidos(created_at) WHERE status = 'pendente';
CREATE UNIQUE INDEX IF NOT EXISTS plano_pedidos_um_pendente ON plano_pedidos(user_id) WHERE status = 'pendente';
