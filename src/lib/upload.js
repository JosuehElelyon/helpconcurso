// Recebimento de arquivos (multer em memória) com limites rígidos.
import multer from 'multer';
import { config } from '../config.js';
import { HttpError } from './http.js';

export const fixName = (n) => { try { return Buffer.from(n, 'latin1').toString('utf8').replace(/[\u0000-\u001f]/g, '').slice(0, 200); } catch { return 'arquivo'; } };
export function uploader(fields, { maxMb = config.security.uploadMaxMb } = {}) {
  const m = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxMb * 1024 * 1024, files: 2, fields: 12, fieldSize: 200 * 1024, parts: 20 } });
  const mw = m.fields(fields);
  return (req, res, next) => mw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, `Arquivo maior que ${maxMb} MB.`));
    if (err.code?.startsWith('LIMIT_')) return next(new HttpError(400, 'Envio fora dos limites permitidos.'));
    return next(new HttpError(400, 'Não foi possível receber o arquivo.'));
  });
}
export const fileOf = (req, field) => { const f = req.files?.[field]?.[0]; return f ? { buffer: f.buffer, name: fixName(f.originalname), mime: f.mimetype } : null; };
