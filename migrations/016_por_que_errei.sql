-- =========================================================
-- HelpConcurso — 016: Sprint 5 (Por que errei? sob Demanda - F4)
-- Armazenamento e cache global de explicações didáticas com analogias e embasamento legal
-- =========================================================

CREATE TABLE IF NOT EXISTS questao_explicacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id          uuid REFERENCES prova_questoes(id) ON DELETE CASCADE,
  questao_hash        text NOT NULL,
  resposta_aluno      text NOT NULL,
  gabarito_oficial    text NOT NULL,
  formato             text NOT NULL CHECK (formato IN ('ce', 'me')),
  diagnostico         text NOT NULL,
  pegadinha           text NOT NULL,
  exemplo_cotidiano   text NOT NULL,
  fundamentacao       text NOT NULL,
  dica_ouro           text NOT NULL,
  visual_svg          text,
  model               text,
  tokens_in           int,
  tokens_out          int,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questao_explicacoes_hash_resp ON questao_explicacoes(questao_hash, resposta_aluno);
CREATE INDEX IF NOT EXISTS idx_questao_explicacoes_qid_resp ON questao_explicacoes(questao_id, resposta_aluno);

