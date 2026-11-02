-- v1.2 — Editais verticalizados, cruzamento Material × Edital × Questões e acompanhamento de avanço

CREATE TABLE editais (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo         text NOT NULL,
  orgao          text,
  cargo          text,
  banca          text,
  ano            text,
  file_name      text,
  file_key       text,
  mime_type      text,
  size           int,
  pages          int,
  text           text NOT NULL,
  word_count     int NOT NULL,
  verticalizado  jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{id, materia, peso, topicos:[{id, codigo, nome}]}]
  sha256         text,
  security       jsonb,
  ocr            boolean NOT NULL DEFAULT false,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX editais_user ON editais(user_id, active DESC, created_at DESC);

ALTER TABLE materials
  ADD COLUMN edital_id    uuid REFERENCES editais(id) ON DELETE SET NULL,
  ADD COLUMN edital_match jsonb;

ALTER TABLE question_sets
  ADD COLUMN edital_id    uuid REFERENCES editais(id) ON DELETE SET NULL;

