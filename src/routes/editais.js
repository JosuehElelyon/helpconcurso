import { Router } from 'express';
import { editalLimit } from '../middleware/limites.js';
import { ah, HttpError, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { visaoSimulado } from '../lib/visao-simulado.js';
import { uploader, fileOf } from '../lib/upload.js';
import { linkOficialDeclarado } from '../lib/bancas.js';
import { baixarDaFonteOficial } from '../lib/fonte-oficial.js';
import { assertCanUpload } from '../services/quota.js';
import {
  createEditalForUser, buildEditalDashboard, getQuestoesReaisDoTopico, criarSimuladoQuestoesReais, criarSimuladoProvaReal,
  editalDoAluno, listarEditais, ativarEdital, excluirEdital,
} from '../services/edital.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);


const summaryView = (e) => {
  const vert = e.verticalizado || [];
  const totalTopicos = vert.reduce((a, d) => a + (d.topicos?.length || 0), 0);
  return {
    id: e.id,
    titulo: e.titulo,
    orgao: e.orgao,
    cargo: e.cargo,
    banca: e.banca,
    ano: e.ano,
    provaId: e.prova_id || null,
    fileName: e.file_name,
    pages: e.pages,
    active: e.active,
    officialUrl: e.official_url || null,
    oficialConfirmado: !!e.oficial_confirmado,
    officialUrlTipo: e.official_url_tipo || null,
    totalDisciplinas: vert.length,
    totalTopicos,
    createdAt: e.created_at,
  };
};

r.get('/', ah(async (req, res) => {
  const { rows, active } = await listarEditais(req.user);
  res.json({ editais: rows.map(summaryView), active });
}));

r.get('/:id', ah(async (req, res) => {
  res.json({ edital: await buildEditalDashboard(await editalDoAluno(req.user, req.params.id), req.user.id) });
}));

r.post('/', editalLimit, uploader([{ name: 'file', maxCount: 1 }]), ah(async (req, res) => {
  await assertCanUpload(req.user, 'material');
  let f = fileOf(req, 'file');
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
  let link = linkOficialDeclarado(req.body?.banca, req.body?.officialUrl);
  if (!f && !String(req.body?.text || '').trim() && req.body?.officialUrl) {
    // Sem arquivo nem texto + link: baixa da fonte oficial (Diário Oficial, banca, órgão) — origem confirmada
    const d = await baixarDaFonteOficial(req.body?.banca, req.body.officialUrl);
    f = { buffer: d.buffer, name: d.name, mime: d.mime };
    link = { campos: { officialUrl: d.url, oficialConfirmado: true, officialUrlTipo: d.tipo }, aviso: null };
  }
  const { editalRow, warnings, reaproveitado } = await createEditalForUser({
    user: req.user,
    file: f,
    text: req.body?.text,
    banca: req.body?.banca,
    orgao: req.body?.orgao,
    cargo: req.body?.cargo,
    ano: req.body?.ano,
    provaId: req.body?.provaId,
    ...link.campos,
    ip: req.ip,
    signal: ctrl.signal,
  });
  if (link.aviso) warnings.push(link.aviso);
  res.status(201).json({ edital: await buildEditalDashboard(editalRow, req.user.id), warnings, reaproveitado });
}));

r.post('/:id/ativar', ah(async (req, res) => res.json({ edital: await ativarEdital(req.user, req.params.id) })));

r.get('/:id/topicos/:topicoId/questoes-reais', ah(async (req, res) => {
  const e = await editalDoAluno(req.user, req.params.id);
  const limite = Math.min(50, Math.max(1, Number(req.query.limite) || 10));
  const result = await getQuestoesReaisDoTopico(e, req.params.topicoId, limite);
  if (!result) throw new HttpError(404, 'Tópico não encontrado no edital.');
  res.json(result);
}));

r.post('/:id/topicos/:topicoId/praticar-reais', ah(async (req, res) => {
  const e = await editalDoAluno(req.user, req.params.id);
  const limite = Math.min(25, Math.max(1, Number(req.body?.limite) || 10));
  const out = await criarSimuladoQuestoesReais({
    user: req.user,
    edital: e,
    topicoIdOrCode: req.params.topicoId,
    limite,
    cadernoId: req.body?.cadernoId || null,
  });
  if (!out.created) {
    throw new HttpError(404, out.message || 'Nenhuma questão encontrada para este tópico.');
  }
  res.status(201).json({ ...out, set: visaoSimulado(out.set) });
}));

r.post('/:id/simulado-prova-real', ah(async (req, res) => {
  const e = await editalDoAluno(req.user, req.params.id);
  const qtdTotal = Math.min(120, Math.max(5, Number(req.body?.qtdTotal) || 30));
  const tempoMinutos = req.body?.tempoMinutos !== undefined && req.body?.tempoMinutos !== null
    ? Math.max(0, Math.min(360, Number(req.body.tempoMinutos) || 0))
    : 120;
  const out = await criarSimuladoProvaReal({
    user: req.user,
    edital: e,
    qtdTotal,
    tempoMinutos,
    cadernoId: req.body?.cadernoId || null,
  });
  if (!out.created) {
    throw new HttpError(404, out.message || 'Nenhuma questão encontrada para montar a prova real.');
  }
  res.status(201).json({ ...out, set: visaoSimulado(out.set) });
}));

r.delete('/:id', ah(async (req, res) => { await excluirEdital(req.user, req.params.id); res.json({ ok: true }); }));

export default r;
