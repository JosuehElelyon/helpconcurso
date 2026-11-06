import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { planoDoUsuario } from './planos.js';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { one, query } from '../db.js';
import { HttpError } from './http.js';

const COOKIE = 'hc_session';
const MAX_AGE = 7 * 24 * 3600 * 1000;

export const hashPassword = (p) => bcrypt.hash(p, 11);
export const checkPassword = (p, h) => bcrypt.compare(p, h);

export function setSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role, sv: user.sessao_versao || 1 }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.appUrl.startsWith('https'), maxAge: MAX_AGE, path: '/' });
}
export function clearSession(res) { res.clearCookie(COOKIE, { path: '/' }); }

export const publicUser = (u) => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, emailVerified: !!u.email_verified_at, stars: { total: u.stars_total ?? 0, balance: u.stars_balance ?? 0 },
  plano: (() => { const p = planoDoUsuario(u); return { id: p.id, nome: p.nome }; })(),
  avatarUrl: u.avatar_url || null });

// Carrega o usuário da sessão (se houver)
export async function loadUser(req, _res, next) {
  const t = req.cookies?.[COOKIE];
  if (t) {
    try {
      const { sub, sv } = jwt.verify(t, config.jwtSecret);
      const u = await one('SELECT * FROM users WHERE id=$1', [sub]);
      if (u && (u.sessao_versao || 1) === (sv || 1)) {
        req.user = u;
      }
    } catch { /* sessão inválida/expirada */ }
  }
  next();
}
export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Faça login para continuar.'));
  if (!req.user.email_verified_at) return next(new HttpError(403, 'Confirme seu e-mail para continuar.', { needsVerification: true }));
  next();
}
export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'ADMIN') return next(new HttpError(403, 'Apenas administradores podem acessar esta área.'));
    next();
  });
}

// ---- Códigos por e-mail ----
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const TTL = { VERIFY_EMAIL: 24 * 60, RESET_PASSWORD: 30 }; // minutos
export const MAX_ATTEMPTS = 5;

export async function issueCode(userId, type) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await query('UPDATE auth_tokens SET used_at=now() WHERE user_id=$1 AND type=$2 AND used_at IS NULL', [userId, type]);
  await query("INSERT INTO auth_tokens(user_id,type,code_hash,expires_at) VALUES ($1,$2,$3, now() + ($4 || ' minutes')::interval)",
    [userId, type, sha(`${userId}:${code}`), String(TTL[type])]);
  return { code, ttlMin: TTL[type] };
}

// Retorna true se o código confere; incrementa tentativas e invalida após MAX_ATTEMPTS
export async function consumeCode(userId, type, code) {
  const tok = await one('SELECT * FROM auth_tokens WHERE user_id=$1 AND type=$2 AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1', [userId, type]);
  if (!tok) return { ok: false, reason: 'expired' };
  if (tok.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'attempts' };
  const a = Buffer.from(tok.code_hash), b = Buffer.from(sha(`${userId}:${String(code).trim()}`));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await query('UPDATE auth_tokens SET attempts=attempts+1 WHERE id=$1', [tok.id]);
    return { ok: false, reason: tok.attempts + 1 >= MAX_ATTEMPTS ? 'attempts' : 'invalid' };
  }
  await query('UPDATE auth_tokens SET used_at=now() WHERE id=$1', [tok.id]);
  return { ok: true };
}
