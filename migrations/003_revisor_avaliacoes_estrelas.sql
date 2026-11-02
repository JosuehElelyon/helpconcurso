-- v1.1 — revisor automático, avaliação das questões, reporte de erro e estrelas

-- Estrelas: total acumulado (define o nível) e saldo (pode ser trocado por gerações extras)
ALTER TABLE users
  ADD COLUMN stars_total   int NOT NULL DEFAULT 0,
  ADD COLUMN stars_balance int NOT NULL DEFAULT 0;

-- Extrato de estrelas. A chave única impede ganhar duas vezes pela mesma contribuição.
CREATE TABLE star_events (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,   -- prova_aprovada, erro_confirmado, avaliacao, troca
  stars      int NOT NULL,    -- positivo = ganhou; negativo = trocou
  ref_id     text NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);
CREATE INDEX star_events_user ON star_events(user_id, created_at DESC);

-- Avaliações e reportes de erro por questão (dados próprios do produto: base para melhorar a geração)
CREATE TABLE question_feedback (
  id            bigserial PRIMARY KEY,
  set_id        uuid NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  q_index       int NOT NULL,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banca         text NOT NULL,
  materia       text,
  rating        smallint CHECK (rating IN (-1, 1)),
  report_reason text,
  report_status text NOT NULL DEFAULT 'none' CHECK (report_status IN ('none','pending','confirmed','rejected','failed')),
  report_result jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, q_index, user_id)
);
CREATE INDEX question_feedback_banca ON question_feedback(banca, rating);

-- Resultado do revisor por simulado
ALTER TABLE question_sets ADD COLUMN review_stats jsonb;
