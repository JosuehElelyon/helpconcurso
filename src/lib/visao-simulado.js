// Representação pública de um simulado na API (o mesmo formato em toda rota que devolve simulado).
// Contrato: esquema "Simulado" em src/openapi.js. Antes, as rotas de edital devolviam o registro cru do banco
// (created_at, modo_prova…) e o front não entrava no modo prova nem mostrava a data.
export const visaoSimulado = (s) => ({
  id: s.id,
  banca: s.banca,
  materia: s.materia,
  assunto: s.assunto,
  nivel: s.nivel,
  formato: s.formato,
  arquivo: s.arquivo,
  editalId: s.edital_id || null,
  cadernoId: s.caderno_id || null,
  questoes: s.questoes,
  respostas: s.respostas,
  finalizado: s.finalizado,
  modoProva: s.modo_prova || false,
  tempoLimiteMinutos: s.tempo_limite_minutos || null,
  tempoGastoSegundos: s.tempo_gasto_segundos || 0,
  duvidas: Array.isArray(s.duvidas) ? s.duvidas : [],
  estatisticas: s.estatisticas || {},
  origem: s.origem || 'ia',
  revisao: s.review_stats ? { ...s.review_stats, motivos: undefined } : null,
  createdAt: s.created_at,
});
