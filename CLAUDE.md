# HelpConcurso — contexto para o Claude

Dono do projeto: Josueh (fala português do Brasil; responda sempre em pt-BR, direto e prático).
Usuária de teste: Amanda (convidada via `ALLOWED_EMAILS`).

## O que é
SaaS que gera questões de concurso no estilo de cada banca (FGV, CEBRASPE, FCC, VUNESP, Cesgranrio)
a partir do material de estudo do aluno. Princípio do produto: **o conhecimento acumulado (provas da base,
estilo aprendido, questões avaliadas, erros confirmados) é do HelpConcurso, não do fornecedor de IA.**

## Estado atual: v1.1 (MVP completo, pronto para teste com usuários)
- Node 22 + Express + PostgreSQL (SQL puro, migrações em `migrations/`), front sem framework em `public/`
- Contas com código por e-mail (SMTP/Brevo), recuperação de senha, cadastro só para convidados
- Upload de material (PDF inclusive escaneado via OCR por IA, DOCX, DOC, TXT) + identificação da matéria
- Geração no estilo da banca + **revisor automático** (2ª IA resolve sem gabarito; descarta e refaz)
- Base compartilhada de provas: envio por todos, checagem por IA, duplicatas, revisão admin, confiança
- Segurança de upload em camadas (`src/security/`, `docs/SEGURANCA.md`): texto oculto/sobrescrito,
  prompt injection, macros, JS em PDF, zip bomb etc.
- IA trocável por tarefa via `.env` (`src/ai/`, `docs/IA.md`), modelo reserva, registro de uso
- Avaliação 👍/👎, reportar erro (verificado por IA), estrelas e níveis (`src/services/stars.js`)
- 41 testes: `npm test` (precisa de PostgreSQL em `DATABASE_URL`; usa `AI_MOCK=true`)

## Como roda na máquina do Josueh (Windows + Docker Desktop)
- Pasta: `C:\helpconcurso` (fora do OneDrive). `docker compose up -d --build`
- App: http://localhost:3000 · Mailpit: http://localhost:8025 · MinIO: http://localhost:9001
- Acesso público: `docker run --rm cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:3000`
  e colocar a URL em `APP_URL` no `.env`, depois `docker compose up -d`
- Logs: `docker compose logs app --tail 50`

## Pendências
1. Enviar o código para o GitHub (repositório privado `JosuehElelyon/helpconcurso`): o zip não traz o histórico,
   então: `git init`, `git add -A`, `git commit -m "HelpConcurso v1.1"`, `git branch -M main`, `git remote add origin ...`, `git push -u origin main`.
2. Primeiro teste real com a IA (até agora só testado com `AI_MOCK=true`): enviar 2–3 provas por banca,
   gerar cadernos, avaliar a qualidade e ajustar os prompts em `src/lib/prompts.js`.
3. V2 (não fazer agora): ver `docs/ROADMAP.md` (chave de IA do próprio aluno, aprendizado com questões
   avaliadas, desconto por estrelas, consulta de legislação, pagamentos).

## Regras
- Nunca coloque chaves/senhas em código, commits ou mensagens; só no `.env` (que está no `.gitignore`).
- Mantenha as barreiras de segurança: todo texto de usuário entra no prompt via `untrusted()` (`src/ai/guard.js`)
  e toda resposta de IA é validada por schema (`src/ai/schemas.js`).
- Ao mudar o banco, crie `migrations/00N_*.sql` (nunca edite migração aplicada).
- Rode `npm test` antes de commitar.
