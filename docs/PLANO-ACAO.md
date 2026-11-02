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

## Ordem sugerida

1. ✅ **Feito em 02/11/2026:** S2, S3, S7, S8, D1 (51/51 testes) e commit da cascata.
2. **Esta semana:** S1, S6, D2, D3, D8 → push.
3. **Antes de abrir para mais alunos:** S5, D4, D5.
4. **Depois:** D6, D7 (Fase 2).
