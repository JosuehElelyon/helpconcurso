-- =========================================================
-- HelpConcurso — 009: Sprint 3 (Revisão Espaçada e Questões Reais por Tópico)
-- =========================================================

-- F2: Revisão espaçada no Caderno de Questões
-- Armazena o ciclo de repetição espaçada por questão (intervalos 1, 3, 7 e 15 dias)
ALTER TABLE cadernos
  ADD COLUMN IF NOT EXISTS revisao_espacada jsonb NOT NULL DEFAULT '{}'::jsonb;

-- F1: Suporte a simulados criados com questões reais de provas (custo US$ 0 de IA)
ALTER TABLE question_sets
  ADD COLUMN IF NOT EXISTS origem          text NOT NULL DEFAULT 'ia' CHECK (origem IN ('ia', 'prova_real')),
  ADD COLUMN IF NOT EXISTS topico_id       text REFERENCES taxonomia(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topico_codigo   text;

CREATE INDEX IF NOT EXISTS question_sets_origem ON question_sets(origem);
CREATE INDEX IF NOT EXISTS question_sets_topico ON question_sets(topico_id);
