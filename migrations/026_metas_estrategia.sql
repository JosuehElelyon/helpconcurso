-- =========================================================
-- HelpConcurso — 026: Estratégia de treino e foco das metas
-- =========================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS meta_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE question_sets DROP CONSTRAINT IF EXISTS question_sets_origem_check;
ALTER TABLE question_sets ADD CONSTRAINT question_sets_origem_check
  CHECK (origem IN ('ia', 'prova_real', 'revanche', 'meta_treino'));
