// Rotas HTTP dos simulados (/api/v1/sets). Camada fina: valida a entrada (zod), chama o serviço e formata a resposta.
// A regra de negócio está em services/simulados.js; o SQL, em repositories/simulados.js.
import { Router } from 'express';
import { z } from 'zod';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { abrirFluxo } from '../lib/ndjson.js';
import { visaoSimulado } from '../lib/visao-simulado.js';
import { BANCA, NIVEIS } from '../lib/bancas.js';
import { zodEstrategia } from '../lib/estrategia.js';
import { generationQuota } from '../services/quota.js';
import { rate, report, listFeedback } from '../services/feedback.js';
import { MAX_BASE } from '../services/revanche.js';
import * as Simulados from '../services/simulados.js';
import * as Treino from '../services/treino-personalizado.js';
import { explainLimit, geracaoLimit, feedbackLimit } from '../middleware/limites.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);
const LET = ['A', 'B', 'C', 'D', 'E'];

// Representação pública de um simulado na API (formato único, em lib/visao-simulado.js)
const view = visaoSimulado;

const schemaGerar = z.object({
  materialId: z.string().uuid('Material inválido.'),
  materia: z.string().trim().min(2, 'Informe a matéria.').max(80),
  assunto: z.string().trim().max(120).optional().default(''),
  banca: z.enum(Object.keys(BANCA), { errorMap: () => ({ message: 'Escolha uma banca.' }) }),
  qtd: z.coerce.number().int().min(1).max(20),
  nivel: z.enum(NIVEIS),
  cadernoId: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => v || null),
});
const schemaRevanche = z.object({
  setId: z.string().uuid().optional().nullable(),
  cadernoId: z.string().uuid().optional().nullable(),
  editalId: z.string().uuid().optional().nullable(),
  indices: z.array(z.number().int().min(0).max(500)).max(50).optional().default([]),
  keys: z.array(z.string().max(120)).max(MAX_BASE).optional().default([]),
  banca: z.string().max(40).optional().nullable(),
  materia: z.string().trim().max(100).optional().nullable(),
  assunto: z.string().trim().max(150).optional().nullable(),
  qtd: z.coerce.number().int().min(1).max(10).optional().default(3),
});
const schemaProgresso = z.object({
  respostas: z.record(z.string().regex(/^\d{1,3}$/), z.enum(LET)).optional(),
  finalizado: z.boolean().optional(),
  tempoGastoSegundos: z.number().int().min(0).max(86400).optional(),
  duvidas: z.array(z.number().int().min(0).max(500)).optional(),
});

/** Executa uma geração longa respondendo em NDJSON: progress/stage ... done | error. */
async function emFluxo(res, rotulo, padraoErro, executar) {
  const fluxo = abrirFluxo(res);
  try {
    fluxo.emitir({ type: 'done', ...(await executar(fluxo)) });
  } catch (e) {
    if (e?.code !== 'aborted') console.error(`[${rotulo}]`, e?.message || e);
    fluxo.emitir({ type: 'error', message: Simulados.mensagemDeFalha(e, padraoErro) });
  } finally {
    fluxo.fechar();
  }
}

r.get('/cota', ah(async (req, res) => res.json({ quota: await generationQuota(req.user) })));

// Gera um simulado (NDJSON: {"type":"progress","count":3} ... {"type":"done","set":{...}} | {"type":"error","message":"..."})
r.post('/', geracaoLimit, ah(async (req, res) => {
  const ctx = await Simulados.prepararGeracao(req.user, parseBody(schemaGerar, req.body));
  await emFluxo(res, 'gerar', 'Não foi possível gerar as questões. Tente novamente.', async ({ emitir, signal }) => {
    const out = await Simulados.executarGeracao(ctx, { emitir, signal });
    return { set: view(out.set), descartadas: out.descartadas, exemplosUsados: out.exemplosUsados, provasUsadas: out.provasUsadas };
  });
}));

// Bateria de Revanche: questões inéditas sobre os pontos cegos (base sempre do servidor: setId ou cadernoId + keys)
r.post('/revanche', geracaoLimit, ah(async (req, res) => {
  const ctx = await Simulados.prepararRevanche(req.user, parseBody(schemaRevanche, req.body));
  await emFluxo(res, 'revanche', 'Não foi possível gerar a bateria de revanche.', async ({ emitir, signal }) => ({
    set: view(await Simulados.executarRevanche(ctx, { emitir, signal })),
  }));
}));

// Treino Personalizado por filtro (caderno, matérias × banca × origem de conteúdo)
const schemaEstrategia = zodEstrategia(z);
r.post('/treino-personalizado/disponibilidade', ah(async (req, res) => {
  res.json(await Treino.simularDisponibilidade(req.user, parseBody(schemaEstrategia, req.body || {})));
}));
r.post('/treino-personalizado', ah(async (req, res) => {
  res.json(await Treino.iniciarTreinoPersonalizado(req.user, parseBody(schemaEstrategia, req.body || {})));
}));

r.get('/', ah(async (req, res) => res.json({ sets: (await Simulados.listar(req.user)).map(view) })));
r.get('/:id', ah(async (req, res) => res.json({ set: view(await Simulados.detalhe(req.user, req.params.id)) })));
r.patch('/:id', ah(async (req, res) => {
  res.json({ set: view(await Simulados.salvarProgresso(req.user, req.params.id, parseBody(schemaProgresso, req.body))) });
}));
r.delete('/:id', ah(async (req, res) => { await Simulados.excluir(req.user, req.params.id); res.json({ ok: true }); }));

const qIndex = (req) => { const i = Number(req.params.i); if (!Number.isInteger(i)) throw new HttpError(404, 'Questão não encontrada.'); return i; };
r.get('/:id/feedback', ah(async (req, res) => res.json({ feedback: await listFeedback(req.user, req.params.id) })));
r.post('/:id/questoes/:i/avaliar', feedbackLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }), req.body);
  res.json(await rate(req.user, req.params.id, qIndex(req), b.rating));
}));
r.post('/:id/questoes/:i/reportar', feedbackLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ motivo: z.string().trim().min(5, 'Explique em poucas palavras qual é o erro.').max(600) }), req.body);
  res.status(202).json(await report(req.user, req.params.id, qIndex(req), b.motivo));
}));
r.post('/:id/questoes/:i/por-que-errei', explainLimit, ah(async (req, res) => {
  res.json(await Simulados.explicarErro(req.user, req.params.id, qIndex(req), req.body?.resposta));
}));

export default r;
