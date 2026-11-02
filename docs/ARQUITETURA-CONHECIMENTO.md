# Arquitetura do Conhecimento do HelpConcurso

> Objetivo: tudo o que a IA aprende sobre bancas, conteúdos e formas de cobrança fica **no nosso banco**, em formato
> estruturado e versionado. A IA contratada vira um "motor de redação" trocável: recebe de nós um contexto pequeno e
> preciso, gasta poucos tokens e pode ser substituída (Anthropic, Google, OpenAI, modelo aberto) sem perdermos nada.

## 1. Princípios

1. **Extrair uma vez, usar sempre.** Cada prova, edital e questão passa pela IA uma única vez. O que ela entende vira
   dado estruturado (tabelas), não texto solto. Nas gerações seguintes, quem trabalha é o banco.
2. **Nada de conhecimento dentro do prompt "na hora".** Hoje `getKnowledge()` refaz o dossiê da banca a cada geração,
   juntando 40 análises. O certo é consolidar o perfil em segundo plano e servir uma versão pronta.
3. **Taxonomia própria.** Matérias, tópicos e formas de cobrança têm IDs do HelpConcurso. Edital, prova real e questão
   gerada apontam para os mesmos IDs. É isso que permite cruzar tudo (incidência, domínio do aluno, exemplos certos).
4. **Proveniência em tudo.** Cada dado guarda de onde veio (prova, edital, aluno, modelo de IA, versão do prompt) e
   quanto confiamos nele. Sem isso não dá para corrigir, auditar nem trocar de IA com segurança.
5. **Cascata de custo.** Antes de chamar a IA, tentamos responder com o que já temos. A IA mais cara só entra quando
   nada mais resolve.
6. **Segurança igual em toda entrada.** Tudo que vem de usuário passa pela varredura (`src/security/`) antes de entrar
   na base compartilhada, e só entra no prompt via `untrusted()`. Saída de IA sempre validada por schema.

## 2. As camadas

```
                ┌──────────────────────────────────────────────────────────┐
  ENTRADAS      │ provas · gabaritos · editais · materiais do aluno · respostas · avaliações · erros reportados │
                └──────────────────────────────────────────────────────────┘
                                  │ (varredura de segurança)
                                  ▼
  1. INGESTÃO     extração estruturada por IA, UMA vez por documento (lote = 50% mais barato)
                                  ▼
  2. CONHECIMENTO taxonomia · questões atômicas · padrões de cobrança · perfil da banca · dispositivos legais
     (nosso ativo) — tudo em PostgreSQL, versionado, com proveniência
                                  ▼
  3. CONSOLIDAÇÃO jobs em segundo plano: estatísticas, perfis, deduplicação, psicometria (sem IA ou com IA barata)
                                  ▼
  4. SERVIÇO      "pacote de contexto" compacto (≈1–2 mil tokens) + cascata L0→L3
                                  ▼
  5. APRENDIZADO  respostas, 👍/👎, erros confirmados, revisor → voltam para a camada 2
```

## 3. Modelo de dados (camada 2)

Novas tabelas (migrações `007_*` em diante). O que já existe continua; as novas organizam e ligam.

| Tabela | O que guarda | Por que importa |
|---|---|---|
| `taxonomia` | Árvore própria: matéria → tópico → subtópico (`id`, `pai_id`, `nome`, `sinonimos[]`, `slug`) | Língua comum entre edital, prova e questão gerada |
| `editais_canonicos` | Edital público (órgão, cargo, ano, banca, `sha256`) com conteúdo programático já mapeado para `taxonomia` | O mesmo edital enviado por 100 alunos é lido **uma vez**. `editais` (do aluno) passa a apontar para ele |
| `questoes` (unificada) | Toda questão: real (prova) ou gerada (IA). `origem`, `banca`, `formato`, `enunciado`, `alternativas`, `gabarito`, `comentario`, `topico_id`, `comando` (ex.: "assinale a incorreta"), `nivel`, `prova_id` ou `set_id`, `modelo`, `prompt_versao`, `hash_texto` | Uma base só para buscar exemplos, servir questões prontas e medir qualidade |
| `questao_tags` | Rótulos estruturados por questão: `pegadinha_tipo`, `dispositivo_id`, `habilidade` (memorização, aplicação, interpretação) | É aqui que mora "como a banca cobra" |
| `padroes_cobranca` | Catálogo por banca × tópico: `tipo` (troca de prazo, "sempre/nunca", inversão de competência, exceção à regra…), `descricao`, `exemplos` (ids de questões reais), `frequencia`, `ultima_vez` | Os "macetes" da banca, prontos para entrar no prompt em 3–5 linhas |
| `perfil_banca` | Perfil consolidado e **versionado** por banca (e por banca × matéria): distribuição de comandos e formatos, tamanho médio de enunciado, dificuldade, incidência por tópico e ano, estilo de distrator, texto-resumo curto | Substitui o dossiê montado na hora. `versao`, `gerado_em`, `base_provas` (quantas) |
| `dispositivos` | Normas citadas (lei, artigo, súmula) com `vigencia` | Liga questão à lei; quando a lei mudar, achamos as questões afetadas (roadmap: legislação) |
| `questao_metricas` | Por questão: vezes respondida, % de acerto (dificuldade real), discriminação, 👍/👎, erros confirmados, `verificada` pelo revisor, `score_qualidade` | Decide o que pode ser reaproveitado e o que vira exemplo "do que evitar" |
| `embeddings` | Vetor por questão/tópico (`pgvector`), `modelo_embedding` | Busca por similaridade (exemplos certos, deduplicação). Recalculável: o texto canônico é o ativo, o vetor é cache |
| `ia_execucoes` | Entrada resumida, saída bruta, `tarefa`, `modelo`, `prompt_versao`, custo | Reprocessar com outro modelo, auditar, montar conjunto de avaliação |

Regras:
- **Material do aluno é privado.** Fica em `materials`, nunca entra na base compartilhada. Questão gerada a partir dele só
  vira "pública" com consentimento nos termos de uso, só se for ancorada em fonte pública (lei, edital) e após a
  varredura de segurança e `score_qualidade` alto.
- **Prova pública é compartilhada** (já é assim): entra pela checagem, duplicata, revisão admin e confiança.

## 4. Ingestão (camada 1): extrair mais, uma vez só

Hoje `prova_extract` devolve só `numero, materia, enunciado, alternativas, gabarito`. Ampliar o schema para, **na mesma
chamada**, devolver por questão: `topico` (texto livre, mapeado depois para `taxonomia`), `comando`, `pegadinha_tipo`,
`dispositivos` citados e `habilidade`. Custo extra pequeno (saída um pouco maior), valor enorme.

- Edital: `edital_parse` passa a rodar sobre `editais_canonicos` — se o `sha256` (ou órgão+cargo+ano) já existe, reaproveita.
- Mapeamento para a taxonomia: primeiro por regra (normalização + sinônimos), depois por similaridade de embedding;
  só os que sobrarem vão para a IA barata, em lote.
- Tudo em modo lote quando o aluno não precisa da resposta na hora (`AI_TRAINING_MODE=batch`).

## 5. Consolidação (camada 3): jobs que rodam sozinhos

| Job | Quando | Usa IA? |
|---|---|---|
| `perfil_banca.rebuild` | a cada N provas novas da banca (ex.: 3) ou 1×/dia | Estatísticas em SQL; 1 chamada barata para redigir o resumo curto |
| `padroes.consolidar` | junto do perfil | Agrupa `pegadinha_tipo` por tópico; IA só para nomear grupos novos |
| `questoes.dedupe` | ao inserir | Não (hash + embedding) |
| `metricas.atualizar` | a cada resposta/avaliação (incremental) | Não |
| `taxonomia.mapear_pendentes` | 1×/dia, em lote | IA barata só para o que a regra não resolveu |

## 6. Serviço (camada 4): pacote de contexto + cascata

**Pacote de contexto** (montado por código, determinístico, ≈1–2 mil tokens):
1. Resumo do `perfil_banca` (versão atual) para a matéria — 10–15 linhas.
2. Top 3–5 `padroes_cobranca` do tópico pedido.
3. 2–3 questões reais do mesmo tópico (por embedding), escolhidas por `score_qualidade`.
4. Tópicos do edital do aluno (já existe) e o trecho relevante do material (não o material inteiro: recorte por tópico).
5. 1–2 "exemplos do que evitar" (questões com erro confirmado no tópico).

Como o pacote é estável por banca × tópico, ele vai no início do prompt com cache (`cacheSystem`), e o material do aluno
vem depois. Com tráfego, o cache passa a ser lido a 10% do preço.

**Cascata** (do mais barato para o mais caro):

| Nível | O que faz | Custo |
|---|---|---|
| L0 | Servir questões já existentes do banco (reais ou geradas com `score_qualidade` alto) do mesmo tópico/banca que o aluno ainda não viu | Zero |
| L1 | Adaptar uma questão existente (trocar caso, valores, alternativa correta) com modelo barato | Muito baixo |
| L2 | Gerar inédita com modelo barato + pacote de contexto | Baixo |
| L3 | Gerar com modelo forte (tópico raro, sem exemplos, ou aluno pediu dificuldade alta) | Normal |

O revisor (2ª IA) continua em L1–L3. A escolha do nível é regra nossa, configurável.

## 7. Aprendizado (camada 5)

- Cada resposta de aluno alimenta `questao_metricas` (dificuldade real medida, não "achada" pela IA).
- 👍/👎 e erro confirmado ajustam `score_qualidade`; abaixo do limite, a questão sai do L0 e vira exemplo negativo.
- Revisor discordou → a questão nem entra na base; o padrão do erro é registrado para o tópico.
- Perfis e padrões são reconstruídos com isso: o sistema melhora com o uso, **sem treinar modelo nenhum**.

## 8. Independência do fornecedor de IA

- **Contrato, não fornecedor:** cada tarefa tem schema de saída (zod) e prompt versionado (`prompt_versao`). Trocar de
  IA = trocar `AI_MODEL_<TAREFA>` e rodar a avaliação.
- **Conjunto de avaliação próprio** (`ia_execucoes` + questões com gabarito verificado): antes de trocar o modelo de uma
  tarefa, rodamos o conjunto e comparamos acerto, formato e custo. Fica escolhido o mais barato que mantém a qualidade.
- **Embeddings locais** (modelo aberto multilíngue rodando no próprio servidor) para não depender de fornecedor nem pagar
  por busca. O vetor é recalculável; o texto canônico é o ativo.
- **Saída bruta guardada** (`ia_execucoes`): dá para reprocessar a base inteira com um modelo novo sem reenviar documentos.
- **Exportação**: dump diário das tabelas de conhecimento (backup e portabilidade).

## 9. Plano de implementação (por fases)

| Fase | Entregas | Ganho |
|---|---|---|
| **1. Fundação** | `taxonomia` (semente com as matérias de `bancas.js`) · `editais_canonicos` com reaproveitamento por hash · schema de `prova_extract` ampliado (tópico, comando, pegadinha, dispositivo) · `prompt_versao` nas chamadas | Edital lido uma vez; toda prova nova já entra rotulada |
| **2. Perfil consolidado** | `perfil_banca` + `padroes_cobranca` + job de reconstrução · pacote de contexto substituindo `getKnowledge()` · `ia_execucoes` | Prompt de geração menor e mais preciso; cache passa a valer |
| **3. Banco de questões** | `questoes` unificada + `questao_metricas` · L0/L1 da cascata · deduplicação | Parte das gerações sem custo de IA |
| **4. Independência** | `pgvector` + embeddings locais · conjunto de avaliação · reprocessamento | Troca de IA guiada por dados; busca semântica |
| **5. Legislação** | `dispositivos` com vigência + alerta de questão desatualizada | Roadmap item 4 |

Cada fase é útil sozinha e não quebra as anteriores. Recomendação: começar pela Fase 1, que custa pouco e faz toda
prova nova enviada a partir de agora já entrar com o conhecimento estruturado.
