# Plano de ação — IA multi-provedor (Groq + Gemini + Claude reserva)

Revisão de 02/11/2026 da cascata gratuita (`AI_FREE_CASCADE`), feita sobre o código não commitado em
`src/config.js`, `src/ai/index.js`, `src/ai/pricing.js`, `src/ai/providers/*`, e no uso real da tabela `ai_usage`.

## Diagnóstico

| Afirmação | Situação verificada |
|---|---|
| Groq na triagem/revisão, Gemini na geração/análise, Claude de reserva | ✅ É o que `routeFor()` monta com as chaves atuais |
| 49/49 testes | ✅ Confirmado |
| Funciona com IA real | ✅ Groq 7/7 chamadas ok; Gemini 6/8 (2 falhas = 503 do Google no `generate`, caiu na reserva) |
| Custo R$ 0,00 | ⚠️ Só enquanto as cotas grátis bastarem; ao estourar, cai no Claude pago (o limite diário de US$ 0,50 continua valendo) |
| "Janela de 1 milhão de tokens do Gemini" | ⚠️ Não é usada: os prompts cortam o texto antes (material 8 mil caracteres, prova 40 mil, amostra 15 mil). E a cota grátis tem limite de tokens por minuto bem abaixo disso |
| "Revisor cego independente" | ⚠️ Revisor é o `gpt-oss-20b`, modelo menor que o gerador. Se o Gemini cair, a geração vai para o Groq e o revisor fica na mesma família. Nada no código impede gerador = revisor |
| "Seguro" | ⚠️ As barreiras (`untrusted()` + schema) valem para todos. Mas a cota grátis do Gemini pode usar os dados enviados para melhorar produtos do Google |
| FCC removido por arquitetura | ✅ Decisão correta: depende de programa aberto no Windows, 15/15 chamadas falharam (sem conexão). Ele traduz para provedores de terceiros — não usa a conta Anthropic, então o risco de termos que levantei antes é baixo |
| Agentes "aprendem entre si" | ❌ Não aprendem. O aprendizado fica no banco do HelpConcurso (provas, rótulos, perfis) — e é assim que deve ser |

## Plano de ajustes de segurança (fazer antes do commit)

| # | Ajuste | Por quê | Esforço |
|---|---|---|---|
| S1 | **Separar tarefas por sensibilidade do dado.** Provas de concurso são públicas → podem ir para cota grátis (`prova_check`, `prova_analysis`, `prova_extract`, `edital_parse`). Material do aluno → só provedor que não treina com os dados (`detect`, `generate`, `review`, `edital_match`, `report_check`, `ocr`, `json_repair`). Variável `AI_GRATIS_DADOS_ALUNO=false` (padrão) | LGPD e confiança do aluno; Gemini grátis pode usar o conteúdo | Pequeno |
| S2 | **Padrão desligado no código**: `freeCascade` e `freeGenerate` = `false` se não vierem no `.env` | Evita mandar dados para cota grátis sem decisão explícita | Mínimo |
| S3 | **Gratuidade declarada, não adivinhada**: `AI_PROVEDORES_GRATIS=groq,gemini` no `.env` em vez de "todo Gemini flash é grátis". Modelos desconhecidos com preço 0 só se o provedor estiver na lista; senão, preço padrão com aviso no log | Hoje uma chave Gemini paga fica invisível ao limite diário | Pequeno |
| S4 | **Não usar várias contas grátis para driblar limite.** A rotação de chaves fica para chaves da mesma conta/organização | Criar contas para fugir de cota viola os termos dos provedores e pode banir a chave | Doc |
| S5 | **Termos de uso / privacidade**: informar quais fornecedores de IA processam o material e para quê | Exigência da LGPD (transparência sobre operadores) | Pequeno |
| S6 | **Revisão admin obrigatória enquanto `prova_check` roda no modelo pequeno**: subir `TRUST_AUTO_APPROVE_MIN` ou desativar auto-aprovação até medir a taxa de acerto | Base de provas é compartilhada; lixo aceito contamina o estilo de todos | Mínimo |
| S7 | **FCC fora do catálogo de produção**: manter o adaptador, mas só entra na fila se `FCC_ENABLED=true` e `NODE_ENV!=production`; remover `extra_hosts`/`FCC_BASE_URL` do compose quando não usado | Superfície desnecessária (HTTP local, token padrão `freecc`) | Mínimo |
| S8 | **Logs**: `previa_resposta` grava até 350 caracteres da resposta da IA — pode conter trecho do material. Cortar para 120 e só em `NODE_ENV!=production` | Minimizar dado pessoal em log | Mínimo |

## Plano de melhorias de desenvolvimento

| # | Melhoria | Resultado esperado | Esforço |
|---|---|---|---|
| D1 | **Revisor de outro provedor** que o gerador (`review` recebe `excluir: provedorDoGerador`) e usar o tier `strong` (`gpt-oss-120b`), já que é grátis | Revisão independente de verdade | Pequeno |
| D2 | **Respeitar 429/503 com `retry-after`**: abrir o disjuntor do provedor pelo tempo indicado, sem gastar 3 tentativas | Menos latência e menos queda para o Claude pago | Pequeno |
| D3 | **Modo lote coerente**: hoje o lote só vale se o 1º da fila suportar (Gemini não suporta), então a reserva Claude roda a preço cheio. Quando a cascata grátis estiver ligada, se cair no Claude em tarefa de treino, enviar em lote | Reserva paga 50% mais barata | Pequeno |
| D4 | **Qualidade por provedor** (início da Fase 2 — `ia_execucoes`): gravar provedor/modelo em cada `question_set` e mostrar no painel admin: % descartada pelo revisor, 👍/👎, erros confirmados, falhas de schema — por modelo | Decidir com dado se Gemini Flash substitui o Sonnet | Médio |
| D5 | **Conjunto de avaliação fixo** (`npm run eval`): 10 materiais + 5 provas de bancas diferentes; roda cada provedor e compara com o gabarito e com os rótulos esperados | Testar troca de modelo antes de ir para os alunos | Médio |
| D6 | **Limites de texto por provedor**: se quiser aproveitar contexto maior, tornar os cortes (8k/15k/40k) configuráveis por tarefa — sem passar da cota por minuto | Provas longas inteiras sem recorte, quando valer a pena | Pequeno |
| D7 | **Fase 2 da arquitetura**: `perfil_banca` consolidado + pacote de contexto compacto | Menos tokens por geração; modelo menor rende como maior | Grande |
| D8 | **Docs**: atualizar `docs/IA.md`, `ROADMAP.md`, `CLAUDE.md` e `.env.example` (multi-provedor, sensibilidade, gratuidade declarada) | Próxima sessão entende o desenho | Pequeno |

## Reanálise após o benchmark (02/11/2026)

Feito também: OpenRouter como 3º grátis, `scripts/benchmark-ia.js`, `docs/BENCHMARK-IA.md`, D2 (fallback imediato em 429), S6 (recusa de prova >=90%) e D5 (`scripts/benchmark-dificil.js` com Sonnet juiz em `docs/BENCHMARK-DIFICIL.md`). 52/52 testes passando.

| Item | O que o código mostrou | Nova prioridade |
|---|---|---|
| D2 (429/503) | Um 429 é tratado como "tente de novo": 3 tentativas com espera (~2,5 s) **no mesmo provedor** antes de ir para o próximo; o disjuntor só abre após 5 falhas. Com cota grátis, 429 é frequente → o aluno espera à toa | **Alta** — ir direto ao próximo provedor e dar "descanso" ao que deu 429 pelo tempo do `retry-after` (padrão 60 s) |
| D3 (lote) | Com a cascata ligada, o treino de prova vai direto ao Gemini (grátis, segundos). O lote só valeria se os 3 grátis falharem — raro e complexo de encaixar | **Baixa** — documentar e não implementar agora |
| S6 (provas) | A aprovação automática já exige usuário de confiança (≥5 aprovadas, 0 recusadas) **e** varredura sem alertas. O risco real do modelo pequeno é outro: `prova_check` **recusa sozinho** se achar que não é prova (confiança ≥ 0,7) ou se a banca não é suportada (≥ 0,85) — falso negativo some com uma prova legítima | **Média** — recusa automática só com confiança ≥ 0,9; abaixo disso vai para revisão do admin |
| D5 (avaliação) | Todos tiraram 100: o teste atual mede velocidade e formato, não qualidade | **Alta** — casos difíceis + juiz (Sonnet) avaliando se o gabarito gerado está certo e se a pegadinha é boa |
| S1 (privacidade) | Material do aluno vai hoje para Gemini/Groq/OpenRouter grátis | **Decisão do Josueh** |
| Novo — D9 | Painel admin sem visão por provedor: chamadas de hoje, 429, falhas, tempo médio | **Média** — base para o D4 |

## Ordem sugerida

1. ✅ **Feito em 02/11/2026:** S2, S3, S7, S8, D1 (51/51 testes), commit da cascata, OpenRouter e benchmark.
2. **Próximo:** D2, S6, D5 (benchmark difícil), D8 → push. ✅ S1 feito (opção b — ver "Estratégia de IA adotada").
3. **Antes de abrir para mais alunos:** S5, D4, D9.
4. **Depois:** D6, D7 (Fase 2). D3 só se o uso do Claude de reserva crescer.

## Estratégia de IA adotada (S1 = opção b) — 02/11/2026

Princípio: **gastar token pago só onde ele vira acerto para o aluno; o resto, de graça.**

| Tarefa | Dado | Fila | Por quê |
|---|---|---|---|
| Gerar questões | aluno | **Haiku** → Sonnet | Saída longa (≈1.300 tokens/questão): no Haiku custa ~20× menos. Benchmark: Haiku 100 na geração |
| Revisar questões | aluno | **Sonnet** → Haiku | Saída curta (~100 tokens/questão): o modelo mais forte vira o juiz. Juiz mais forte que o autor pega mais erro de gabarito |
| Identificar matéria, cruzar material × edital | aluno | Haiku → Sonnet | Tarefas simples |
| Verificar erro reportado | aluno | Sonnet → Haiku | Raro e decide estrelas/correção: precisão vale o custo |
| OCR | aluno | Haiku → Sonnet | Só o Claude lê PDF escaneado |
| Analisar estilo da banca | público | **Sonnet** → Gemini → Groq → OpenRouter → Haiku | Gera o perfil da banca que alimenta todas as gerações (~US$ 0,02 por prova) |
| Extrair questões da prova, ler edital | público | Gemini → Groq → OpenRouter → Claude | Muito texto de saída; documento público: grátis |
| Checar prova enviada | público | Groq → Gemini → OpenRouter → Claude | Triagem rápida (~1 s) |
| Consertar JSON | herda | conforme a tarefa de origem | Não vaza material do aluno para o grátis |

Regras no código:
- `AI_TASKS[*].dados` + `AI_PROVEDORES_PRIVADOS` (padrão `anthropic`): material do aluno nunca entra na cascata grátis.
  Ativando faturamento no Google, basta `AI_PROVEDORES_PRIVADOS=anthropic,gemini`.
- `pagoPrimeiro` (análise de estilo): Sonnet primeiro, grátis como reserva.
- Revisor ≠ gerador por **modelo** (`avoid`): Haiku gerou → Sonnet revisa; se a geração cair no Sonnet, o Haiku revisa.
- Limite diário (`AI_LIMITE_USD_DIA`) bloqueia só modelos pagos: provas e editais continuam sendo processados de graça.

Custo estimado por simulado de 10 questões: geração Haiku ≈ US$ 0,008 + revisão Sonnet ≈ US$ 0,03 + matéria ≈ US$ 0,001
→ **≈ US$ 0,04** (antes, Sonnet gerando e Haiku revisando: ≈ US$ 0,15). Com o teto de US$ 0,50/dia: ~12 simulados/dia
além das provas. A confirmar com o D5 (benchmark difícil) e com os números reais do `ai_usage`.

Valor extra grátis (dados públicos, sem custo de token): reprocessar provas antigas sem rótulo (Fase 1), dupla extração
com consenso de gabarito, e montar o `perfil_banca` da Fase 2 com os modelos grátis.
