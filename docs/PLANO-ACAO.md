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

### Ajuste após o D5 (02/11/2026)
Benchmark com juiz (Sonnet): Difícil — Haiku 58 × Sonnet 80 (Gemini Flash 81, mas não recebe material do aluno);
Médio — Haiku 68 × Sonnet 67. Decisão: **gerador por nível** — `generate` (Haiku) para Fácil/Médio e
`generate_dificil` (Sonnet → Haiku) para Difícil/Misto; o revisor continua sendo sempre o outro modelo.
Custo estimado por 10 questões: Fácil/Médio ≈ US$ 0,04 · Difícil/Misto ≈ US$ 0,15.

Próximo ganho sem custo extra: nos dois níveis o juiz deu nota baixa em **dificuldade** (8–14 de 25) — as questões
copiam a lei. Melhorar `promptGenerate` (situação hipotética, combinar dispositivos, cobrir mais do material, não repetir
"Julgue o item" no enunciado) e medir de novo com `npm run eval` / `EVAL_NIVEL=Médio npm run eval`.

## Arquitetura de Veracidade e Fonte Primária (P1 e P2 concluídos) — 02/11/2026

Garante a integridade do acervo contra falsificações, materiais de cursinhos com gabaritos adaptados/distorcidos ou links não oficiais:

- **P1: Catálogo de Domínios Oficiais Primários (`src/lib/bancas.js`)**:
  - Bancas suportadas: `cebraspe.org.br`, `conhecimento.fgv.br`, `vunesp.com.br`, `concursosfcc.com.br`, `cesgranrio.org.br`, `ibfc.org.br`, `quadrix.org.br`, `institutoaocp.org.br`, etc.
  - Rede oficial estatal e Diários Oficiais: `in.gov.br` (DOU), `imprensaoficial.com.br`, e qualquer sufixo `.gov.br`, `.jus.br`, `.leg.br`, `.def.br`, `.mp.br`, `.tc.br`.
  - Bloqueio imediato de fontes secundárias/cursinhos/drives privados (`estrategiaconcursos.com.br`, `grancursosonline.com.br`, `folhadirigida.com.br`, `qconcursos.com.br`, `drive.google.com`, `dropbox.com`).
  - Detecção automática de divergência de banca (ex: informou banca FGV, mas enviou link do Cebraspe).
  - Função exportada: `validarUrlOficial(banca, url)`.

- **P2: Rastreabilidade no Banco e nas Rotas (`008_veracidade_url_oficial.sql`)**:
  - Colunas adicionadas: `official_url`, `oficial_confirmado` e `official_url_tipo` em `provas`, `editais` e `editais_canonicos`.
  - Validação automática na submissão de Provas (`POST /api/provas`) e Editais (`POST /api/editais`). Se o usuário informar uma URL que não seja primária/oficial, a requisição é rejeitada com HTTP 422 e mensagem explicativa.
  - Na checagem em segundo plano (`checkProva`), provas com fonte oficial confirmada recebem marcação explícita de alta veracidade.
  - Painel do aluno e painel do administrador exibem se a prova/edital possui fonte oficial primária validada.
  - 61/61 testes passando com cobertura completa em `test/veracidade.test.js` e `test/v1.test.js`.

---

# Revisão crítica da Veracidade (P1/P2) e plano de evolução — 02/11/2026

## O que está bom
- Catálogo de domínios bem feito: casa por domínio exato ou subdomínio (`x.cebraspe.org.br`), então
  `cebraspe.org.br.evil.com` e `fgv.br@evil.com` são recusados. Só aceita http/https. Tem testes dedicados.
- Migração nova (008) em vez de editar as anteriores; colunas também no edital canônico (a fonte vale para todos).

## Problemas encontrados

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| V1 | **Alta (conceito)** | `oficial_confirmado` não confirma nada: é a URL **digitada** pelo usuário. Qualquer um informa `cebraspe.org.br/...` e anexa qualquer PDF → ganha "selo de alta confiabilidade". No edital canônico, a 1ª URL informada passa a valer para todos os alunos | Até haver confirmação real, tratar como **fonte declarada** (nome e texto do selo). Confirmação de verdade = V3 |
| V2 | Média (bug) | Edital enviado **sem banca** + link do site de uma banca → 422 "divergindo da banca informada ''" | Sem banca informada, aceitar qualquer banca do catálogo |
| V3 | Valor alto | — | **Importar pelo link oficial**: o servidor baixa o arquivo do domínio do catálogo e passa pelo `secureUpload` → aí sim `oficial_confirmado`. Proteções obrigatórias contra SSRF: só https, só domínios do catálogo, redirecionamento só para domínio do catálogo, IP de destino público, 25 MB, 20 s. Se o aluno também anexou o arquivo, comparar sha256/texto |
| V4 | Média (UX) | Link desconhecido (banca fora do catálogo: Objetiva, Fundep, Ibade, Legalle...) ou de cursinho **bloqueia o envio inteiro** (422). A prova continua útil — provas são públicas | Aceitar o envio, descartar o link e avisar ("link não oficial, ignorado") |
| V5 | Média (produto) | Nada no front: sem campo de link e sem selo. A funcionalidade está invisível para a Amanda | Campo "Link oficial (opcional)" nos envios; selo "Fonte oficial" na prova, no edital e nas questões reais do caderno |
| V6 | Baixa | `officialUrl` sem tamanho máximo; nomes misturados (`official_url` × `oficial_confirmado`); há uma alteração não commitada (só uma linha em branco) na migração 008 já aplicada | `max(500)`; próximas colunas em pt-BR; descartar a alteração da 008 (`git checkout migrations/008_veracidade_url_oficial.sql`) |
| V7 | Baixa | Sufixos governamentais: confirmar no registro.br se `.tc.br` existe como domínio oficial (tribunais de contas usam em geral `*.gov.br`) | Ajustar a lista |

## Resultado da melhoria do prompt de geração (v3, commit 22cc0dc)

| Nível | Haiku antes → depois | Sonnet antes → depois |
|---|---|---|
| Difícil | 58 → **78** | 80 → 76 |
| Médio | 68 → **77** | 67 → 72 |

Com a técnica de elaboração no prompt, o Haiku alcançou o Sonnet também no Difícil. Amostra pequena (1 material,
3 questões): **antes de voltar o Difícil para o Haiku** (economia de ~70% nesse nível), confirmar com Q2.

## Plano de evolução

### Qualidade da IA
| # | Item | Valor |
|---|---|---|
| Q1 | Se Q2 confirmar, `generate_dificil` volta para Haiku → Sonnet | ~US$ 0,15 → ~US$ 0,04 por simulado difícil |
| Q2 | Eval com 3 materiais (Português, Constitucional, Raciocínio) × 2 formatos (CEBRASPE C/E e FGV múltipla escolha) × 2 rodadas | Decisão com dado, não com 1 amostra |
| Q3 | "Dificuldade" ainda é o critério mais fraco (12–14/25). Próximo salto: pôr no prompt as **pegadinhas reais desta banca neste tópico** (rótulos da Fase 1) — é o pacote de contexto da Fase 2 | Questão com a cara da banca, sem modelo mais caro |
| Q4 | Gravar `prompt_versao` em `question_sets` e mostrar no admin: % descartada pelo revisor e 👍/👎 por modelo e versão de prompt (D4/D9) | Medir qualidade real dos alunos |

### Novas funcionalidades (do maior valor por custo para o menor)
| # | Funcionalidade | Custo de IA | Valor |
|---|---|---|---|
| F5 | Reprocessar provas antigas sem rótulo pela cascata grátis (dado público) | US$ 0 | Destrava F1 e Q3 |
| F1 | **Questões reais por tópico do edital**: o aluno treina com questões reais da banca filtradas pelo tópico do edital ativo | US$ 0 por uso | Diferencial forte; usa a base que já existe |
| F2 | **Revisão espaçada do caderno de erros** (volta a questão errada em 1, 3, 7 e 15 dias) | US$ 0 | Retenção e hábito diário |
| F7 | **Gabarito definitivo e anulações** pelo link oficial (V3): marca questões anuladas/alteradas na base | Baixo (grátis: dado público) | Confiança: "questão conferida com o gabarito definitivo" |
| F6 | Dupla extração com consenso de gabarito (dois modelos grátis; divergência vai para revisão) | US$ 0 | Base mais confiável |
| F3 | Simulado no formato da prova real: cronômetro e distribuição de matérias pelo edital/incidência | ~US$ 0 com questões reais | Treino de prova |
| F4 | "Por que errei?" sob demanda, com resposta guardada e reaproveitada para todos que errarem a mesma questão | Haiku, só quando pedido | Explicação sem custo fixo |

### Processo
| # | Item |
|---|---|
| O1 | Uma sessão de IA por vez no projeto (ou uma branch por funcionalidade): já houve commit misturado e testes quebrando por rodarem ao mesmo tempo |
| O2 | `git push` (≈16 commits locais) e CI no GitHub rodando `npm test` a cada push |
| O3 | Trocar a chave do OpenRouter que foi colada no chat |

## Ordem sugerida
1. **Sprint 1 (curta):** V1, V2, V4, V6, V7, O2, O3 e Q2.
2. **Sprint 2:** V3 (importar por link, com proteção SSRF), V5 (front), F5 (reprocessar grátis), Q1 se Q2 confirmar.
3. **Sprint 3:** F1 (questões reais por tópico), F2 (revisão espaçada), Q3 (Fase 2: pacote de contexto).
4. **Sprint 4:** F7, F6, F3, F4, Q4.
