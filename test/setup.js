// Carregado antes de cada arquivo de teste (npm test → --import): os testes usam um banco próprio,
// para não misturar usuários e uso de IA de teste com o banco de desenvolvimento.
// Banco: TEST_DATABASE_URL, ou o mesmo de DATABASE_URL com o sufixo "_test" (criado se não existir).
// As migrações são aplicadas pelo servidor que o teste sobe.
import pg from 'pg';

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
