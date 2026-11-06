// Aplicação HTTP (API REST + arquivos do front). Só monta o Express: quem sobe o processo é server.js (API)
// e worker.js (fila de IA). Usado também pelos testes.
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { loadUser } from './lib/auth.js';
import { HttpError } from './lib/http.js';
import { AiError, userMessage } from './ai/errors.js';
import { UploadBlockedError } from './security/index.js';
import { criarRotasApi, VERSAO_API } from './routes/index.js';

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

  // API REST: /api/v1 é a versão atual; /api fica como apelido durante a transição (clientes antigos, avatares já salvos)
  const api = criarRotasApi();
  app.use(`/api/${VERSAO_API}`, (_req, res, next) => { res.set('X-API-Versao', VERSAO_API); next(); }, api);
  app.use('/api', (_req, res, next) => {
    res.set({ 'X-API-Versao': VERSAO_API, Deprecation: 'true', Link: `</api/${VERSAO_API}>; rel="successor-version"` });
    next();
  }, api);

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
