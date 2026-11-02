-- =========================================================
-- HelpConcurso — 008: Arquitetura de Veracidade e URL Oficial Primária
-- Adiciona rastreabilidade da fonte oficial primária para provas e editais
-- =========================================================

-- Provas: URL oficial de divulgação e confirmação de proveniência primária
ALTER TABLE provas
  ADD COLUMN IF NOT EXISTS official_url        text,
  ADD COLUMN IF NOT EXISTS oficial_confirmado  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_url_tipo   text;

CREATE INDEX IF NOT EXISTS provas_oficial ON provas(oficial_confirmado) WHERE oficial_confirmado;

-- Editais do usuário: URL oficial do edital/retificação
ALTER TABLE editais
  ADD COLUMN IF NOT EXISTS official_url        text,
  ADD COLUMN IF NOT EXISTS oficial_confirmado  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_url_tipo   text;

CREATE INDEX IF NOT EXISTS editais_oficial ON editais(oficial_confirmado) WHERE oficial_confirmado;

-- Editais canônicos: link com a fonte primária oficial
ALTER TABLE editais_canonicos
  ADD COLUMN IF NOT EXISTS official_url        text,
  ADD COLUMN IF NOT EXISTS oficial_confirmado  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_url_tipo   text;
