// Atividade diária: quantas questões o aluno respondeu por dia (dia de Brasília).
// Alimenta a tela "Hoje": meta diária, sequência de dias de estudo e os últimos 7 dias.
import * as atividadeRepo from '../repositories/atividade.js';
import * as usuariosRepo from '../repositories/usuarios.js';

const diaBR = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Soma respostas novas ao dia de hoje. Falha aqui nunca derruba o registro da resposta. */
export async function registrarAtividade(userId, { respondidas = 0, acertos = 0 } = {}) {
  if (!userId || respondidas <= 0) return;
  await atividadeRepo.somarAoDia(userId, respondidas, acertos)
    .catch((e) => console.error('[ERRO-BANCO] atividade diária:', e.message));
}

/** Respostas novas entre dois estados de `respostas` de um simulado ({ "0": "A", ... }). */
export function contarNovas(questoes, antes = {}, depois = {}) {
  let respondidas = 0, acertos = 0;
  for (const [k, v] of Object.entries(depois || {})) {
    if (v == null || (antes || {})[k] != null) continue;
    respondidas++;
    if (v === (questoes || [])[Number(k)]?.gabarito) acertos++;
  }
  return { respondidas, acertos };
}

/** Sequência atual (conta até hoje, ou até ontem se hoje ainda não estudou) e recorde, a partir dos dias estudados. */
export function calcularSequencia(diasEstudados, hoje = diaBR()) {
  const set = new Set(diasEstudados);
  let atual = 0;
  let d = set.has(hoje) ? hoje : somaDias(hoje, -1);
  while (set.has(d)) { atual++; d = somaDias(d, -1); }
  let recorde = 0, corrida = 0, anterior = null;
  for (const dia of [...set].sort()) {
    corrida = anterior && somaDias(anterior, 1) === dia ? corrida + 1 : 1;
    recorde = Math.max(recorde, corrida);
    anterior = dia;
  }
  return { atual, recorde: Math.max(recorde, atual) };
}

export async function resumoHoje(user) {
  const hoje = diaBR();
  const [rows, u] = await Promise.all([
    atividadeRepo.diasRecentes(user.id, 400),
    usuariosRepo.metaEDataDaProva(user.id),
  ]);
  const porDia = new Map(rows.map((r) => [r.dia, r]));
  const meta = u?.meta_diaria || null;
  const h = porDia.get(hoje) || { respondidas: 0, acertos: 0 };
  const semana = [];
  for (let i = 6; i >= 0; i--) {
    const dia = somaDias(hoje, -i), r = porDia.get(dia);
    semana.push({ dia, respondidas: r?.respondidas || 0, metaBatida: !!(meta && r && r.respondidas >= meta) });
  }
  const dataProva = u?.data_prova ? new Date(u.data_prova).toISOString().slice(0, 10) : null;
  return {
    dia: hoje,
    meta,
    hoje: { respondidas: h.respondidas, acertos: h.acertos, metaBatida: !!(meta && h.respondidas >= meta) },
    sequencia: calcularSequencia(rows.filter((r) => r.respondidas > 0).map((r) => r.dia), hoje),
    semana,
    dataProva,
    diasParaProva: dataProva ? Math.round((new Date(`${dataProva}T12:00:00Z`) - new Date(`${hoje}T12:00:00Z`)) / 86400000) : null,
  };
}
