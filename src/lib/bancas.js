// Perfis base das bancas. A IA começa com eles e enriquece com as provas cadastradas em "Base de provas".
export const BANCAS = [
  { id: 'fgv', nome: 'FGV', full: 'Fundação Getulio Vargas', cor: '#1D4ED8', formato: 'me', formatoLabel: 'Múltipla escolha · A a E',
    resumo: 'Alto nível de dificuldade, textos longos, raciocínio crítico e interpretação aprofundada. Aplicação prática do Direito e da jurisprudência.',
    estilo: ['Enunciados longos com situações-problema e casos concretos', 'Interpretação de texto aprofundada, especialmente em Português', 'Cobra jurisprudência (STF/STJ) e aplicação prática da norma', 'Alternativas extensas e muito parecidas entre si', 'Exige raciocínio crítico, não apenas memorização'],
    provas: 'OAB, concursos fiscais e de tribunais' },
  { id: 'cebraspe', nome: 'CEBRASPE', full: 'Cebraspe (antigo CESPE/UnB)', cor: '#B42318', formato: 'ce', formatoLabel: 'Certo ou Errado · uma errada anula uma certa',
    resumo: 'Itens de julgamento Certo/Errado, em que uma resposta errada anula uma certa. Forte exigência de interpretação e densidade teórica.',
    estilo: ['Assertivas para julgar como CERTO ou ERRADO', 'Pegadinhas sutis com troca de uma palavra (sempre, nunca, apenas, exclusivamente)', 'Itens agrupados a partir de um texto ou situação hipotética', 'Densidade teórica e cobrança de doutrina', 'Generalizações indevidas e extrapolações do conceito'],
    provas: 'Polícia Federal, PRF, TCU, INSS' },
  { id: 'fcc', nome: 'FCC', full: 'Fundação Carlos Chagas', cor: '#047857', formato: 'me', formatoLabel: 'Múltipla escolha · A a E',
    resumo: 'Questões diretas, com foco na literalidade da lei (texto seco da legislação) e na teoria clássica. Tradicional em tribunais e legislativos.',
    estilo: ['Cobra a letra da lei de forma quase literal', 'Enunciados curtos e diretos ("É correto afirmar que...")', 'Troca de prazos, números e competências nas alternativas', 'Teoria clássica e doutrina consolidada', 'Pouca exploração de casos concretos'],
    provas: 'TRTs, TRFs, Assembleias Legislativas' },
  { id: 'vunesp', nome: 'VUNESP', full: 'Fundação Vunesp', cor: '#C2410C', formato: 'me', formatoLabel: 'Múltipla escolha · A a E',
    resumo: 'Direta e objetiva, com enunciados menos capciosos que FGV e Cebraspe. Muito forte no estado de São Paulo.',
    estilo: ['Enunciados objetivos e pouco capciosos', 'Cobrança direta do conteúdo e da lei', 'Situações práticas simples', 'Português com gramática aplicada ao texto', 'Distratores claros nas alternativas'],
    provas: 'TJ-SP, Polícia Civil-SP, prefeituras paulistas' },
  { id: 'cesgranrio', nome: 'Cesgranrio', full: 'Fundação Cesgranrio', cor: '#0E7490', formato: 'me', formatoLabel: 'Múltipla escolha · A a E',
    resumo: 'Dificuldade moderada a alta, com forte cobrança de interpretação de texto e gramática. Organiza grandes concursos nacionais.',
    estilo: ['Forte cobrança de interpretação de texto e gramática', 'Contextualização com o ambiente de trabalho do órgão', 'Conhecimentos do setor (bancário, petróleo, serviço público)', 'Nível moderado a alto', 'Alternativas equilibradas e bem elaboradas'],
    provas: 'Banco do Brasil, Petrobras, CNU' },
];
export const BANCA = Object.fromEntries(BANCAS.map((b) => [b.id, b]));

export const MATERIAS = ['Língua Portuguesa', 'Direito Constitucional', 'Direito Administrativo', 'Direito Penal', 'Direito Processual Penal', 'Direito Civil', 'Direito Processual Civil', 'Direito Tributário', 'Direito do Trabalho', 'Direito Processual do Trabalho', 'Direito Previdenciário', 'Raciocínio Lógico', 'Matemática', 'Matemática Financeira', 'Estatística', 'Informática', 'Contabilidade Geral', 'Contabilidade Pública', 'Administração Geral', 'Administração Pública', 'Arquivologia', 'Economia', 'Auditoria', 'Ética no Serviço Público', 'Legislação Específica', 'Conhecimentos Bancários', 'Atualidades', 'Língua Inglesa', 'Outra'];

export const NIVEIS = ['Fácil', 'Médio', 'Difícil', 'Misto'];

// Domínios oficiais primários das bancas organizadoras de concursos
export const DOMINIOS_OFICIAIS = {
  cebraspe: ['cebraspe.org.br', 'cespe.unb.br'],
  fgv: ['conhecimento.fgv.br', 'fgv.br'],
  fcc: ['concursosfcc.com.br', 'fcc.org.br'],
  vunesp: ['vunesp.com.br'],
  cesgranrio: ['cesgranrio.org.br'],
  ibfc: ['ibfc.org.br'],
  quadrix: ['quadrix.org.br'],
  aocp: ['institutoaocp.org.br', 'aocp.com.br'],
  idecan: ['idecan.org.br'],
  selecon: ['selecon.org.br', 'selecon.com.br'],
  iades: ['iades.com.br'],
  funcab: ['funcab.org'],
  consulplan: ['consulplan.net', 'institutoconsulplan.org.br'],
  fundatec: ['fundatec.org.br'],
  fepese: ['fepese.org.br'],
  comperve: ['comperve.ufrn.br'],
  coperve: ['coperve.ufsc.br'],
};

// Cursinhos, redes sociais, blogs e repositórios de arquivos (NÃO são fonte oficial primária)
export const DOMINIOS_NAO_OFICIAIS = [
  'grancursosonline.com.br',
  'gran.com.br',
  'estrategiaconcursos.com.br',
  'estrategia.com',
  'folhadirigida.com.br',
  'folhadirigida.com',
  'qconcursos.com.br',
  'qconcursos.com',
  'direcaoconcursos.com.br',
  'alfaconconcursos.com.br',
  'novaconcursos.com.br',
  'pciconcursos.com.br',
  'acheconcursos.com.br',
  'concursosnobrasil.com.br',
  'drive.google.com',
  'docs.google.com',
  'dropbox.com',
  'mega.nz',
  'mediafire.com',
  'onedrive.live.com',
  '1drv.ms',
  'scribd.com',
  'passeidireto.com',
];

/**
 * Valida se uma URL pertence ao site oficial da banca informada ou a uma fonte governamental oficial
 * (Diários Oficiais: DOU in.gov.br, Imprensa Oficial, portais de órgãos .gov.br, .jus.br, .leg.br etc.).
 *
 * @param {string} banca - ID da banca (ex: 'cebraspe', 'fgv')
 * @param {string} rawUrl - URL enviada pelo usuário
 * @returns {{ valida: boolean, oficial: boolean, dominio: string|null, tipo?: string, motivo?: string, urlNormalizada?: string }}
 */
export function validarUrlOficial(banca, rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valida: false, oficial: false, dominio: null, motivo: 'URL não informada.' };
  }
  let parsed;
  try {
    const trimmed = rawUrl.trim();
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProto);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valida: false, oficial: false, dominio: null, motivo: 'Protocolo inválido. Use http ou https.' };
    }
  } catch {
    return { valida: false, oficial: false, dominio: null, motivo: 'Formato de URL inválido.' };
  }

  let host = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (host.startsWith('www.')) host = host.slice(4);

  // 1. Checa domínios não oficiais (cursinhos, blogs, drives compartilhados)
  for (const dom of DOMINIOS_NAO_OFICIAIS) {
    if (host === dom || host.endsWith('.' + dom)) {
      return {
        valida: false,
        oficial: false,
        dominio: host,
        tipo: 'nao_oficial',
        motivo: `O domínio "${host}" pertence a cursinho preparatório, blog ou serviço de arquivos particulares, não sendo fonte primária oficial da banca nem diário oficial.`,
      };
    }
  }

  // 2. Checa se pertence à banca declarada
  const bancaKey = String(banca || '').trim().toLowerCase();
  const domsBanca = DOMINIOS_OFICIAIS[bancaKey] || [];
  const matchBanca = domsBanca.some((d) => host === d || host.endsWith('.' + d));

  if (matchBanca) {
    return {
      valida: true,
      oficial: true,
      dominio: host,
      tipo: 'banca',
      urlNormalizada: parsed.toString(),
    };
  }

  // 3. Checa portais governamentais e Diários Oficiais oficiais
  const sufixosOficiais = ['.gov.br', '.leg.br', '.jus.br', '.def.br', '.mp.br', '.tc.br'];
  const dominiosOficiaisGerais = ['in.gov.br', 'imprensaoficial.com.br'];
  const matchGov = sufixosOficiais.some((suf) => host === suf.slice(1) || host.endsWith(suf)) || dominiosOficiaisGerais.some((d) => host === d || host.endsWith('.' + d));

  if (matchGov) {
    const tipo = host.includes('in.gov.br') || host.includes('imprensaoficial') || host.includes('diario') ? 'diario_oficial' : 'orgao_publico';
    return {
      valida: true,
      oficial: true,
      dominio: host,
      tipo,
      urlNormalizada: parsed.toString(),
    };
  }

  // 4. Se a URL pertence a OUTRA banca do catálogo (divergência de banca)
  for (const [outraBanca, doms] of Object.entries(DOMINIOS_OFICIAIS)) {
    if (outraBanca !== bancaKey && doms.some((d) => host === d || host.endsWith('.' + d))) {
      return {
        valida: false,
        oficial: true,
        dominio: host,
        tipo: 'banca_divergente',
        motivo: `A URL pertence ao portal oficial da banca "${outraBanca.toUpperCase()}", divergindo da banca informada "${bancaKey.toUpperCase()}".`,
      };
    }
  }

  return {
    valida: false,
    oficial: false,
    dominio: host,
    tipo: 'desconhecido',
    motivo: `O domínio "${host}" não consta no catálogo de domínios oficiais das bancas examinadoras nem na rede de diários oficiais governamentais.`,
  };
}

const KEYWORDS = {
  'Direito Constitucional': ['constituição', 'constitucional', 'art. 5', 'direitos fundamentais', 'emenda constitucional', 'poder constituinte', 'controle de constitucionalidade', 'mandado de segurança', 'habeas'],
  'Direito Administrativo': ['administração pública', 'ato administrativo', 'atos administrativos', 'licitação', 'servidor público', 'poder de polícia', '14.133', '8.112', 'improbidade', 'autarquia'],
  'Direito Penal': ['crime', 'código penal', 'dolo', 'tipicidade', 'ilicitude', 'culpabilidade', 'reclusão', 'detenção'],
  'Direito Processual Penal': ['inquérito', 'processo penal', 'prisão preventiva', 'ação penal', 'denúncia', 'flagrante'],
  'Direito Civil': ['código civil', 'obrigações', 'posse', 'propriedade', 'pessoa natural', 'negócio jurídico'],
  'Direito Processual Civil': ['processo civil', 'petição inicial', 'tutela provisória', 'citação'],
  'Direito Tributário': ['tributo', 'imposto', 'ctn', 'fato gerador', 'crédito tributário', 'lançamento tributário'],
  'Direito do Trabalho': ['clt', 'empregado', 'empregador', 'jornada', 'contrato de trabalho', 'rescisão'],
  'Direito Previdenciário': ['previdência', 'inss', 'aposentadoria', 'segurado', '8.213'],
  'Língua Portuguesa': ['concordância', 'regência', 'crase', 'pontuação', 'oração', 'sintaxe', 'morfologia', 'semântica', 'coesão'],
  'Raciocínio Lógico': ['proposição', 'tabela-verdade', 'silogismo', 'conectivo', 'equivalência lógica'],
  'Matemática Financeira': ['juros', 'montante', 'taxa de juros', 'amortização'],
  'Estatística': ['mediana', 'variância', 'desvio padrão', 'probabilidade', 'amostra'],
  'Informática': ['windows', 'linux', 'excel', 'planilha', 'navegador', 'hardware', 'software', 'malware', 'backup'],
  'Contabilidade Geral': ['ativo', 'passivo', 'patrimônio líquido', 'balanço patrimonial', 'lançamento contábil'],
  'Administração Geral': ['planejamento', 'liderança', 'motivação', 'gestão de pessoas'],
  'Arquivologia': ['arquivo', 'temporalidade', 'gestão documental', 'protocolo'],
  'Conhecimentos Bancários': ['banco central', 'sistema financeiro', 'copom', 'selic'],
};

export function keywordGuess(text) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0, total = 0;
  for (const [m, kws] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const k of kws) s += t.split(k).length - 1;
    total += s;
    if (s > bestScore) { bestScore = s; best = m; }
  }
  if (!best || bestScore < 3) return null;
  return { materia: best, confianca: Math.min(0.85, bestScore / Math.max(total, 1)), temas: [], resumo: '', origem: 'palavras-chave' };
}
