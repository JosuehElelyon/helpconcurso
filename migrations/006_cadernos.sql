-- =========================================================
-- HelpConcurso — 006: Cadernos de Questões (Histórico acumulativo por Banca, Concurso e Edital)
-- =========================================================

CREATE TABLE IF NOT EXISTS cadernos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  descricao       text,
  banca           text NOT NULL,
  orgao           text,
  cargo           text,
  ano             text,
  edital_id       uuid REFERENCES editais(id) ON DELETE SET NULL,
  materiais_ids   jsonb NOT NULL DEFAULT '[]'::jsonb,
  provas_ids      jsonb NOT NULL DEFAULT '[]'::jsonb,
  questoes_extras jsonb NOT NULL DEFAULT '[]'::jsonb,
  respostas_extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  favoritas       jsonb NOT NULL DEFAULT '{}'::jsonb,
  anotacoes       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cadernos_user ON cadernos(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS cadernos_edital ON cadernos(edital_id);

ALTER TABLE question_sets ADD COLUMN IF NOT EXISTS caderno_id uuid REFERENCES cadernos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS question_sets_caderno ON question_sets(caderno_id);

