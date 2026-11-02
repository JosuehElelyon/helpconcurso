// Uso: npm run make-admin -- email@dominio.com
import { query, pool } from '../src/db.js';
const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Informe o e-mail: npm run make-admin -- voce@email.com'); process.exit(1); }
const r = await query("UPDATE users SET role='ADMIN', updated_at=now() WHERE email=$1 RETURNING name", [email]);
console.log(r.rowCount ? `${r.rows[0].name} agora é administrador.` : 'Usuário não encontrado. Ele precisa criar a conta primeiro.');
await pool.end();
