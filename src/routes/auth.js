import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { one, query } from '../db.js';
import { ah, HttpError, parseBody } from '../lib/http.js';
import { hashPassword, checkPassword, setSession, clearSession, publicUser, issueCode, consumeCode } from '../lib/auth.js';
import { sendVerificationEmail, sendResetEmail } from '../lib/mailer.js';
import { config } from '../config.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde alguns minutos.' } });
const mailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitos e-mails solicitados. Tente novamente mais tarde.' } });
r.use(limiter);

const email = z.string().trim().toLowerCase().email('Informe um e-mail válido.');
const password = z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').max(200);
const code = z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos.');
const CODE_MSG = { expired: 'Código expirado. Peça um novo.', attempts: 'Muitas tentativas erradas. Peça um novo código.', invalid: 'Código incorreto.' };

const byEmail = (e) => one('SELECT * FROM users WHERE email=$1', [e]);

r.get('/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

r.post('/register', mailLimiter, ah(async (req, res) => {
  const b = parseBody(z.object({ name: z.string().trim().min(2, 'Informe seu nome.').max(80), email, password }), req.body);
  const isAdminEmail = config.adminEmails.includes(b.email);
  const isInvited = isAdminEmail || config.allowedEmails.includes(b.email);
  if (config.registrationMode === 'allowlist' && !isInvited) {
    throw new HttpError(403, 'O cadastro está aberto apenas para convidados nesta fase de testes.');
  }
  let user = await byEmail(b.email);
  // Conta confirmada nunca é sobrescrita pelo cadastro (nem de convidado/admin): quem esqueceu a senha usa "Esqueci a senha".
  // Toda conta só é ativada pelo código enviado ao e-mail — é isso que prova que a pessoa é dona do endereço.
  if (user?.email_verified_at) throw new HttpError(409, 'Já existe uma conta com este e-mail. Entre ou recupere a senha.');
  const hash = await hashPassword(b.password);
  const role = isAdminEmail ? 'ADMIN' : 'USER';
  if (user) user = await one('UPDATE users SET name=$2, password_hash=$3, role=$4, updated_at=now() WHERE id=$1 RETURNING *', [user.id, b.name, hash, role]);
  else user = await one('INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING *', [b.name, b.email, hash, role]);
  const { code: c, ttlMin } = await issueCode(user.id, 'VERIFY_EMAIL');
  const mailRes = await sendVerificationEmail(user, c, ttlMin);
  const aviso = mailRes?.sent === false ? 'Conta criada, mas o e-mail com o código falhou agora. Toque em "Reenviar código" em instantes.' : null;
  res.status(201).json({ ok: true, email: user.email, aviso });
}));

r.post('/verify', ah(async (req, res) => {
  const b = parseBody(z.object({ email, code }), req.body);
  const user = await byEmail(b.email);
  if (!user) throw new HttpError(400, CODE_MSG.invalid);
  if (user.email_verified_at) { setSession(res, user); return res.json({ user: publicUser(user) }); }
  const v = await consumeCode(user.id, 'VERIFY_EMAIL', b.code);
  if (!v.ok) throw new HttpError(400, CODE_MSG[v.reason]);
  const u = await one('UPDATE users SET email_verified_at=now(), updated_at=now() WHERE id=$1 RETURNING *', [user.id]);
  setSession(res, u);
  res.json({ user: publicUser(u) });
}));

r.post('/resend', mailLimiter, ah(async (req, res) => {
  const b = parseBody(z.object({ email }), req.body);
  const user = await byEmail(b.email);
  if (user && !user.email_verified_at) { const { code: c, ttlMin } = await issueCode(user.id, 'VERIFY_EMAIL'); await sendVerificationEmail(user, c, ttlMin); }
  res.json({ ok: true });
}));

r.post('/login', ah(async (req, res) => {
  const b = parseBody(z.object({ email, password: z.string().min(1, 'Informe a senha.') }), req.body);
  const user = await byEmail(b.email);
  if (!user || !(await checkPassword(b.password, user.password_hash))) throw new HttpError(401, 'E-mail ou senha incorretos.');
  if (!user.email_verified_at) {
    const { code: c, ttlMin } = await issueCode(user.id, 'VERIFY_EMAIL');
    await sendVerificationEmail(user, c, ttlMin);
    throw new HttpError(403, 'Confirme seu e-mail. Enviamos um novo código.', { needsVerification: true, email: user.email });
  }
  if (config.adminEmails.includes(user.email) && user.role !== 'ADMIN') await query("UPDATE users SET role='ADMIN' WHERE id=$1", [user.id]), (user.role = 'ADMIN');
  setSession(res, user);
  res.json({ user: publicUser(user) });
}));

r.post('/forgot', mailLimiter, ah(async (req, res) => {
  const b = parseBody(z.object({ email }), req.body);
  const user = await byEmail(b.email);
  if (user) { const { code: c, ttlMin } = await issueCode(user.id, 'RESET_PASSWORD'); await sendResetEmail(user, c, ttlMin); }
  // Mesma resposta exista ou não a conta (evita descobrir e-mails cadastrados)
  res.json({ ok: true });
}));

r.post('/reset', ah(async (req, res) => {
  const b = parseBody(z.object({ email, code, password }), req.body);
  const user = await byEmail(b.email);
  if (!user) throw new HttpError(400, CODE_MSG.invalid);
  const v = await consumeCode(user.id, 'RESET_PASSWORD', b.code);
  if (!v.ok) throw new HttpError(400, CODE_MSG[v.reason]);
  const u = await one('UPDATE users SET password_hash=$2, email_verified_at=COALESCE(email_verified_at, now()), updated_at=now() WHERE id=$1 RETURNING *', [user.id, await hashPassword(b.password)]);
  setSession(res, u);
  res.json({ user: publicUser(u) });
}));

r.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

export default r;
