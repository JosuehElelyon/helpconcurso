-- =====================================================================
-- 017: Bateria de Revanche da IA ("Destruir Ponto Cego")
-- Permite origem='revanche' em question_sets
-- =====================================================================

ALTER TABLE question_sets DROP CONSTRAINT IF EXISTS question_sets_origem_check;
ALTER TABLE question_sets ADD CONSTRAINT question_sets_origem_check CHECK (origem IN ('ia', 'prova_real', 'revanche'));

