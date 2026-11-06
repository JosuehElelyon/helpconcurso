// Rotas de sistema (sem login): saúde do serviço e contrato OpenAPI da API.
import { Router } from 'express';
import { pool } from '../db.js';
import { especificacaoOpenApi } from '../openapi.js';

const r = Router();

r.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, versao: '2.0.0', api: 'v1' }); } catch { res.status(503).json({ ok: false }); }
});
r.get('/openapi.json', (_req, res) => res.json(especificacaoOpenApi()));

export default r;
