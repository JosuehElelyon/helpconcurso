-- =========================================================
-- HelpConcurso — 018: limite diário do "Por que errei?" (Sprint 5.1, R3)
-- Guarda quem pediu a explicação nova (cache hit não conta) para aplicar o limite por plano.
-- =========================================================

ALTER TABLE questao_explicacoes ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_questao_explicacoes_autor ON questao_explicacoes(criado_por, created_at);
