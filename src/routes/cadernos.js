// Rotas HTTP dos Cadernos de Questões (/api/v1/cadernos). Camada fina: valida a entrada (zod), chama o serviço e
// devolve a resposta. A regra está em services/cadernos.js; o SQL, em repositories/.
import { Router } from 'express';
import { z } from 'zod';
import { ah, parseBody, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import { BANCA } from '../lib/bancas.js';
import { explainLimit, cadernoLimit } from '../middleware/limites.js';
import * as Cadernos from '../services/cadernos.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);
const LET = ['A', 'B', 'C', 'D', 'E'];

const schemaCriar = z.object({
  titulo: z.string().trim().max(160).optional().default(''),
  descricao: z.string().trim().max(400).optional().default(''),
  banca: z.enum(Object.keys(BANCA), { errorMap: () => ({ message: 'Escolha a banca do caderno.' }) }),
  orgao: z.string().trim().max(120).optional().default(''),
  cargo: z.string().trim().max(120).optional().default(''),
  ano: z.string().trim().regex(/^(\d{4})?$/, 'Ano inválido.').optional().default(''),
  editalId: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => v || null),
  importarExistentes: z.boolean().optional().default(true),
});
const schemaInteragir = z.object({
  key: z.string().max(120).optional(),
  resposta: z.enum(LET).nullable().optional(),
  favorita: z.boolean().optional(),
  anotacao: z.string().trim().max(1500).optional(),
  reset: z.enum(['all', 'erros']).optional(),
});
const schemaPorQueErrei = z.object({ key: z.string().max(120), resposta: z.string().max(10).optional() });

r.get('/', ah(async (req, res) => res.json(await Cadernos.listar(req.user))));

r.post('/', cadernoLimit, ah(async (req, res) => {
  res.status(201).json({ caderno: await Cadernos.criar(req.user, parseBody(schemaCriar, req.body)) });
}));

r.get('/:id', ah(async (req, res) => res.json({ caderno: await Cadernos.abrir(req.user, req.params.id) })));

r.post('/:id/alimentar-material', cadernoLimit, ah(async (req, res) => {
  const { materialId } = parseBody(z.object({ materialId: z.string().uuid('Material inválido.') }), req.body);
  res.json(await Cadernos.alimentarComMaterial(req.user, req.params.id, materialId));
}));

r.post('/:id/alimentar-prova', cadernoLimit, uploader([{ name: 'prova', maxCount: 1 }, { name: 'gabarito', maxCount: 1 }]), ah(async (req, res) => {
  const arquivo = fileOf(req, 'prova');
  const provaId = arquivo ? null : parseBody(z.object({ provaId: z.string().uuid('Selecione uma prova válida.') }), req.body).provaId;
  res.json(await Cadernos.alimentarComProva(req.user, req.params.id, {
    arquivo, gabarito: fileOf(req, 'gabarito'), provaId, orgao: req.body?.orgao, cargo: req.body?.cargo, ano: req.body?.ano, ip: req.ip,
  }));
}));

r.post('/:id/vincular-simulado', cadernoLimit, ah(async (req, res) => {
  const { setId } = parseBody(z.object({ setId: z.string().uuid('Simulado inválido.') }), req.body);
  res.json({ caderno: await Cadernos.vincularSimulado(req.user, req.params.id, setId) });
}));

// Responder, favoritar, anotar ou refazer (todas / erradas)
r.patch('/:id/interagir', ah(async (req, res) => {
  res.json({ caderno: await Cadernos.interagir(req.user, req.params.id, parseBody(schemaInteragir, req.body)) });
}));

r.post('/:id/questoes/por-que-errei', explainLimit, ah(async (req, res) => {
  res.json(await Cadernos.explicarErro(req.user, req.params.id, parseBody(schemaPorQueErrei, req.body)));
}));

r.delete('/:id', ah(async (req, res) => { await Cadernos.excluir(req.user, req.params.id); res.json({ ok: true }); }));

export default r;
