// Repositório das contagens usadas nas cotas do plano. Só SQL, só leitura.
import { one } from '../db.js';

const HOJE_BR = "date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'";

/** Simulados gerados por IA hoje (dia de Brasília) e quantos deles nos níveis difíceis. Questões reais não contam. */
export const simuladosDeIAHoje = (userId, niveisDificeis) => one(
  `SELECT count(*)::int AS n, count(*) FILTER (WHERE nivel = ANY($2::text[]))::int AS dif
   FROM question_sets WHERE user_id=$1 AND origem='ia' AND created_at >= ${HOJE_BR}`, [userId, niveisDificeis]);

const TABELAS = { editais: 'editais', cadernos: 'cadernos' };
/** Quantos itens do recurso o aluno tem (editais, cadernos). */
export async function contarDoAluno(recurso, userId) {
  const tabela = TABELAS[recurso];
  if (!tabela) throw new Error('recurso sem contagem: ' + recurso);
  return (await one(`SELECT count(*)::int AS n FROM ${tabela} WHERE user_id=$1`, [userId])).n;
}

export const materiaisNas24h = async (userId) =>
  (await one("SELECT count(*)::int AS n FROM materials WHERE user_id=$1 AND created_at > now() - interval '24 hours'", [userId])).n;
