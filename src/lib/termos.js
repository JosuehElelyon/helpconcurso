// Termos de Uso e Política de Privacidade e Proteção de Dados (LGPD - Lei 13.709/2018)
// Define de forma transparente o controlador, finalidades, operadores de IA e direitos do aluno.

export function obterTermosEPrivacidade() {
  return {
    versao: '2.0',
    atualizadoEm: '2026-11-05',
    controlador: {
      nome: 'HelpConcurso',
      descricao: 'Plataforma de inteligência educacional para preparação ativa em concursos públicos.',
      contato: 'privacidade@helpconcurso.com.br',
    },
    operadoresIA: [
      {
        fornecedor: 'Anthropic, PBC',
        modelos: ['Claude 3.5 Haiku', 'Claude 3.5 Sonnet'],
        finalidade: 'Geração de questões inéditas ancoradas no material, revisão de gabaritos e diagnósticos pedagógicos de pontos cegos.',
        privacidade: 'Acordo comercial de API com retenção zero de dados de treinamento. Seus materiais e resumos NÃO são utilizados para treinar modelos públicos de IA.',
      },
      {
        fornecedor: 'Google Cloud Platform (Gemini API)',
        modelos: ['Gemini 1.5 Flash', 'Gemini 1.5 Pro'],
        finalidade: 'Análise de editais públicos, cruzamento de matrizes curriculares e extração de provas oficiais.',
        privacidade: 'Tratamento em conformidade com Google Cloud Enterprise Terms e ISO/IEC 27018.',
      },
      {
        fornecedor: 'Groq / OpenAI',
        modelos: ['Llama 3', 'GPT-4o mini'],
        finalidade: 'Triagem rápida de formatação, classificação de matérias e rotulagem de pegadinhas.',
        privacidade: 'Tratamento exclusivo por endpoint de API sem retenção de dados após o processamento da requisição.',
      },
    ],
    dadosTratados: [
      {
        categoria: 'Dados Cadastrais',
        itens: ['Nome', 'Endereço de e-mail', 'Hash criptográfico da senha (bcrypt)', 'Foto de perfil (avatar opcional)'],
        finalidade: 'Autenticação, controle de sessões, recuperação de conta e comunicação oficial.',
      },
      {
        categoria: 'Dados de Estudo e Desempenho',
        itens: ['Materiais e resumos enviados', 'Cadernos de questões', 'Respostas a simulados', 'Tempo de resolução', 'Anotações pessoais'],
        finalidade: 'Construção do seu Cockpit de Desempenho, cálculo da repetição espaçada, geração de baterias de revanche e recomendações pedagógicas.',
      },
    ],
    direitosTitularLGPD: [
      'Confirmação da existência de tratamento e acesso facilitado aos seus dados.',
      'Correção e atualização de dados incompletos ou desatualizados na tela "Minha Conta".',
      'Portabilidade dos dados de simulados e cadernos.',
      'Eliminação definitiva de materiais enviados e exclusão completa da conta e dados associados a qualquer momento.',
      'Revogação de consentimento mediante cancelamento do serviço.',
    ],
    segurança: [
      'Criptografia de ponta a ponta em trânsito via protocolo HTTPS/TLS.',
      'Varredura automatizada de segurança em arquivos contra ameaças e injeções de prompt.',
      'Remoção automática de metadados EXIF e de geolocalização em fotos e uploads.',
      'Sessões criptografadas com invalidação imediata em todos os dispositivos ao alterar ou redefinir a senha.',
    ],
  };
}

