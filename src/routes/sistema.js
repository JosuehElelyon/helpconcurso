// Rotas de sistema (sem login): saúde do serviço, termos/LGPD e contrato OpenAPI da API.
import { Router } from 'express';
import { ping } from '../db.js';
import { especificacaoOpenApi } from '../openapi.js';
import { obterTermosEPrivacidade } from '../lib/termos.js';

const r = Router();

r.get('/health', async (_req, res) => {
  try { await ping(); res.json({ ok: true, versao: '2.0.0', api: 'v1' }); } catch { res.status(503).json({ ok: false }); }
});
r.get('/openapi.json', (_req, res) => res.json(especificacaoOpenApi()));
r.get('/termos', (_req, res) => res.json(obterTermosEPrivacidade()));

export default r;
