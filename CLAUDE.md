# HelpConcurso — contexto para o Claude

Dono do projeto: Josueh (fala português do Brasil; responda sempre em pt-BR, direto e prático).
Usuária de teste: Amanda (convidada via `ALLOWED_EMAILS`).

## O que é
SaaS que gera questões de concurso no estilo de cada banca (FGV, CEBRASPE, FCC, VUNESP, Cesgranrio)
a partir do material de estudo do aluno. Princípio do produto: **o conhecimento acumulado (provas da base,
estilo aprendido, questões avaliadas, erros confirmados) é do HelpConcurso, não do fornecedor de IA.**

## Estado atual: v1.4 (editais, cadernos de questões, controle de custo) — em teste com IA real
Base v1.1:
- Node 22 + Express + PostgreSQL (SQL puro, migrações em `migrations/`), front sem framework em `public/`
- Contas (SMTP/Brevo), recuperação de senha, cadastro só para convidados
- Upload de material (PDF inclusive escaneado via OCR por IA, DOCX, DOC, TXT) + identificação da matéria
- Geração no estilo da banca + **revisor automático** (2ª IA resolve sem gabarito; descarta e refaz)
- Base compartilhada de provas: envio por todos, checagem por IA, duplicatas, revisão admin, confiança
- Segurança de upload em camadas (`src/security/`, `docs/SEGURANCA.md`)
- IA trocável por tarefa via `.env` (`src/ai/`, `docs/IA.md`), modelo reserva, registro de uso (`ai_usage`)
- Avaliação 👍/👎, reportar erro (verificado por IA), estrelas e níveis (`src/services/stars.js`)

Novo na v1.2 (migrações `004_editais.sql`, `005_provas_editais_link.sql`):
- **Edital verticalizado** (`src/services/edital.js`, `src/routes/editais.js`, tela "Meu edital"):
  aluno envia o edital (arquivo ou texto); a IA (`edital_parse`) extrai disciplinas e tópicos com IDs `D1-T1`.
  Editais longos são recortados por `extractProgrammaticSample()` (início + anexo de conteúdo programático).
  Um edital fica "ativo" por aluno (`POST /api/editais/:id/ativar`).
- **Cruzamento Material × Edital** (`edital_match`): ao enviar material com `editalId` (ou `POST /api/materials/:id/edital`),
  grava `materials.edital_match` com tópicos cobertos (completo/parcial), faltantes e % da disciplina.
- **Questões ligadas ao edital**: o prompt de geração recebe os tópicos cobertos e cada questão traz `topico_edital`;
  `question_sets.edital_id` guarda o vínculo.
- **Painel de avanço** (`buildEditalDashboard`): por tópico/disciplina — pendente → estudado → praticado → dominado
  (≥70% de acerto), cobertura %, questões geradas/respondidas/acertos.
- **Prova ↔ Edital**: ao enviar prova dá para anexar o edital (`edital` no upload) ou vincular depois
  (`POST /api/provas/:id/edital`); `getKnowledge()` prioriza provas do mesmo edital como exemplos de estilo.
- Logs padronizados para achar erros: `[ERRO-IA]`, `[ERRO-SMTP]`, `[ERRO-FILA]`, `[ERRO-BANCO]`, `[ERRO-INTERNO]`.
- SMTP com 2 tentativas e fallback que imprime o e-mail no console.
- Filtro de injeção ajustado para não marcar "Instrução Normativa" (texto legítimo de legislação).
- Testes: 46 (`npm test`, IA simulada). Rodam num banco próprio (`<banco>_test`, criado por `test/setup.js`;
  ou `TEST_DATABASE_URL`), sem sujar o banco de desenvolvimento. Os testes de prova (fila) às vezes falham por tempo; rode de novo.

Novo na v1.3/v1.4 (migração `006_cadernos.sql`):
- **Caderno de erros** + "revanche IA" no tópico; **incidência real da banca** por tópico do edital; **impressão/PDF** do simulado.
- **Cadernos de questões** (`src/routes/cadernos.js`): por banca/concurso/edital; reúnem simulados (`question_sets.caderno_id`),
  materiais, provas antigas (questões reais copiadas em `cadernos.questoes_extras`), favoritas, anotações e "refazer erradas".
- `getKnowledge()` pontua exemplos reais por subtema e prioriza provas do caderno/edital.

## Segurança — revisão de 02/11/2026 (corrigido)
- Cadastro nunca sobrescreve conta confirmada (nem de admin/convidado) e só ativa conta com o código do e-mail;
  se o SMTP falhar, a conta fica pendente e o aluno usa "Reenviar código". Teste cobre a tentativa de tomar a conta do admin.
- Vínculos prova↔edital checam o dono (`createEditalForUser`, `submitProva`, duplicata em `POST /api/provas`).
- Tópicos/título do edital entram no prompt de geração via `untrusted()`.
- Caderno: corrigida consulta a coluna inexistente (`editais.disciplinas`) que quebrava caderno com edital; teto de 3000 favoritas/anotações.
- Pendente de desenho: `provas.edital_id` é uma coluna só, mas provas são compartilhadas e editais são por aluno
  (precisa de tabela de ligação — ver `editais_canonicos` em `docs/ARQUITETURA-CONHECIMENTO.md`).

## Custo de IA (conta Anthropic do Josueh, crédito pré-pago de US$ 5)
- Modelos por tarefa em `src/config.js` (`AI_TASKS`): Sonnet em `review`, `prova_analysis`, `report_check`;
  Haiku no resto (inclusive `generate`). Trocar via `AI_MODEL_<TAREFA>` no `.env`. Sonnet custa ~20× o Haiku.
- Preços e cálculo de custo num lugar só: `src/ai/pricing.js` (painel admin e limite diário usam). Atualize ao trocar de modelo.
- **Limite diário** `AI_LIMITE_USD_DIA` (hoje 0.50, dia de Brasília): ao atingir, `runText`/`submitBatch` lançam `AiError` com
  `code='budget'`; a fila adia tarefas por 30 min sem gastar tentativa. Painel admin mostra "Hoje: US$ x de US$ y".
- **Modo lote** ligado (`AI_TRAINING_MODE=batch`): análise/extração de provas pela Batch API (50% mais barato; a prova leva
  de minutos a horas para ficar pronta).
- Custo médio observado: prova ≈ US$ 0,02 (direto) · caderno ≈ US$ 0,07 · edital ≈ US$ 0,003. Maior gasto: `prova_analysis` (Sonnet).
- O cache de prompt (`cacheSystem` na geração) quase não é reaproveitado com pouco tráfego; a escrita de cache não é registrada.
- **Cascata grátis** (`AI_FREE_CASCADE`, desligada por padrão; ligada no .env do Josueh): Groq na triagem/revisão,
  Gemini na geração/análise, Claude de reserva (`routeFor()` em `src/ai/index.js`, catálogo `FREE_AGENT_CATALOG` em `src/config.js`).
  Custo 0 só para o que está em `AI_PROVEDORES_GRATIS`. **Material do aluno só no Claude** (`AI_TASKS[*].dados` +
  `AI_PROVEDORES_PRIVADOS`); provas/editais (públicos) na cascata grátis. Fácil/Médio: Haiku gera (`generate`); Difícil/Misto: Sonnet gera (`generate_dificil`); o outro modelo revisa (revisor ≠ gerador por modelo,
  `avoid`); análise de estilo com Sonnet primeiro (`pagoPrimeiro`). Teto diário bloqueia só modelos pagos. Benchmarks: `npm run benchmark` (velocidade/formato) e `npm run eval` (qualidade, Sonnet como juiz; `EVAL_NIVEL=Médio`).
  Riscos e próximos passos em `docs/PLANO-ACAO.md` (privacidade da cota grátis, modo lote, qualidade por modelo).
- **Raciocínio do Claude 5.5** é cobrado como saída e conta no `max_tokens`: ligado (esforço `medium` + reserva) só em geração,
  revisão, análise de estilo e erro reportado; desligado no resto (`paramsClaude` em `src/ai/providers/anthropic.js`, `AI_ESFORCO_<TAREFA>`).
- Uso real: tabela `ai_usage` (ou painel admin → IA; o provedor `mock` fica de fora). Para testar sem gastar: `AI_MOCK=true`.

## Como roda na máquina (Windows + Docker Desktop)
- Pasta: `C:\helpconcursos\helpconcurso` (fora do OneDrive). Repositório git local já criado (branch `main`).
- Tudo sobe com `docker compose up -d --build` (a imagem reaproveita o `node_modules` do host — sem dependências nativas).
  Alternativa: serviços no Docker (`docker compose up -d db minio mailpit`) e app no host com `npm start`.
- App: http://localhost:3000 · Mailpit: http://localhost:8025 · S3 local (SeaweedFS no serviço `minio`): http://localhost:9000
- A imagem `minio/minio` saiu do Docker Hub; o compose usa `chrislusf/seaweedfs`. Arquivos antigos do MinIO ficaram em `data/minio`.
- Se o Docker Desktop fechar com "com.docker.build: exit status 1": encerre o processo órfão `com.docker.build`
  (Gerenciador de Tarefas), rode `wsl --shutdown` e abra o Docker de novo. Não use "Reset to factory defaults".
- `.env` já tem `JWT_SECRET`, SMTP do Brevo e `ANTHROPIC_API_KEY` (`AI_MOCK=false`). Remetente: `SMTP_FROM`.
- Acesso público: `docker run --rm cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:3000`
  e colocar a URL em `APP_URL` no `.env`.

## Pendências
1. `git push -u origin main` (remote `JosuehElelyon/helpconcurso` já configurado).
2. Arquitetura de conhecimento (`docs/ARQUITETURA-CONHECIMENTO.md`). **Fase 1 pronta** (migração 007): taxonomia própria
   (`src/services/taxonomia.js`, semente na subida), vocabulário fechado de cobrança (`src/lib/cobranca.js`), `prova_extract` v2
   rotula cada questão real (tópico, comando, pegadinha, habilidade, leis), `editais_canonicos` (edital lido uma vez; chave =
   sha256 do texto normalizado + cargo), `ai_usage.prompt_versao` (`PROMPT_VERSAO` em `src/lib/prompts.js`).
   Provas antigas ficam sem rótulo até reprocessar. Próximo: Fase 2 (perfil_banca consolidado + pacote de contexto).
3. Teste real com a IA: provas por banca, editais, cadernos; avaliar qualidade e ajustar `src/lib/prompts.js`.
4. Atualizar `docs/ROADMAP.md` e `docs/IA.md` com editais e cadernos.
5. V2: ver `docs/ROADMAP.md`.

## Regras
- Nunca coloque chaves/senhas em código, commits ou mensagens; só no `.env` (que está no `.gitignore`).
- Mantenha as barreiras de segurança: todo texto de usuário entra no prompt via `untrusted()` (`src/ai/guard.js`)
  e toda resposta de IA é validada por schema (`src/ai/schemas.js`).
- Ao mudar o banco, crie `migrations/00N_*.sql` (nunca edite migração aplicada).
- Rode `npm test` antes de commitar.
