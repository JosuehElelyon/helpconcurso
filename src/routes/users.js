// Rotas públicas de usuários (sem login): foto de perfil, usada em <img>.
import { Router } from 'express';
import { one } from '../db.js';
import { ah, checkId } from '../lib/http.js';
import { getFile } from '../lib/storage.js';

const r = Router();
r.param('id', checkId);

r.get('/:id/avatar', ah(async (req, res) => {
  const u = await one('SELECT avatar_url, avatar_key FROM users WHERE id=$1', [req.params.id]);
  if (!u || (!u.avatar_url && !u.avatar_key)) return res.status(404).json({ error: 'Avatar não encontrado.' });
  if (u.avatar_key) {
    try {
      const file = await getFile(u.avatar_key);
      res.set({
        'Content-Type': file.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline; filename="avatar"',
      });
      return res.send(file.buffer);
    } catch {
      return res.status(404).json({ error: 'Arquivo do avatar não encontrado.' });
    }
  }
  if (u.avatar_url?.startsWith('/avatars/')) return res.redirect(u.avatar_url);
  return res.status(404).json({ error: 'Avatar não encontrado.' });
}));

export default r;
