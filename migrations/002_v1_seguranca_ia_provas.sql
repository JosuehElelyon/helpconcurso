-- v1.0 — provas enviadas por todos, revisão, segurança, fila de jobs persistente, uso de IA

-- Usuários: reputação de contribuição e créditos extras
ALTER TABLE users
  ADD COLUMN approved_contribs int NOT NULL DEFAULT 0,
  ADD COLUMN rejected_contribs int NOT NULL DEFAULT 0,
  ADD COLUMN bonus_credits     int NOT NULL DEFAULT 0,
  ADD COLUMN uploads_blocked_until timestamptz;

-- Provas: novo ciclo de vida
ALTER TABLE provas DROP CONSTRAINT IF EXISTS provas_status_check;
UPDATE provas SET status = 'QUEUED' WHERE status = 'PENDING';
ALTER TABLE provas
  ADD CONSTRAINT provas_status_check CHECK (status IN (
    'CHECKING',      -- verificações automáticas (OCR da amostra, classificação, duplicatas)
    'IN_REVIEW',     -- aguardando revisão de um administrador
    'QUEUED',        -- aprovada, aguardando treino
    'PROCESSING',    -- treinando (direto)
    'BATCH_PENDING', -- treinando em lote (mais barato, resposta em minutos/horas)
    'READY',         -- na base, usada nas gerações
    'DUPLICATE',     -- já existia na base
    'REJECTED',      -- recusada (automática ou pelo revisor)
    'FAILED'         -- erro técnico; pode ser reprocessada
  )),
  ADD COLUMN source          text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','user')),
  ADD COLUMN sha256          text,
  ADD COLUMN gabarito_sha256 text,
  ADD COLUMN fingerprint     jsonb,       -- minhash do início do texto (detecção de duplicatas)
  ADD COLUMN text            text,        -- texto extraído (ou transcrito por OCR)
  ADD COLUMN gabarito_text   text,
  ADD COLUMN needs_ocr       boolean NOT NULL DEFAULT false,
  ADD COLUMN ocr_done        boolean NOT NULL DEFAULT false,
  ADD COLUMN page_count      int,
  ADD COLUMN security        jsonb,       -- relatório das barreiras de segurança
  ADD COLUMN security_override boolean NOT NULL DEFAULT false,
  ADD COLUMN classification  jsonb,       -- resultado da checagem automática pela IA
  ADD COLUMN banca_informada text,
  ADD COLUMN duplicate_of    uuid REFERENCES provas(id) ON DELETE SET NULL,
  ADD COLUMN review_note     text,
  ADD COLUMN reviewed_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at     timestamptz,
  ADD COLUMN auto_approved   boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_batch_id     text,
  ADD COLUMN attempts        int NOT NULL DEFAULT 0;

-- Mesmo arquivo não entra duas vezes (exceto se a anterior foi recusada/duplicada)
CREATE UNIQUE INDEX provas_sha256_ativo ON provas(sha256) WHERE sha256 IS NOT NULL AND status NOT IN ('REJECTED','DUPLICATE');
CREATE INDEX provas_status ON provas(status, created_at);
CREATE INDEX provas_uploader ON provas(uploaded_by, created_at DESC);

-- Questões extraídas: guarda se passaram na varredura de segurança
ALTER TABLE prova_questoes ADD COLUMN flagged boolean NOT NULL DEFAULT false;

-- Materiais: hash e relatório de segurança
ALTER TABLE materials
  ADD COLUMN sha256   text,
  ADD COLUMN security jsonb,
  ADD COLUMN ocr      boolean NOT NULL DEFAULT false;

-- Fila de tarefas persistente (sobrevive a reinícios)
CREATE TABLE jobs (
  id           bigserial PRIMARY KEY,
  type         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','dead')),
  attempts     int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 4,
  run_after    timestamptz NOT NULL DEFAULT now(),
  locked_at    timestamptz,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_pick ON jobs(status, run_after, id);

-- Eventos de segurança (uploads bloqueados, suspeitas) para auditoria
CREATE TABLE security_events (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  kind       text NOT NULL,          -- material_bloqueado, prova_bloqueada, prova_suspeita, saida_ia_suspeita...
  severity   text NOT NULL,
  file_name  text,
  sha256     text,
  details    jsonb,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_events_user ON security_events(user_id, created_at DESC);

-- Uso de IA (custo e auditoria)
CREATE TABLE ai_usage (
  id            bigserial PRIMARY KEY,
  task          text NOT NULL,
  provider      text NOT NULL,
  model         text NOT NULL,
  input_tokens  int,
  output_tokens int,
  cache_read_tokens int,
  duration_ms   int,
  ok            boolean NOT NULL,
  fallback      boolean NOT NULL DEFAULT false,
  batch         boolean NOT NULL DEFAULT false,
  error         text,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_created ON ai_usage(created_at DESC);
