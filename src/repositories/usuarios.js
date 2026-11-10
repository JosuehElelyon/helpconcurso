// Repositório de usuários (tabela users) — leituras e contadores usados pelos serviços. Só SQL.
import { one, query } from '../db.js';

export const buscar = (id) => one('SELECT * FROM users WHERE id=$1', [id]);

/** Prova aprovada: conta a contribuição e dá gerações de bônus a quem enviou. */
export const creditarContribuicao = (id, bonus) =>
  query('UPDATE users SET approved_contribs=approved_contribs+1, bonus_credits=bonus_credits+$2 WHERE id=$1', [id, bonus]);

/** Prova recusada na revisão: conta contra a confiança de quem enviou. */
export const registrarRecusa = (id) => query('UPDATE users SET rejected_contribs=rejected_contribs+1 WHERE id=$1', [id]);

export const creditosExtras = async (id) => (await one('SELECT bonus_credits FROM users WHERE id=$1', [id]))?.bonus_credits || 0;

/** Gasta 1 crédito extra; false se não havia crédito. */
export const consumirCredito = async (id) => !!(await one('UPDATE users SET bonus_credits=bonus_credits-1 WHERE id=$1 AND bonus_credits > 0 RETURNING bonus_credits', [id]));

export const devolverCredito = (id) => query('UPDATE users SET bonus_credits=bonus_credits+1 WHERE id=$1', [id]);

export const enviosBloqueadosAte = async (id) => (await one('SELECT uploads_blocked_until FROM users WHERE id=$1', [id]))?.uploads_blocked_until || null;

export const metaEDataDaProva = (id) => one('SELECT meta_diaria, data_prova FROM users WHERE id=$1', [id]);

export const porEmail = (email) => one('SELECT * FROM users WHERE email=$1', [email]);

/** Conta nova (cadastro), com o aceite dos termos na versão vigente. */
export const criar = ({ nome, email, hash, papel, versaoTermos }) => one(
  'INSERT INTO users(name,email,password_hash,role,termos_versao,termos_aceitos_em) VALUES ($1,$2,$3,$4,$5,now()) RETURNING *',
  [nome, email, hash, papel, versaoTermos]);

/** Refaz o cadastro de uma conta ainda NÃO confirmada (o serviço garante isso). */
export const refazerCadastro = (id, { nome, hash, papel, versaoTermos }) => one(
  'UPDATE users SET name=$2, password_hash=$3, role=$4, termos_versao=$5, termos_aceitos_em=now(), updated_at=now() WHERE id=$1 RETURNING *',
  [id, nome, hash, papel, versaoTermos]);

export const confirmarEmail = (id) => one('UPDATE users SET email_verified_at=now(), updated_at=now() WHERE id=$1 RETURNING *', [id]);

export const promoverAdmin = (id) => query("UPDATE users SET role='ADMIN' WHERE id=$1", [id]);

/** Nova senha: invalida as sessões abertas (sessao_versao+1). confirmarEmail=true na recuperação por código do e-mail. */
export const definirSenha = (id, hash, { confirmarEmail = false } = {}) => one(
  `UPDATE users SET password_hash=$2, sessao_versao=COALESCE(sessao_versao, 1) + 1,
     email_verified_at = CASE WHEN $3 THEN COALESCE(email_verified_at, now()) ELSE email_verified_at END, updated_at=now()
   WHERE id=$1 RETURNING *`, [id, hash, !!confirmarEmail]);

export const atualizarPerfil = (id, p) => one(
  `UPDATE users SET name=$2, telefone=NULLIF($3,''), concurso_alvo=NULLIF($4,''), banca_preferida=NULLIF($5,''),
     data_prova=NULLIF($6,'')::date, meta_diaria=$7, updated_at=now() WHERE id=$1 RETURNING *`,
  [id, p.name, p.telefone, p.concursoAlvo, p.bancaPreferida, p.dataProva, p.metaDiaria || null]);

export const avatar = (id) => one('SELECT avatar_url, avatar_key FROM users WHERE id=$1', [id]);

export const definirAvatar = (id, url, chave) =>
  one('UPDATE users SET avatar_url=$2, avatar_key=$3, updated_at=now() WHERE id=$1 RETURNING *', [id, url, chave]);
