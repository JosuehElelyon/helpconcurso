// Benchmark de Geração Difícil com Claude Sonnet 5.5 como Juiz (LLM-as-a-Judge) — Passo D5
// Avalia se o Claude Haiku 5.5 e os modelos gratuitos geram questões difíceis com precisão jurídica,
// sem ambiguidade e com pegadinhas sofisticadas no padrão Cebraspe.
//
// Uso: node --env-file=.env scripts/benchmark-dificil.js [filtro]
// Exemplo: node --env-file=.env scripts/benchmark-dificil.js haiku
import fs from 'node:fs';
import { createAnthropic } from '../src/ai/providers/anthropic.js';
import { createOpenAICompat } from '../src/ai/providers/openai-compat.js';
import { SECURITY_RULES } from '../src/ai/guard.js';
import { extractJSON } from '../src/ai/index.js';
import { costUsd } from '../src/ai/pricing.js';
import { config } from '../src/config.js';
import { promptGenerate } from '../src/lib/prompts.js';
import { generateSchema } from '../src/ai/schemas.js';

// Material desafiador: Improbidade Administrativa (Lei 8.429/92 com redação da Lei 14.230/2021) e CF art. 37, § 4º
const LEI_IMPROBIDADE = `LEI Nº 8.429/1992 (COM AS ALTERAÇÕES DA LEI Nº 14.230/2021)
Art. 1º O sistema de responsabilização por atos de improbidade administrativa tutelará a probidade na organização do Estado e no exercício de suas funções.
§ 1º Consideram-se atos de improbidade administrativa as condutas dolosas tipificadas nos arts. 9º, 10 e 11 desta Lei, ressalvados tipos previstos em leis especiais.
§ 2º Considera-se dolo a vontade livre e consciente de alcançar o resultado ilícito tipificado nos arts. 9º, 10 e 11 desta Lei, não bastando a voluntariedade do agente.
§ 3º O mero exercício da função ou desempenho de competências públicas, sem comprovação de ato doloso com fim ilícito, afasta a responsabilidade por ato de improbidade administrativa.
§ 8º Não configura improbidade a mera divergência interpretativa da lei, baseada em jurisprudência, ainda que não pacificada, mesmo que não venha a ser posteriormente prevalecente nas decisões dos órgãos de controle ou dos tribunais do Poder Judiciário.

Art. 8º O sucessor ou o herdeiro daquele que causar dano ao erário ou que se enriquecer ilicitamente estão sujeitos apenas à obrigação de repará-lo até o limite do valor da herança ou do patrimônio transferido.
(Nota: a obrigação não abrange a sanção de multa civil, nem suspensão de direitos políticos).

Art. 16. Na ação de improbidade administrativa, para a decretação de indisponibilidade de bens do réu, é necessária a demonstração no caso concreto de perigo de dano irreparável ou de risco ao resultado útil do processo, vedada a presunção de periculum in mora.

Art. 23. A ação para a aplicação das sanções previstas nesta Lei prescreve em 8 (oito) anos, contados a partir da ocorrência do fato ou, no caso de infrações permanentes, do dia em que cessou a permanência.
§ 4º O prazo prescricional referido no caput interrompe-se pelo ajuizamento da ação de improbidade administrativa e pela publicação da sentença condenatória.
§ 5º Interrompida a prescrição, o prazo recomeça a correr pela metade (4 anos - prescrição intercorrente).`;

const KNOWLEDGE_CEBRASPE = {
  provas: 8,
  caracteristicas: [
    'Enunciados assertivos no formato Certo ou Errado para julgamento objetivo',
    'Exploração precisa de novidades legislativas e superação de teses antigas',
    'Apresentação de situações hipotéticas onde a ausência de dolo específico descaracteriza a infração',
  ],
  padroes: [
    'Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente',
  ],
  pegadinhas: [
    'Afirmar que a culpa grave ou negligência inescusável ainda caracteriza ato de improbidade que causa prejuízo ao erário',
    'Sustentar que o sucessor responde pela multa civil até o limite da herança',
    'Afirmar que o perigo da demora na indisponibilidade de bens é presumido (in re ipsa)',
    'Induzir que mera divergência interpretativa de lei não pacificada configura improbidade',
  ],
  exemplos: [],
};

const MODELOS = [
  ['anthropic', 'claude-haiku-5-5'],
  ['anthropic', 'claude-sonnet-5-5'],
  ['gemini', 'gemini-3.5-flash-lite'],
  ['gemini', 'gemini-3.5-flash'],
  ['groq', 'openai/gpt-oss-120b'],
].filter(([p, m]) => !process.argv[2] || `${p}:${m}`.toLowerCase().includes(process.argv[2].toLowerCase()));

const getProvider = (name) => (name === 'anthropic'
  ? createAnthropic({ apiKey: config.ai.keys.anthropic, timeoutMs: 180000 })
  : createOpenAICompat({ name, apiKey: config.ai.keys[name], baseUrl: config.ai.baseUrls[name], timeoutMs: 180000 }));

// Claude Sonnet 5.5 como Juiz
const judgeProvider = createAnthropic({ apiKey: config.ai.keys.anthropic, timeoutMs: 180000 });

async function julgarComSonnet(questoes) {
  const prompt = `Você é um Juiz Examinador Sênior e Auditor de Provas de Concursos Públicos de Alto Nível (nível Cebraspe/FGV para carreiras de Juiz, Promotor e Auditor Fiscal).
Avalie a qualidade técnica, precisão jurídica, sofisticação de pegadinha e ausência de ambiguidade das seguintes questões geradas por uma IA.

MATERIAL DE BASE UTILIZADO PELA IA:
${LEI_IMPROBIDADE}

QUESTÕES GERADAS PARA JULGAMENTO:
${JSON.stringify(questoes, null, 2)}

CRITÉRIOS DE AVALIAÇÃO (0 a 100 pontos):
1. Correção Jurídica & Gabarito (0 a 30 pontos): O gabarito indicado bate 100% com a legislação informada? Não há inversão errônea?
2. Ausência de Ambiguidade / Blindagem contra Recursos (0 a 25 pontos): O texto é límpido? Uma banca manteria o gabarito contra recursos de candidatos?
3. Sofisticação da Pegadinha & Dificuldade Real (0 a 25 pontos): A questão exige conhecimento fino e raciocínio (ex.: dolo específico, herdeiro não pagar multa, vedação de periculum in mora presumido)? Ou é trivial?
4. Estilo Cebraspe & Redação Forense (0 a 20 pontos): O enunciado é direto, assertivo, formal e elegante?

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "nota_geral": 0 a 100,
  "criterios": {
    "correcao": 0 a 30,
    "sem_ambiguidade": 0 a 25,
    "dificuldade": 0 a 25,
    "estilo": 0 a 20
  },
  "parecer_itens": [
    { "item": 1, "acerto_gabarito": true, "parecer": "uma frase avaliando a assertiva e a pegadinha" }
  ],
  "resumo_juiz": "2 a 3 frases resumindo a qualidade técnica da prova e se as questões servem para concurso de alto nível"
}`;

  const res = await judgeProvider.generate({
    model: 'claude-sonnet-5-5',
    system: SECURITY_RULES,
    maxTokens: 2500,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt + '\n\nResponda APENAS com JSON válido.' }] }],
  });

  return extractJSON(res.text);
}

console.log('========================================================================');
console.log('   BENCHMARK D5: QUESTÕES DIFÍCEIS COM CLAUDE SONNET 5.5 COMO JUIZ     ');
console.log('========================================================================\n');

const relatorio = [];

for (const [pName, model] of MODELOS) {
  if (!config.ai.keys[pName]) {
    console.log(`[PULANDO] ${pName}:${model} — chave não configurada.`);
    continue;
  }

  console.log(`\nGerando questões difíceis com: ${pName}:${model}...`);
  const t0 = Date.now();
  try {
    const req = promptGenerate({
      banca: 'cebraspe',
      materia: 'Direito Administrativo',
      assunto: 'Improbidade Administrativa (Lei 14.230/2021)',
      nivel: 'Difícil',
      qtd: 3,
      text: LEI_IMPROBIDADE,
      knowledge: KNOWLEDGE_CEBRASPE,
    });

    const out = await getProvider(pName).generate({
      model,
      system: [SECURITY_RULES, req.system].join('\n\n'),
      maxTokens: 5000,
      messages: [{ role: 'user', content: [{ type: 'text', text: req.prompt + '\n\nResponda APENAS com JSON válido, sem markdown.' }] }],
    });
    const msGen = Date.now() - t0;
    const parsed = generateSchema.safeParse(extractJSON(out.text));

    if (!parsed.success) {
      console.log(`❌ Falha de schema JSON no modelo ${model}`);
      relatorio.push({ provider: pName, model, nota: 0, ms: msGen, erro: 'JSON fora do schema' });
      continue;
    }

    const questoes = parsed.data.questoes;
    console.log(`✅ ${questoes.length} questões geradas em ${msGen}ms. Submetendo ao Juiz (Claude Sonnet 5.5)...`);

    const tJudge = Date.now();
    const julgamento = await julgarComSonnet(questoes);
    const msJudge = Date.now() - tJudge;

    console.log(`⚖️  Julgamento concluído em ${msJudge}ms: Nota ${julgamento.nota_geral}/100`);
    console.log(`   - Correção: ${julgamento.criterios.correcao}/30 | Sem Ambiguidade: ${julgamento.criterios.sem_ambiguidade}/25`);
    console.log(`   - Dificuldade: ${julgamento.criterios.dificuldade}/25 | Estilo: ${julgamento.criterios.estilo}/20`);
    console.log(`   - Parecer: ${julgamento.resumo_juiz}`);

    const custoTotal = costUsd(model, out.usage?.input || 0, out.usage?.output || 0, 0, false, pName);

    relatorio.push({
      provider: pName,
      model,
      nota: julgamento.nota_geral,
      criterios: julgamento.criterios,
      msGen,
      custoUsd: custoTotal,
      julgamento,
      questoes,
    });
  } catch (err) {
    console.error(`❌ Erro com ${model}:`, err.message);
    relatorio.push({ provider: pName, model, nota: 0, ms: Date.now() - t0, erro: err.message });
  }
}

relatorio.sort((a, b) => (b.nota || 0) - (a.nota || 0) || a.msGen - b.msGen);

const mdLines = [
  `# Benchmark D5: Geração de Questões Difíceis — Juiz: Claude Sonnet 5.5`,
  `Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
  '',
  `Avaliação de questões no nível **Difícil (Banca Cebraspe)** sobre a Nova Lei de Improbidade Administrativa (Lei 14.230/2021).`,
  `O **Claude Sonnet 5.5** atuou como juiz cego (sem saber o nome do modelo gerador), pontuando de 0 a 100 com base em correção jurídica, blindagem contra recursos, sofisticação de pegadinhas e padrão de redação Cebraspe.`,
  '',
  `| # | Modelo | Nota Juiz | Correção (30) | Sem Ambíg. (25) | Dificuldade (25) | Estilo (20) | Tempo Geração | Custo |`,
  `|---|---|---|---|---|---|---|---|---|`,
  ...relatorio.map((r, i) => {
    if (r.erro) return `| ${i + 1} | \`${r.provider}:${r.model}\` | **0 ⚠** | — | — | — | — | ${(r.msGen / 1000).toFixed(1)}s | — |`;
    const c = r.criterios;
    return `| ${i + 1} | \`${r.provider}:${r.model}\` | **${r.nota}** | ${c.correcao} | ${c.sem_ambiguidade} | ${c.dificuldade} | ${c.estilo} | ${(r.msGen / 1000).toFixed(1)}s | US$ ${r.custoUsd.toFixed(4)} |`;
  }),
  '',
  `## Pareceres do Juiz (Claude Sonnet 5.5)`,
  '',
  ...relatorio.filter((r) => !r.erro).flatMap((r) => [
    `### \`${r.provider}:${r.model}\` (Nota: ${r.nota}/100 — Tempo: ${(r.msGen / 1000).toFixed(1)}s)`,
    `**Resumo do Juiz:** ${r.julgamento.resumo_juiz}`,
    '',
    `**Itens Gerados & Julgamento:**`,
    ...(r.questoes || []).map((q, idx) => {
      const p = r.julgamento.parecer_itens?.[idx];
      return `- **Item ${idx + 1} [Gabarito: ${q.gabarito}]:** "${q.enunciado}"\n  - *Pegadinha:* ${q.pegadinha || '—'}\n  - *Parecer do Juiz:* ${p ? p.parecer : 'Avaliado positivamente.'}`;
    }),
    '',
  ]),
];

fs.writeFileSync('docs/BENCHMARK-DIFICIL.md', mdLines.join('\n') + '\n');
console.log('\n========================================================================');
console.log('✅ Benchmark concluído! Relatório completo salvo em docs/BENCHMARK-DIFICIL.md');
console.log('========================================================================');
