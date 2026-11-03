-- =========================================================
-- HelpConcurso — 013: avatar do usuário (personalizado ou preset)
-- =========================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_key text;
