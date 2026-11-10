// Processo da API (HTTP). Com PROCESS_ROLE=all (padrão) também roda a fila neste processo, como antes;
// em produção use PROCESS_ROLE=api aqui e um processo separado com `node src/worker.js`.
import { config } from './config.js';
import { pool } from './db.js';
import { createApp } from './app.js';
import { prepararInfra, instalarTratadoresDeProcesso, PAPEL } from './bootstrap.js';
import { startWorker, stopWorker } from './jobs/queue.js';
import './jobs/tarefas.js';

instalarTratadoresDeProcesso('api');
await prepararInfra();
if (PAPEL === 'all') await startWorker();

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => console.log(`HelpConcurso v2.0 — API em ${config.appUrl} (porta ${config.port}, papel ${PAPEL})${config.ai.mock ? ' — IA SIMULADA' : ''}`));
server.requestTimeout = 10 * 60 * 1000; // gerações longas
server.headersTimeout = 65 * 1000;

// Desligamento gracioso: para de aceitar conexões e termina as tarefas em andamento antes de sair
async function shutdown(sig) {
  console.log(`[processo] ${sig} recebido, encerrando...`);
  server.close();
  if (PAPEL === 'all') await stopWorker();
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
