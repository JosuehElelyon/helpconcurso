-- =========================================================
-- HelpConcurso — 019: limites de requisição compartilhados entre instâncias da API (A2)
-- Antes ficavam na memória de cada processo: com 2+ instâncias, cada uma contava sozinha.
-- UNLOGGED: mais rápida; se o banco reiniciar sem desligar direito, os contadores zeram (aceitável).
-- =========================================================

CREATE UNLOGGED TABLE IF NOT EXISTS limites_requisicao (
  chave        text PRIMARY KEY,          -- <prefixo>:<limitador>:<aluno ou IP>
  hits         int NOT NULL,
  reinicia_em  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS limites_requisicao_reinicia ON limites_requisicao(reinicia_em);
