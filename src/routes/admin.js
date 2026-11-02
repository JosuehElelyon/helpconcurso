// Painel do administrador: revisão de provas, base, segurança e uso de IA
import { Router } from 'express';
import { z } from 'zod';
import { one, many } from '../db.js';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { BANCA } from '../lib/bancas.js';
import { getFile, deleteFile } from '../lib/storage.js';
import { approveProva, rejectProva, reprocessProva, publicStatus } from '../services/provas.js';
import { describeRouting } from '../ai/index.js';
import { config } from '../config.js';

const r = Router();
r.use(requireAdmin);
r.param('id', checkId);

const view = (p, detail = false) => ({
  id: p.id, banca: p.banca, bancaInformada: p.banca_informada, orgao: p.orgao, cargo: p.cargo, ano: p.ano, titulo: p.titulo, fileName: p.file_name, gabaritoName: p.gabarito_name,
  status: p.status, statusLabel: publicStatus[p.status], error: p.error, source: p.source, uploader: p.uploader_name ? { name: p.uploader_name, email: p.uploader_email } : null,
  needsOcr: p.needs_ocr, pageCount: p.page_count, materias: p.materias, numQuestoes: p.num_questoes, reviewNote: p.review_note, autoApproved: p.auto_approved,
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
r.get('/provas/:id/questoes', ah(async (req, res) => {
  const rows = await many('SELECT numero, materia, enunciado, alternativas, gabarito, flagged FROM prova_questoes WHERE prova_id=$1 ORDER BY numero NULLS LAST, created_at', [req.params.id]);
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
  const usage = await many(`SELECT task, provider, model, count(*)::int AS chamadas, sum(CASE WHEN ok THEN 0 ELSE 1 END)::int AS falhas, sum(CASE WHEN fallback THEN 1 ELSE 0 END)::int AS reservas,
                              coalesce(sum(input_tokens),0)::bigint AS entrada, coalesce(sum(output_tokens),0)::bigint AS saida, coalesce(sum(cache_read_tokens),0)::bigint AS cache,
                              round(avg(duration_ms))::int AS ms_medio
                            FROM ai_usage WHERE created_at > now() - interval '30 days' GROUP BY task, provider, model ORDER BY task`);
  const jobs = await many("SELECT status, count(*)::int AS n FROM jobs GROUP BY status");
  // Qualidade percebida pelos alunos (dados próprios do produto)
  const qualidade = await many(`SELECT banca, count(*) FILTER (WHERE rating=1)::int AS gostei, count(*) FILTER (WHERE rating=-1)::int AS nao_gostei,
                                  count(*) FILTER (WHERE report_status='confirmed')::int AS erros_confirmados, count(*) FILTER (WHERE report_status='rejected')::int AS erros_nao_confirmados
                                FROM question_feedback GROUP BY banca ORDER BY banca`);
  const revisor = await one(`SELECT coalesce(sum((review_stats->>'geradas')::int),0)::int AS geradas, coalesce(sum((review_stats->>'descartadas')::int),0)::int AS descartadas,
                               coalesce(sum((review_stats->>'refeitas')::int),0)::int AS refeitas FROM question_sets WHERE created_at > now() - interval '30 days' AND review_stats IS NOT NULL`);
  res.json({ routing: describeRouting(), trainingMode: config.ai.trainingMode, mock: config.ai.mock, usage, jobs: Object.fromEntries(jobs.map((j) => [j.status, j.n])), qualidade, revisor });
}));

export default r;
