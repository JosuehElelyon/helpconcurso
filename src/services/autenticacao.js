// Cadastro, confirmação de e-mail, entrada e recuperação de senha. A rota só valida e abre/fecha a sessão.
import { HttpError } from '../lib/http.js';
import { hashPassword, checkPassword, issueCode, consumeCode } from '../lib/auth.js';
import { sendVerificationEmail, sendResetEmail } from '../lib/mailer.js';
import { versaoDosTermos } from '../lib/termos.js';
import { config } from '../config.js';
import * as usuarios from '../repositories/usuarios.js';

const CODE_MSG = { expired: 'Código expirado. Peça um novo.', attempts: 'Muitas tentativas erradas. Peça um novo código.', invalid: 'Código incorreto.' };

async function enviarCodigoDeConfirmacao(user) {
  const { code, ttlMin } = await issueCode(user.id, 'VERIFY_EMAIL');
  return sendVerificationEmail(user, code, ttlMin);
}

/** Cria (ou refaz, se ainda não confirmada) a conta e envia o código. Devolve { email, aviso }. */
export async function cadastrar({ name, email, password }) {
  const isAdminEmail = config.adminEmails.includes(email);
  const isInvited = isAdminEmail || config.allowedEmails.includes(email);
  if (config.registrationMode === 'allowlist' && !isInvited) {
    throw new HttpError(403, 'O cadastro está aberto apenas para convidados nesta fase de testes.');
  }
  let user = await usuarios.porEmail(email);
  // Conta confirmada nunca é sobrescrita pelo cadastro (nem de convidado/admin): quem esqueceu a senha usa "Esqueci a senha".
  // Toda conta só é ativada pelo código enviado ao e-mail — é isso que prova que a pessoa é dona do endereço.
  if (user?.email_verified_at) throw new HttpError(409, 'Já existe uma conta com este e-mail. Entre ou recupere a senha.');
  const dados = { nome: name, hash: await hashPassword(password), papel: isAdminEmail ? 'ADMIN' : 'USER', versaoTermos: versaoDosTermos() };
  // Aceite dos termos registrado com a versão vigente (LGPD: prova de que o aluno foi informado)
  user = user ? await usuarios.refazerCadastro(user.id, dados) : await usuarios.criar({ ...dados, email });
  const mailRes = await enviarCodigoDeConfirmacao(user);
  const aviso = mailRes?.sent === false ? 'Conta criada, mas o e-mail com o código falhou agora. Toque em "Reenviar código" em instantes.' : null;
  return { email: user.email, aviso };
}

/** Confere o código do e-mail e ativa a conta. Devolve o usuário para abrir a sessão. */
export async function confirmarEmail(email, codigo) {
  const user = await usuarios.porEmail(email);
  if (!user) throw new HttpError(400, CODE_MSG.invalid);
  // Conta já confirmada: nunca abre sessão por aqui (antes abria sem conferir o código — quem soubesse o e-mail entrava)
  if (user.email_verified_at) throw new HttpError(409, 'Este e-mail já está confirmado. Entre com sua senha.', { jaConfirmado: true });
  const v = await consumeCode(user.id, 'VERIFY_EMAIL', codigo);
  if (!v.ok) throw new HttpError(400, CODE_MSG[v.reason]);
  return usuarios.confirmarEmail(user.id);
}

export async function reenviarCodigo(email) {
  const user = await usuarios.porEmail(email);
  if (user && !user.email_verified_at) await enviarCodigoDeConfirmacao(user);
}

/** E-mail e senha. Conta não confirmada recebe um código novo e a entrada é recusada. */
export async function entrar(email, senha) {
  const user = await usuarios.porEmail(email);
  if (!user || !(await checkPassword(senha, user.password_hash))) throw new HttpError(401, 'E-mail ou senha incorretos.');
  if (!user.email_verified_at) {
    await enviarCodigoDeConfirmacao(user);
    throw new HttpError(403, 'Confirme seu e-mail. Enviamos um novo código.', { needsVerification: true, email: user.email });
  }
  if (config.adminEmails.includes(user.email) && user.role !== 'ADMIN') { await usuarios.promoverAdmin(user.id); user.role = 'ADMIN'; }
  return user;
}

/** Envia o código de recuperação. Mesma resposta exista ou não a conta (evita descobrir e-mails cadastrados). */
export async function esqueciSenha(email) {
  const user = await usuarios.porEmail(email);
  if (user) { const { code, ttlMin } = await issueCode(user.id, 'RESET_PASSWORD'); await sendResetEmail(user, code, ttlMin); }
}

/** Troca a senha com o código do e-mail (e confirma o e-mail, já que o código prova a posse). */
export async function redefinirSenha(email, codigo, senha) {
  const user = await usuarios.porEmail(email);
  if (!user) throw new HttpError(400, CODE_MSG.invalid);
  const v = await consumeCode(user.id, 'RESET_PASSWORD', codigo);
  if (!v.ok) throw new HttpError(400, CODE_MSG[v.reason]);
  return usuarios.definirSenha(user.id, await hashPassword(senha), { confirmarEmail: true });
}
