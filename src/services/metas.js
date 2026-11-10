// Serviço puro do domínio de Metas & Progresso de Ritmo (sem UI, sem acoplamento cruzado com outros domínios).
import { normalizarEstrategia } from '../lib/estrategia.js';
import { resumoHoje } from './atividade.js';
import * as usuarios from '../repositories/usuarios.js';
import * as atividade from '../repositories/atividade.js';

const NIVEIS_XP = [
  { id: 'desbravador', min: 0 },
  { id: 'focado', min: 50 },
  { id: 'estrategista', min: 200 },
  { id: 'implacavel', min: 500 },
  { id: 'elite', min: 1200 },
  { id: 'lenda', min: 2500 },
];

function calcularNivelXp(xp) {
  let idx = 0;
  for (let i = 0; i < NIVEIS_XP.length; i++) {
    if (xp >= NIVEIS_XP[i].min) idx = i;
  }
  const atual = NIVEIS_XP[idx];
  const proximo = NIVEIS_XP[idx + 1] || null;
  const progressoNivelPct = proximo
    ? Math.min(100, Math.max(0, Math.round(((xp - atual.min) / (proximo.min - atual.min)) * 100)))
    : 100;
  return {
    nivelId: atual.id,
    proximoNivelId: proximo ? proximo.id : null,
    xpAtualMin: atual.min,
    xpProximoMin: proximo ? proximo.min : null,
    xpParaProximo: proximo ? Math.max(0, proximo.min - xp) : 0,
    progressoNivelPct,
  };
}

/** Dados puros das metas, sequência e XP do aluno (UI resolve ícones, cores e textos). */
export async function obterMetas(user) {
  const [u, hoje, hist] = await Promise.all([
    usuarios.buscar(user.id),
    resumoHoje(user),
    atividade.totaisHistorico(user.id),
  ]);

  const metaDiaria = u.meta_diaria || null;
  const dataProva = u.data_prova ? new Date(u.data_prova).toISOString().slice(0, 10) : '';
  const estrategia = normalizarEstrategia(u.meta_config || {}, u.banca_preferida || '');

  const totalRespondidas = hist?.respondidas || 0;
  const totalAcertos = hist?.acertos || 0;
  const seqRecorde = hoje.sequencia?.recorde || 0;
  const estrelasTotal = u.stars_total || 0;
  const xp = totalRespondidas + (totalAcertos * 2) + (seqRecorde * 15) + (estrelasTotal * 2);

  return {
    metaDiaria,
    concursoAlvo: u.concurso_alvo || '',
    bancaPreferida: u.banca_preferida || '',
    dataProva,
    diasParaProva: hoje.diasParaProva,
    estrategia,
    progressoHoje: {
      respondidas: hoje.hoje.respondidas,
      acertos: hoje.hoje.acertos,
      metaBatida: hoje.hoje.metaBatida,
      restantes: metaDiaria ? Math.max(0, metaDiaria - hoje.hoje.respondidas) : 0,
      percentual: metaDiaria ? Math.min(100, Math.round((hoje.hoje.respondidas / metaDiaria) * 100)) : 0,
    },
    sequencia: hoje.sequencia,
    semana: hoje.semana,
    gamificacao: {
      xp,
      ...calcularNivelXp(xp),
      estrelasTotal,
      estrelasSaldo: u.stars_balance || 0,
      totalRespondidas,
      totalAcertos,
      taxaAcertoHistorico: totalRespondidas ? Math.round((totalAcertos / totalRespondidas) * 100) : 0,
      diasAtivos: hist?.dias_ativos || 0,
    },
  };
}

export async function atualizarMetas(user, dados) {
  const metaConfig = dados.estrategia
    ? normalizarEstrategia(dados.estrategia, dados.bancaPreferida || user.banca_preferida || '')
    : null;

  const atualizado = await usuarios.atualizarMetas(user.id, {
    metaDiaria: dados.metaDiaria,
    concursoAlvo: dados.concursoAlvo,
    bancaPreferida: dados.bancaPreferida,
    dataProva: dados.dataProva,
    metaConfig,
  });
  return obterMetas(atualizado);
}
