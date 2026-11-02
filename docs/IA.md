# Como a IA funciona no HelpConcurso

## Resumo em uma frase

O HelpConcurso **não re-treina um modelo**: ele usa o Claude (um modelo pronto, via API) e, a cada geração, **entrega ao modelo um "dossiê" da banca** montado a partir das provas que você cadastrou. Quanto mais provas na base, mais rico o dossiê e mais fiel o estilo.

Essa técnica se chama *aprendizado em contexto* (com exemplos, ou *few-shot*). É o padrão do mercado para este caso. Ela é imediata (uma prova cadastrada já vale na próxima geração), barata, auditável (você vê o que a IA aprendeu) e reversível (remover uma prova tira a influência dela).

## 1. "Treinamento": o que acontece quando você envia uma prova

Qualquer usuário: menu → **Enviar provas**. As provas passam pelas barreiras de segurança (veja `docs/SEGURANCA.md`), por uma checagem automática pela IA (é mesmo uma prova? qual a banca? é duplicata?) e, se necessário, pela **revisão** do administrador em **Base de provas**. Só depois disso a prova é treinada.

```
Prova (PDF/DOCX/DOC)  ──►  S3 (arquivo original guardado)
        │
        ▼
Extração de texto (servidor)
        │
        ├──► Análise de estilo (Claude) ──► características, padrões de enunciado,
        │                                   pegadinhas, dificuldade, matérias, ano, órgão
        │
        └──► Extração das questões (Claude) ──► questões reais com alternativas,
                                                gabarito (se enviado) e matéria
                                                        │
                                                        ▼
                                            PostgreSQL (tabelas provas e prova_questoes)
```

- Roda em segundo plano. O status passa por *Na fila → Processando → Treinada* (ou *Falhou*, com o motivo).
- Provas longas são divididas em partes (até 5 partes de ~24 mil caracteres) para extrair as questões.
- O **gabarito** é opcional, mas recomendado: com ele, os exemplos carregam a resposta certa, e a IA entende melhor *o que torna uma alternativa a correta* naquela banca.
- **Reprocessar** refaz a análise (útil depois de melhorar os prompts). **Remover** apaga a prova e tudo o que veio dela.

## 2. Uso: o que acontece quando o aluno gera questões

```
Material do aluno ──► texto extraído ──► identificação da matéria (modelo rápido)
                                                 │  aluno confirma a matéria e escolhe banca/nível
                                                 ▼
                              Monta o "dossiê" da banca (services/knowledge.js):
                              • perfil base da banca (src/lib/bancas.js)
                              • características/pegadinhas mais frequentes nas provas cadastradas
                              • até 6 questões REAIS da banca, de preferência da mesma matéria
                                                 │
                                                 ▼
                     Prompt de geração (src/lib/prompts.js) = dossiê + regras de formato
                     + material do aluno ──► Claude ──► JSON com as questões
                                                 │
                                                 ▼
                      Validação (5 alternativas, gabarito válido, C/E no CEBRASPE)
                      ──► salva o simulado ──► aluno resolve com gabarito comentado
```

Regras importantes do prompt:

- As questões devem ser **inéditas** e respondíveis **só com o material do aluno**. Os exemplos reais servem para imitar o estilo, não o conteúdo.
- Cada questão traz o **trecho do material** que fundamenta a resposta. Isso reduz invenções e ajuda o aluno a revisar.
- CEBRASPE: itens Certo/Errado equilibrados. Demais bancas: 5 alternativas com posição da correta variada.

## 3. Trocar de IA (v1)

Toda chamada passa por `src/ai/index.js`. Cada **tarefa** tem um modelo **principal** e um **reserva**, no formato `provedor:modelo`:

| Tarefa | Variável | Padrão | Reserva |
|---|---|---|---|
| Identificar a matéria | `AI_MODEL_DETECT` | `anthropic:claude-haiku-5-5` | sonnet |
| Gerar questões | `AI_MODEL_GENERATE` | `anthropic:claude-sonnet-5-5` | haiku |
| Ler PDF escaneado | `AI_MODEL_OCR` | `anthropic:claude-haiku-5-5` | sonnet |
| Checar prova enviada | `AI_MODEL_PROVA_CHECK` | `anthropic:claude-haiku-5-5` | sonnet |
| Analisar estilo | `AI_MODEL_PROVA_ANALYSIS` | `anthropic:claude-sonnet-5-5` | haiku |
| Extrair questões reais | `AI_MODEL_PROVA_EXTRACT` | `anthropic:claude-haiku-5-5` | sonnet |
| Revisor (resolver sem gabarito) | `AI_MODEL_REVIEW` | `anthropic:claude-haiku-5-5` | sonnet |
| Verificar erro reportado | `AI_MODEL_REPORT_CHECK` | `anthropic:claude-sonnet-5-5` | haiku |

Provedores prontos: `anthropic`, `openai`, `gemini`, `groq`, `together`, `deepseek`, `compat` (qualquer API compatível com OpenAI) e `mock` (simulado). Para trocar, basta mudar o `.env`, sem tocar no código. Por exemplo:
```
GEMINI_API_KEY=...
AI_MODEL_PROVA_EXTRACT=gemini:gemini-2.5-flash
```
Comportamento automático:
- **Retentativas** com espera crescente em falhas temporárias.
- **Troca para o modelo reserva** se o principal falhar, não estiver configurado ou não suportar a tarefa. Por exemplo, provedores sem leitura de PDF caem no reserva para OCR.
- **Disjuntor:** um modelo que falha 5 vezes seguidas é pulado por 60 s.
- **Cancelamento:** se o aluno fecha a página durante a geração, a chamada é interrompida e você não paga por ela.
- **Registro de uso:** toda chamada grava tokens, tempo, falhas e uso do reserva. Veja em **Base de provas → Segurança e IA**.
- **Modo lote** (`AI_TRAINING_MODE=batch`): o treino das provas usa a API de lote, mais barata.
- **Cache de prompt:** o perfil da banca vai na parte fixa do prompt, que o provedor cobra mais barato quando se repete.

Para adicionar um provedor novo, crie um adaptador em `src/ai/providers/` com o método `generate()` (veja `openai-compat.js`) e registre-o em `getProvider()`.

## 3b. Precisão das questões (revisor automático)

Nenhuma IA garante 100% de acerto. Por isso, cada caderno passa por camadas:
1. **Ancoragem:** toda questão cita o trecho do material que a justifica, e o sistema confere se o trecho existe mesmo.
2. **Revisor** (tarefa `review`, modelo barato): resolve cada questão **sem ver o gabarito**, só com o material. Passa apenas o que bate com o gabarito, não é ambíguo e é respondível pelo material. O que falha é descartado e **refeito** uma vez.
3. **Alunos:** 👍/👎 e "Reportar erro". O reporte é verificado pela IA (tarefa `report_check`). Se confirmado, a questão mostra a correção e o aluno ganha estrelas.

Se o revisor estiver fora do ar, as questões são entregues sem o selo "Verificada", com um aviso, e o aluno não fica travado. Limite: as questões seguem o material do aluno. Se ele estiver desatualizado, a questão também estará (a consulta externa está no ROADMAP).

## 4. Como melhorar a qualidade com o tempo

1. **Cadastre provas variadas** por banca: matérias diferentes, anos recentes, com gabarito. Comece com 2 ou 3 por banca e chegue a 10 ou mais nas bancas mais usadas.
2. **Ajuste os prompts** em `src/lib/prompts.js`. É o ponto de maior impacto. Depois, use *Reprocessar* nas provas, se mudar o prompt de análise.
3. **Próximas evoluções** (no README): busca semântica de exemplos (pgvector), avaliação das questões pelos alunos e OCR para provas escaneadas.

## Por que não "fine-tuning" (re-treinar o modelo)?

Re-treinar exigiria milhares de questões bem rotuladas, custo alto, semanas de ciclo, e cada nova prova pediria um novo treino. Com o dossiê em contexto, cada prova enviada melhora as gerações **na hora**, e você controla exatamente o que a IA usa. Se no futuro houver um grande volume de questões avaliadas pelos alunos, dá para reavaliar.
