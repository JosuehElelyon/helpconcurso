-- Migração 020: Controle de versão da sessão do usuário e flexibilização de banca
-- Ao trocar ou redefinir a senha, a versão da sessão é incrementada, invalidando
-- imediatamente todos os tokens JWT emitidos em outras sessões e navegadores.
-- Permite também banca nula em question_sets para editais sem banca declarada (R10).

ALTER TABLE users ADD COLUMN IF NOT EXISTS sessao_versao int NOT NULL DEFAULT 1;

ALTER TABLE question_sets ALTER COLUMN banca DROP NOT NULL;

