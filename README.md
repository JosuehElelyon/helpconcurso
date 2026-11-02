# HelpConcurso

Gere questões de concurso público **no estilo de cada banca** (FGV, CEBRASPE, FCC, VUNESP, Cesgranrio) a partir do material de estudo do aluno: resumos, anotações e apostilas em PDF, DOCX, DOC ou TXT.

## Funcionalidades

- **Contas de usuário**: cadastro com confirmação por código no e-mail, login e recuperação de senha por e-mail.
- **Gerar questões** em 4 passos: upload → identificação automática da matéria (com confirmação) → escolha da banca, quantidade e nível → questões com gabarito comentado, trecho do material que fundamenta a resposta e a pegadinha típica da banca.
- **Formato de cada banca**: CEBRASPE em Certo/Errado (com nota líquida, em que uma errada anula uma certa); as demais em múltipla escolha de A a E.
- **Meus simulados**: histórico, filtros, respostas salvas, refazer, copiar as questões com o gabarito.
- **Bancas e estilos**: o que a IA sabe de cada banca (perfil base + o que aprendeu).
- **Enviar provas** (todos os usuários): a base é compartilhada. Cada prova passa por barreiras de segurança, checagem automática pela IA e detecção de duplicatas (pelo arquivo e pelo conteúdo). Quem contribui ganha gerações extras.
- **Base de provas** (administradores): fila de revisão (aprovar/recusar com motivo), base por banca e painel de **Segurança e IA** com eventos, uso de tokens e roteamento dos modelos.
- **PDF escaneado**: as páginas são lidas pela IA (OCR).
- **Segurança de upload em camadas**: texto oculto ou sobrescrito, injeção de instruções na IA, macros, scripts, zip bomb etc. Veja [docs/SEGURANCA.md](docs/SEGURANCA.md).
- **IA trocável por tarefa** (Claude, OpenAI, Gemini, Groq...), com modelo reserva automático. Veja [docs/IA.md](docs/IA.md).
- **Revisor automático**: depois de gerar, uma segunda IA resolve cada questão sem ver o gabarito, usando só o material. Questões divergentes ou ambíguas são descartadas e refeitas; as aprovadas ganham o selo "Verificada".
- **Avaliação e reporte de erro**: 👍/👎 em cada questão e "Reportar erro", verificado pela IA em segundo plano (com a correção mostrada ao aluno).
- **Estrelas e níveis**: ganhas só por contribuições verificadas (prova aprovada, erro confirmado, avaliações) e trocáveis por gerações extras.
- **Cotas** por usuário e **cadastro só para convidados** na fase de testes.
- Plano de evolução em [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | HTML/CSS/JS sem framework (`public/`), servido pelo próprio back-end |
| Back-end | Node.js 22 + Express (`src/`) |
| Banco de dados | PostgreSQL, com migrações SQL em `migrations/` |
| Arquivos | Qualquer serviço compatível com S3 (AWS S3, Cloudflare R2, MinIO...) |
| E-mail | SMTP via Nodemailer (Brevo, Resend, Amazon SES, Gmail...) |
| IA | Camada própria multi-provedor (`src/ai/`); padrão: Claude |
| Fila | Tarefas persistentes no PostgreSQL (`src/jobs/`) |

## Rodando localmente (Docker)

```bash
cp .env.example .env          # preencha JWT_SECRET e ANTHROPIC_API_KEY
docker compose up -d --build
```

- App: http://localhost:3000
- E-mails de teste (Mailpit): http://localhost:8025
- Arquivos (MinIO): http://localhost:9001 (login `minioadmin`/`minioadmin`)

O e-mail em `ADMIN_EMAILS` vira administrador ao criar a conta. Para promover outro usuário: `docker compose exec app node scripts/make-admin.js email@dominio.com`.

## Rodando sem Docker

Você precisa de Node 22+ e de um PostgreSQL.

```bash
npm install
cp .env.example .env    # ajuste DATABASE_URL; para testes sem storage, use S3_DISABLED=true
npm run dev             # aplica as migrações e sobe em http://localhost:3000
```

Sem `SMTP_HOST`, os e-mails (com o código) aparecem no console. Com `AI_MOCK=true`, a IA devolve respostas falsas, o que serve para desenvolver sem gastar créditos.

## Testes

```bash
npm test   # precisa de DATABASE_URL apontando para um PostgreSQL de teste
```

O GitHub Actions (`.github/workflows/ci.yml`) roda os testes a cada push.

## Estrutura

```
src/
  server.js            # Express, cabeçalhos de segurança, rotas, erros, desligamento gracioso
  config.js            # variáveis de ambiente + roteamento de IA por tarefa
  db.js                # PostgreSQL + migrador
  ai/                  # camada de IA: provedores, retentativas, reserva, schemas, guard
  security/            # inspeção de arquivo, varredura de texto, política, antivírus, impressão digital
  jobs/                # fila de tarefas persistente
  lib/                 # auth, e-mail, S3, upload, prompts, bancas
  routes/              # auth, materials, sets, provas, bancas, admin
  services/            # provas (ciclo de vida), knowledge, ocr, quota
public/                # front-end (index.html, styles.css, app.js)
migrations/            # SQL versionado (crie 002_*.sql para mudanças)
docs/IA.md             # como funciona o treinamento e o uso da IA
docs/DEPLOY.md         # hospedagem: nuvem ou seu computador como servidor
docs/SEGURANCA.md      # todas as barreiras de segurança
```

## API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` · `/verify` · `/resend` · `/login` · `/logout` | Conta e sessão (cookie httpOnly) |
| POST | `/api/auth/forgot` · `/reset` | Recuperação de senha por código |
| GET | `/api/auth/me` | Usuário logado |
| POST | `/api/materials` | Upload (multipart `file`) ou texto (`{text}`); extrai o texto e identifica a matéria |
| POST | `/api/sets` | Gera um simulado (resposta em NDJSON com o progresso) |
| GET/PATCH/DELETE | `/api/sets/:id` | Consultar, salvar respostas, excluir |
| GET | `/api/bancas` | Perfis das bancas + estilo aprendido |
| GET | `/api/admin/provas` | Listar provas (admin) |
| GET | `/api/admin/provas/:id/questoes` · `/arquivo` | Questões extraídas / arquivo original |
| POST/DELETE | `/api/admin/provas/:id/reprocessar` · `/api/admin/provas/:id` | Reprocessar / remover |
| POST | `/api/provas` · GET `/api/provas/minhas` | Usuário envia prova / acompanha |
| POST | `/api/admin/provas/:id/aprovar` · `/recusar` | Revisão |
| GET | `/api/admin/seguranca` · `/api/admin/ia` · `/api/sets/cota` | Eventos de segurança · uso de IA · cota |

## Próximos passos

Veja [docs/ROADMAP.md](docs/ROADMAP.md).

### Ideias técnicas

- Fila de processamento dedicada (BullMQ/Redis) quando o volume de provas crescer.
- Busca semântica dos exemplos (pgvector) em vez de filtro por matéria.
- Avaliação das questões pelos alunos (👍/👎) para medir e melhorar a qualidade.
- Apps mobile (PWA ou React Native) consumindo a mesma API.
