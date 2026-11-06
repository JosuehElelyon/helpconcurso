// Provas enviadas pelos usuários para a base compartilhada
import { Router } from 'express';
import { provaLimit } from '../middleware/limites.js';
import { z } from 'zod';
import { one, many, query } from '../db.js';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import { BANCA, linkOficialDeclarado } from '../lib/bancas.js';
import { baixarDaFonteOficial } from '../lib/fonte-oficial.js';
import { submitProva, publicStatus } from '../services/provas.js';
import { createEditalForUser } from '../services/edital.js';
import { assertCanUpload } from '../services/quota.js';
import { scanText, SEV } from '../security/index.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);

const meta = z.string().trim().max(120).optional().default('');
r.post('/', provaLimit, uploader([{ name: 'prova', maxCount: 1 }, { name: 'gabarito', maxCount: 1 }, { name: 'edital', maxCount: 1 }]), ah(async (req, res) => {
  await assertCanUpload(req.user, 'prova');
  const b = parseBody(z.object({
    banca: z.enum(Object.keys(BANCA), { errorMap: () => ({ message: 'Escolha a banca.' }) }),
    orgao: meta, cargo: meta, ano: z.string().trim().regex(/^(\d{4})?$/, 'Ano inválido.').optional().default(''),
    editalId: z.string().trim().optional().default(''),
    officialUrl: z.string().trim().max(500, 'Link oficial muito longo.').optional().default(''),
  }), req.body);
  for (const v of [b.orgao, b.cargo]) if (SEV[scanText(v).severity] >= SEV.medium) throw new HttpError(422, 'Órgão/cargo com conteúdo não permitido.');
  let file = fileOf(req, 'prova');
  let link = linkOficialDeclarado(b.banca, b.officialUrl);
  if (!file && b.officialUrl) {
    // Sem arquivo + link: o servidor baixa da fonte oficial — aí a origem é confirmada
    const d = await baixarDaFonteOficial(b.banca, b.officialUrl);
    file = { buffer: d.buffer, name: d.name, mime: d.mime };
    link = { campos: { officialUrl: d.url, oficialConfirmado: true, officialUrlTipo: d.tipo }, aviso: null };
  }
  if (!file) throw new HttpError(400, 'Envie o arquivo da prova (PDF, DOCX, DOC ou TXT) ou cole o link direto do arquivo no site oficial.');
  const avisos = link.aviso ? [link.aviso] : [];

  let editalId = b.editalId;
  let editalCreated = null;
  const editalFile = fileOf(req, 'edital');
  if (editalFile) {
    const { editalRow } = await createEditalForUser({
      user: req.user, file: editalFile, banca: b.banca, orgao: b.orgao, cargo: b.cargo, ano: b.ano, ip: req.ip, ...link.campos,
    });
    editalId = editalRow.id;
    editalCreated = { id: editalRow.id, titulo: editalRow.titulo };
  }

  const out = await submitProva({
    user: req.user,
    ...b,
    ...link.campos,
    editalId,
    file,
    gabarito: fileOf(req, 'gabarito'),
    ip: req.ip,
  });
  if (editalCreated && out.prova) {
    await query('UPDATE editais SET prova_id=$2 WHERE id=$1', [editalCreated.id, out.prova.id]);
  } else if (editalCreated && out.provaId) {
    // Duplicata: a prova já existe (talvez de outro aluno). O edital deste aluno aponta para ela,
    // mas a prova só ganha o vínculo se for dele e ainda não tiver edital.
    await query('UPDATE provas SET edital_id=$2 WHERE id=$1 AND uploaded_by=$3 AND edital_id IS NULL', [out.provaId, editalCreated.id, req.user.id]);
    await query('UPDATE editais SET prova_id=$2 WHERE id=$1', [editalCreated.id, out.provaId]);
  }
  if (out.duplicate) return res.status(200).json({ duplicate: true, message: out.message, edital: editalCreated, avisos });
  res.status(202).json({
    prova: viewMine({ ...out.prova, edital_titulo: editalCreated?.titulo || null }),
    edital: editalCreated,
    avisos,
    message: 'Recebemos sua prova! Ela passa por verificações automáticas e, se preciso, por uma revisão antes de entrar na base.',
  });
}));

// Vincula uma prova já enviada a um edital existente ou a um novo arquivo de edital
r.post('/:id/edital', provaLimit, uploader([{ name: 'edital', maxCount: 1 }]), ah(async (req, res) => {
  const p = await one('SELECT * FROM provas WHERE id=$1 AND (uploaded_by=$2 OR $3)', [req.params.id, req.user.id, req.user.role === 'ADMIN']);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  const editalFile = fileOf(req, 'edital');
  let editalId = String(req.body?.editalId || '').trim();
  if (editalFile) {
    const { editalRow } = await createEditalForUser({
      user: req.user, file: editalFile, banca: p.banca, orgao: p.orgao, cargo: p.cargo, ano: p.ano, provaId: p.id, ip: req.ip,
    });
    editalId = editalRow.id;
  } else if (editalId) {
    if (!/^[0-9a-f-]{36}$/i.test(editalId)) throw new HttpError(400, 'Edital inválido.');
    const ed = await one('SELECT * FROM editais WHERE id=$1 AND user_id=$2', [editalId, req.user.id]);
    if (!ed) throw new HttpError(404, 'Edital não encontrado.');
    await query('UPDATE provas SET edital_id=$2 WHERE id=$1', [p.id, ed.id]);
    await query('UPDATE editais SET prova_id=COALESCE(prova_id, $2), banca=COALESCE(banca, $3) WHERE id=$1', [ed.id, p.id, p.banca]);
  } else {
    await query('UPDATE provas SET edital_id=NULL WHERE id=$1', [p.id]);
  }
  const rows = await many(
    `SELECT p.*, e.titulo AS edital_titulo FROM provas p LEFT JOIN editais e ON e.id = p.edital_id WHERE p.uploaded_by=$1 ORDER BY p.created_at DESC LIMIT 200`,
    [req.user.id]
  );
  res.json({ provas: rows.map(viewMine) });
}));

const viewMine = (p) => ({
  id: p.id, banca: p.banca, orgao: p.orgao, cargo: p.cargo, ano: p.ano,
  titulo: p.titulo || p.file_name, fileName: p.file_name, status: p.status, statusLabel: publicStatus[p.status],
  editalId: p.edital_id || null, editalTitulo: p.edital_titulo || null,
  officialUrl: p.official_url || null, oficialConfirmado: !!p.oficial_confirmado, officialUrlTipo: p.official_url_tipo || null,
  motivo: ['REJECTED', 'DUPLICATE'].includes(p.status) ? p.review_note : null, numQuestoes: p.status === 'READY' ? p.num_questoes : null, createdAt: p.created_at,
});

r.get('/minhas', ah(async (req, res) => {
  const rows = await many(
    `SELECT p.*, e.titulo AS edital_titulo FROM provas p LEFT JOIN editais e ON e.id = p.edital_id WHERE p.uploaded_by=$1 ORDER BY p.created_at DESC LIMIT 200`,
    [req.user.id]
  );
  res.json({ provas: rows.map(viewMine) });
}));

export default r;
