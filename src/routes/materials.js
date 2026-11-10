// Materiais de estudo. A regra está em services/materiais.js; o SQL, em repositories/materiais.js.
import { Router } from 'express';
import { materialLimit } from '../middleware/limites.js';
import { ah, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import * as Materiais from '../services/materiais.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);

const view = (m) => ({ id: m.id, fileName: m.file_name, pages: m.pages, wordCount: m.word_count, preview: m.text.slice(0, 1400), materia: m.materia, detect: m.detect, editalId: m.edital_id || null, editalMatch: m.edital_match || null, ocr: m.ocr, createdAt: m.created_at });

// Envia um arquivo (multipart "file") ou texto colado (campo "text")
r.post('/', materialLimit, uploader([{ name: 'file', maxCount: 1 }]), ah(async (req, res) => {
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
  const { material, warnings } = await Materiais.enviarMaterial(req.user, {
    arquivo: fileOf(req, 'file'), textoColado: req.body?.text, editalId: req.body?.editalId, ip: req.ip, signal: ctrl.signal,
  });
  res.status(201).json({ material: view(material), warnings });
}));

// Cruza (ou recrusa) um material já enviado com um edital do aluno
r.post('/:id/edital', materialLimit, ah(async (req, res) => {
  res.json({ material: view(await Materiais.cruzarComEdital(req.user, req.params.id, req.body?.editalId)) });
}));

r.get('/', ah(async (req, res) => res.json({ materials: (await Materiais.listarMateriais(req.user)).map(view) })));

r.delete('/:id', ah(async (req, res) => {
  await Materiais.excluirMaterial(req.user, req.params.id);
  res.json({ ok: true });
}));

export default r;
