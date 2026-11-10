-- =========================================================
-- HelpConcurso — 022: rastreio da qualidade por modelo e versão de prompt (Sprint 6 — medir)
-- Cada simulado guarda a versão do prompt que o gerou (o modelo já está em question_sets.model e o modelo
-- do revisor em review_stats.revisorModelo). O painel admin cruza com avaliações e erros confirmados.
-- =========================================================

ALTER TABLE question_sets ADD COLUMN IF NOT EXISTS prompt_versao text;
CREATE INDEX IF NOT EXISTS question_sets_criado ON question_sets(created_at);
