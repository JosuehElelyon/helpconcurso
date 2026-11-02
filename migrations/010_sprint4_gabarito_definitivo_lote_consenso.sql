-- =========================================================
-- HelpConcurso — 010: Sprint 4 (Base Maior e Mais Confiável)
-- Gabarito definitivo, anulações oficiais e consenso de gabarito
-- =========================================================

-- F7: Rastreamento de gabarito definitivo e anulações em questões de prova
ALTER TABLE prova_questoes
  ADD COLUMN IF NOT EXISTS anulada               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gabarito_alterado      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gabarito_original      text,
  ADD COLUMN IF NOT EXISTS motivo_anulacao        text,
  ADD COLUMN IF NOT EXISTS gabarito_definitivo    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_gabarito      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS divergencia_gabarito   jsonb;

CREATE INDEX IF NOT EXISTS prova_questoes_anulada ON prova_questoes(anulada);
CREATE INDEX IF NOT EXISTS prova_questoes_consenso ON prova_questoes(consenso_gabarito);

-- Provas: suporte a gabarito definitivo oficial
ALTER TABLE provas
  ADD COLUMN IF NOT EXISTS gabarito_definitivo            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gabarito_definitivo_url        text,
  ADD COLUMN IF NOT EXISTS gabarito_definitivo_confirmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_concluido             boolean DEFAULT true;

