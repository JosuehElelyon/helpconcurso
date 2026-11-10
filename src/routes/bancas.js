import { Router } from 'express';
import { contagemPorBanca } from '../services/provas.js';
import { ah } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { BANCAS, BANCA, MATERIAS, NIVEIS } from '../lib/bancas.js';
import { getKnowledge } from '../services/knowledge.js';

// ---------- Leitura (todos os usuários logados) ----------
export const bancasRouter = Router();
bancasRouter.use(requireAuth);

bancasRouter.get('/', ah(async (_req, res) => {
  const counts = Object.fromEntries((await contagemPorBanca()).map((r) => [r.banca, r]));
  const bancas = await Promise.all(BANCAS.map(async (b) => {
    const k = await getKnowledge(b.id, null, 0);
    return { ...b, provasTreinadas: counts[b.id]?.n || 0, questoesReais: counts[b.id]?.q || 0, aprendido: { caracteristicas: k.caracteristicas, padroes: k.padroes, pegadinhas: k.pegadinhas } };
  }));
  res.json({ bancas, materias: MATERIAS, niveis: NIVEIS });
}));

