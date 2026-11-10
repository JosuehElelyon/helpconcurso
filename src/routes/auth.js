import { Router } from 'express';
import { authLimit, emailLimit } from '../middleware/limites.js';
import { z } from 'zod';
import { ah, parseBody } from '../lib/http.js';
import { setSession, clearSession, publicUser } from '../lib/auth.js';
import * as Auth from '../services/autenticacao.js';

const r = Router();
r.use(authLimit);

const email = z.string().trim().toLowerCase().email('Informe um e-mail válido.');
const password = z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').max(200);
const code = z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos.');

r.get('/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

r.post('/register', emailLimit, ah(async (req, res) => {
  const b = parseBody(z.object({
    name: z.string().trim().min(2, 'Informe seu nome.').max(80), email, password,
    aceitouTermos: z.literal(true, { errorMap: () => ({ message: 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.' }) }),
  }), req.body);
  res.status(201).json({ ok: true, ...(await Auth.cadastrar(b)) });
}));

r.post('/verify', ah(async (req, res) => {
  const b = parseBody(z.object({ email, code }), req.body);
  const u = await Auth.confirmarEmail(b.email, b.code);
  setSession(res, u);
  res.json({ user: publicUser(u) });
}));

r.post('/resend', emailLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ email }), req.body);
  await Auth.reenviarCodigo(b.email);
  res.json({ ok: true });
}));

r.post('/login', ah(async (req, res) => {
  const b = parseBody(z.object({ email, password: z.string().min(1, 'Informe a senha.') }), req.body);
  const user = await Auth.entrar(b.email, b.password);
  setSession(res, user);
  res.json({ user: publicUser(user) });
}));

r.post('/forgot', emailLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ email }), req.body);
  await Auth.esqueciSenha(b.email);
  res.json({ ok: true });
}));

r.post('/reset', ah(async (req, res) => {
  const b = parseBody(z.object({ email, code, password }), req.body);
  const u = await Auth.redefinirSenha(b.email, b.code, b.password);
  setSession(res, u);
  res.json({ user: publicUser(u) });
}));

r.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

export default r;
