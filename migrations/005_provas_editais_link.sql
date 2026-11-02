-- v1.2.1 — Vínculo direto entre Provas, Editais, Bancas e Materiais

ALTER TABLE provas
  ADD COLUMN IF NOT EXISTS edital_id uuid REFERENCES editais(id) ON DELETE SET NULL;

ALTER TABLE editais
  ADD COLUMN IF NOT EXISTS prova_id uuid REFERENCES provas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS provas_edital ON provas(edital_id);

