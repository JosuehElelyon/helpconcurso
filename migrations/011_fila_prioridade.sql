-- =========================================================
-- HelpConcurso — 011: prioridade na fila de tarefas
-- Tarefas de fundo (rotular provas antigas, importação em lote) não podem atrasar as do aluno
-- (checar/treinar a prova que ele acabou de enviar, revisar erro reportado).
-- =========================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS prioridade integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS jobs_fila_prioridade ON jobs(prioridade DESC, id) WHERE status = 'queued';
