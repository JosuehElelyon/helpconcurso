// Painel de IA do admin (Sprint 6 — medir): custo por tarefa e por funcionalidade, custo médio por uso, aproveitamento do
// cache de prompt e qualidade por modelo/versão de prompt. É a base para decidir modelos, preços e limites dos planos.
import { config } from '../config.js';
import { costUsd, spentTodayUsd, USD_TO_BRL } from '../ai/pricing.js';
import { describeRouting } from '../ai/index.js';
import * as metricas from '../repositories/metricas.js';

// Tarefa de IA → funcionalidade do produto e qual contagem de usos divide o custo
const FUNCIONALIDADES = [
  { nome: 'Simulados e revanches (gerar + revisar)', tarefas: ['generate', 'generate_dificil', 'review'], usos: 'simulados', unidade: 'simulado' },
  { nome: 'Envio de material (matéria, OCR, cruzar com edital)', tarefas: ['detect', 'ocr', 'edital_match'], usos: 'materiais', unidade: 'material' },
  { nome: '"Por que errei?"', tarefas: ['explain_mistake'], usos: 'explicacoes', unidade: 'explicação nova' },
  { nome: 'Provas da base (checar, extrair, analisar estilo)', tarefas: ['prova_check', 'prova_extract', 'prova_analysis'], usos: 'provas', unidade: 'prova' },
  { nome: 'Editais (ler conteúdo programático)', tarefas: ['edital_parse'], usos: 'editais', unidade: 'edital' },
  { nome: 'Erro reportado (verificação)', tarefas: ['report_check'], usos: 'reportes', unidade: 'reporte' },
];

const arred = (n, casas = 4) => Number(Number(n || 0).toFixed(casas));
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);

export async function painelIA({ dias = 30 } = {}) {
  const [bruto, usos, qualidadeModelo, qualidade, revisor, fila, hojeUsd] = await Promise.all([
    metricas.usoDeIA(dias), metricas.usosPorFuncionalidade(dias), metricas.qualidadePorModelo(dias),
    metricas.qualidadePorBanca(), metricas.totaisDoRevisor(dias), metricas.filaPorSituacao(), spentTodayUsd(),
  ]);

  let totalUsd = 0;
  const usage = bruto.map((u) => {
    const usd = costUsd(u.model, Number(u.entrada), Number(u.saida), Number(u.cache), u.batch, u.provider, Number(u.cache_escrita));
    totalUsd += usd;
    return {
      ...u, custoUsd: arred(usd), custoBrl: arred(usd * USD_TO_BRL, 2),
      // Quanto da entrada veio do cache de prompt (meta: system estável por banca/dia — C6)
      // (entrada + lido + escrito = prompt inteiro). Escrita sem leitura = sobrecusto de 25% sem retorno.
      cachePct: pct(Number(u.cache), Number(u.entrada) + Number(u.cache) + Number(u.cache_escrita)),
    };
  });

  const conhecidas = new Set(FUNCIONALIDADES.flatMap((f) => f.tarefas));
  const custoPorFuncionalidade = [...FUNCIONALIDADES, { nome: 'Outros (consertar JSON da IA etc.)', tarefas: null, usos: null, unidade: null }].map((f) => {
    const linhas = usage.filter((u) => (f.tarefas ? f.tarefas.includes(u.task) : !conhecidas.has(u.task)));
    const usd = linhas.reduce((s, u) => s + u.custoUsd, 0);
    const n = f.usos ? usos[f.usos] : null;
    return {
      funcionalidade: f.nome, chamadas: linhas.reduce((s, u) => s + u.chamadas, 0), custoUsd: arred(usd), custoBrl: arred(usd * USD_TO_BRL, 2),
      usos: n, unidade: f.unidade, custoMedioUsd: n ? arred(usd / n) : null, custoMedioBrl: n ? arred((usd / n) * USD_TO_BRL, 3) : null,
    };
  }).filter((f) => f.chamadas > 0 || f.usos);

  const qualidadePorModelo = qualidadeModelo.map((q) => ({
    ...q,
    descartePct: pct(q.descartadas, q.geradas),
    aprovacaoAlunosPct: pct(q.gostei, q.gostei + q.nao_gostei),
  }));

  return {
    periodoDias: dias,
    routing: describeRouting(),
    trainingMode: config.ai.trainingMode,
    mock: config.ai.mock,
    usage,
    custoTotal: { usd: arred(totalUsd), brl: arred(totalUsd * USD_TO_BRL, 2), cotacao: USD_TO_BRL },
    custoPorFuncionalidade,
    qualidadePorModelo,
    limiteDia: { usd: config.ai.limiteUsdDia || null, gastoHojeUsd: arred(hojeUsd), atingido: !!config.ai.limiteUsdDia && hojeUsd >= config.ai.limiteUsdDia },
    jobs: Object.fromEntries(fila.map((j) => [j.status, j.n])),
    qualidade,
    revisor,
  };
}
