// Dados do próprio usuário: estrelas, nível e trocas
import { Router } from 'express';
import { z } from 'zod';
import { ah, parseBody } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { summary, redeem } from '../services/stars.js';

const r = Router();
r.use(requireAuth);
r.get('/estrelas', ah(async (req, res) => res.json(await summary(req.user.id))));
r.post('/estrelas/trocar', ah(async (req, res) => {
  const b = parseBody(z.object({ geracoes: z.coerce.number().int().min(1, 'Quantidade inválida.').max(50) }), req.body);
  res.json(await redeem(req.user.id, b.geracoes));
}));
export default r;
