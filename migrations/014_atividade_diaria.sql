-- Atividade diária do aluno (dia de Brasília): base da meta diária e da sequência de dias de estudo
CREATE TABLE IF NOT EXISTS atividade_diaria (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dia date NOT NULL,
  respondidas int NOT NULL DEFAULT 0,
  acertos int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dia)
);
