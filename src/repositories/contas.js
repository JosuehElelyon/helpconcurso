// Repositório da conta do aluno (tabela users e dados ligados a ela) para LGPD: aceite dos termos, exportação e exclusão.
import { one, many, query } from '../db.js';

export const registrarAceiteTermos = (userId, versao) =>
  one('UPDATE users SET termos_versao=$2, termos_aceitos_em=now(), updated_at=now() WHERE id=$1 RETURNING *', [userId, versao]);

export const hashDaSenha = async (userId) => (await one('SELECT password_hash FROM users WHERE id=$1', [userId]))?.password_hash || null;

/** Chaves de arquivos no S3 que são só deste aluno (provas enviadas ficam: são da base compartilhada). */
export async function arquivosDoAluno(userId) {
  const rows = await many(
    `SELECT file_key AS k FROM materials WHERE user_id=$1 AND file_key IS NOT NULL
     UNION ALL SELECT file_key FROM editais WHERE user_id=$1 AND file_key IS NOT NULL
     UNION ALL SELECT avatar_key FROM users WHERE id=$1 AND avatar_key IS NOT NULL`, [userId]);
  return rows.map((r) => r.k);
}

/**
 * Exclui a conta. As tabelas do aluno caem em cascata (materiais, simulados, cadernos, editais, atividade, avaliações,
 * pedidos, códigos); provas enviadas, registros de segurança e de uso de IA ficam sem autoria (ON DELETE SET NULL).
 */
export const excluirUsuario = (userId) => query('DELETE FROM users WHERE id=$1', [userId]);

/** Todos os dados pessoais do aluno, para portabilidade (art. 18, V). */
export async function dadosDoAluno(userId) {
  const [perfil, materiais, editais, simulados, cadernos, atividade, avaliacoesEReportes, estrelas, pedidos, provasEnviadas] = await Promise.all([
    one(`SELECT id, name, email, role, telefone, concurso_alvo, banca_preferida, data_prova, meta_diaria, plano, plano_ate,
                stars_total, stars_balance, termos_versao, termos_aceitos_em, email_verified_at, created_at FROM users WHERE id=$1`, [userId]),
    many('SELECT id, file_name, materia, assunto, word_count, text, edital_id, created_at FROM materials WHERE user_id=$1 ORDER BY created_at', [userId]),
    many('SELECT id, titulo, banca, orgao, cargo, ano, verticalizado, active, created_at FROM editais WHERE user_id=$1 ORDER BY created_at', [userId]),
    many(`SELECT id, banca, materia, assunto, nivel, formato, origem, questoes, respostas, finalizado, tempo_gasto_segundos, estatisticas, created_at
          FROM question_sets WHERE user_id=$1 ORDER BY created_at`, [userId]),
    many(`SELECT id, titulo, descricao, banca, orgao, cargo, ano, favoritas, anotacoes, respostas_extras, revisao_espacada, created_at
          FROM cadernos WHERE user_id=$1 ORDER BY created_at`, [userId]),
    many("SELECT to_char(dia, 'YYYY-MM-DD') AS dia, respondidas, acertos FROM atividade_diaria WHERE user_id=$1 ORDER BY dia", [userId]),
    many('SELECT * FROM question_feedback WHERE user_id=$1 ORDER BY created_at', [userId]),
    many('SELECT * FROM star_events WHERE user_id=$1 ORDER BY created_at', [userId]),
    many('SELECT id, plano, periodicidade, valor, status, created_at FROM plano_pedidos WHERE user_id=$1 ORDER BY created_at', [userId]),
    many('SELECT id, banca, titulo, orgao, cargo, ano, status, created_at FROM provas WHERE uploaded_by=$1 ORDER BY created_at', [userId]),
  ]);
  return { perfil, materiais, editais, simulados, cadernos, atividade, avaliacoesEReportes, estrelas, pedidos, provasEnviadas };
}

export const contagemEditaisECadernos = (userId) =>
  one('SELECT (SELECT count(*) FROM editais WHERE user_id=$1)::int AS editais, (SELECT count(*) FROM cadernos WHERE user_id=$1)::int AS cadernos', [userId]);
