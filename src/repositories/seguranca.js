// Repositório de segurança para o admin (eventos e alunos com envio bloqueado). Só SQL, só leitura.
import { many } from '../db.js';

export const eventosRecentes = () => many(
  `SELECT e.id, e.kind, e.severity, e.file_name, e.details, e.created_at, u.name, u.email
   FROM security_events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 200`);

export const usuariosBloqueados = () => many('SELECT name, email, uploads_blocked_until FROM users WHERE uploads_blocked_until > now()');
