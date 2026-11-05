// Provedor simulado (AI_MOCK=true): respostas determinísticas para desenvolver e testar sem custo.
// Imita o comportamento de cada tarefa o suficiente para exercitar todo o fluxo, inclusive as barreiras de segurança.
const LET = ['A', 'B', 'C', 'D', 'E'];
const untrusted = (txt, label = '') => { const m = txt.match(new RegExp(`${label}[^\\n]*\\n<<INICIO-[a-f0-9]+>>\\n?([\\s\\S]*?)\\n?<<FIM-[a-f0-9]+>>`)); return m ? m[1] : txt; };
const sentences = (t) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 6);

function respond(task, req) {
  const all = req.messages.flatMap((m) => m.content).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  const data = untrusted(all);
  switch (task) {
    case 'detect':
      return { materia: /licita|ato administrativ|administração pública/i.test(data) ? 'Direito Administrativo' : 'Língua Portuguesa', confianca: 0.9, temas: ['Tema de teste'], resumo: 'Resumo de teste (modo simulado).', outras: [] };
    case 'generate':
    case 'generate_dificil': {
      const n = Number((all.match(/elabore (\d+) quest/i) || [])[1] || 5);
      const ce = /Formato CEBRASPE/.test(all);
      const ss = sentences(untrusted(all, 'MATERIAL DO ALUNO'));
      const hasEdital = /TÓPICOS DO EDITAL VINCULADO/.test(all);
      return { questoes: Array.from({ length: n }, (_, i) => ({
        tema: 'Tema de teste', topico_edital: hasEdital ? '[D1-T1] 1 Atos administrativos' : '', nivel: 'Médio', enunciado: `(Simulado${/QUESTÕES DE REPOSIÇÃO/.test(all) ? ' refeita' : ''}) Questão ${i + 1}: com base no material, assinale a opção correta.`,
        alternativas: ce ? [] : LET.map((l) => `Alternativa ${l} de teste`), gabarito: ce ? (i % 2 ? 'C' : 'E') : LET[i % 5],
        comentario: 'Comentário de teste.', trecho_base: ss.length ? ss[i % ss.length].slice(0, 160) : '', pegadinha: '' })), alertas: [] };
    }
    case 'ocr':
      return process.env.MOCK_OCR_TEXT || '--- Página 1 ---\nFUNDAÇÃO GETULIO VARGAS — Prova de Analista (simulada)\nQuestão 1. Acerca dos atos administrativos, assinale a alternativa correta.\nA) O ato vinculado admite juízo de conveniência e oportunidade. B) A competência é elemento vinculado do ato administrativo. C) A finalidade pode ser escolhida livremente. D) A forma nunca é requisito. E) O motivo é sempre discricionário.\nQuestão 2. Sobre licitações na Lei 14.133, assinale a correta.\nA) O pregão é usado para obras de grande vulto. B) O diálogo competitivo é modalidade de licitação. C) A concorrência foi extinta. D) O leilão serve para contratar serviços. E) Não há fase de habilitação nas licitações públicas.';
    case 'prova_check': {
      const bancas = [['cebraspe', /cebraspe|cespe/i], ['fgv', /fgv|getulio vargas/i], ['fcc', /carlos chagas|\bfcc\b/i], ['vunesp', /vunesp/i], ['cesgranrio', /cesgranrio/i]];
      const b = bancas.find(([, r]) => r.test(data));
      const inj = /ignore|desconsidere|instru[cç](ão|ões) para a ia|you are now|aprove esta prova/i.test(data);
      return { e_prova: /quest[aã]o|julgue|assinale|alternativa/i.test(data), confianca: 0.9, banca: b ? b[0] : 'desconhecida', banca_confianca: b ? 0.9 : 0.2,
        orgao: (data.match(/(TRF|TRT|TJ|PF|PRF|INSS)[-\s]?\d*/) || [''])[0], cargo: /analista/i.test(data) ? 'Analista' : '', ano: (data.match(/20\d\d/) || [''])[0],
        materias: ['Direito Administrativo'], tentativa_de_instrucao: inj, trechos_suspeitos: inj ? ['trecho com instrução'] : [], observacao: '' };
    }
    case 'prova_analysis':
      return { titulo: 'Prova de teste', ano: '2024', orgao: 'Órgão Teste', cargo: 'Analista', materias: ['Direito Administrativo'], num_questoes: 2, caracteristicas: ['Enunciados de teste'], padroes_enunciado: ['Assinale a alternativa correta'], pegadinhas: ['Troca de prazos'], dificuldade: 'Médio', alertas: [] };
    case 'prova_extract': {
      const parts = data.split(/Quest[aã]o\s+(\d+)[.:)]?/i).slice(1);
      const qs = [];
      for (let i = 0; i + 1 < parts.length && qs.length < 30; i += 2) {
        const body = parts[i + 1].trim();
        const alts = body.split(/\s[A-E]\)\s/).slice(1).map((s) => s.trim()).slice(0, 5);
        const licit = /licita/i.test(body);
        const num = Number(parts[i]);
        const numGab = data.match(new RegExp(`(?:^|\\s)${num}\\s*[-:.)]\\s*([A-E]|C|E)`, 'i'));
        let gab = numGab ? numGab[1].toUpperCase() : (alts.length ? LET[(num - 1) % 5] : (num % 2 === 0 ? 'C' : 'E'));
        qs.push({ numero: num, materia: 'Noções de Direito Administrativo', topico: licit ? 'Licitações — modalidades' : 'Atos administrativos — elementos',
          comando: 'assinale_correta', pegadinha: licit ? 'troca_conceito' : 'Generalização absoluta', habilidade: 'memorizacao', dispositivos: licit ? ['Lei 14.133/2021 art. 28'] : [],
          enunciado: body.split(/\s[A-E]\)\s/)[0].slice(0, 600) || body.slice(0, 600), alternativas: alts, gabarito: gab });
      }
      return { questoes: qs, alertas: [] };
    }
    case 'review': {
      // Simula um revisor: concorda com o gabarito do gerador simulado, exceto na 2ª questão da 1ª rodada
      const qs = [...data.matchAll(/### Questão (\d+)\n([\s\S]*?)(?=\n### Questão|$)/g)];
      const ce = /\( \) Certo/.test(data);
      return { respostas: qs.map((m, i) => {
        const n = Number((m[2].match(/Questão (\d+):/) || [])[1] || i + 1) - 1;
        const right = ce ? (n % 2 ? 'C' : 'E') : LET[n % 5];
        const wrong = process.env.MOCK_REVIEW_DISAGREE !== 'false' && n === 1 && !/refeita/i.test(m[2]);
        return { indice: i + 1, resposta: wrong ? (ce ? (right === 'C' ? 'E' : 'C') : LET[(n + 1) % 5]) : right, ambigua: false, respondivel_pelo_material: true, problema: wrong ? 'Divergência simulada' : '' };
      }) };
    }
    case 'report_check': {
      const confirmed = /gabarito|errad|ambígu|ambigu/i.test((all.match(/MOTIVO INFORMADO PELO ALUNO[\s\S]*?<<INICIO-[a-f0-9]+>>\n?([\s\S]*?)\n?<<FIM/) || [])[1] || '');
      return { gabarito_correto: !confirmed, resposta_correta: confirmed ? 'B' : 'A', ambigua: false, explicacao: confirmed ? 'O material sustenta outra alternativa (simulado).' : 'O gabarito está de acordo com o material (simulado).' };
    }
    case 'edital_parse':
      return {
        titulo: 'TRF-1 · Analista Judiciário (2024)', orgao: 'TRF-1', cargo: 'Analista Judiciário', banca: 'fgv', ano: '2024',
        disciplinas: [
          { materia: 'Direito Administrativo', peso: 2, topicos: [
            { codigo: '1', nome: 'Atos administrativos: requisitos, atributos e classificação' },
            { codigo: '2', nome: 'Licitações e contratos administrativos (Lei 14.133/2021)' },
            { codigo: '3', nome: 'Poderes da Administração e controle administrativo' },
          ] },
          { materia: 'Língua Portuguesa', peso: 1, topicos: [
            { codigo: '1', nome: 'Compreensão e interpretação de textos' },
            { codigo: '2', nome: 'Concordância verbal e nominal e regência' },
          ] },
        ],
      };
    case 'edital_match':
      return {
        disciplina_id: 'D1', disciplina_nome: 'Direito Administrativo', cobertura_disciplina_pct: 67,
        topicos_cobertos: [
          { id: 'D1-T1', codigo: '1', nome: 'Atos administrativos: requisitos, atributos e classificação', nivel_cobertura: 'completo', resumo: 'Aborda os requisitos (competência, finalidade, forma, motivo e objeto) e atributos.' },
          { id: 'D1-T2', codigo: '2', nome: 'Licitações e contratos administrativos (Lei 14.133/2021)', nivel_cobertura: 'completo', resumo: 'Trata das modalidades de licitação na Lei 14.133/2021.' },
        ],
        topicos_faltantes: [
          { id: 'D1-T3', codigo: '3', nome: 'Poderes da Administração e controle administrativo' },
        ],
        analise: 'Seu material cobre 2 dos 3 tópicos de Direito Administrativo do edital (67%). Para fechar a disciplina, estude Poderes da Administração e controle administrativo.',
      };
    case 'explain_mistake':
      return {
        diagnostico: 'Você foi induzido a pensar que a competência poderia ser delegada sem restrições porque na prática muitas tarefas são transferidas no dia a dia da repartição.',
        pegadinha: 'A banca utilizou a clássica casca de banana da generalização indevida: omitiu as vedações expressas de delegação.',
        exemplo_cotidiano: 'Imagine que no condomínio o síndico peça para o porteiro receber uma encomenda. Tudo bem! Mas se o síndico pedir para o porteiro julgar um recurso de multa da convenção do condomínio, aí não dá!',
        fundamentacao: 'Conforme art. 13 da Lei nº 9.784/1999: "Não podem ser objeto de delegação: I - a edição de atos de caráter normativo; II - a decisão de recursos administrativos; III - as matérias de competência exclusiva do órgão ou autoridade."',
        dica_ouro: 'Mnemônico CENORA: CEnouras Não se delegam! CE (competência exclusiva), NO (atos normativos), RA (recursos administrativos).',
        visual_svg: '<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F8FAFC" rx="12"/><rect x="20" y="30" width="210" height="140" fill="#FEE2E2" stroke="#EF4444" stroke-width="2" rx="8"/><text x="125" y="60" text-anchor="middle" font-weight="bold" fill="#991B1B">❌ Pegadinha</text><text x="125" y="100" text-anchor="middle" font-size="12" fill="#7F1D1D">Achar que tudo delega</text><rect x="270" y="30" width="210" height="140" fill="#DCFCE7" stroke="#10B981" stroke-width="2" rx="8"/><text x="375" y="60" text-anchor="middle" font-weight="bold" fill="#065F46">✅ Regra da Lei</text><text x="375" y="100" text-anchor="middle" font-size="12" fill="#047857">CENORA não delega!</text></svg>',
      };
    case 'json_repair': { const m = all.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
    default: return {};
  }
}

export function createMock() {
  const batches = new Map();
  const gen = async (req) => {
    if (process.env.MOCK_AI_FAIL === req.task) throw Object.assign(new Error('falha simulada'), { retryable: false, fallback: true, code: 'unavailable' });
    const out = respond(req.task, req);
    const text = typeof out === 'string' ? out : JSON.stringify(out);
    if (req.onText) for (let i = 120; i < text.length + 120; i += 120) { if (req.signal?.aborted) break; req.onText(text.slice(0, i)); await new Promise((r) => setTimeout(r, 5)); }
    return { text, usage: { input: Math.ceil(JSON.stringify(req.messages).length / 4), output: Math.ceil(text.length / 4), cacheRead: 0 }, stopReason: 'end_turn' };
  };
  return {
    name: 'mock',
    capabilities: { pdf: true, batch: true, stream: true, cache: false },
    generate: gen,
    batch: {
      async submit(items) { const id = 'mockbatch_' + Math.random().toString(16).slice(2); const results = new Map(); for (const it of items) results.set(it.id, await gen(it)); batches.set(id, results); return id; },
      async poll(id) { const r = batches.get(id); return r ? { state: 'ended', results: r } : { state: 'ended', results: new Map() }; },
    },
  };
}
