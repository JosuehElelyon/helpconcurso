// Repositório de simulados (tabela question_sets). Só SQL: sem regra de negócio. Toda consulta filtra pelo dono.
import { one, many, query } from '../db.js';

const COLUNAS_INSERIR = ['user_id', 'material_id', 'edital_id', 'caderno_id', 'banca', 'materia', 'assunto', 'nivel', 'formato',
  'arquivo', 'questoes', 'model', 'review_stats', 'origem', 'estatisticas'];
const JSONB = new Set(['questoes', 'review_stats', 'estatisticas']);

export const buscar = (id, userId) => one('SELECT * FROM question_sets WHERE id=$1 AND user_id=$2', [id, userId]);

export const listar = (userId, limite = 300) =>
  many('SELECT * FROM question_sets WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limite]);

/** Insere um simulado; só as colunas informadas (as demais ficam com o padrão do banco). */
export function inserir(campos) {
  const cols = COLUNAS_INSERIR.filter((c) => campos[c] !== undefined);
  const vals = cols.map((c) => (JSONB.has(c) && campos[c] != null ? JSON.stringify(campos[c]) : campos[c]));
  return one(`INSERT INTO question_sets(${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, vals);
}

/** Atualiza o progresso; campo undefined/null mantém o valor atual. */
export const atualizarProgresso = (id, userId, { respostas, finalizado, tempoGastoSegundos, duvidas, estatisticas }) => one(
  `UPDATE question_sets SET
     respostas = COALESCE($3, respostas),
     finalizado = COALESCE($4, finalizado),
     tempo_gasto_segundos = COALESCE($5, tempo_gasto_segundos),
     duvidas = COALESCE($6, duvidas),
     estatisticas = COALESCE($7, estatisticas),
     updated_at = now()
   WHERE id=$1 AND user_id=$2 RETURNING *`,
  [id, userId, respostas ? JSON.stringify(respostas) : null, finalizado ?? null, tempoGastoSegundos ?? null,
    duvidas ? JSON.stringify(duvidas) : null, estatisticas ? JSON.stringify(estatisticas) : null]
);

export const excluir = (id, userId) => query('DELETE FROM question_sets WHERE id=$1 AND user_id=$2', [id, userId]);

// ---------- Simulados dentro de cadernos ----------

export const listarDoCaderno = (userId, cadernoId) =>
  many('SELECT * FROM question_sets WHERE user_id=$1 AND caderno_id=$2 ORDER BY created_at DESC', [userId, cadernoId]);

/** Simulados do aluno (resumo, para agrupar por caderno na lista). */
export const listarResumo = (userId, limite = 300) => many(
  `SELECT id, caderno_id, material_id, edital_id, banca, materia, assunto, nivel, formato, arquivo, questoes, respostas, finalizado, created_at
   FROM question_sets WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`, [userId, limite]);

export const vincularAoCaderno = (id, userId, cadernoId) =>
  query('UPDATE question_sets SET caderno_id=$3, updated_at=now() WHERE id=$1 AND user_id=$2', [id, userId, cadernoId]);

/** Puxa para o caderno os simulados ainda sem caderno que casam com o filtro (um só: editalId, banca ou materialId). */
export function vincularSoltos(userId, cadernoId, { editalId, banca, materialId }) {
  const [coluna, valor] = editalId ? ['edital_id', editalId] : materialId ? ['material_id', materialId] : ['banca', banca];
  return query(`UPDATE question_sets SET caderno_id=$1 WHERE user_id=$2 AND ${coluna}=$3 AND caderno_id IS NULL`, [cadernoId, userId, valor]);
}

export const desvincularDoCaderno = (userId, cadernoId) =>
  query('UPDATE question_sets SET caderno_id=NULL WHERE caderno_id=$1 AND user_id=$2', [cadernoId, userId]);

export const limparRespostasDoCaderno = (userId, cadernoId) =>
  query("UPDATE question_sets SET respostas='{}'::jsonb, finalizado=false, updated_at=now() WHERE user_id=$1 AND caderno_id=$2", [userId, cadernoId]);

/** Grava a resposta de UMA questão sem regravar as outras (null apaga). */
export const definirResposta = (id, userId, idx, resposta) => (resposta == null
  ? query("UPDATE question_sets SET respostas = coalesce(respostas, '{}'::jsonb) - $3::text, updated_at=now() WHERE id=$1 AND user_id=$2", [id, userId, String(idx)])
  : query("UPDATE question_sets SET respostas = coalesce(respostas, '{}'::jsonb) || jsonb_build_object($3::text, $4::text), updated_at=now() WHERE id=$1 AND user_id=$2", [id, userId, String(idx), resposta]));

/** Substitui as respostas e reabre o simulado ("refazer erradas"). */
export const redefinirRespostas = (id, userId, respostas) =>
  query('UPDATE question_sets SET respostas=$3, finalizado=false, updated_at=now() WHERE id=$1 AND user_id=$2', [id, userId, JSON.stringify(respostas)]);
