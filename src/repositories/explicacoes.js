// Repositório do cache global de explicações "Por que errei?" (tabela questao_explicacoes). Só SQL.
import { one } from '../db.js';

/** Explicações novas (geradas pela IA) pedidas pelo aluno hoje, no dia de Brasília. */
export const novasHoje = async (userId) => (await one(
  `SELECT count(*)::int AS n FROM questao_explicacoes
    WHERE criado_por=$1 AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date`,
  [userId]))?.n || 0;

/** Explicação já gerada para a mesma questão (id ou hash), resposta e gabarito. */
export const emCache = ({ questaoId, questaoHash, resposta, gabarito }) => one(
  `SELECT id, questao_id, questao_hash, resposta_aluno, gabarito_oficial, formato,
          diagnostico, pegadinha, exemplo_cotidiano, fundamentacao, dica_ouro, visual_svg,
          model, created_at
   FROM questao_explicacoes
   WHERE (questao_id = $1 OR questao_hash = $2) AND resposta_aluno = $3 AND gabarito_oficial = $4
   ORDER BY created_at DESC LIMIT 1`,
  [questaoId, questaoHash, resposta, gabarito]);

export const gravar = (c) => one(
  `INSERT INTO questao_explicacoes (
     questao_id, questao_hash, resposta_aluno, gabarito_oficial, formato,
     diagnostico, pegadinha, exemplo_cotidiano, fundamentacao, dica_ouro, visual_svg,
     model, tokens_in, tokens_out, criado_por
   ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
   RETURNING id, diagnostico, pegadinha, exemplo_cotidiano, fundamentacao, dica_ouro, visual_svg, model, created_at`,
  [c.questaoId, c.questaoHash, c.resposta, c.gabarito, c.formato, c.diagnostico, c.pegadinha, c.exemploCotidiano,
    c.fundamentacao, c.dicaOuro, c.visualSvg, c.modelo, c.tokensIn, c.tokensOut, c.criadoPor]);
