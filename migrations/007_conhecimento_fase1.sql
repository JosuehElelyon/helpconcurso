-- =========================================================
-- HelpConcurso — 007: Base de conhecimento, Fase 1 (docs/ARQUITETURA-CONHECIMENTO.md)
-- Taxonomia própria · editais canônicos (lidos uma vez) · questões de prova rotuladas · versão de prompt
-- =========================================================

-- Taxonomia própria: matéria → tópico (IDs do HelpConcurso, independentes de edital, prova ou IA)
CREATE TABLE IF NOT EXISTS taxonomia (
  id          text PRIMARY KEY,                 -- slug estável, ex.: 'direito-administrativo' ou 'direito-administrativo/atos-administrativos'
  tipo        text NOT NULL CHECK (tipo IN ('materia', 'topico')),
  pai_id      text REFERENCES taxonomia(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  nome_norm   text NOT NULL,                    -- minúsculo, sem acento, só letras/números (para casar nomes)
  sinonimos   jsonb NOT NULL DEFAULT '[]'::jsonb,
  origem      text NOT NULL DEFAULT 'regra',    -- 'semente' | 'regra' | 'admin'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS taxonomia_pai_nome ON taxonomia(coalesce(pai_id, ''), nome_norm);

-- Edital canônico: o conteúdo programático de um edital público, extraído pela IA uma única vez
CREATE TABLE IF NOT EXISTS editais_canonicos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave          text NOT NULL UNIQUE,          -- sha256 do texto normalizado + cargo pedido
  titulo         text,
  orgao          text,
  cargo          text,
  banca          text,
  ano            text,
  verticalizado  jsonb NOT NULL,                -- [{id, materia, materiaId, peso, topicos:[{id, codigo, nome, topicoId}]}]
  prompt_versao  text,
  usos           int NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE editais ADD COLUMN IF NOT EXISTS canonico_id uuid REFERENCES editais_canonicos(id) ON DELETE SET NULL;

-- Questões reais rotuladas na extração (como a banca cobra)
ALTER TABLE prova_questoes
  ADD COLUMN IF NOT EXISTS topico         text,
  ADD COLUMN IF NOT EXISTS materia_id     text REFERENCES taxonomia(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topico_id      text REFERENCES taxonomia(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comando        text,
  ADD COLUMN IF NOT EXISTS pegadinha_tipo text,
  ADD COLUMN IF NOT EXISTS habilidade     text,
  ADD COLUMN IF NOT EXISTS dispositivos   jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS prova_questoes_topico ON prova_questoes(banca, topico_id) WHERE NOT flagged;
CREATE INDEX IF NOT EXISTS prova_questoes_pegadinha ON prova_questoes(banca, pegadinha_tipo) WHERE NOT flagged;

-- Versão do prompt em cada chamada de IA (para comparar modelos/prompts e reprocessar)
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS prompt_versao text;
