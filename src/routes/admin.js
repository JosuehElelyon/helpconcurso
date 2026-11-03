// Painel do administrador: revisão de provas, base, segurança e uso de IA
import { Router } from 'express';
import { z } from 'zod';
import { one, many, query } from '../db.js';
import { PLANOS } from '../lib/planos.js';
import { sendPlanoAtivadoEmail } from '../lib/mailer.js';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { BANCA } from '../lib/bancas.js';
import { getFile, deleteFile } from '../lib/storage.js';
import { uploader, fileOf } from '../lib/upload.js';
import { approveProva, rejectProva, reprocessProva, enqueueRelabel, aplicarGabaritoDefinitivo, importarProvasEmLote, publicStatus } from '../services/provas.js';
import { describeRouting } from '../ai/index.js';
import { costUsd, USD_TO_BRL, spentTodayUsd } from '../ai/pricing.js';
import { config } from '../config.js';

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
const SELECT = 'SELECT p.*, u.name AS uploader_name, u.email AS uploader_email FROM provas p LEFT JOIN users u ON u.id=p.uploaded_by';

r.get('/provas', ah(async (req, res) => {
  const banca = BANCA[req.query.banca] ? req.query.banca : null;
  const status = typeof req.query.status === 'string' && /^[A-Z_]+$/.test(req.query.status) ? req.query.status : null;
  const rows = await many(`${SELECT} WHERE ($1::text IS NULL OR p.banca=$1) AND ($2::text IS NULL OR p.status=$2) ORDER BY p.created_at DESC LIMIT 500`, [banca, status]);
  const counts = await many('SELECT status, count(*)::int AS n FROM provas GROUP BY status');
  res.json({ provas: rows.map((p) => view(p)), counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) });
}));
r.get('/provas/:id', ah(async (req, res) => {
  const p = await one(`${SELECT} WHERE p.id=$1`, [req.params.id]);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  res.json({ prova: view(p, true) });
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
r.get('/pedidos', ah(async (_req, res) => {
  const rows = await many(`SELECT pp.id, pp.plano, pp.periodicidade, pp.valor, pp.status, pp.created_at, u.id AS user_id, u.name, u.email, u.plano AS plano_atual, u.plano_ate
                           FROM plano_pedidos pp JOIN users u ON u.id = pp.user_id
                           ORDER BY (pp.status = 'pendente') DESC, pp.created_at DESC LIMIT 200`);
  res.json({ pedidos: rows.map((p) => ({ ...p, planoNome: PLANOS[p.plano]?.nome || p.plano })) });
}));
r.post('/pedidos/:pid/:acao', ah(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.pid) || !['aprovar', 'recusar'].includes(req.params.acao)) throw new HttpError(404, 'Pedido não encontrado.');
  const p = await one("SELECT * FROM plano_pedidos WHERE id=$1 AND status='pendente'", [req.params.pid]);
  if (!p) throw new HttpError(404, 'Pedido não encontrado ou já decidido.');
  if (req.params.acao === 'recusar') {
    await query("UPDATE plano_pedidos SET status='recusado', decidido_por=$2, decidido_em=now() WHERE id=$1", [p.id, req.user.id]);
    return res.json({ ok: true });
  }
  // Renovação soma ao período que ainda resta
  const u = await one(`UPDATE users SET plano=$2,
                         plano_ate = greatest(coalesce(CASE WHEN plano=$2 THEN plano_ate END, now()), now()) + (CASE WHEN $3='anual' THEN interval '1 year' ELSE interval '1 month' END),
                         updated_at=now() WHERE id=$1 RETURNING *`, [p.user_id, p.plano, p.periodicidade]);
  await query("UPDATE plano_pedidos SET status='aprovado', decidido_por=$2, decidido_em=now() WHERE id=$1", [p.id, req.user.id]);
  sendPlanoAtivadoEmail(u, { plano: PLANOS[p.plano]?.nome || p.plano, ate: u.plano_ate });
  res.json({ ok: true, planoAte: u.plano_ate });
}));

// G5: questões com gabarito em disputa entre os modelos do consenso — o admin escolhe/confirma
r.get('/divergencias', ah(async (_req, res) => {
  const rows = await many(`SELECT q.id, q.numero, q.materia, left(q.enunciado, 400) AS enunciado, q.alternativas, q.gabarito, q.divergencia_gabarito,
                                  p.id AS prova_id, coalesce(p.titulo, p.file_name) AS prova_titulo, p.banca
                           FROM prova_questoes q JOIN provas p ON p.id = q.prova_id
                           WHERE q.consenso_gabarito = false AND NOT q.anulada
                           ORDER BY p.created_at DESC, q.numero NULLS LAST LIMIT 200`);
  res.json({ divergencias: rows });
}));
r.post('/questoes/:qid/gabarito', ah(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.qid)) throw new HttpError(404, 'Questão não encontrada.');
  const b = parseBody(z.object({ gabarito: z.string().trim().toUpperCase().regex(/^[A-E]$/, 'Gabarito inválido.') }), req.body);
  const q = await one('SELECT id, alternativas FROM prova_questoes WHERE id=$1', [req.params.qid]);
  if (!q) throw new HttpError(404, 'Questão não encontrada.');
  const alts = Array.isArray(q.alternativas) ? q.alternativas : [];
  const ok = alts.length ? 'ABCDE'.indexOf(b.gabarito) < alts.length : /^[CE]$/.test(b.gabarito);
  if (!ok) throw new HttpError(422, alts.length ? 'Letra fora das alternativas desta questão.' : 'Questão Certo/Errado: use C ou E.');
  await query('UPDATE prova_questoes SET gabarito=$2, consenso_gabarito=true WHERE id=$1', [q.id, b.gabarito]);
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

r.get('/provas/:id/questoes', ah(async (req, res) => {
  const rows = await many('SELECT numero, materia, materia_id, topico, topico_id, comando, pegadinha_tipo, habilidade, dispositivos, enunciado, alternativas, gabarito, flagged, anulada, gabarito_alterado, gabarito_original, motivo_anulacao, gabarito_definitivo, consenso_gabarito, divergencia_gabarito FROM prova_questoes WHERE prova_id=$1 ORDER BY numero NULLS LAST, created_at', [req.params.id]);
  res.json({ questoes: rows });
}));
r.get('/provas/:id/arquivo', ah(async (req, res) => {
  const p = await one('SELECT file_key, file_name FROM provas WHERE id=$1', [req.params.id]);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  const f = await getFile(p.file_key);
  // Sempre como download e com tipo genérico: o navegador nunca abre/executa o arquivo do usuário
  res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(p.file_name)}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" }).send(f.buffer);
}));
r.delete('/provas/:id', ah(async (req, res) => {
  const p = await one('DELETE FROM provas WHERE id=$1 RETURNING file_key, gabarito_key', [req.params.id]);
  if (p) {
    await deleteFile(p.file_key);
    if (p.gabarito_key && !(await one('SELECT 1 FROM provas WHERE gabarito_key=$1', [p.gabarito_key]))) await deleteFile(p.gabarito_key);
  }
  res.json({ ok: true });
}));

r.get('/seguranca', ah(async (_req, res) => {
  const rows = await many(`SELECT e.id, e.kind, e.severity, e.file_name, e.details, e.created_at, u.name, u.email FROM security_events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 200`);
  const blocked = await many("SELECT name, email, uploads_blocked_until FROM users WHERE uploads_blocked_until > now()");
  res.json({ events: rows, blockedUsers: blocked });
}));

r.get('/ia', ah(async (_req, res) => {
  // O provedor simulado (testes / AI_MOCK) não custa nada e fica fora do painel
  const rawUsage = await many(`SELECT task, provider, model, batch, count(*)::int AS chamadas, sum(CASE WHEN ok THEN 0 ELSE 1 END)::int AS falhas, sum(CASE WHEN fallback THEN 1 ELSE 0 END)::int AS reservas,
                               coalesce(sum(input_tokens),0)::bigint AS entrada, coalesce(sum(output_tokens),0)::bigint AS saida, coalesce(sum(cache_read_tokens),0)::bigint AS cache,
                               round(avg(duration_ms))::int AS ms_medio
                             FROM ai_usage WHERE created_at > now() - interval '30 days' AND provider <> 'mock' GROUP BY task, provider, model, batch ORDER BY task, batch`);
  let totalUsd = 0;
  const usage = rawUsage.map((u) => {
    const usd = costUsd(u.model, u.entrada, u.saida, u.cache, u.batch);
    totalUsd += usd;
    return { ...u, custoUsd: Number(usd.toFixed(4)), custoBrl: Number((usd * USD_TO_BRL).toFixed(2)) };
  });
  const hojeUsd = await spentTodayUsd();
  const jobs = await many("SELECT status, count(*)::int AS n FROM jobs GROUP BY status");
  // Qualidade percebida pelos alunos (dados próprios do produto)
  const qualidade = await many(`SELECT banca, count(*) FILTER (WHERE rating=1)::int AS gostei, count(*) FILTER (WHERE rating=-1)::int AS nao_gostei,
                                  count(*) FILTER (WHERE report_status='confirmed')::int AS erros_confirmados, count(*) FILTER (WHERE report_status='rejected')::int AS erros_nao_confirmados
                                FROM question_feedback GROUP BY banca ORDER BY banca`);
  const revisor = await one(`SELECT coalesce(sum((review_stats->>'geradas')::int),0)::int AS geradas, coalesce(sum((review_stats->>'descartadas')::int),0)::int AS descartadas,
                               coalesce(sum((review_stats->>'refeitas')::int),0)::int AS refeitas FROM question_sets WHERE created_at > now() - interval '30 days' AND review_stats IS NOT NULL`);
  res.json({
    routing: describeRouting(),
    trainingMode: config.ai.trainingMode,
    mock: config.ai.mock,
    usage,
    custoTotal: { usd: Number(totalUsd.toFixed(4)), brl: Number((totalUsd * USD_TO_BRL).toFixed(2)), cotacao: USD_TO_BRL },
    limiteDia: { usd: config.ai.limiteUsdDia || null, gastoHojeUsd: Number(hojeUsd.toFixed(4)), atingido: !!config.ai.limiteUsdDia && hojeUsd >= config.ai.limiteUsdDia },
    jobs: Object.fromEntries(jobs.map((j) => [j.status, j.n])),
    qualidade,
    revisor,
  });
}));

export default r;
