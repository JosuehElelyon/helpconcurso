-- =========================================================
-- HelpConcurso — 023: tokens escritos no cache de prompt (Anthropic: usage.cache_creation_input_tokens)
-- input_tokens já vem SEM os tokens lidos e escritos no cache: sem esta coluna, o prompt de sistema marcado para cache
-- ficava fora do custo e do teto diário. Escrita custa ~1,25× a entrada (cache de 5 minutos).
-- =========================================================

ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS cache_write_tokens int;
