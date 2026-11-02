// Fila de tarefas persistente no PostgreSQL (sobrevive a reinícios e quedas).
// Retentativas com espera exponencial; após o máximo, a tarefa vai para "dead" e o handler.onDead é chamado.
import { query, one } from '../db.js';

const handlers = new Map();
let timer = null, running = 0, stopping = false;
const CONCURRENCY = 2, POLL_MS = 1500, STALE_MIN = 20;

export function registerJob(type, handler) { handlers.set(type, handler); } // handler: { run(payload, job), onDead?(payload, err), maxAttempts? }

export async function enqueue(type, payload, { delaySec = 0, maxAttempts } = {}) {
  const h = handlers.get(type);
  return one(`INSERT INTO jobs(type,payload,run_after,max_attempts) VALUES ($1,$2, now() + ($3 || ' seconds')::interval, $4) RETURNING id`,
    [type, JSON.stringify(payload), String(delaySec), maxAttempts || h?.maxAttempts || 4]);
}

async function pick() {
  return one(`UPDATE jobs SET status='running', locked_at=now(), attempts=attempts+1, updated_at=now()
              WHERE id = (SELECT id FROM jobs WHERE status='queued' AND run_after <= now() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
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
    if (job.attempts >= job.max_attempts || e?.permanent) {
      await query("UPDATE jobs SET status='dead', last_error=$2, locked_at=NULL, updated_at=now() WHERE id=$1", [job.id, msg]);
      console.error(`[jobs] ${job.type}#${job.id} desistiu após ${job.attempts} tentativa(s): ${msg}`);
      try { await h?.onDead?.(job.payload, e); } catch (e2) { console.error('[jobs] onDead falhou', e2); }
    } else {
      const wait = Math.min(1800, 20 * 3 ** (job.attempts - 1));
      await query("UPDATE jobs SET status='queued', last_error=$2, run_after=now() + ($3 || ' seconds')::interval, locked_at=NULL, updated_at=now() WHERE id=$1", [job.id, msg, String(wait)]);
      console.warn(`[jobs] ${job.type}#${job.id} falhou (tentativa ${job.attempts}), nova tentativa em ${wait}s: ${msg}`);
    }
  }
}

async function tick() {
  if (stopping) return;
  while (running < CONCURRENCY) {
    let job;
    try { job = await pick(); } catch (e) { console.warn('[jobs] erro ao buscar tarefa:', e.message); break; }
    if (!job) break;
    running++;
    runOne(job).finally(() => { running--; });
  }
}

export async function startWorker() {
  // Tarefas "presas" (servidor caiu no meio) voltam para a fila
  await query(`UPDATE jobs SET status='queued', locked_at=NULL WHERE status='running' AND locked_at < now() - interval '${STALE_MIN} minutes'`);
  await query("UPDATE jobs SET status='queued', locked_at=NULL WHERE status='running'"); // processo único: tudo que estava rodando foi interrompido
  timer = setInterval(() => tick().catch(() => {}), POLL_MS);
  tick().catch(() => {});
}
export async function stopWorker(timeoutMs = 20000) {
  stopping = true; clearInterval(timer);
  const t0 = Date.now();
  while (running > 0 && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 200));
}
export const kick = () => tick().catch(() => {});
