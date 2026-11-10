-- =========================================================
-- HelpConcurso — 024: vínculo prova ↔ edital POR ALUNO
-- Provas são da base compartilhada; editais são de cada aluno. A coluna única provas.edital_id fazia o vínculo de um
-- aluno sobrescrever (ou bloquear) o de outro que usasse a mesma prova. Agora cada aluno liga a prova aos SEUS editais.
-- provas.edital_id fica obsoleta (não é mais lida nem gravada); os vínculos existentes são copiados abaixo.
-- =========================================================

CREATE TABLE IF NOT EXISTS provas_editais (
  prova_id   uuid NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  edital_id  uuid NOT NULL REFERENCES editais(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- dono do edital
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prova_id, edital_id)
);
CREATE INDEX IF NOT EXISTS provas_editais_edital ON provas_editais(edital_id);
CREATE INDEX IF NOT EXISTS provas_editais_aluno ON provas_editais(user_id, prova_id);

INSERT INTO provas_editais (prova_id, edital_id, user_id)
SELECT p.id, p.edital_id, e.user_id
FROM provas p JOIN editais e ON e.id = p.edital_id
WHERE p.edital_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN provas.edital_id IS 'Obsoleta desde a migração 024: use provas_editais (vínculo por aluno).';
