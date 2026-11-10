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

## Sprint 1 — concluída (02/11/2026)
- **V1** link digitado = fonte **declarada** (`oficial_confirmado=false`); não vai mais para o edital canônico. Confirmação real fica para V3.
- **V2** edital sem banca aceita site de qualquer banca do catálogo. **V4** link ruim não bloqueia: vira aviso (`avisos` / `warnings`).
- **V6** link com no máximo 500 caracteres. **V7** `tc.br` e `def.br` existem como zonas do registro.br (mantidos).
- **O2** CI já existe (`.github/workflows/ci.yml`); falta só o `git push`.
- **Achado novo — raciocínio do Claude 5.5:** Haiku/Sonnet 5.5 pensam por padrão; o raciocínio conta no `max_tokens` e é cobrado
  como saída. Respostas estavam sendo cortadas (ex.: `edital_parse` bateu 6.000/6.000; no eval, 5.400 tokens para ~1.300 de texto).
  Agora é por tarefa (`AI_ESFORCO_<TAREFA>`): `medium` + reserva de tokens em generate, generate_dificil, review, report_check e
  prova_analysis; desligado no resto (Haiku `disabled`, Sonnet `between_tools`). Testado contra a API real.
- **Q2** eval ampliado (`scripts/eval-amplo.js`, 3 matérias × 3 bancas, nível Difícil, configuração da produção): Haiku 65 × Sonnet 70.
  **Q1 não confirmado** — Difícil continua no Sonnet. Ponto fraco comum: dupla resposta defensável → prompt v4 com autoconferência.

## Sprint 2 — concluída (02/11/2026)
- **V3 importar pelo link oficial** (`src/lib/fonte-oficial.js`): sem arquivo + link → o servidor baixa da fonte e marca
  `oficial_confirmado=true` (prova e edital; no edital, a fonte confirmada vai para o edital canônico). Defesas SSRF: só https,
  só domínios do catálogo (inclusive em cada redirecionamento, máx. 3), IP checado na conexão (`lookupSeguro`: só endereços
  públicos; trata NAT64 `64:ff9b::/96`), 25 MB, 20 s, página HTML recusada. O arquivo segue pelo `secureUpload` normal.
  Testado contra a rede real (gov.br com redirecionamento, cebraspe.org.br). Obs.: planalto.gov.br derruba conexões desta rede.
- **V5 front**: campo "Link oficial" em Enviar provas e Meu edital, botão "Importar do link", avisos do servidor nos resultados e
  selo `✔ Fonte oficial` (baixado da fonte) ou `Link informado` (declarado) na lista de provas, no edital e na base do admin.
- **F5 rotular provas antigas**: botão no admin (`POST /api/admin/provas/rotular`) enfileira `prova.relabel` para provas prontas com
  questões sem rótulo. Usa a cascata grátis (dado público); só completa tópico/comando/pegadinha/habilidade/leis — não cria nem apaga
  questões e não mexe em gabarito.

## Sprint 3 — concluída (02/11/2026)
- **F2 Revisão espaçada do caderno de erros** (`src/lib/revisao-espacada.js`, migration `009_sprint3_revisao_espacada_questoes_reais.sql`):
  - Algoritmo de Leitner com intervalos calibrados para concursos: 1 dia → 3 dias → 7 dias → 15 dias → Dominada.
  - Erro inicial coloca a questão na Fase 1 (1d). Acertos consecutivos na revisão avançam de fase. Qualquer recaída reinicia para a Fase 1.
  - No front (`public/app.js`): resumo no cabeçalho do caderno ("🔔 X revisar hoje · ✔ Y dominadas"), filtro "Revisar hoje" e badges dinâmicos de fase em cada questão (`Fase 1 (1d)`, `Fase 2 (3d)`, `✔ Dominada`).
- **F1 Treinar com questões reais da banca por tópico do edital** (`src/services/edital.js`, `src/routes/editais.js`):
  - Endpoints: `GET /api/editais/:id/topicos/:topicoId/questoes-reais` e `POST /api/editais/:id/topicos/:topicoId/praticar-reais`.
  - O aluno treina com questões oficiais de provas anteriores da banca mapeadas para o tópico do edital verticalizado, com **custo US$ 0 de IA** (`origem='prova_real'`, `model='prova_real'`).
  - No front: botão "Reais (X)" direto no edital verticalizado ao lado de cada tópico com questões disponíveis na banca, abrindo o simulado instantaneamente.
- **Q3 Pacote de contexto da Fase 2** (`src/services/knowledge.js`, `src/lib/prompts.js`):
  - `getKnowledge` agora agrega e extrai pegadinhas reais (`pegadinhasReais`), comandos típicos (`comandosReais`) e leis/dispositivos mais cobrados (`dispositivosReais`) a partir das questões rotuladas em `prova_questoes`.
  - `promptGenerate` injeta essas evidências no system prompt de forma compacta e estável, aproveitando o cache dos modelos e ensinando a IA a elaborar com a identidade exata da banca.
- **Testes**: 77 testes passando com 100% de sucesso (`npm test`).


---

# Revisão do Sprint 3 e plano ajustado — 02/11/2026

## O que está bom
- Revisão espaçada (Leitner 1→3→7→15 dias → dominada) em módulo próprio e testado; o gabarito é conferido no servidor.
- Questões reais por tópico com custo zero de IA, origem gravada (`question_sets.origem='prova_real'`), migração nova (009).
- O DNA da banca (pegadinhas, comandos e leis rotulados) entra no prompt de geração — é a direção certa da Fase 2.

## Problemas encontrados

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| C1 | **Alta (segurança)** | `POST /api/editais/:id/topicos/:topicoId/praticar-reais` usa o `cadernoId` do corpo **sem conferir o dono** (IDOR): dá para pendurar um simulado no caderno de outro aluno | Conferir `cadernos.user_id`; caderno alheio → 404 |
| C2 | **Alta (questão errada)** | Se o edital é CEBRASPE (ou há prova vinculada de outro formato), questões de **múltipla escolha viram Certo/Errado**: as alternativas são apagadas e o gabarito continua "B" — questão impossível de responder | Formato por questão; o simulado só reúne questões do mesmo formato |
| C3 | Média (honestidade) | "Reais (X)" conta qualquer questão da **disciplina** (`materia ILIKE`) e ainda rotula como sendo do tópico; com edital sem banca, mistura bancas | Separar "X do tópico · Y da disciplina"; nunca rotular questão da disciplina como do tópico; sem banca, só provas vinculadas |
| C4 | Média (produto) | A revisão espaçada só conta respostas dadas **dentro do caderno**. Errou no simulado normal → a questão não entra no ciclo | Ligar a resposta do simulado (`sets.js`) ao ciclo; agenda por **dia** (fuso de Brasília), não por hora exata |
| C5 | Média (qualidade) | O DNA da banca sorteia 60 questões (`random()`), **não filtra pela matéria** (pegadinhas de Português entram na geração de Constitucional) e manda **códigos crus** (`troca_conceito`) misturados com texto livre | Agregar por banca + matéria com `GROUP BY`/contagem (determinístico); traduzir códigos pelas descrições de `src/lib/cobranca.js`; filtrar por tópico quando houver |
| C6 | Média (custo) | A afirmação "fica no system e aproveita o cache" não vale: os exemplos já eram sorteados e agora o DNA também → o system muda a cada pedido e o cache nunca acerta | Exemplos e DNA determinísticos por (banca, matéria, dia) → mesmo system para todos os alunos da banca no dia; medir `cache_read_tokens` |
| C7 | Baixa (UX) | O comentário da questão real mostra o código cru (`[assinale_correta]`) | Mostrar a descrição |
| C8 | Baixa (processo) | 3ª vez que uma migração aplicada fica com alteração não commitada (linha em branco no fim: 008, 009) | Descartar (`git checkout migrations/`) e criar as próximas já com a linha final |

## Dependência que define a prioridade
F1 (questões reais por tópico) e o DNA da banca **só rendem com base rotulada e grande**. Hoje a base é pequena e as provas
antigas ainda não foram rotuladas (falta clicar em "Rotular provas antigas"). Crescer a base é o que mais aumenta o valor agora.

## Plano ajustado

### Sprint 3.1 — correções (curta, antes de abrir para mais alunos)
C1, C2, C3, C4, C5, C6, C7 + testes de cada um (inclusive IDOR e mistura de formatos).

### Sprint 4 — base maior e mais confiável
| # | Item | Valor |
|---|---|---|
| B1 | **Importação em lote pelo admin**: colar uma lista de links oficiais (provas + gabaritos) e o sistema baixa, checa e treina (usa V3) | Base cresce rápido, toda com selo de fonte oficial |
| F7 | **Gabarito definitivo e anulações** pelo link oficial: marca questões anuladas/alteradas | Questão real com gabarito oficial final |
| F6 | Dupla extração com consenso de gabarito (dois modelos grátis; divergência → revisão) | Base confiável sem custo |
| F5 | Rodar a rotulagem das provas antigas (botão já existe) | Destrava F1 e o DNA da banca |

### Sprint 5 — hábito e retenção
| # | Item | Valor |
|---|---|---|
| N1 | **"Hoje" na tela inicial**: revisões pendentes de todos os cadernos + tópicos fracos do edital; e-mail diário opcional (Brevo) | Volta diária do aluno |
| F3 | Simulado no formato da prova real: cronômetro, distribuição de matérias pelo peso do edital, misturando questões reais e geradas | Treino de prova |
| F4 | "Por que errei?" sob demanda, guardado e reaproveitado por questão | Explicação sem custo fixo |

### Sprint 6 — medir qualidade de verdade
Q4/D4/D9: `prompt_versao` e modelo em cada simulado; painel admin com % descartada pelo revisor, 👍/👎, erros confirmados e
chamadas/429 por provedor; cache de prompt medido. Decisões de modelo e prompt passam a usar dado real dos alunos.

## Sprint 3.1 — concluída (02/11/2026)
- **C1** caderno do simulado de questões reais só do próprio aluno (404 para caderno alheio).
- **C2** formato por questão: o simulado tem um formato só (o da banca; sem banca, o mais comum); questão incoerente
  (sem alternativas e gabarito de letra) fica de fora. Antes, ME virava C/E com gabarito "B".
- **C3** "do tópico" × "da disciplina": a questão da disciplina não é atribuída ao tópico; edital sem banca usa só provas
  vinculadas; o front diz quantas são de cada.
- **Bug achado no caminho:** o simulado de questões reais gravava em colunas inexistentes (`tokens_in`, `tokens_out`,
  `custo_estimado_usd`) → o botão "Reais" dava erro 500 sempre. O teste original passava sem exercitar (sem questões na base);
  agora o teste cria a base e cobre o fluxo inteiro.
- **C4** resposta dada no simulado de um caderno entra no ciclo (merge atômico no jsonb); erro antigo sem ciclo vira Fase 1;
  revisão vence por dia no fuso de Brasília.
- **C5/C6** DNA da banca agregado por banca + matéria com contagem (sem sorteio), códigos traduzidos; exemplos com ordem fixa
  por dia → system estável para todos os alunos da banca no dia (cache). Leis extraídas entram por `untrusted()`. Prompt v5.
- **C7** comentário mostra a descrição do comando, não o código.
- Testes: 80.

## Sprint 4 — concluída (02/11/2026)
- **B1 (Importação em lote pelo admin):**
  - Endpoint `POST /api/admin/provas/lote` aceita links oficiais de provas e gabaritos em JSON ou em texto colado (`link_prova | link_gabarito | orgao | cargo | ano | banca` ou uma URL por linha).
  - Download seguro com proteção SSRF (`baixarDaFonteOficial`), submissão automática e enfileiramento de treino imediato.
  - Front-end com modal "Importar em lote" e tabela de status (importadas, duplicadas, erros).
- **F7 (Gabarito definitivo e anulações):**
  - Migração `010_sprint4_gabarito_definitivo_lote_consenso.sql` adicionou colunas de rastreamento: `anulada`, `gabarito_alterado`, `gabarito_original`, `motivo_anulacao`, `gabarito_definitivo` em `prova_questoes`; e `gabarito_definitivo`, `gabarito_definitivo_url`, `gabarito_definitivo_confirmado`, `consenso_concluido` em `provas`.
  - Parser determinístico `parseGabaritoTexto` cobre todos os formatos usuais de gabarito oficiais (A-E, C/E, anulações por palavras-chave ou símbolos como X e #, retificações e alterações de letras) com custo $0 de tokens.
  - Endpoint `POST /api/admin/provas/:id/gabarito-definitivo` aceita link oficial (confirmado), arquivo ou texto colado.
  - Questões anuladas e sem consenso são automaticamente excluídas dos simulados e contagens dos alunos (`getQuestoesReaisDoTopico`, `buildEditalDashboard`, `knowledge.js`).
- **F6 (Dupla extração com consenso de gabarito):**
  - `trainProva` executa extração dupla com dois modelos gratuitos distintos da cascata (`avoid: { provider, model }`).
  - Questões com gabaritos divergentes são registradas com `consenso_gabarito = false` e detalhe das respostas de cada modelo em `divergencia_gabarito`. Prova sinalizada com `consenso_concluido = false`.
  - Questões divergentes ficam ocultas dos alunos até validação por gabarito definitivo ou revisão humana.
- **Front-End & Painel Admin:**
  - Badges visuais: `✔ Gabarito definitivo`, `ANULADA`, `Alterada (A → B)`, `⚠ Divergência no gabarito`.
  - Botão e modal "Gabarito definitivo" e "Importar em lote" integrados na tela Base de Provas do Admin.
- Testes: 86 testes automatizados passando (100% de sucesso).

---

# Revisão do Sprint 4 — 02/11/2026

## O que está bom
- Importação em lote reaproveita o download seguro (V3): SSRF, catálogo de domínios, selo de fonte confirmada.
- Gabarito definitivo sem custo de IA; anulada/alterada ficam registradas por questão (migração 010 nova).
- Consenso usa `avoid` (outro modelo confere) e grava os palpites divergentes para auditoria.
- Simulados de questões reais e o mapa de incidência já excluem questões anuladas/divergentes. 86 testes passando.

## Problemas encontrados

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| G1 | **Alta (dado errado marcado como definitivo)** | O parser lê texto comum como gabarito: "questões 1 e 2" → Q1=**E**; "Questões 10 a 20" → Q10=**A**. Gabarito com **dois cargos** ou **tipos de prova** (comum em FGV/FCC): o último bloco vence sem aviso. Tudo é gravado como "definitivo" e marcado como "alterada" | Só aceitar letra em contexto de gabarito (maiúscula, separador ou tabela); **conflito no mesmo número → 422** pedindo o bloco do cargo/tipo; letra válida para o formato (C/E ou A–E dentro das alternativas); cobertura mínima (≥ 60% das questões da prova); **prévia antes de aplicar** (admin confere e confirma); "alterada pela banca" só quando o texto diz; diferença em relação à extração da IA = "corrigida" |
| G2 | **Alta (custo)** | A 2ª extração do consenso não olha se o modelo é grátis. Sem provedores grátis (ou com eles fora do ar), ela cai no Claude — `avoid` joga o Haiku para o fim e o **Sonnet** extrai 16 mil tokens por parte: ~US$ 1 por prova, ligado por padrão | Consenso **só com modelo grátis** (`isFreeModel`); sem grátis disponível, pula e registra "consenso não verificado" |
| G3 | Média (aluno vê questão anulada) | Filtro incompleto: "Alimentar caderno com provas antigas" (`cadernos.js`) não exclui anuladas nem divergentes; exemplos do prompt e o DNA da banca não excluem divergentes | Um filtro único de "questão válida para aluno" usado em todas as consultas |
| G4 | Média | O lote **não roda em segundo plano** (o relatório diz que sim): baixa e processa tudo dentro da requisição, **sem limite** de itens → requisição de minutos/horas e timeout | Cada item vira uma tarefa na fila (`prova.importar`); limite de 50 links por envio; tela acompanha o progresso |
| G5 | Média | Questão com gabarito divergente fica escondida, mas **não há como o admin resolver** (só aplicando gabarito definitivo da prova inteira) | Lista de divergências no admin com os dois palpites e botão para escolher/confirmar |
| G6 | Baixa | Simulados já criados com uma questão depois anulada continuam com o gabarito antigo | Marcar "anulada" ao exibir o simulado/caderno e não contar no acerto |
| G7 | Baixa | O mock de produção tem gancho de teste (`MOCK_CONSENSUS_DIVERGE`) | Mover para o teste |

## Plano ajustado
1. **Sprint 4.1 (correções, antes de usar com provas reais):** G1, G2, G3, G4 — com testes do parser usando gabaritos reais
   (cargos, tipos de prova, CEBRASPE C/E, anulações, texto corrido) e do consenso sem provedor grátis.
2. **Sprint 4.2:** G5, G6, G7.
3. Depois: Sprint 5 (retenção: "Hoje" na tela inicial, simulado de prova real, "por que errei?") e Sprint 6 (medir qualidade e cache).

## Sprint 4.1/4.2 — concluídas (02/11/2026)
- **G1** parser de gabarito reescrito (`analisarGabarito`): letra solta só maiúscula e em linha com cara de gabarito; cabeçalho de
  cargo/tipo abre bloco; mesmo número em blocos diferentes = conflito (422 pedindo o bloco certo); letra validada pelo formato da
  questão; cobertura mínima de 60%; **prévia antes de gravar** (`confirmar`); "alterada pela banca" só quando o texto diz — diferença em
  relação à extração da IA vira "corrigida".
- **G2** 2ª extração do consenso só com modelo grátis (`somenteGratis`); sem grátis → consenso "não verificado" (null), nunca Claude.
- **G3** filtro único `questaoValida()` (`src/lib/questoes-validas.js`) em toda consulta que alimenta aluno ou prompt.
- **G4** lote valida na hora e enfileira `prova.importar` (máx. 50 links); download/treino em segundo plano.
- **G5** admin: `GET /api/admin/divergencias` + `POST /api/admin/questoes/:qid/gabarito` e botão "Divergências".
- **G6** `aplicarSituacaoOficial`: cópias em simulados/cadernos refletem anulação e gabarito definitivo; anulada não conta nem entra
  na revisão; selo no caderno.
- **G7** gancho de teste removido do mock.
- **G8 (novo)** fila com prioridade (migração 011): rotular provas antigas e importar em lote têm prioridade −10 e não atrasam as tarefas
  do aluno. Rotulagem só de provas com texto, sem duplicar tarefa pendente, e opcionalmente de uma prova só.
- **Bug do front** corrigido: envio do gabarito por arquivo usava `body` em vez de `form` (o arquivo nunca chegava).
- Testes: 92.

## Atividades para amanhã (03/11/2026)
1. **Josueh:** `git push -u origin main` (CI roda os testes no GitHub).
2. **Josueh:** trocar a chave do OpenRouter que foi colada no chat.
3. **Josueh/Amanda:** abrir o app no navegador e conferir as telas novas (admin: lote, gabarito definitivo com prévia, divergências;
   aluno: selo "Anulada" no caderno, botão "Reais" do edital, revisão espaçada).
4. **Admin:** clicar "Rotular provas antigas" (agora não atrasa os alunos).
5. Testar o gabarito definitivo com **gabaritos reais** (FGV/FCC com vários cargos e tipos de prova; CEBRASPE C/E) — usar a prévia.
6. Pendências pequenas: selo "Anulada" também na tela do simulado (hoje só no caderno); resumo da lista de cadernos ainda conta
   questão anulada no acerto (o detalhe já não conta).
7. Sprint 6 (medir): conferir `cache_read_tokens` no `ai_usage` depois de alguns simulados para ver se o cache do prompt pegou.

## v2.0 — Identidade visual, responsividade, Minha conta e Planos (03/11/2026)
- **Identidade:** marca nova (escudo com check = confiança/aprovação), logotipo "Help**Concurso**", paleta verde-petróleo
  (#0E7A65 → #14A383) + âmbar (#F2A62B) sobre papel quente, foco visível para teclado, botões com 44 px de altura mínima.
- **Responsivo:** desktop ≥1100 px com menu lateral fixo; tablet com menu sanduíche; celular <700 px com barra inferior de 5 atalhos,
  modais como folha que sobe da base, campos com fonte de 16 px (sem zoom no iOS). Conferido com capturas em 1366×900 e 390×844.
- **Minha conta (`#conta`):** dados pessoais (nome, telefone, concurso alvo, banca preferida, data da prova com contagem regressiva,
  meta diária), uso do plano no dia com barras, troca de senha conferindo a atual.
- **Planos (`#planos`):** Grátis (R$ 0) · Essencial (R$ 29,90/mês ou R$ 299/ano) · Aprovação (R$ 59,90/mês ou R$ 599/ano);
  limites reais aplicados nas cotas (`src/lib/planos.js`); pedido de upgrade → admin confirma o pagamento e aprova (botão
  "Pedidos de plano" na Base de provas) → aluno recebe e-mail. **Sem gateway de pagamento ainda.**

### Decisões pendentes do Josueh
1. **Preços e limites** (estão em `src/lib/planos.js`): pior caso do Essencial ≈ 5 simulados Médio + 3 Difícil por dia ≈ US$ 0,65/dia
   ≈ US$ 20/mês, acima do preço — só um aluno que usa tudo todo dia; o uso típico deve ficar bem abaixo. Rever com os dados reais
   do `ai_usage` (Sprint 6) antes de abrir para o público.
2. **Gateway de pagamento** (Pix + cartão, renovação automática): Mercado Pago, Asaas ou Stripe — escolher para integrar.
3. Na fase de testes, `QUOTA_GERACOES_DIA` no `.env` sobrepõe o limite do Grátis (hoje 30/dia). Remover no lançamento (o padrão é 3).
4. Contas de teste (Amanda) estão no Grátis: para testar tudo, aprovar um pedido dela ou mudar o plano direto no banco.

## Sprint 5 (parte 1) — pendências + tela "Hoje" (03/11/2026)
- **Pendências:** selo "Anulada pela banca — não conta" / "Gabarito atualizado" também no simulado; placar do simulado, lista
  de simulados, taxa de acerto do Início e caderno de erros ignoram questão anulada; a **lista** de simulados e de cadernos agora
  aplica a situação oficial (antes só o detalhe), numa consulta só (`carregarSituacaoOficial`); resumo do caderno não conta anulada
  em acerto nem em "revisar hoje".
- **Tela "Hoje"** (Início): meta diária (anel de progresso), sequência de dias 🔥 com recorde, últimos 7 dias (✓ estudou, ★ meta
  batida), contagem até a prova e "Para fazer hoje" (revisões pendentes por caderno → abre o caderno no filtro "Revisar hoje";
  tópicos do edital com acerto < 70% e tópicos de alta incidência ainda não estudados → treino com questões reais quando houver).
  Base: tabela `atividade_diaria` (migração 014, dia de Brasília), alimentada ao responder no simulado e no caderno
  (`src/services/atividade.js`, `GET /api/me/hoje`). A sequência começa a contar a partir de agora (não há histórico com data).
- **Amanda** (conta real) no plano Aprovação até 01/02/2027.

## Sprint 5 (parte 2) — Simulado no Formato da Prova Real (F3) — 05/11/2026
- **Migração 015 (`015_simulado_prova_real.sql`):**
  - Colunas adicionadas em `question_sets`: `modo_prova` (boolean), `tempo_limite_minutos` (int), `tempo_gasto_segundos` (int), `duvidas` (jsonb), `estatisticas` (jsonb).
- **Backend (`src/services/edital.js` e `src/routes/editais.js`):**
  - Endpoint `POST /api/editais/:id/simulado-prova-real`: monta o simulado ponderado pelas disciplinas do edital verticalizado (`d.peso`).
  - Prioriza questões reais da banca de provas anteriores a **custo US$ 0 de IA** (`origem = 'prova_real'`, `model = 'prova_real'`).
  - Formato coerente com a banca: CEBRASPE = Certo/Errado (`ce`), FGV/FCC/VUNESP = Múltipla Escolha (`me`).
  - Proteção estrita contra IDOR no caderno associado.
- **Resolução de Prova & Pontuação (`src/routes/sets.js`):**
  - Em `PATCH /api/sets/:id`, suporte a `tempoGastoSegundos`, marcação de dúvidas (`duvidas`), e chave expandida até 3 dígitos para simulados com até 120 itens.
  - Regra oficial CEBRASPE: cálculo de **Nota Líquida** = `acertos - erros` (questões em branco pontuam 0 e não descontam).
  - Regra Múltipla Escolha: Nota Bruta (%) e proporção de acertos.
  - Relatório estatístico consolidado por disciplina em `estatisticas.resultadoFinal.disciplinas`.
  - Integração com repetição espaçada (erros entram na Fase 1) e `atividade_diaria`.
- **Front-End (`public/app.js` e `public/styles.css`):**
  - Botão "Simulado Prova Real" com modal de configuração (escolha de 20 a 120 questões, tempo de 1h a 4h ou livre, e prévia das matérias).
  - Barra superior destacada com cronômetro regressivo digital em tempo real (alertas visuais em 15m e 5m, auto-submissão se zerar).
  - Mapa de Questões / Cartão-Resposta interativo com status (respondida, dúvida 🚩, em branco).
  - Na resolução, as questões não revelam gabarito nem explicação imediatamente; aluno pode desmarcar itens em C/E para deixar em branco.
  - Card final pós-prova com nota líquida/bruta oficial, tempo gasto e barras de desempenho por matéria do edital.
- **Testes automatizados:** 113 testes passando com 100% de sucesso (`npm test`).

## Sprint 5 (parte 3) — "Por que errei?" sob Demanda (F4) — 05/11/2026
- **Migração 016 (`016_por_que_errei.sql`):**
  - Tabela `questao_explicacoes` com cache global multi-aluno por `questao_hash` determinístico + `resposta_aluno`.
  - Campos pedagógicos: `diagnostico`, `pegadinha`, `exemplo_cotidiano`, `fundamentacao` (artigo de lei/jurisprudência/súmula), `dica_ouro` e `visual_svg`.
- **Serviço (`src/services/explicacao.js`):**
  - Prompt calibrado com pedagogia assertiva, humor leve, analogias da vida real e sanitização estrita de SVG (bloqueio de scripts e eventos).
  - Cache global: se outro aluno errou a mesma alternativa da mesma questão, o custo de IA é **US$ 0**.
- **Front-end (`public/app.js` e `public/styles.css`):**
  - Botão "Por que errei esta questão?" nas alternativas erradas em simulados e cadernos.
  - Card pedagógico com 6 blocos estruturados e visual SVG limpo.

## Sprint 5 (parte 4) — Radar de Desempenho, Probabilidade da Banca (F6) & Cockpit Visual — 05/11/2026
- **Backend (`src/services/edital.js`, `src/services/desempenho.js`, `src/routes/me.js`):**
  - Endpoint `GET /api/me/desempenho` (com suporte opcional a `?editalId=...`):
    - Métricas de tempo líquido dedicado (horas e minutos) em `question_sets`, média de velocidade por questão (segundos/questão) e ritmo horário (questões/hora).
    - Histórico diário de evolução dos últimos 14 a 30 dias de `atividade_diaria` (volume de questões, acertos, erros e taxa diária %).
    - Cruzamento com `buildEditalDashboard`: cálculo de probabilidade na banca por tópico (`probBancaPct`), relevância histórica (`muito_alta`, `alta`, `media`, `baixa`) e priorização de estudo (`critica`, `reforco`, `segura`, `secundaria`).
    - Matriz 2D de Relevância × Desempenho (Quadrantes de Pareto: Zona de Perigo, Fortaleza, Reforço e Zona Secundária).
    - Índice de Prontidão da Prova (0 a 100%) ponderado por frequência da banca e peso da matéria.
- **Front-End (`public/app.js` e `public/styles.css`):**
  - Tela completa **Desempenho & Radar** (`#desempenho`) no menu lateral desktop e gaveta mobile.
  - Botão de atalho rápido direto no card do Radar em **Meu Edital**.
  - **4 KPIs Cockpit** com medidores gráficos:
    - Velocímetro / Gauge SVG de Prontidão da Prova com arco gradiente.
    - Card de Horas Estudadas e Ritmo Ideal de Prova (alerta de velocidade ideal ≤ 2m30s).
    - Balanço Acertos × Erros com Donut SVG Duplo.
    - Card de Simulados e Modo Prova com dias seguidos de estudo 🔥.
  - **Gráfico Interativo de Evolução Diária (14 dias):** barras empilhadas de acertos (verde) e erros (vermelho) + linha suave de taxa de acerto + linha de corte de aprovação (80% em dourado).
  - **Gráfico Comparativo de Disciplinas vs Linha de Corte (80%):** barras horizontais personalizadas com badges de acertos, erros e incidência na banca.
  - **Matriz de Pareto da Banca (4 Quadrantes Visuais):** tópicos críticos com botões rápidos de ação (`Resolver Reais (US$ 0)` e `Gerar IA`).
- **Testes automatizados:** 124 testes passando com 100% de sucesso (`npm test`).

## Sprint 5 (parte 5) — Bateria de Revanche da IA ("Destruir Ponto Cego") — 05/11/2026
- **Conceito pedagógico:**
  - Repetir a mesma questão exata decora gabarito mas não ensina. A Bateria de Revanche diagnostica o erro, identifica o ponto cego ou pegadinha da banca e gera de 3 a 5 questões inéditas explorando o mesmo conceito e fundamentação jurídica sob diferentes ângulos práticos e progressão pedagógica (Fixação Conceitual, Aplicação Prática, Desafio Estilo da Banca).
  - Vencendo a revanche com taxa ≥ 65%, o aluno destrói o ponto cego, recebe o selo `🏆 Ponto Cego Vencido!` e o ciclo de repetição espaçada no caderno avança automaticamente para a próxima fase.
- **Banco de Dados (`migrations/017_revanche.sql`):**
  - Atualização do check constraint em `question_sets`: `CHECK (origem IN ('ia', 'prova_real', 'revanche'))`.
- **Backend Prompts & Rotas (`src/lib/prompts.js`, `src/routes/sets.js`):**
  - `promptRevanche(p)`: prompt calibrado com diagnóstico do ponto cego, ineditismo obrigatório, proibição de repetição da questão-base e estilo rigoroso da banca.
  - Endpoint `POST /api/sets/revanche`: streaming NDJSON, validação de titularidade do caderno/simulado, controle de cota com estorno automático em falhas, e armazenamento das questões com `origem = 'revanche'`.
  - Finalização em `PATCH /api/sets/:id`: se for revanche e o aluno obtiver ≥ 65% de acertos, marca `revancheSuperada = true` no set e atualiza todas as questões do caderno associadas ao simulado de origem em `cadernos.revisao_espacada` (`revancheVencida = true` e avanço de fase).
- **Front-End (`public/app.js`):**
  - Modal dinâmico de configuração e geração da Revanche com feedback em tempo real.
  - Banners de Revanche no resultado de Simulados Regulares e Modo Prova Real.
  - Botão de Revanche por questão errada no simulado e no rodapé do card de explicação ("Por que errei?").
  - Botão geral de Revanche de erros no Caderno de Questões e botão individual por questão do caderno.
- **Testes automatizados:** 126 testes passando com 100% de sucesso (`npm test`).


---

# Revisão do Sprint 5 (partes 2–5) e plano ajustado — 05/11/2026

Escopo: F3 (Simulado Prova Real), F4 ("Por que errei?"), Radar/Cockpit, Revanche + varredura geral de segurança.
`npm test`: 126/126 passando — mas o teste da Revanche **copia a lógica da rota** em vez de chamá-la, e por isso não pegou o R1.

## O que está bom
- Dono conferido em toda consulta (`AND user_id=$2`), inclusive caderno do Simulado Prova Real (`criarSimuladoProvaReal`).
- Texto das questões entra no prompt por `untrusted()`; respostas da IA validadas por schema (`explainMistakeSchema`).
- Front escapa tudo com `esc()` — exceto o SVG da explicação (R5). CSP sem `unsafe-inline` em script.
- Migrações novas (015–017) sem editar as aplicadas; `push` já feito (`main` = `origin/main`).

## Problemas encontrados

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| R1 | **Alta (função quebrada)** | Revanche nunca é "superada": o `PATCH /api/sets/:id` não seleciona `origem` (`sets.js:436`), então `antes.origem === 'revanche'` é sempre falso | Incluir `origem` no SELECT; teste chamando a rota |
| R2 | **Alta (dado corrompido)** | Ao vencer a revanche, só `fase` muda (sem `proximaRevisao`, `intervaloDias`, `acertosSeguidos`); pode chegar a fase 5 sem `dominada`. Cada novo `finalizado:true` avança de novo | Usar `calcularRevisao({ acerto: true })`; aplicar só na 1ª finalização |
| R3 | **Alta (custo)** | "Por que errei?": `resposta` livre no corpo (`sets.js:593` sem validação) → cada valor fura o cache e chama a IA; não conta cota; 40/min. Entra no prompt **fora** do `untrusted()`. Um aluno pode esgotar o teto diário e travar a IA de todos | Resposta ∈ formato (C/E ou A–E) e igual à gravada; limite diário de explicações **novas** por plano (cache não conta) |
| R4 | **Alta (custo/injeção)** | Revanche aceita `questoes` no corpo sem tamanho máximo e sem `scanText`; `materia`/`assunto`/`banca` sem varredura (a geração normal varre) | Remover o modo "questões do corpo" (usar só `setId`/`cadernoId` do servidor) ou limitar + varrer |
| R5 | Média (XSS/phishing) | SVG da explicação vai cru para `innerHTML` (`app.js:1122`); o sanitizador por regex fura (`onload=x` sem aspas, `&#106;avascript:`, `<foreignObject>`, links externos). A explicação é cache **global** e a prova vem de upload de qualquer aluno | Renderizar como `<img src="data:image/svg+xml;base64,…">` + sanitizador por lista de permitidos |
| R6 | Média (qualidade) | Revanche: se o revisor reprova todas, entrega todas assim mesmo (`sets.js:366`) | Sem aprovadas → erro + estorno (como na geração) |
| R7 | Média (vazamento) | `POST /cadernos/:id/questoes/por-que-errei` com `extra:<id>` busca qualquer `prova_questoes` sem `questaoValida()` nem `status='READY'` (anuladas, divergentes, provas pendentes/recusadas). Id não-UUID → 500 | Só questões do próprio caderno (ou com filtro válido); validar UUID |
| R8 | Média | Chave do cache da explicação não inclui o gabarito: após gabarito definitivo, serve explicação do gabarito antigo; `aplicarSituacaoOficial` não é aplicada antes de explicar | Incluir gabarito na chave; aplicar situação oficial; anulada → não explica |
| R9 | Média | Nota do simulado (`PATCH finalizado`) conta questão anulada (o resto do app já ignora) | Aplicar situação oficial antes de pontuar |
| R10 | Média (produto) | Simulado Prova Real: seleção determinística → **todo simulado do mesmo edital traz as mesmas questões**; filtro pela 1ª palavra (`%Direito%`, `%Noções%`) mistura disciplinas; edital sem banca grava `banca='cebraspe'` com formato `me` | Priorizar questões ainda não feitas pelo aluno; casar matéria pela taxonomia; banca nula quando não houver |
| R11 | Baixa (IDOR) | Revanche grava `cadernoId`/`editalId` do corpo sem conferir o dono (mesma classe do C1); UUID inexistente → 500 | Conferir dono, como em `criarSimuladoProvaReal` |
| R12 | Média (sessão) | Trocar/redefinir senha não derruba outras sessões (JWT 7 dias sem versão) | `users.sessao_versao` no token (migração 018) |
| R13 | Baixa | `GET /api/me/desempenho?editalId=xyz` → 500; sem `editalId` usa o mais recente, não o ativo | Validar UUID; usar `active=true` |
| R14 | Baixa (desempenho) | `obterDesempenhoCompleto` carrega **todos** os simulados com o JSON inteiro | Agregar em SQL ou limitar ao período |
| R15 | Baixa | `cadernos/interagir` regrava `revisao_espacada` inteiro; `PATCH /sets` faz merge → corrida perde atualização | Merge atômico (`||`) também no caderno |
| R16 | Baixa (higiene) | Pastas vazias `package.json;A` e `package-lock.json;A` na raiz; CLAUDE.md sem F3–F6/Revanche e com "push" ainda pendente | Apagar; atualizar CLAUDE.md |

## Arquitetura e processo
- `sets.js` (613 linhas) mistura geração, revanche, pontuação e explicação; `cadernos.js` 760; `app.js` 3.858. Extrair
  `services/revanche.js` e `services/pontuacao.js` (funções puras, testáveis) — sem reescrever o resto.
- **Regra de teste:** teste de funcionalidade chama a **rota HTTP** (como `v1.test.js`), nunca uma cópia da lógica.
- Pendências antigas ainda abertas: S5 (termos/LGPD), D4/D9 (qualidade por modelo), O3 (trocar chave OpenRouter),
  `provas.edital_id` × tabela de ligação, remover `QUOTA_GERACOES_DIA` no lançamento.

## Plano ajustado
1. **Sprint 5.1 (correções, antes da Amanda usar Revanche e "Por que errei?"):** R1–R11 com testes pela rota.
2. **Sprint 5.2 (segurança e dívida):** R12 (migração 018), R13–R16, extrair revanche/pontuação.
3. **Sprint 6 (medir — já planejado, agora com uso real):** custo por funcionalidade no `ai_usage` (explicação, revanche,
   geração), % descartada pelo revisor e 👍/👎 por modelo/prompt, acerto do cache → base para **decidir preços e limites**.
4. **Antes de abrir para mais alunos:** S5 (termos/privacidade), gateway de pagamento (decisão do Josueh), O3.
5. **Depois:** Fase 2 (`perfil_banca` consolidado), D6, tabela de ligação prova↔edital.

## Sprint 5.1 — concluída (05/11/2026)
- **R1** `PATCH /api/sets/:id` lê `origem`: a revanche vencida (≥ 65%) agora é marcada.
- **R2** vitória da revanche avança a questão-base pelo algoritmo normal (`calcularRevisao`: fase, intervalo, próxima revisão e
  acertos seguidos coerentes), só as questões-base (`revancheDe.keys`) e só na 1ª finalização (`aplicarVitoriaRevanche`).
- **R3** "Por que errei?": resposta validada pelo formato (C/E ou A..E) e a gravada prevalece; limite por minuto (10) e
  **limite diário de explicações novas por plano** (`explicacoesDia`: Grátis 5, Essencial 30, Aprovação 60; cache não conta;
  migração 018 grava `criado_por`).
- **R4** revanche só usa questões do servidor (`setId` ou `cadernoId` + `keys`); o corpo não manda mais enunciado/gabarito;
  matéria/assunto passam pela varredura; textos cortados.
- **R5** SVG da explicação mostrado como `<img>` (data URI) e descartado inteiro se tiver qualquer resto perigoso.
- **R6** revanche reprovada pelo revisor não chega ao aluno (erro + estorno). **Achado:** o revisor da revanche nunca rodava
  (`promptReview` quebrava sem material e o serviço tratava como "indisponível"); agora revisa com o material, se houver, ou por
  lei/doutrina.
- **R7** "Por que errei?" do caderno só alcança questões do próprio caderno; chave malformada → 404 (antes 500).
- **R8** cache da explicação considera o gabarito; questão anulada não é explicada.
- **R9** nota do simulado ignora questão anulada (`services/pontuacao.js`).
- **R11** revanche confere o dono do caderno e do edital.
- Testes: 133 (novo `test/sprint5_1.test.js` chama as rotas HTTP; o teste antigo da revanche, que copiava a lógica, foi trocado).
- Fica para depois: R10 (variedade e matérias do Simulado Prova Real), R12–R16.

# Reestruturação da arquitetura (decisão do Josueh, 05/11/2026)
Escopo escolhido: **API + worker + camadas** (o front atual continua, servido à parte). Sem microsserviços.

| Etapa | O que muda | Por quê |
|---|---|---|
| A1 ✅ | `src/worker.js` separado: a fila de IA sai do processo da API (`ROLE=api|worker|all`; `all` mantém o modo atual no dev) | Escalar API e processamento de IA independentemente |
| A2 ✅ | Limites de requisição num armazenamento compartilhado (Postgres) em vez da memória | Com 2+ instâncias da API, os limites continuam valendo |
| A3 ✅ | `/api/v1` com contrato OpenAPI (`docs/openapi.yaml`) e `/api/*` como apelido durante a transição | Front e futuros clientes (app móvel) consomem um contrato estável |
| A4 ◐ | Camadas: `routes` (HTTP) → `controllers` → `services` (regra) → `repositories` (SQL). Começando por sets, cadernos e editais | Rotas finas e regra de negócio testável sem HTTP |
| A5 ✅ | Front servido à parte (Nginx no compose; CORS/cookies por `APP_URL`/`API_URL`) | Publicar o front num CDN e a API em outro lugar |
| A6 ✅ | Docs (CLAUDE.md, DEPLOY.md, ARQUITETURA) e CI com os dois processos | A próxima sessão entende o desenho |

### A1 — concluída (05/11/2026)
`src/app.js` (Express), `src/server.js` (API), `src/worker.js` (fila, saúde em :3001), `src/bootstrap.js` (migração, semente,
S3, SMTP), `src/jobs/tarefas.js` (registro das tarefas). Fila segura para vários workers: o processo não devolve mais à fila
**todas** as tarefas "running" ao subir (roubaria tarefas de outro worker); usa batimento (30 s) e só recupera órfãs (2 min).
NOTIFY acorda os workers na hora. Compose com `app` + `worker`; Render com web + worker. Teste: `test/arquitetura.test.js`.
Validado no Docker local. 137 testes.

### A2 — concluída (05/11/2026)
Os 11 limitadores de requisição ficam em `src/middleware/limites.js` (antes espalhados pelas rotas) e contam no Postgres
(`PostgresStore`, tabela UNLOGGED `limites_requisicao`, migração 019; upsert atômico com janela fixa; faxina ocasional).
Várias instâncias da API somam a mesma contagem. Banco fora → a requisição segue (`passOnStoreError`). `RATE_LIMIT_PREFIXO`
separa ambientes no mesmo banco (os testes usam um por arquivo). Testes em `test/arquitetura.test.js`. 139 testes.

### A3 — concluída (05/11/2026)
API versionada: `src/routes/index.js` monta todos os módulos em `/api/v1` (atual) e em `/api` (apelido da transição, com
`Deprecation: true` e `Link` para a v1). Rotas soltas do `app.js` foram para `routes/sistema.js` (saúde, contrato) e
`routes/users.js` (avatar público). Contrato OpenAPI 3.1 em `src/openapi.js` (74 operações, 66 caminhos), servido em
`/api/v1/openapi.json` e exportado com `npm run openapi` para `docs/openapi.json`. `test/contrato.test.js` falha se uma rota
existir sem estar no contrato (ou o contrato citar rota inexistente). Front usa `/api/v1`. 142 testes.
Próximo passo natural do contrato: esquemas de resposta das rotas principais (hoje só os corpos de requisição principais).

### A4 — parcial (05/11/2026)
Simulados e cadernos em camadas: `routes/` (só HTTP + zod) → `services/simulados.js`, `services/cadernos.js` (regra, sem req/res)
→ `repositories/` (só SQL, sempre filtrando pelo dono). Rotas: sets 422 → ~125 linhas; cadernos 738 → 73. No caminho, **R15**
resolvido (interagir no caderno faz mescla atômica por chave; teste com 15 requisições paralelas falha no código antigo).
**Falta:** tirar o SQL de `services/edital.js`, `services/provas.js` e `services/desempenho.js` para repositórios — fazer
aos poucos, sempre que um desses arquivos for mexido. Regra para código novo: SQL só em `repositories/`.

### A5 — concluída (05/11/2026)
Front separado da API. No compose: serviço **`web`** (Nginx, porta 3000) entrega `public/`, gera `/config.js` a partir de
`API_URL` e repassa `/api` para a API (fluxo NDJSON sem buffer, 600 s, 30 MB); **`app`** roda com `SERVIR_FRONT=false`
(só `/api`; acesso direto em 127.0.0.1:3100). Config nova: `SERVIR_FRONT` (padrão true = tudo-em-um, usado no `npm start`,
nos testes e no Render), `CORS_ORIGINS` (front em outro domínio, com cookie; CSRF aceita só essas origens) e `TRUST_PROXY`
(proxies na frente: 1 com Nginx; 2 com túnel Cloudflare → Nginx). Front lê a API de `window.HC_CONFIG.apiUrl` (`public/config.js`).
CSP do front fica no Nginx (`deploy/nginx/default.conf.template`). Testado no Docker: IP real do cliente chega à API.
**Render:** continua tudo-em-um (a API serve o front). Para separar lá: site estático + API em subdomínio (`CORS_ORIGINS`,
`API_URL` absoluto), a validar no painel do Render. Teste: `test/front-separado.test.js`. 146 testes.
**Atenção ao túnel nomeado (perfil "publico"):** no painel da Cloudflare, o destino passa a ser `http://web:80` (antes `app:3000`)
e use `TRUST_PROXY=2`.

### A6 — concluída (05/11/2026)
`docs/ARQUITETURA.md` (processos, camadas, fluxo de uma requisição, fila, variáveis de topologia e regras para código novo).
CI (`.github/workflows/ci.yml`) com dois jobs: **test** (sintaxe de todo JS, `docs/openapi.json` em dia, `npm test`) e
**infra** (`docker compose config`, template do Nginx + `nginx -t`, build da imagem). Passos validados localmente.

## Próximos passos após a reestruturação
1. **Resto do A4** aos poucos: SQL de `services/edital.js`, `provas.js` e `desempenho.js` para `repositories/` quando forem mexidos.
2. **Pendentes da revisão:** R10 (variedade e matérias do Simulado Prova Real), R12 (derrubar sessões ao trocar senha — migração),
   R13, R14, R16 (atualizado: pastas vazias já removidas).
3. **Contrato:** esquemas de resposta das rotas principais no `src/openapi.js`.
4. **Sprint 6 (medir)** e os itens "antes de abrir para mais alunos" (S5 termos/LGPD, gateway, O3).
5. **Processo:** uma sessão de IA por vez no repositório (nesta sessão outra sessão fez commits e push em paralelo).

---

## Sprint 5.2 — Pendências da Revisão, Repositórios e LGPD Concluídos (05/11/2026)
- **R10 (Simulado Prova Real com variedade e sem misturar disciplinas):**
  - Rastreamento de ineditismo: consulta questões já resolvidas pelo aluno e aplica bônus de prioridade (+40) para questões ainda não vistas.
  - Desempate estocástico: evita repetição determinística da mesma fatia em simulados subsequentes.
  - Taxonomia e casamento de matérias: remoção do filtro genérico `%${d.materia.split(' ')[0]}%` que misturava Direito Penal/Administrativo/Constitucional; consulta agora casa por `materia_id` da taxonomia e nome completo.
  - Edital sem banca não força mais `banca = 'cebraspe'`, gravando `banca = null`.
- **R12 (Invalidar sessões ao trocar/redefinir senha — Migração 020):**
  - Coluna `sessao_versao` adicionada em `users` (`migrations/020_sessao_versao.sql`) e `banca` flexibilizada para aceitar null em `question_sets`.
  - Token JWT inclui `sv` no payload; `loadUser` confere a versão da sessão no banco.
  - Alterar senha (`PATCH /me/conta/senha`) e redefinir senha (`POST /auth/reset`) incrementam `sessao_versao`, derrubando imediatamente todas as outras sessões abertas.
- **R13 & R14 (Estabilidade, Edital Ativo e Consulta Leve de Desempenho):**
  - Validação rigorosa de UUID em `editalId` em `src/services/desempenho.js`, prevenindo erro 500 em IDs inválidos (agora retorna 400).
  - Sem `editalId`, seleciona prioritariamente o edital com `active=true` (`editaisRepo.buscarAtivoOuRecente`).
  - Consulta de simulados otimizada no repositório `src/repositories/desempenho.js`: não carrega o JSON completo de enunciados e comentários, extraindo apenas gabaritos e contagem no período recente (90 dias).
- **Resto do A4 (Camada de Repositórios):**
  - Criado `src/repositories/desempenho.js` e ampliado `src/repositories/editais.js`, removendo chamadas diretas de banco de `desempenho.js`.
- **S5 / LGPD (Termos de Uso e Privacidade):**
  - Criado `src/lib/termos.js` e rota pública `GET /api/v1/termos`.
  - Transparência explícita sobre subprocessadores de IA (Anthropic, Google Gemini, OpenAI, Groq) com garantia contratual de retenção zero e não-treinamento de modelos públicos com material do aluno.
  - Direitos do titular sob o art. 18 da LGPD.
  - Modal interativo e links informativos no login/cadastro e rodapé da navegação (`public/app.js`).
  - Contrato OpenAPI 3.1 sincronizado em `src/openapi.js` e `docs/openapi.json`.
- **Suíte de Testes Automatizados:** 149/149 testes passando com 100% de sucesso (`npm test`).

# Revisão do commit 591d977 (R10, R12, R13, R14, A4, LGPD) — 05/11/2026

**Achado crítico fora do commit (corrigido em seguida):** `POST /auth/verify` abria sessão de conta já confirmada sem conferir o
código (desde a v1.1) — bastava saber o e-mail. Agora 409. Teste de regressão adicionado.

## O que está bom
- R12: versão de sessão no JWT (`sv`) conferida em `loadUser`; troca e redefinição de senha incrementam e renovam o cookie atual.
- R13: `editalId` validado (400) e edital ativo priorizado. R14: consulta via repositório sem trafegar enunciados.
- `GET /termos` público entrou no contrato OpenAPI; front escapa o conteúdo do modal; `materiaId` só lê a taxonomia.

## Problemas encontrados
| # | Gravidade | Problema | Correção |
|---|---|---|---|
| L1 | **Alta (jurídico)** | Termos/LGPD com afirmações falsas ou não comprovadas: modelos errados (diz "Claude 3.5", "Gemini 1.5", "GPT-4o mini/OpenAI"; o sistema usa Claude Haiku/Sonnet 5.5, Gemini 3.5 Flash, Groq gpt-oss, OpenRouter); "retenção zero" com a Anthropic sem contrato ZDR; Gemini descrito como "Google Cloud Enterprise / ISO 27018", mas é a cota grátis do AI Studio, que pode usar os dados (ver S1); "classificação de matérias" atribuída ao Groq, mas é dado do aluno e só vai ao Claude; OpenRouter e Brevo (e-mail), armazenamento S3/R2 e hospedagem ausentes | Gerar a lista de operadores a partir de `AI_TASKS`/provedores configurados (não à mão); afirmar só o que os termos de cada fornecedor garantem; revisão por advogado antes de abrir para o público |
| L2 | **Alta (jurídico)** | Promete direitos sem funcionalidade: exclusão completa da conta e portabilidade não existem na API | Implementar `DELETE /me/conta` (com materiais/arquivos S3) e `GET /me/exportar`, ou dizer "por e-mail ao encarregado em até 15 dias" |
| L3 | Média (jurídico) | Faltam: base legal (art. 7º), encarregado/DPO (art. 41), transferência internacional (art. 33 — IAs nos EUA), prazo de retenção, e que **provas enviadas vão para a base compartilhada** de todos os alunos; texto diz "processados exclusivamente para a sua preparação" | Incluir essas seções |
| L4 | Média | "Entendi e concordo" só fecha o modal: o aceite não é registrado (versão, data); "criptografia de ponta a ponta" e "sessões criptografadas" são termos incorretos (HTTPS é em trânsito; o JWT é assinado) | Gravar `termos_versao_aceita`/`termos_aceitos_em` no cadastro; corrigir os termos técnicos |
| L5 | Baixa (padrão) | Texto dos termos duplicado no `app.js` como reserva (duas fontes da verdade, já divergentes) | Sem reserva: em erro, mostrar "não foi possível carregar" |
| P1 | Média (bug) | Migração 020 deixou `question_sets.banca` nulo, mas o front assume banca: "Copiar questões" quebra (`setText`, `app.js:1225`) | Tratar banca nula no front (`BANCA()[s.banca] || …`) |
| P2 | Média | R10: a busca ainda faz `ORDER BY q.id LIMIT 300` antes de priorizar inéditas — com base grande, as questões além das 300 primeiras nunca aparecem | Ordenar no SQL por "não feita primeiro" + `random()` (passar os ids já feitos) |
| P3 | Média (padrão) | Testes copiam lógica: o de R12 repete o `UPDATE` da rota em vez de chamar `/me/conta/senha` e `/auth/reset`; o de R10 promete "prioriza não feitas" e só confere a banca nula; mistura de disciplinas não testada | Testar pela rota HTTP (regra 8 de `docs/ARQUITETURA.md`) |
| P4 | Baixa (padrão) | SQL novo dentro de `services/edital.js` (consulta de questões já usadas) — regra 2: SQL novo só em `repositories/` | Mover para `repositories/simulados.js` |
| P5 | Baixa | R14 limita os totais a 90 dias (horas, simulados concluídos) sem a tela dizer isso; migração 020 mistura dois assuntos (sessão e banca) | Rótulo "últimos 90 dias" na tela; uma migração por assunto daqui em diante |

## Ajustes da revisão de 591d977 — concluídos (05/11/2026)
- **L1/L3/L5** `src/lib/termos.js` reescrito: operadores de IA **gerados da configuração** (`AI_TASKS`, chaves, cascata grátis,
  `AI_PROVEDORES_PRIVADOS`) com o que cada um recebe de fato (material do aluno só no Claude; Groq/Gemini/OpenRouter só documentos
  públicos, com o aviso da cota grátis); e-mail (Brevo), armazenamento, hospedagem (`LGPD_HOSPEDAGEM`) e túnel conforme a config;
  seções de base legal, compartilhamento (base de provas e cache do "Por que errei?"), IA, transferência internacional, retenção,
  direitos e como exercê-los, segurança e cookies; encarregado/contato por `LGPD_*`. Versão = data + resumo dos operadores
  (mudou fornecedor → novo aceite). Front sem cópia do texto: renderiza o que a API devolve.
- **L2** `GET /me/exportar` (JSON com todos os dados, sem hash de senha; 5/hora) e `DELETE /me/conta` (senha + "EXCLUIR"; cascata
  no banco, arquivos do S3 apagados, provas ficam na base sem autoria; admin não se exclui). Botões em "Minha conta".
- **L4** migração 021 (`termos_versao`, `termos_aceitos_em`); cadastro exige `aceitouTermos` (checkbox); `POST /me/termos/aceite`;
  ao entrar, versão nova dos termos abre o modal pedindo aceite. Termos técnicos corrigidos (sem "ponta a ponta"/"criptografadas").
- **P1** front trata simulado sem banca (copiar questões, aviso de geração). **P2** inéditas primeiro e sorteio no SQL, antes do corte
  de 300; ILIKE escapado. **P3** testes pela rota em `test/lgpd-e-pendencias.test.js` (troca e redefinição de senha derrubando
  sessões, R10 sem misturar disciplinas e com inéditas, termos, aceite, exportação, exclusão); teste de R12 que copiava a lógica
  removido. **P4** consulta de questões já usadas em `repositories/simulados.js`. **P5** aviso "últimos 90 dias" no desempenho.
- **Bugs achados no caminho:** o modal dos termos nunca aparecia na tela de login/cadastro (só renderizava dentro do app); abrir o
  modal apagava o que o aluno digitara no cadastro; botões de modal perdiam o clique após redesenho. Corrigidos.
- Testes: 156.

**Pendente de decisão do Josueh (não dá para resolver no código):** nome do encarregado (DPO) e e-mail de privacidade
(`LGPD_ENCARREGADO`, `LGPD_CONTATO` — hoje cai no e-mail do `SMTP_FROM`), hospedagem de produção (`LGPD_HOSPEDAGEM`) e
**revisão do texto por advogado** antes de abrir para o público.

---

# Revisão do plano — 09/11/2026

## Estado verificado hoje
- Ambiente local completo no Docker (web/Nginx, app/API, worker, db, minio, mailpit) saudável; migrações até a 023.
- 158 testes; CI do GitHub verde nos últimos commits (incluindo o job de infra).
- **Teste de navegador** (novo, `npm run e2e`): 14/14 — login com aceite dos termos, simulado sem banca, exportar e excluir conta,
  cadastro com termos/aceite, sem erros de JavaScript. Primeira vez que as telas novas foram exercitadas num navegador.

## Achados e correções de hoje
| # | Gravidade | Achado | Situação |
|---|---|---|---|
| H1 | **Alta (disponibilidade)** | Nginx resolvia o IP da API só ao subir: com a API reiniciando com outro IP, as requisições iam para o container errado (no teste, o worker) → app em 502 até reiniciar o Nginx | ✅ `resolver` + variável no `proxy_pass` (`NGINX_RESOLVER`); testado forçando a troca de IP |
| H2 | **Alta (custo)** | `costUsd` descontava a leitura de cache da entrada (a API já desconta) e **não registrava a escrita no cache**: o prompt de sistema marcado para cache ficava fora do custo e do teto diário | ✅ migração 023 (`cache_write_tokens`), custo = entrada + leitura 0,1× + escrita 1,25× + saída |
| H3 | Média (privacidade) | Termos usavam o e-mail do admin como contato de privacidade quando faltava `LGPD_CONTATO` | ✅ só `LGPD_CONTATO` ou o remetente do `SMTP_FROM` (hoje é o Gmail do Josueh — **definir `LGPD_CONTATO`**) |
| H4 | Informativo | `generate`/`review` no Gemini/Groq em 02/11 | Sem violação: todas sem aluno (scripts de benchmark); a regra "material só no Claude" tem teste (`test/ai.test.js:52`) |
| H5 | Informativo | Cache de prompt em 0% em todas as tarefas | Esperado com o volume atual (poucas gerações/dia, cache de 5 min); agora a escrita aparece no custo — reavaliar com uso real |
| H6 | Baixa | Teste A2 (limite entre duas APIs) falhou 1 vez em 3 rodadas da suíte completa | Instável sob carga; não reproduzido isolado — observar |

## Sprint 6 (parte 1) — concluída hoje
Cada simulado guarda versão do prompt (migração 022) e modelo do revisor; painel admin `/admin/ia?dias=` com **custo por
funcionalidade e custo médio por uso** e **qualidade por gerador × prompt × revisor** (descarte do revisor, 👍/👎, erros
confirmados), % de cache. Primeiros números reais (30 dias, R$ 2,99 no total): prova ≈ R$ 0,066 · edital ≈ R$ 0,012 ·
reporte ≈ R$ 0,004. Simulado ainda **sem amostra** (só 2 gerações reais; os demais foram com IA simulada).

## Prioridades daqui em diante
| Ordem | Item | Quem | Por quê |
|---|---|---|---|
| 1 | Push dos commits locais | Josueh | GitHub está atrás; CI valida |
| 2 | **Uso real por 1–2 semanas** (Amanda + Josueh, com IA real) | Josueh/Amanda | Sem volume, o painel da Sprint 6 não decide preço nem modelo |
| 3 | Definir `LGPD_CONTATO`, `LGPD_ENCARREGADO`, hospedagem; revisão jurídica dos termos | Josueh | Antes de abrir para o público |
| 4 | Trocar a chave do OpenRouter colada no chat (O3); `TRUST_PROXY=2` e destino `http://web:80` se usar o túnel nomeado | Josueh | Segurança / IP real |
| 5 | Sprint 6 parte 2: com os dados, decidir preços/limites dos planos e se o cache de prompt compensa (desligar no volume baixo?) | Josueh + Claude | Custo |
| 6 | Resto do A4 quando mexer: SQL de `services/edital.js` (959 linhas), `provas.js`, `desempenho.js` → repositórios | Claude | Padrão de camadas |
| 7 | Tabela de ligação prova ↔ edital (`provas.edital_id` é coluna única numa base compartilhada) | Claude | Dívida de modelo de dados |
| 8 | Contrato OpenAPI com esquemas de resposta das rotas principais | Claude | Clientes futuros (app móvel) |
| 9 | Fase 2 do conhecimento: `perfil_banca` consolidado | Claude | Qualidade das questões com menos tokens |
| 10 | Front: dividir `public/app.js` (~4 mil linhas) em módulos ES | Claude | Manutenção |
| 11 | Gateway de pagamento (Mercado Pago, Asaas ou Stripe) | Decisão do Josueh | Monetização |

Observação: `claude-sonnet-4-5` aparece só como padrão do proxy de desenvolvimento FCC (`FCC_STRONG_MODEL`); esse modelo é
aposentado pela Anthropic em 30/11/2026 — trocar o padrão para `claude-sonnet-5-5` se o FCC voltar a ser usado.

### A4 — editais, provas e admin concluídos (09/11/2026)
`services/edital.js` (21 consultas), `services/provas.js` (34, inclusive fila de treino e gabarito definitivo), `routes/editais.js`,
`routes/provas.js` e `routes/admin.js` sem SQL: tudo em `repositories/` (novos: `usuarios`, `planos`, `seguranca`); serviços novos
`services/admin.js` e `services/provas-editais.js`. Rotas: admin 209 → 128 linhas, provas 121 → 89, editais 148 → 127.
**Bug achado:** "Praticar questões reais" de edital sem banca gravava `banca='cebraspe'` (o R10 só corrigira o Simulado Prova Real).
`ILIKE` das questões reais com % e _ escapados. 159 testes; e2e 14/14.
Resta (~85 consultas, módulos menores): estrelas, feedback, cota, revanche, conhecimento, taxonomia, explicação, atividade, revisão,
e as rotas me, materials, auth — migrar quando forem alterados.

### Item 7 — vínculo prova ↔ edital por aluno — concluído (09/11/2026)
Migração 024: tabela `provas_editais (prova_id, edital_id, user_id)`, com os vínculos antigos copiados; `provas.edital_id` fica
obsoleta (não é lida nem gravada). Antes, a coluna única fazia o vínculo de um aluno sobrescrever o de outro na mesma prova
(e quem não tinha enviado a prova não conseguia ligá-la ao seu edital). Agora:
- cada aluno liga ao SEU edital provas que enviou ou que já estão prontas na base; desvincular só tira o vínculo dele;
- envio de prova + edital (inclusive duplicata) liga a prova ao edital de quem enviou;
- painel do edital, questões reais por tópico, Simulado Prova Real, cadernos e exemplos de estilo (`getKnowledge`) usam o vínculo
  do aluno; "Minhas provas" e "provas disponíveis" mostram o edital DELE.
Teste pela rota com duas alunas na mesma prova. 160 testes; e2e 14/14.
