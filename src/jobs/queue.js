// Fila de tarefas persistente no PostgreSQL (sobrevive a reinícios e quedas).
// Retentativas com espera exponencial; após o máximo, a tarefa vai para "dead" e o handler.onDead é chamado.
//
// Vários workers podem rodar ao mesmo tempo (em máquinas diferentes):
// - cada tarefa é reservada com FOR UPDATE SKIP LOCKED (nunca roda em dois workers);
// - o worker renova locked_at das suas tarefas a cada HEARTBEAT_MS; tarefa sem batimento há STALE_MS
//   é de um worker que caiu e volta para a fila;
// - a API avisa os workers por NOTIFY ao enfileirar (o polling continua como garantia).
import os from 'node:os';
import { pool, query, one } from '../db.js';

const handlers = new Map();
let timer = null, heartbeat = null, listener = null, running = 0, stopping = false, started = false;
const ativos = new Set(); // ids das tarefas rodando neste processo
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 2;
const POLL_MS = 1500, HEARTBEAT_MS = 30_000, STALE_MS = 2 * 60_000;
const CANAL = 'jobs_novos';
export const WORKER_ID = `${os.hostname()}:${process.pid}`;

// handler: { run(payload, job), onDead?(payload, err), maxAttempts?, prioridade? } — prioridade maior sai primeiro (padrão 0;
// tarefas de fundo usam negativa para nunca atrasar as do aluno)
export function registerJob(type, handler) { handlers.set(type, handler); }

export async function enqueue(type, payload, { delaySec = 0, maxAttempts, prioridade } = {}) {
  const h = handlers.get(type);
  const job = await one(`INSERT INTO jobs(type,payload,run_after,max_attempts,prioridade) VALUES ($1,$2, now() + ($3 || ' seconds')::interval, $4, $5) RETURNING id`,
    [type, JSON.stringify(payload), String(delaySec), maxAttempts || h?.maxAttempts || 4, prioridade ?? h?.prioridade ?? 0]);
  if (!delaySec) await query(`NOTIFY ${CANAL}`).catch(() => {}); // acorda os workers na hora
  return job;
}

async function pick() {
  return one(`UPDATE jobs SET status='running', locked_at=now(), attempts=attempts+1, updated_at=now()
              WHERE id = (SELECT id FROM jobs WHERE status='queued' AND run_after <= now() ORDER BY prioridade DESC, id FOR UPDATE SKIP LOCKED LIMIT 1)
              RETURNING *`);
}

async function runOne(job) {
  const h = handlers.get(job.type);
  try {
    if (!h) throw new Error(`Sem handler para ${job.type}`);
    const res = await h.run(job.payload, job);
    if (res && res.retryInSec) { // tarefa pediu para ser chamada de novo (ex.: aguardar lote)
      await query("UPDATE jobs SET status='queued', attempts=attempts-1, run_after=now() + ($2 || ' seconds')::interval, locked_at=NULL, updated_at=now() WHERE id=$1", [job.id, String(res.retryInSec)]);
    } else await query("UPDATE jobs SET status='done', locked_at=NULL, updated_at=now() WHERE id=$1", [job.id]);
  } catch (e) {
    const msg = String(e?.message || e).slice(0, 500);
    if (e?.code === 'budget') { // limite diário de gasto: espera 30 min sem gastar tentativa
      await query("UPDATE jobs SET status='queued', attempts=attempts-1, last_error=$2, run_after=now() + interval '30 minutes', locked_at=NULL, updated_at=now() WHERE id=$1", [job.id, msg]);
      console.warn(`[ERRO-IA] [LIMITE-DIARIO] ${job.type}#${job.id} adiada por 30 min`);
      return;
    }
    const tag = e?.name === 'AiError' || e?.code === 'bad_output' || e?.code === 'rate_limit' ? '[ERRO-IA] [FILA]' : '[ERRO-FILA]';
    if (job.attempts >= job.max_attempts || e?.permanent) {
      await query("UPDATE jobs SET status='dead', last_error=$2, locked_at=NULL, updated_at=now() WHERE id=$1", [job.id, msg]);
      console.error(`${tag} ${job.type}#${job.id} desistiu após ${job.attempts} tentativa(s): ${msg}`);
      try { await h?.onDead?.(job.payload, e); } catch (e2) { console.error('[ERRO-FILA] onDead falhou', e2); }
    } else {
      const wait = Math.min(1800, 20 * 3 ** (job.attempts - 1));
      await query("UPDATE jobs SET status='queued', last_error=$2, run_after=now() + ($3 || ' seconds')::interval, locked_at=NULL, updated_at=now() WHERE id=$1", [job.id, msg, String(wait)]);
      console.warn(`${tag} ${job.type}#${job.id} falhou (tentativa ${job.attempts}), nova tentativa em ${wait}s: ${msg}`);
    }
  }
}

async function tick() {
  if (stopping || !started) return;
  while (running < CONCURRENCY) {
    let job;
    try { job = await pick(); } catch (e) { console.warn('[ERRO-FILA] erro ao buscar tarefa:', e.message); break; }
    if (!job) break;
    running++; ativos.add(job.id);
    runOne(job).finally(() => { running--; ativos.delete(job.id); tick().catch(() => {}); });
  }
}

// Tarefas sem batimento há STALE_MS: o worker que as pegou caiu → voltam para a fila
async function recuperarOrfas() {
  const r = await query(`UPDATE jobs SET status='queued', locked_at=NULL, updated_at=now()
                         WHERE status='running' AND locked_at < now() - ($1 || ' milliseconds')::interval RETURNING id`, [String(STALE_MS)]);
  if (r.rowCount) console.warn(`[fila] ${r.rowCount} tarefa(s) de worker interrompido voltaram para a fila`);
}

async function batimento() {
  if (ativos.size) await query('UPDATE jobs SET locked_at=now() WHERE id = ANY($1::bigint[]) AND status=$2', [[...ativos], 'running']).catch(() => {});
  await recuperarOrfas().catch(() => {});
}

async function escutar() {
  try {
    listener = await pool.connect();
    listener.on('notification', () => tick().catch(() => {}));
    listener.on('error', () => { try { listener.release(true); } catch {} listener = null; if (!stopping) setTimeout(escutar, 5000); });
    await listener.query(`LISTEN ${CANAL}`);
  } catch (e) {
    console.warn('[fila] LISTEN indisponível, seguindo só com polling:', e.message);
    if (listener) { try { listener.release(true); } catch {} listener = null; }
  }
}

export async function startWorker() {
  if (started) return;
  started = true; stopping = false;
  await recuperarOrfas();
  await escutar();
  timer = setInterval(() => tick().catch(() => {}), POLL_MS);
  heartbeat = setInterval(() => batimento(), HEARTBEAT_MS);
  console.log(`[fila] worker ${WORKER_ID} ativo (concorrência ${CONCURRENCY})`);
  tick().catch(() => {});
}

export async function stopWorker(timeoutMs = 20000) {
  stopping = true; clearInterval(timer); clearInterval(heartbeat);
  const t0 = Date.now();
  while (running > 0 && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 200));
  if (listener) { try { await listener.query(`UNLISTEN ${CANAL}`); } catch {} listener.release(); listener = null; }
}

/** Estado do worker (para /health do processo worker e para o admin). */
export const statusWorker = () => ({ id: WORKER_ID, ativo: started && !stopping, rodando: running, concorrencia: CONCURRENCY, escutando: !!listener });
