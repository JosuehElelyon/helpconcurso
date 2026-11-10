// Direitos do titular (LGPD, art. 18) e aceite dos termos: exportar dados, excluir a conta, registrar aceite.
import { HttpError } from '../lib/http.js';
import { checkPassword, hashPassword, publicUser } from '../lib/auth.js';
import { deleteFile } from '../lib/storage.js';
import { versaoDosTermos } from '../lib/termos.js';
import { PLANOS, planoDoUsuario } from '../lib/planos.js';
import { sendUpgradePedidoEmail } from '../lib/mailer.js';
import { config } from '../config.js';
import { generationQuota } from './quota.js';
import { criarPedidoUpgrade, obterPedidoPendente } from './pagamentos.js';
import * as contas from '../repositories/contas.js';
import * as usuarios from '../repositories/usuarios.js';
import * as planos from '../repositories/planos.js';
export { obterMetas, atualizarMetas } from './metas.js';

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

// ---------- Minha conta ----------
const perfil = (u) => ({
  ...publicUser(u),
  telefone: u.telefone || '', concursoAlvo: u.concurso_alvo || '', bancaPreferida: u.banca_preferida || '',
  dataProva: u.data_prova ? new Date(u.data_prova).toISOString().slice(0, 10) : '', metaDiaria: u.meta_diaria || null,
  membroDesde: u.created_at,
});

/** Tela "Minha conta": perfil, plano, uso de hoje e pedido de upgrade pendente. */
export async function visaoConta(u) {
  const plano = planoDoUsuario(u);
  const [uso, pedido, contagem] = await Promise.all([generationQuota(u), planos.pendenteDoAluno(u.id), contas.contagemEditaisECadernos(u.id)]);
  return {
    perfil: perfil(u),
    plano: { id: plano.id, nome: plano.nome, ate: plano.id === u.plano ? u.plano_ate : null, limites: plano.limites },
    uso: { simuladosHoje: uso.usedToday, dificeisHoje: uso.dificeisHoje, creditosExtras: uso.bonus, editais: contagem.editais, cadernos: contagem.cadernos },
    pedidoPendente: pedido ? { ...pedido, planoNome: PLANOS[pedido.plano]?.nome || pedido.plano } : null,
  };
}

export async function atualizarPerfil(user, dados) { return visaoConta(await usuarios.atualizarPerfil(user.id, dados)); }

/** Confere a senha atual e grava a nova (invalida as outras sessões). Devolve o usuário para renovar a sessão. */
export async function trocarSenha(user, senhaAtual, novaSenha) {
  const hash = await contas.hashDaSenha(user.id);
  if (!hash || !(await checkPassword(senhaAtual, hash))) throw new HttpError(400, 'Senha atual incorreta.');
  return usuarios.definirSenha(user.id, await hashPassword(novaSenha));
}

/** Troca o avatar e só depois apaga o arquivo antigo (se a gravação falhar, o aluno não fica sem foto). */
export async function trocarAvatar(userId, avatarUrl, avatarKey) {
  const antigo = await usuarios.avatar(userId);
  const u = await usuarios.definirAvatar(userId, avatarUrl, avatarKey);
  if (antigo?.avatar_key && antigo.avatar_key !== avatarKey) await deleteFile(antigo.avatar_key).catch(() => {});
  return visaoConta(u);
}

/** Pedido de upgrade: gera Pix via Mercado Pago se configurado, ou cria pedido manual para o admin confirmar. */
export async function pedirUpgrade(user, plano, periodicidade) {
  const pedido = await criarPedidoUpgrade(user, plano, periodicidade);
  return { pedido, conta: await visaoConta(user) };
}

export async function cancelarUpgrade(user) {
  await planos.cancelarPendenteDoAluno(user.id);
  return visaoConta(user);
}

export const obterPedidoUpgrade = (userId) => obterPedidoPendente(userId);

/** Foto de perfil pública (rota sem login, usada em <img>). */
export const avatarPublico = (userId) => usuarios.avatar(userId);
