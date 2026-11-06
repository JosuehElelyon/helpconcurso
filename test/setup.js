// Carregado antes de cada arquivo de teste (npm test → --import): os testes usam um banco próprio,
// para não misturar usuários e uso de IA de teste com o banco de desenvolvimento.
// Banco: TEST_DATABASE_URL, ou o mesmo de DATABASE_URL com o sufixo "_test" (criado se não existir).
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.DATABASE_URL;
if (!base) throw new Error('Defina DATABASE_URL (ou TEST_DATABASE_URL) para rodar os testes.');
const url = new URL(process.env.TEST_DATABASE_URL || base);
if (!process.env.TEST_DATABASE_URL && !url.pathname.endsWith('_test')) url.pathname += '_test';
const dbName = decodeURIComponent(url.pathname.slice(1));

const admin = new pg.Client({ connectionString: base });
await admin.connect();
try {
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
} catch (e) {
  if (!['42P04', '23505'].includes(e.code)) throw e; // outro arquivo de teste criou ao mesmo tempo
} finally {
  await admin.end();
}
process.env.DATABASE_URL = url.toString();

// Garante que todas as migrações estão aplicadas antes de qualquer arquivo de teste rodar
// (no CI o banco começa vazio e os arquivos de teste rodam em paralelo) e limpa tarefas antigas.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const limpa = new pg.Client({ connectionString: process.env.DATABASE_URL });
await limpa.connect();
try {
  await limpa.query('SELECT pg_advisory_lock(727274)');
  await limpa.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await limpa.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await fs.readFile(path.join(dir, f), 'utf8');
    await limpa.query('BEGIN');
    try {
      await limpa.query(sql);
      await limpa.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
      await limpa.query('COMMIT');
    } catch (e) {
      await limpa.query('ROLLBACK');
      throw new Error(`Falha na migração ${f}: ${e.message}`);
    }
  }
  await limpa.query("UPDATE jobs SET status='dead', updated_at=now() WHERE status IN ('queued','running') AND created_at < now() - interval '2 minutes'");
  await limpa.query("DELETE FROM limites_requisicao WHERE chave LIKE 'teste-%' AND reinicia_em < now()");
} finally {
  await limpa.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
  await limpa.end();
}

// Limites de requisição ficam no banco (compartilhados entre instâncias). Cada arquivo de teste usa um prefixo próprio
// (herdado pelos servidores que ele sobe), para os arquivos que rodam em paralelo não somarem contagens entre si.
process.env.RATE_LIMIT_PREFIXO ||= `teste-${process.pid}-${Date.now().toString(36)}`;
