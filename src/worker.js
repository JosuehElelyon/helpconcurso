// Processo worker: só executa a fila de tarefas de IA (checar/treinar provas, importar lote, rotular, verificar erro
// reportado). Escala separado da API: rode quantos quiser — a fila no Postgres garante que cada tarefa roda uma vez.
//   node src/worker.js        (ou npm run start:worker)
// Saúde: GET http://localhost:${WORKER_HEALTH_PORT:-3001}/health
import http from 'node:http';
import { pool } from './db.js';
import { prepararInfra, instalarTratadoresDeProcesso } from './bootstrap.js';
import { startWorker, stopWorker, statusWorker } from './jobs/queue.js';
import './jobs/tarefas.js';

instalarTratadoresDeProcesso('worker');
await prepararInfra();
await startWorker();

const porta = Number(process.env.WORKER_HEALTH_PORT) || 3001;
const saude = http.createServer(async (req, res) => {
  if (req.url !== '/health') { res.writeHead(404).end(); return; }
  let banco = true;
  try { await pool.query('SELECT 1'); } catch { banco = false; }
  const st = statusWorker();
  const ok = banco && st.ativo;
  res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify({ ok, banco, ...st }));
}).listen(porta, '0.0.0.0', () => console.log(`[worker] saúde em http://localhost:${porta}/health`));

async function shutdown(sig) {
  console.log(`[worker] ${sig} recebido, terminando as tarefas em andamento...`);
  saude.close();
  await stopWorker();
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
