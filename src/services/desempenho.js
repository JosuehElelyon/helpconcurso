// Serviço de Análise de Desempenho, Produtividade e Radar de Relevância
// Fornece métricas visuais completas para o concurseiro:
// - Horas/minutos estudados e velocidade média (segundos/questão)
// - Taxa de acerto global, acertos e erros
// - Evolução diária (últimos 14 a 30 dias)
// - Desempenho comparativo por disciplina vs linha de corte (80%)
// - Matriz 2D de Relevância da Banca × Domínio do Aluno (Quadrantes de Pareto)
// - Índice de Prontidão da Prova com velocímetro/gauge

import * as desempenhoRepo from '../repositories/desempenho.js';
import * as editaisRepo from '../repositories/editais.js';
import { buildEditalDashboard } from './edital.js';
import { HttpError } from '../lib/http.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const diaBR = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const somaDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const DIAS_SEMANA_ABR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatarTempo(totalSegundos = 0) {
  const s = Math.max(0, Math.round(Number(totalSegundos) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${seg}s`;
  return `${seg}s`;
}

export function formatarVelocidade(segundosPorQuestao = 0) {
  const s = Math.max(0, Math.round(Number(segundosPorQuestao) || 0));
  const m = Math.floor(s / 60);
  const seg = s % 60;
  if (m > 0) return `${m}m ${seg}s`;
  return `${seg}s`;
}

export async function obterDesempenhoCompleto(user, editalId = null) {
  const userId = user.id;
  const hoje = diaBR();

  // R14 (A4): Consulta leve e agregada via repositório, sem carregar o JSON pesado das questões
  const sets = await desempenhoRepo.buscarSimuladosParaDesempenho(userId, 90);

  let totalSegundosGravados = 0;
  let totalQuestoesSets = 0;
  let totalRespondidasSets = 0;
  let totalAcertosSets = 0;
  let simuladosConcluidos = 0;
  let simuladosModoProva = 0;

  const materiaStatsMap = new Map();

  for (const s of sets) {
    const respostas = s.respostas || {};
    const gabaritos = s.gabaritos || [];
    const nResp = Object.keys(respostas).length;
    const nTotal = Number(s.total_questoes) || gabaritos.length;

    if (nResp > 0) {
      simuladosConcluidos++;
      if (s.modo_prova) simuladosModoProva++;
    }

    const tGasto = Number(s.tempo_gasto_segundos) || 0;
    // Se o tempo gravado for > 0 usamos o real; se for 0 mas houver respostas, estima 100s por questão
    const tEfetivo = tGasto > 0 ? tGasto : nResp * 100;
    totalSegundosGravados += tEfetivo;

    totalQuestoesSets += nTotal;
    totalRespondidasSets += nResp;

    const mat = (s.materia || 'Geral').trim();
    if (!materiaStatsMap.has(mat)) {
      materiaStatsMap.set(mat, { materia: mat, respondidas: 0, acertos: 0, erros: 0, segundos: 0 });
    }
    const ms = materiaStatsMap.get(mat);
    ms.segundos += tEfetivo;

    for (const [k, v] of Object.entries(respostas)) {
      if (v == null) continue;
      const q = gabaritos[Number(k)];
      const acertou = q && v === q.gabarito;
      if (acertou) {
        totalAcertosSets++;
        ms.acertos++;
      } else {
        ms.erros++;
      }
      ms.respondidas++;
    }
  }

  // 2) Atividade diária e histórico dos últimos 14 a 30 dias (via repositório)
  const [atividadesRows, metaRow] = await Promise.all([
    desempenhoRepo.buscarAtividadeRecente(userId, 30),
    desempenhoRepo.buscarMetaPerfil(userId),
  ]);

  const atvMap = new Map(atividadesRows.map((r) => [r.dia, r]));
  const metaDiaria = metaRow?.meta_diaria || null;

  // Soma de atividade diária
  let totalRespondidasAtv = 0;
  let totalAcertosAtv = 0;
  for (const r of atividadesRows) {
    totalRespondidasAtv += r.respondidas;
    totalAcertosAtv += r.acertos;
  }

  // Consolidação de totais (garante o maior valor caso o usuário tenha simulados antigos)
  const totalRespondidas = Math.max(totalRespondidasSets, totalRespondidasAtv);
  const totalAcertos = Math.max(totalAcertosSets, totalAcertosAtv);
  const totalErros = Math.max(0, totalRespondidas - totalAcertos);
  const taxaGeralPct = totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : 0;

  // Métricas de Produtividade & Tempo
  const mediaSegundosPorQuestao = totalRespondidas > 0 ? Math.round(totalSegundosGravados / totalRespondidas) : 0;
  const horasTotaisDec = totalSegundosGravados / 3600;
  const questoesPorHora = horasTotaisDec > 0 ? Math.round((totalRespondidas / horasTotaisDec) * 10) / 10 : 0;

  // Evolução dos últimos 14 dias
  const evolucao = [];
  for (let i = 13; i >= 0; i--) {
    const dStr = somaDias(hoje, -i);
    const r = atvMap.get(dStr);
    const resp = r?.respondidas || 0;
    const ac = r?.acertos || 0;
    const err = Math.max(0, resp - ac);
    const taxa = resp > 0 ? Math.round((ac / resp) * 100) : null;
    const dateObj = new Date(`${dStr}T12:00:00Z`);
    const diaSemana = DIAS_SEMANA_ABR[dateObj.getUTCDay()];
    const diaMes = dStr.slice(8, 10);
    const mes = dStr.slice(5, 7);

    evolucao.push({
      dia: dStr,
      label: `${diaMes}/${mes}`,
      diaSemana,
      respondidas: resp,
      acertos: ac,
      erros: err,
      taxaPct: taxa,
      metaBatida: !!(metaDiaria && resp >= metaDiaria),
    });
  }

  // 3) Resolução de Edital (R13: valida UUID e prioriza edital ativo active=true)
  let edital = null;
  if (editalId) {
    const cleanId = String(editalId).trim();
    if (!UUID_RE.test(cleanId)) {
      throw new HttpError(400, 'ID de edital inválido.');
    }
    edital = await editaisRepo.buscar(cleanId, userId);
  }
  if (!edital) {
    edital = await editaisRepo.buscarAtivoOuRecente(userId);
  }

  let editalDashboard = null;
  let disciplinasResult = [];
  let radarResult = null;

  if (edital) {
    try {
      editalDashboard = await buildEditalDashboard(edital, userId);
      radarResult = editalDashboard.resumo?.radar || null;

      disciplinasResult = (editalDashboard.disciplinas || []).map((d) => {
        const resp = d.questoesRespondidas || 0;
        const ac = d.questoesAcertos || 0;
        const err = Math.max(0, resp - ac);
        const taxa = d.taxaAcertoGeral ?? (resp > 0 ? Math.round((ac / resp) * 100) : null);
        const qBanca = d.questoesNaBanca || 0;

        let statusCorte = 'sem_dados';
        if (taxa !== null) {
          if (taxa >= 80) statusCorte = 'aprovado';
          else if (taxa >= 65) statusCorte = 'competitivo';
          else statusCorte = 'risco';
        }

        return {
          id: d.id,
          materia: d.materia,
          peso: d.peso || 1,
          totalTopicos: d.totalTopicos || 0,
          estudados: d.estudados || 0,
          praticados: d.praticados || 0,
          dominados: d.dominados || 0,
          questoesRespondidas: resp,
          questoesAcertos: ac,
          questoesErros: err,
          taxaAcerto: taxa,
          questoesNaBanca: qBanca,
          statusCorte,
          topicos: d.topicos || [],
        };
      });
    } catch (e) {
      console.error('[ERRO-DESEMPENHO] Falha ao construir dashboard do edital:', e.message);
    }
  }

  // Se não houver edital, monta as disciplinas com base no histórico geral de simulados
  if (!disciplinasResult.length && materiaStatsMap.size > 0) {
    for (const ms of materiaStatsMap.values()) {
      const resp = ms.respondidas;
      const ac = ms.acertos;
      const err = ms.erros;
      const taxa = resp > 0 ? Math.round((ac / resp) * 100) : null;
      disciplinasResult.push({
        id: ms.materia,
        materia: ms.materia,
        peso: 1,
        totalTopicos: 1,
        estudados: resp > 0 ? 1 : 0,
        praticados: resp > 0 ? 1 : 0,
        dominados: taxa !== null && taxa >= 80 ? 1 : 0,
        questoesRespondidas: resp,
        questoesAcertos: ac,
        questoesErros: err,
        taxaAcerto: taxa,
        questoesNaBanca: 0,
        statusCorte: taxa !== null ? (taxa >= 80 ? 'aprovado' : taxa >= 65 ? 'competitivo' : 'risco') : 'sem_dados',
        topicos: [],
      });
    }
  }

  // 4) Matriz 2D de Relevância × Desempenho (Quadrantes de Pareto)
  const todosTopicos = editalDashboard?.disciplinas?.flatMap((d) => d.topicos || []) || [];
  const quadrantes = {
    perigo: [],
    fortaleza: [],
    reforco: [],
    conforto: [],
  };

  for (const t of todosTopicos) {
    const item = {
      id: t.id,
      codigo: t.codigo,
      nome: t.nome,
      materia: t.materia,
      taxaAcerto: t.taxaAcerto,
      questoesNaBanca: t.questoesNaBanca || 0,
      probBancaPct: t.probBancaPct || 0,
      relevanciaBanca: t.relevanciaBanca,
      prioridade: t.prioridade,
      prioridadeLabel: t.prioridadeLabel,
    };

    if (t.prioridade === 'critica') {
      quadrantes.perigo.push(item);
    } else if (t.prioridade === 'segura') {
      quadrantes.fortaleza.push(item);
    } else if (t.prioridade === 'reforco') {
      quadrantes.reforco.push(item);
    } else {
      quadrantes.conforto.push(item);
    }
  }

  // Ordenações úteis
  quadrantes.perigo.sort((a, b) => b.questoesNaBanca - a.questoesNaBanca || (a.taxaAcerto ?? 0) - (b.taxaAcerto ?? 0));
  quadrantes.fortaleza.sort((a, b) => b.questoesNaBanca - a.questoesNaBanca);
  quadrantes.reforco.sort((a, b) => b.questoesNaBanca - a.questoesNaBanca);

  // Diagnóstico pedagógico dinâmico para o concurseiro
  let diagnostico = '';
  const prontidao = radarResult?.indiceProntidao || (taxaGeralPct >= 80 ? 80 : taxaGeralPct);
  if (prontidao >= 80) {
    diagnostico = 'Desempenho excelente! Você está dentro da zona de corte de aprovação. Mantenha as revisões ativas para fixar as pegadinhas.';
  } else if (prontidao >= 65) {
    diagnostico = `Ritmo competitivo! Seu aproveitamento é de ${taxaGeralPct}%. Concentre-se nos tópicos de maior peso da banca para ultrapassar a barreira dos 80%.`;
  } else if (totalRespondidas > 0) {
    diagnostico = 'Fase de evolução: priorize os tópicos mais cobrados pela banca para maximizar seus pontos com menor tempo de estudo.';
  } else {
    diagnostico = 'Inicie seus primeiros simulados para que o Radar trace seu mapa térmico de pontos fortes e pontos cegos.';
  }

  return {
    usuario: {
      concursoAlvo: metaRow?.concurso_alvo || '',
      bancaPreferida: metaRow?.banca_preferida || '',
      dataProva: metaRow?.data_prova ? new Date(metaRow.data_prova).toISOString().slice(0, 10) : null,
      metaDiaria,
    },
    resumo: {
      totalRespondidas,
      totalAcertos,
      totalErros,
      taxaGeralPct,
      totalTempoSegundos: totalSegundosGravados,
      tempoFormatado: formatarTempo(totalSegundosGravados),
      mediaSegundosPorQuestao,
      mediaVelocidadeFormatada: formatarVelocidade(mediaSegundosPorQuestao),
      questoesPorHora,
      simuladosConcluidos,
      simuladosModoProva,
      ritmoIdeal: mediaSegundosPorQuestao > 0 && mediaSegundosPorQuestao <= 150,
      diagnostico,
    },
    evolucao,
    disciplinas: disciplinasResult,
    radar: {
      indiceProntidao: radarResult?.indiceProntidao ?? (totalRespondidas > 0 ? taxaGeralPct : 0),
      prontidaoFaixa: radarResult?.prontidaoFaixa ?? (taxaGeralPct >= 80 ? 'Zona de Aprovação' : taxaGeralPct >= 65 ? 'Competitivo' : 'Em Evolução'),
      prontidaoCor: radarResult?.prontidaoCor ?? (taxaGeralPct >= 80 ? 'var(--ok)' : taxaGeralPct >= 65 ? 'var(--brand)' : 'var(--accent)'),
      totalQuestoesNaBanca: radarResult?.totalQuestoesNaBanca || 0,
      distribuicaoPrioridades: radarResult?.distribuicaoPrioridades || {
        critica: quadrantes.perigo.length,
        reforco: quadrantes.reforco.length,
        segura: quadrantes.fortaleza.length,
        secundaria: quadrantes.conforto.length,
      },
      topUrgentes: radarResult?.topUrgentes || quadrantes.perigo.slice(0, 5),
      quadrantes,
    },
    editalAtivo: edital ? { id: edital.id, titulo: edital.titulo, cargo: edital.cargo, banca: edital.banca } : null,
  };
}

