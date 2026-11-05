// Aplicação HTTP (API REST + arquivos do front). Só monta o Express: quem sobe o processo é server.js (API)
// e worker.js (fila de IA). Usado também pelos testes.
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { pool, one } from './db.js';
import { loadUser } from './lib/auth.js';
import { HttpError, ah } from './lib/http.js';
import { getFile } from './lib/storage.js';
import { AiError, userMessage } from './ai/errors.js';
import { UploadBlockedError } from './security/index.js';
import authRoutes from './routes/auth.js';
import materialRoutes from './routes/materials.js';
import setRoutes from './routes/sets.js';
import provaRoutes from './routes/provas.js';
import adminRoutes from './routes/admin.js';
import meRoutes from './routes/me.js';
import editalRoutes from './routes/editais.js';
import cadernoRoutes from './routes/cadernos.js';
import { bancasRouter } from './routes/bancas.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // atrás de Render, Cloudflare Tunnel, Nginx etc.
  app.disable('x-powered-by');

  app.use((req, res, next) => { req.id = crypto.randomUUID().slice(0, 8); res.set('X-Request-Id', req.id); next(); });
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      'default-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // atributos style= do front
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:'],
      'script-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': null, // permite rodar em http na rede local
    } },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  // Proteção CSRF simples: requisições que alteram dados precisam vir do próprio site
  app.use((req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.path.startsWith('/api/')) return next();
    const origin = req.get('origin');
    if (!origin) return next(); // chamadas sem navegador (curl, testes) dependem do cookie SameSite=Lax
    let host = null; try { host = new URL(origin).host; } catch {}
    if (origin === config.appUrl || host === req.get('host')) return next();
    next(new HttpError(403, 'Origem não permitida.'));
  });
  app.use(loadUser);

  app.get('/api/health', async (_req, res) => {
    try { await pool.query('SELECT 1'); res.json({ ok: true, versao: '2.0.0' }); } catch { res.status(503).json({ ok: false }); }
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/materials', materialRoutes);
  app.use('/api/sets', setRoutes);
  app.use('/api/provas', provaRoutes);
  app.use('/api/bancas', bancasRouter);
  app.use('/api/admin', adminRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/editais', editalRoutes);
  app.use('/api/cadernos', cadernoRoutes);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.get('/api/users/:id/avatar', ah(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Avatar não encontrado.' });
    const u = await one('SELECT avatar_url, avatar_key FROM users WHERE id=$1', [req.params.id]);
    if (!u || (!u.avatar_url && !u.avatar_key)) return res.status(404).json({ error: 'Avatar não encontrado.' });
    if (u.avatar_key) {
      try {
        const file = await getFile(u.avatar_key);
        res.set({
          'Content-Type': file.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': 'inline; filename="avatar"',
        });
        return res.send(file.buffer);
      } catch {
        return res.status(404).json({ error: 'Arquivo do avatar não encontrado.' });
      }
    }
    if (u.avatar_url?.startsWith('/avatars/')) {
      return res.redirect(u.avatar_url);
    }
    return res.status(404).json({ error: 'Avatar não encontrado.' });
  }));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));

  const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  app.use(express.static(pub, { maxAge: config.env === 'production' ? '1h' : 0 }));
  app.get('*', (_req, res) => res.sendFile(path.join(pub, 'index.html')));

  // Tratamento central de erros: mensagem amigável para o usuário, detalhes só no log
  app.use((err, req, res, _next) => {
    if (res.headersSent) { try { res.end(); } catch {} return; }
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
    if (err instanceof UploadBlockedError) return res.status(422).json({ error: err.message, blocked: true });
    if (err instanceof AiError) {
      console.error(`[ERRO-IA] [req=${req.id}] rota="${req.method} ${req.originalUrl}" codigo=${err.code} msg="${err.message}"`);
      return res.status(err.code === 'aborted' ? 499 : 503).json({ error: userMessage(err) });
    }
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Conteúdo muito grande.' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
    if (err?.code === 'ECONNREFUSED' || err?.code === '57P01') { console.error(`[ERRO-BANCO] [req=${req.id}] banco indisponível:`, err.message); return res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente.' }); }
    console.error(`[ERRO-INTERNO] [req=${req.id}] rota="${req.method} ${req.originalUrl}"`, err);
    res.status(500).json({ error: `Erro interno. Se persistir, informe o código ${req.id}.` });
  });

  return app;
}
