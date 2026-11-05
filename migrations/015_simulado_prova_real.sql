-- =========================================================
-- HelpConcurso — 015: Sprint 5 (Simulado no Formato da Prova Real - F3)
-- Cronômetro, navegação de prova, marcação de dúvidas, nota líquida e estatísticas por matéria
-- =========================================================

ALTER TABLE question_sets
  ADD COLUMN IF NOT EXISTS modo_prova           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tempo_limite_minutos int,
  ADD COLUMN IF NOT EXISTS tempo_gasto_segundos int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duvidas              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estatisticas         jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS question_sets_modo_prova ON question_sets(modo_prova);

