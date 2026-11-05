// Pontuação de um simulado finalizado. Função pura: recebe as questões já com a situação oficial aplicada
// (aplicarSituacaoOficial) — questão anulada pela banca não conta como acerto, erro nem em branco.

/**
 * @param {object[]} questoes
 * @param {Record<string,string>} respostas  índice (string) → letra marcada
 * @param {'ce'|'me'} formato  CEBRASPE (ce): nota líquida = acertos − erros; múltipla escolha: nota = acertos
 * @param {number} [tempoGastoSegundos]
 */
export function pontuarSimulado(questoes, respostas = {}, formato = 'me', tempoGastoSegundos = 0) {
  const qs = Array.isArray(questoes) ? questoes : [];
  let acertos = 0, erros = 0, emBranco = 0, anuladas = 0;
  const porMateria = {};

  qs.forEach((q, i) => {
    if (q?.anulada) { anuladas++; return; }
    const r = respostas[String(i)];
    const mat = q?.materia || 'Geral';
    const m = (porMateria[mat] ||= { materia: mat, total: 0, respondidas: 0, acertos: 0, erros: 0 });
    m.total++;
    if (!r) { emBranco++; return; }
    m.respondidas++;
    if (r === q.gabarito) { acertos++; m.acertos++; } else { erros++; m.erros++; }
  });

  const total = qs.length - anuladas;
  const notaLiquida = formato === 'ce' ? acertos - erros : acertos;
  const notaBruta = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const aproveitamentoLiquido = formato === 'ce' && total > 0 ? Math.round((Math.max(0, notaLiquida) / total) * 100) : notaBruta;
  const disciplinas = Object.values(porMateria).map((m) => ({
    ...m,
    taxaAcerto: m.respondidas > 0 ? Math.round((m.acertos / m.respondidas) * 100) : 0,
    taxaTotal: m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0,
  }));

  return {
    total, respondidas: acertos + erros, acertos, erros, emBranco, anuladas,
    notaLiquida, notaBruta, aproveitamentoLiquido, tempoGastoSegundos, disciplinas,
    concluidoEm: new Date().toISOString(),
  };
}
