// Planos do HelpConcurso — preços, limites e benefícios num lugar só (a tela de planos, as cotas e o admin leem daqui).
// Para mudar preço ou limite, edite este arquivo. limite null = sem limite.
//
// Custo de IA de referência (docs/PLANO-ACAO.md): simulado de 10 questões ≈ US$ 0,04 (Fácil/Médio, Haiku gera e Sonnet revisa)
// e ≈ US$ 0,15 (Difícil/Misto, Sonnet gera). Questões reais, revisão espaçada e edital reaproveitado custam ~zero.
// Os limites diários existem para o pior caso (aluno que usa tudo, todo dia) não passar do preço do plano.
const env = (k) => (process.env[k] === undefined || process.env[k] === '' ? undefined : process.env[k]);

export const PLANOS = {
  gratis: {
    id: 'gratis', nome: 'Grátis', precoMensal: 0, precoAnual: 0,
    resumo: 'Para conhecer o método e começar a estudar.',
    limites: {
      // Na fase de testes, QUOTA_GERACOES_DIA no .env continua valendo para o plano grátis
      simuladosDia: Number(env('QUOTA_GERACOES_DIA')) || 3,
      dificeisDia: 1, editais: 1, cadernos: 3,
      explicacoesDia: 5, // "Por que errei?" novas por dia (explicação já pronta no cache não conta)
    },
    beneficios: [
      'Simulados gerados do seu material no estilo da banca',
      '1 simulado Difícil por dia',
      '1 edital verticalizado com painel de avanço',
      'Questões reais da banca por tópico do edital',
      'Caderno de erros com revisão espaçada',
    ],
  },
  essencial: {
    id: 'essencial', nome: 'Essencial', precoMensal: 29.9, precoAnual: 299, destaque: true,
    resumo: 'Para quem estuda todo dia para um concurso.',
    limites: { simuladosDia: 8, dificeisDia: 3, editais: 3, cadernos: null, explicacoesDia: 30 },
    beneficios: [
      'Tudo do Grátis',
      '8 simulados por dia, até 3 no nível Difícil',
      'Até 3 editais acompanhados ao mesmo tempo',
      'Cadernos de questões ilimitados',
      'Revisor automático com o modelo mais forte em todas as questões',
    ],
  },
  aprovacao: {
    id: 'aprovacao', nome: 'Aprovação', precoMensal: 59.9, precoAnual: 599,
    resumo: 'Para a reta final: volume alto e vários concursos.',
    limites: { simuladosDia: 20, dificeisDia: 10, editais: null, cadernos: null, explicacoesDia: 60 },
    beneficios: [
      'Tudo do Essencial',
      '20 simulados por dia, até 10 no nível Difícil',
      'Editais ilimitados',
      'Prioridade no processamento das suas provas e materiais',
      'Novidades primeiro: simulado no formato da prova real',
    ],
  },
};
export const ORDEM_PLANOS = ['gratis', 'essencial', 'aprovacao'];

/** Plano em vigor: o contratado, se não venceu; senão, Grátis. Admin não tem limites. */
export function planoDoUsuario(u) {
  if (u?.role === 'ADMIN') return { ...PLANOS.aprovacao, id: 'admin', nome: 'Administrador', limites: { simuladosDia: null, dificeisDia: null, editais: null, cadernos: null, explicacoesDia: null } };
  const vigente = PLANOS[u?.plano] && (!u.plano_ate || new Date(u.plano_ate) > new Date()) ? u.plano : 'gratis';
  return PLANOS[vigente];
}

/** Catálogo para a tela (sem nada interno). */
export const catalogoPlanos = () => ORDEM_PLANOS.map((id) => {
  const p = PLANOS[id];
  return { id, nome: p.nome, precoMensal: p.precoMensal, precoAnual: p.precoAnual, destaque: !!p.destaque, resumo: p.resumo, beneficios: p.beneficios, limites: p.limites };
});

export const NIVEIS_DIFICEIS = ['Difícil', 'Misto'];
