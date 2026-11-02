-- HelpConcurso — esquema inicial
-- Novas mudanças: crie migrations/002_<descricao>.sql (nunca edite um arquivo já aplicado).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  email              text NOT NULL UNIQUE,
  password_hash      text NOT NULL,
  role               text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  email_verified_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Códigos de 6 dígitos enviados por e-mail (só o hash é guardado)
CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('VERIFY_EMAIL','RESET_PASSWORD')),
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  attempts    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_type ON auth_tokens(user_id, type);

-- Material de estudo enviado pelo aluno
CREATE TABLE materials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   text,
  file_key    text,            -- chave do arquivo original no S3
  mime_type   text,
  size        int,
  pages       int,
  text        text NOT NULL,
  word_count  int NOT NULL,
  materia     text,
  assunto     text,
  detect      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX materials_user ON materials(user_id, created_at DESC);

-- Simulados gerados pela IA
CREATE TABLE question_sets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id  uuid REFERENCES materials(id) ON DELETE SET NULL,
  banca        text NOT NULL,
  materia      text NOT NULL,
  assunto      text,
  nivel        text NOT NULL,
  formato      text NOT NULL CHECK (formato IN ('me','ce')),
  arquivo      text,
  questoes     jsonb NOT NULL,
  respostas    jsonb NOT NULL DEFAULT '{}'::jsonb,
  finalizado   boolean NOT NULL DEFAULT false,
  model        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX question_sets_user ON question_sets(user_id, created_at DESC);

-- Provas anteriores enviadas para treinar a IA de cada banca
CREATE TABLE provas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banca          text NOT NULL,
  orgao          text,
  cargo          text,
  ano            text,
  titulo         text,
  file_name      text NOT NULL,
  file_key       text NOT NULL,
  gabarito_name  text,
  gabarito_key   text,
  status         text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','READY','FAILED')),
  error          text,
  materias       jsonb,
  analysis       jsonb,      -- características, padrões de enunciado, pegadinhas, dificuldade
  num_questoes   int,
  uploaded_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provas_banca_status ON provas(banca, status);

-- Questões reais extraídas das provas (exemplos usados na geração)
CREATE TABLE prova_questoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prova_id      uuid NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  banca         text NOT NULL,
  materia       text,
  numero        int,
  enunciado     text NOT NULL,
  alternativas  jsonb NOT NULL DEFAULT '[]'::jsonb,
  gabarito      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prova_questoes_banca_materia ON prova_questoes(banca, materia);
