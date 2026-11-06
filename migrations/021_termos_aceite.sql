-- =========================================================
-- HelpConcurso — 021: registro do aceite dos Termos de Uso e da Política de Privacidade (LGPD)
-- Guarda qual versão o aluno aceitou e quando. Versão nova dos termos → o front pede novo aceite.
-- =========================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS termos_versao     text,
  ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz;
