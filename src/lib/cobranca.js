// Vocabulário fechado de "como a banca cobra" (docs/ARQUITETURA-CONHECIMENTO.md).
// Listas fixas permitem somar e comparar entre provas, bancas e modelos de IA diferentes.
// Ao incluir um item novo, mantenha os antigos (dados já gravados usam esses códigos).

export const COMANDOS = {
  assinale_correta: 'Assinale a alternativa correta',
  assinale_incorreta: 'Assinale a alternativa incorreta / exceto',
  julgue_item: 'Julgue o item (Certo/Errado)',
  complete_lacuna: 'Complete as lacunas',
  associe_colunas: 'Associe as colunas / sequência correta',
  calcule: 'Calcule / resolva',
  interprete_texto: 'Interprete o texto',
  outro: 'Outro',
};

export const PEGADINHAS = {
  troca_prazo_valor: 'Troca de prazo, número, percentual ou valor',
  generalizacao_absoluta: 'Generalização absoluta (sempre, nunca, somente, exclusivamente)',
  inversao_competencia: 'Inversão de competência, sujeito ou órgão',
  excecao_regra: 'Cobra a exceção da regra',
  troca_conceito: 'Troca de conceitos parecidos (ex.: revogação × anulação)',
  literalidade_alterada: 'Texto de lei com uma palavra trocada',
  jurisprudencia: 'Entendimento de tribunal (súmula, tese)',
  extrapolacao_texto: 'Extrapola ou contradiz o texto-base',
  calculo_armadilha: 'Armadilha de cálculo / unidade',
  nenhuma: 'Sem pegadinha clara',
};

export const HABILIDADES = {
  memorizacao: 'Memorização (letra da lei, definição)',
  compreensao: 'Compreensão de conceito',
  aplicacao: 'Aplicação a um caso',
  analise: 'Análise / comparação',
};

/** Converte a resposta da IA para um código conhecido (ou o padrão). */
export const toCode = (vocab, fallback) => (v) => {
  const s = String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z_ ]/g, '').trim().replace(/\s+/g, '_');
  return Object.hasOwn(vocab, s) ? s : fallback;
};
