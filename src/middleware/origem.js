// CORS e proteção CSRF por origem.
// - Front no mesmo domínio (API servindo public/, ou Nginx/CDN repassando /api): não precisa de CORS.
// - Front em outro domínio: liste-o em CORS_ORIGINS. Só essas origens recebem os cabeçalhos CORS (com cookie) e
//   podem fazer requisições que alteram dados. Use subdomínios do mesmo site (app.x.com.br + api.x.com.br): o cookie
//   SameSite=Lax continua valendo, sem depender de cookie de terceiros.
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';

const METODOS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

export const origemLiberada = (origin) => !!origin && config.corsOrigins.includes(origin.toLowerCase().replace(/\/$/, ''));

export function cors(req, res, next) {
  const origin = req.get('origin');
  if (!req.path.startsWith('/api/') || !origemLiberada(origin)) return next();
  res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' });
  if (req.method === 'OPTIONS') {
    res.set({
      'Access-Control-Allow-Methods': METODOS,
      'Access-Control-Allow-Headers': req.get('access-control-request-headers') || 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    return res.status(204).end();
  }
  next();
}

/** Requisições que alteram dados precisam vir do próprio site (ou de uma origem liberada em CORS_ORIGINS). */
export function csrf(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.path.startsWith('/api/')) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // chamadas sem navegador (curl, testes, app nativo) dependem do cookie SameSite=Lax
  let host = null; try { host = new URL(origin).host; } catch {}
  if (origin === config.appUrl || host === req.get('host') || origemLiberada(origin)) return next();
  next(new HttpError(403, 'Origem não permitida.'));
}
