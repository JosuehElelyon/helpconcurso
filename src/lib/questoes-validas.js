// Filtro único de "questão real válida para o aluno" (e para exemplos/DNA no prompt): passou na varredura de segurança,
// não foi anulada pela banca e não tem gabarito em disputa entre os modelos do consenso. Use em TODA consulta a prova_questoes
// que alimenta aluno ou prompt — assim um critério novo entra em todos os lugares de uma vez.
export const questaoValida = (alias = 'q') => {
  const c = alias ? `${alias}.` : '';
  return `NOT ${c}flagged AND NOT ${c}anulada AND ${c}consenso_gabarito IS NOT FALSE`;
};
