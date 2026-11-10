// Painel do administrador: revisão de provas, base, segurança e uso de IA
import { Router } from 'express';
import { z } from 'zod';
import * as Admin from '../services/admin.js';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import { approveProva, rejectProva, reprocessProva, enqueueRelabel, aplicarGabaritoDefinitivo, importarProvasEmLote, publicStatus } from '../services/provas.js';
import { painelIA } from '../services/metricas.js';

const r = Router();
r.use(requireAdmin);
r.param('id', checkId);

const view = (p, detail = false) => ({
  id: p.id, banca: p.banca, bancaInformada: p.banca_informada, orgao: p.orgao, cargo: p.cargo, ano: p.ano, titulo: p.titulo, fileName: p.file_name, gabaritoName: p.gabarito_name,
  status: p.status, statusLabel: publicStatus[p.status], error: p.error, source: p.source, uploader: p.uploader_name ? { name: p.uploader_name, email: p.uploader_email } : null,
  needsOcr: p.needs_ocr, pageCount: p.page_count, materias: p.materias, numQuestoes: p.num_questoes, reviewNote: p.review_note, autoApproved: p.auto_approved,
  officialUrl: p.official_url || null, oficialConfirmado: !!p.oficial_confirmado, officialUrlTipo: p.official_url_tipo || null,
  gabaritoDefinitivo: !!p.gabarito_definitivo, gabaritoDefinitivoUrl: p.gabarito_definitivo_url || null, gabaritoDefinitivoConfirmado: !!p.gabarito_definitivo_confirmado,
  consensoConcluido: p.consenso_concluido !== false,
  securitySeverity: p.security?.decision?.severity || null, duplicateOf: p.duplicate_of, createdAt: p.created_at,
  ...(detail ? { security: p.security, classification: p.classification, analysis: p.analysis, textPreview: (p.text || '').slice(0, 6000) } : {}),
});

r.get('/provas', ah(async (req, res) => {
  const { rows, counts } = await Admin.listarProvas({ banca: req.query.banca, status: req.query.status });
  res.json({ provas: rows.map((p) => view(p)), counts });
}));
r.get('/provas/:id', ah(async (req, res) => {
  res.json({ prova: view(await Admin.detalheProva(req.params.id), true) });
}));
r.post('/provas/:id/aprovar', ah(async (req, res) => {
  const b = parseBody(z.object({ banca: z.string().optional() }), req.body || {});
  res.json({ prova: view(await approveProva(req.params.id, req.user, b)) });
}));
r.post('/provas/:id/recusar', ah(async (req, res) => {
  const b = parseBody(z.object({ motivo: z.string().trim().min(3, 'Informe o motivo.').max(500) }), req.body || {});
  res.json({ prova: view(await rejectProva(req.params.id, req.user, b.motivo)) });
}));
r.post('/provas/:id/reprocessar', ah(async (req, res) => res.json({ prova: view(await reprocessProva(req.params.id)) })));
// F5: rotula questões de provas antigas (cascata grátis — provas são documentos públicos)
r.post('/provas/rotular', ah(async (req, res) => {
  const provaId = /^[0-9a-f-]{36}$/i.test(String(req.body?.provaId || '')) ? req.body.provaId : null; // vazio = todas
  res.json({ provas: await enqueueRelabel({ provaId }) });
}));

// Planos: pedidos de upgrade (o admin confirma o pagamento e ativa — sem gateway por enquanto)
r.get('/pedidos', ah(async (_req, res) => res.json({ pedidos: await Admin.listarPedidos() })));
r.post('/pedidos/:pid/:acao', ah(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.pid) || !['aprovar', 'recusar'].includes(req.params.acao)) throw new HttpError(404, 'Pedido não encontrado.');
  res.json(await Admin.decidirPedido(req.params.pid, req.params.acao, req.user));
}));

// G5: questões com gabarito em disputa entre os modelos do consenso — o admin escolhe/confirma
r.get('/divergencias', ah(async (_req, res) => res.json({ divergencias: await Admin.listarDivergencias() })));
r.post('/questoes/:qid/gabarito', ah(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.qid)) throw new HttpError(404, 'Questão não encontrada.');
  const b = parseBody(z.object({ gabarito: z.string().trim().toUpperCase().regex(/^[A-E]$/, 'Gabarito inválido.') }), req.body);
  await Admin.definirGabaritoDivergente(req.params.qid, b.gabarito);
  res.json({ ok: true });
}));

// B1: Importação de provas em lote a partir de links oficiais
r.post('/provas/lote', ah(async (req, res) => {
  const b = parseBody(z.object({
    banca: z.string().trim().optional(),
    itens: z.array(z.object({
      banca: z.string().trim().optional(),
      provaUrl: z.string().trim().min(5),
      gabaritoUrl: z.string().trim().optional(),
      orgao: z.string().trim().max(120).optional(),
      cargo: z.string().trim().max(120).optional(),
      ano: z.string().trim().regex(/^(\d{4})?$/).optional(),
    })).optional(),
    texto: z.string().trim().optional(),
  }), req.body || {});

  const out = await importarProvasEmLote({
    user: req.user,
    defaultBanca: b.banca,
    itens: b.itens,
    texto: b.texto,
  });
  res.json(out);
}));

// F7: Aplica gabarito definitivo oficial (link oficial, arquivo ou texto)
r.post('/provas/:id/gabarito-definitivo', uploader([{ name: 'gabarito', maxCount: 1 }]), ah(async (req, res) => {
  const b = parseBody(z.object({
    url: z.string().trim().max(500).optional().default(''),
    text: z.string().trim().max(500000).optional().default(''),
    // Sem confirmar → só a prévia (nada é gravado)
    confirmar: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().default(false),
  }), req.body || {});

  const file = fileOf(req, 'gabarito');
  const out = await aplicarGabaritoDefinitivo({
    provaId: req.params.id,
    user: req.user,
    url: b.url || null,
    file: file || null,
    text: b.text || null,
    confirmar: b.confirmar === true || b.confirmar === 'true',
  });
  res.json({ prova: view(out.prova), resumo: out.resumo });
}));

r.get('/provas/:id/questoes', ah(async (req, res) => res.json({ questoes: await Admin.questoesDaProva(req.params.id) })));
r.get('/provas/:id/arquivo', ah(async (req, res) => {
  const { nome, conteudo } = await Admin.arquivoDaProva(req.params.id);
  // Sempre como download e com tipo genérico: o navegador nunca abre/executa o arquivo do usuário
  res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" }).send(conteudo);
}));
r.delete('/provas/:id', ah(async (req, res) => {
  await Admin.excluirProva(req.params.id);
  res.json({ ok: true });
}));

r.get('/seguranca', ah(async (_req, res) => res.json(await Admin.painelSeguranca())));

// Painel de IA (Sprint 6 — medir): custo por tarefa e por funcionalidade, cache e qualidade por modelo/prompt
r.get('/ia', ah(async (req, res) => {
  const { dias } = parseBody(z.object({ dias: z.coerce.number().int().min(1).max(365).optional().default(30) }), req.query);
  res.json(await painelIA({ dias }));
}));

export default r;
