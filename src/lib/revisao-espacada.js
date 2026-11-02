// =========================================================
// Algoritmo de Revisão Espaçada (Spaced Repetition / Leitner)
// Intervalos otimizados para concursos: 1 dia → 3 dias → 7 dias → 15 dias → Dominada
// =========================================================

export const INTERVALOS_DIAS = [1, 3, 7, 15];
export const FASE_DOMINADA = 5;

/**
 * Calcula o próximo estado da questão na revisão espaçada.
 *
 * @param {object} params
 * @param {object|null} params.estadoAnterior - Estado atual da questão em revisao_espacada
 * @param {boolean} params.acerto - Se a nova resposta foi correta
 * @param {Date} [params.data] - Data da resposta (default: now)
 * @returns {object|null} Novo estado da revisão ou null se acertou de primeira sem estar em ciclo
 */
export function calcularRevisao({ estadoAnterior = null, acerto, data = new Date() }) {
  const d = data instanceof Date ? data : new Date(data);
  const nowIso = d.toISOString();

  // Se acertou de primeira e nunca tinha errado essa questão, não precisa entrar no ciclo de erros
  if (acerto && !estadoAnterior) {
    return null;
  }

  // Se errou (seja pela 1ª vez ou durante o ciclo): reinicia para Fase 1 (1 dia)
  if (!acerto) {
    const proxima = new Date(d.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
    return {
      fase: 1,
      intervaloDias: 1,
      proximaRevisao: proxima,
      acertosSeguidos: 0,
      vezesAcertada: estadoAnterior?.vezesAcertada || 0,
      vezesErrada: (estadoAnterior?.vezesErrada || 0) + 1,
      dominada: false,
      ultimaResposta: nowIso,
      ultimoResultado: false,
    };
  }

  // Se acertou estando no ciclo de revisão: avança de fase
  const acertosSeguidos = (estadoAnterior.acertosSeguidos || 0) + 1;
  const vezesAcertada = (estadoAnterior.vezesAcertada || 0) + 1;
  const vezesErrada = estadoAnterior.vezesErrada || 0;

  if (acertosSeguidos >= 4) {
    // 4 acertos consecutivos após o erro: questão dominada!
    return {
      fase: FASE_DOMINADA,
      intervaloDias: null,
      proximaRevisao: null,
      acertosSeguidos,
      vezesAcertada,
      vezesErrada,
      dominada: true,
      ultimaResposta: nowIso,
      ultimoResultado: true,
    };
  }

  const proximaFase = acertosSeguidos + 1; // 2, 3 ou 4
  const intervaloDias = INTERVALOS_DIAS[acertosSeguidos]; // 3, 7 ou 15
  const proxima = new Date(d.getTime() + intervaloDias * 24 * 60 * 60 * 1000).toISOString();

  return {
    fase: proximaFase,
    intervaloDias,
    proximaRevisao: proxima,
    acertosSeguidos,
    vezesAcertada,
    vezesErrada,
    dominada: false,
    ultimaResposta: nowIso,
    ultimoResultado: true,
  };
}

/**
 * Retorna se uma questão está pendente para revisão hoje.
 */
export function paraRevisarHoje(estado, agora = new Date()) {
  if (!estado || estado.dominada || !estado.proximaRevisao) return false;
  const tAgora = agora instanceof Date ? agora.getTime() : new Date(agora).getTime();
  const tRev = new Date(estado.proximaRevisao).getTime();
  return tRev <= tAgora;
}

/**
 * Formata um rótulo legível para a fase da repetição espaçada.
 */
export function rotuloFase(fase, intervaloDias) {
  if (fase === FASE_DOMINADA) return '✔ Dominada';
  if (!fase) return null;
  return `Fase ${fase} (${intervaloDias}d)`;
}

/**
 * Totaliza as questões em revisão espaçada: ativas, pendentes para hoje e dominadas.
 */
export function resumoRevisao(mapa = {}, agora = new Date()) {
  let ativas = 0;
  let hoje = 0;
  let dominadas = 0;
  if (!mapa || typeof mapa !== 'object') return { ativas, hoje, dominadas };
  for (const item of Object.values(mapa)) {
    if (!item || typeof item !== 'object') continue;
    if (item.dominada) {
      dominadas++;
    } else if (item.fase) {
      ativas++;
      if (paraRevisarHoje(item, agora)) hoje++;
    }
  }
  return { ativas, hoje, dominadas };
}

