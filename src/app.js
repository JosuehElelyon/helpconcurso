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
import { cors, csrf } from './middleware/origem.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', config.trustProxy); // proxies na frente (Nginx, Render, Cloudflare Tunnel): define o IP real
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
    // front em outro subdomínio (CORS_ORIGINS) precisa carregar o avatar da API em <img>
    crossOriginResourcePolicy: { policy: config.corsOrigins.length ? 'same-site' : 'same-origin' },
  }));
  app.use(cors);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(csrf);
  app.use(loadUser);

  // API REST: /api/v1 é a versão atual; /api fica como apelido durante a transição (clientes antigos, avatares já salvos)
  const api = criarRotasApi();
  app.use(`/api/${VERSAO_API}`, (_req, res, next) => { res.set('X-API-Versao', VERSAO_API); next(); }, api);
  app.use('/api', (_req, res, next) => {
    res.set({ 'X-API-Versao': VERSAO_API, Deprecation: 'true', Link: `</api/${VERSAO_API}>; rel="successor-version"` });
    next();
  }, api);

  // Front (public/): servido aqui só no modo tudo-em-um. Com SERVIR_FRONT=false o front fica no Nginx/CDN e a API
  // responde 404 em JSON fora de /api.
  if (config.servirFront) {
    const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
    app.use(express.static(pub, {
      maxAge: config.env === 'production' ? '1h' : 0,
      // JS/CSS sempre revalidam (304 se nada mudou): o front é dividido em módulos e não pode misturar versões
      setHeaders: (res, arquivo) => { if (/\.(js|css)$/.test(arquivo)) res.setHeader('Cache-Control', 'no-cache'); },
    }));
    app.get('*', (_req, res) => res.sendFile(path.join(pub, 'index.html')));
  } else {
    app.use((_req, _res, next) => next(new HttpError(404, 'Rota não encontrada. A API está em /api/' + VERSAO_API + '.')));
  }

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
