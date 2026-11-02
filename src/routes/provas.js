// Provas enviadas pelos usuários para a base compartilhada
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { many } from '../db.js';
import { ah, HttpError, parseBody } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import { BANCA } from '../lib/bancas.js';
import { submitProva, publicStatus } from '../services/provas.js';
import { assertCanUpload } from '../services/quota.js';
import { scanText, SEV } from '../security/index.js';

const r = Router();
r.use(requireAuth);
const perUser = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitos envios em pouco tempo. Aguarde alguns minutos.' } });

const meta = z.string().trim().max(120).optional().default('');
r.post('/', perUser, uploader([{ name: 'prova', maxCount: 1 }, { name: 'gabarito', maxCount: 1 }]), ah(async (req, res) => {
  await assertCanUpload(req.user, 'prova');
  const b = parseBody(z.object({
    banca: z.enum(Object.keys(BANCA), { errorMap: () => ({ message: 'Escolha a banca.' }) }),
    orgao: meta, cargo: meta, ano: z.string().trim().regex(/^(\d{4})?$/, 'Ano inválido.').optional().default(''),
  }), req.body);
  for (const v of [b.orgao, b.cargo]) if (SEV[scanText(v).severity] >= SEV.medium) throw new HttpError(422, 'Órgão/cargo com conteúdo não permitido.');
  const file = fileOf(req, 'prova');
  if (!file) throw new HttpError(400, 'Envie o arquivo da prova (PDF, DOCX, DOC ou TXT).');
  const out = await submitProva({ user: req.user, ...b, file, gabarito: fileOf(req, 'gabarito'), ip: req.ip });
  if (out.duplicate) return res.status(200).json({ duplicate: true, message: out.message });
  res.status(202).json({ prova: viewMine(out.prova), message: 'Recebemos sua prova! Ela passa por verificações automáticas e, se preciso, por uma revisão antes de entrar na base.' });
}));

const viewMine = (p) => ({ id: p.id, banca: p.banca, titulo: p.titulo || p.file_name, fileName: p.file_name, status: p.status, statusLabel: publicStatus[p.status],
  motivo: ['REJECTED', 'DUPLICATE'].includes(p.status) ? p.review_note : null, numQuestoes: p.status === 'READY' ? p.num_questoes : null, createdAt: p.created_at });

r.get('/minhas', ah(async (req, res) => {
  const rows = await many('SELECT * FROM provas WHERE uploaded_by=$1 ORDER BY created_at DESC LIMIT 200', [req.user.id]);
  res.json({ provas: rows.map(viewMine) });
}));

export default r;
