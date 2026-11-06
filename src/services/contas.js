// Direitos do titular (LGPD, art. 18) e aceite dos termos: exportar dados, excluir a conta, registrar aceite.
import { HttpError } from '../lib/http.js';
import { checkPassword } from '../lib/auth.js';
import { deleteFile } from '../lib/storage.js';
import { versaoDosTermos } from '../lib/termos.js';
import * as contas from '../repositories/contas.js';

export const aceitarTermos = (user) => contas.registrarAceiteTermos(user.id, versaoDosTermos());

/** Portabilidade: todos os dados pessoais do aluno num JSON. */
export async function exportarDados(user) {
  return { geradoEm: new Date().toISOString(), formato: 'HelpConcurso — exportação de dados pessoais (LGPD art. 18, V)', ...(await contas.dadosDoAluno(user.id)) };
}

/**
 * Eliminação: confere a senha, apaga a conta (cascata no banco) e os arquivos do aluno no S3.
 * Admin não se exclui por aqui (evita ficar sem administrador por engano).
 */
export async function excluirConta(user, senha) {
  if (user.role === 'ADMIN') throw new HttpError(403, 'Conta de administrador não pode ser excluída por aqui.');
  const hash = await contas.hashDaSenha(user.id);
  if (!hash || !(await checkPassword(String(senha || ''), hash))) throw new HttpError(400, 'Senha incorreta.');
  const arquivos = await contas.arquivosDoAluno(user.id);
  await contas.excluirUsuario(user.id);
  // Arquivos depois do banco: se o S3 falhar, a conta já não existe e o arquivo fica órfão (registrado no log)
  for (const k of arquivos) await deleteFile(k).catch((e) => console.error('[ERRO-INTERNO] [LGPD] arquivo não apagado ao excluir conta:', k, e.message));
  return { ok: true, arquivosApagados: arquivos.length };
}
