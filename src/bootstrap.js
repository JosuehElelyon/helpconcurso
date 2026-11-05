// Preparação comum aos processos (API e worker): configuração, migrações, semente da taxonomia, S3 e SMTP.
// Resiliente: sobe mesmo com S3/SMTP fora do ar (com aviso). As migrações usam trava no banco, então
// vários processos subindo juntos não aplicam a mesma migração duas vezes.
import { assertConfig } from './config.js';
import { migrate } from './db.js';
import { ensureTaxonomiaSeed } from './services/taxonomia.js';
import { ensureBucket } from './lib/storage.js';
import { verifyMailer } from './lib/mailer.js';

export function instalarTratadoresDeProcesso(nome) {
  process.on('unhandledRejection', (e) => console.error(`[processo:${nome}] promessa rejeitada sem tratamento:`, e));
  process.on('uncaughtException', (e) => console.error(`[processo:${nome}] exceção não tratada:`, e));
}

export async function prepararInfra() {
  assertConfig();
  await migrate();
  await ensureTaxonomiaSeed();
  await ensureBucket().catch((e) => console.warn('[s3]', e.message));
  await verifyMailer();
}

/** Papel do processo: api (só HTTP), worker (só fila) ou all (os dois — padrão, bom para dev e servidor único).
 *  Vem de --papel=api na linha de comando ou de PROCESS_ROLE no ambiente. */
const pedido = process.argv.find((a) => a.startsWith('--papel='))?.slice(8) || process.env.PROCESS_ROLE;
export const PAPEL = ['api', 'worker', 'all'].includes(pedido) ? pedido : 'all';
