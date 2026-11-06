# Arquitetura do HelpConcurso

Estado em 05/11/2026 (reestruturação A1–A6). Para a arquitetura do **conhecimento** (provas, rótulos, perfil da banca),
veja `ARQUITETURA-CONHECIMENTO.md`. Para IA (modelos, custos, cascata), `IA.md`. Para segurança, `SEGURANCA.md`.

## Visão geral

```
 navegador ──► web (Nginx) ──┬── /            → public/ (front: SPA sem framework)
                             └── /api/v1/*    → app (API REST, Node/Express) ──┐
                                                                               ├──► PostgreSQL (dados, fila, limites)
                                               worker (fila de IA) ◄── NOTIFY ─┘──► S3 (arquivos) · SMTP · IA
```

| Processo | Entrada | Escala | O que faz |
|---|---|---|---|
| `web` | Nginx (`deploy/nginx/default.conf.template`) | CDN/réplicas | Entrega o front, gera `/config.js`, repassa `/api` |
| `app` | `src/server.js` (`PROCESS_ROLE=api`) | horizontal, sem estado | API REST `/api/v1` |
| `worker` | `src/worker.js` | horizontal | Tarefas de IA da fila: checar/treinar/rotular provas, importar lote, verificar erro reportado |

Tudo-em-um (dev, testes, Render): `npm start` = API + fila + front no mesmo processo (`PROCESS_ROLE=all`, `SERVIR_FRONT=true`).

**Sem estado no processo da API:** sessão em cookie JWT, cotas e limites de requisição no Postgres, arquivos no S3, fila no
Postgres. Por isso dá para rodar várias instâncias de `app` e de `worker` sem combinar nada entre elas.

## Camadas do back

```
routes/        HTTP: valida a entrada (zod), chama o serviço, monta a resposta. Sem SQL, sem regra.
  └► services/   Regra de negócio. Não conhece req/res (recebe dados validados; progresso por callback).
       └► repositories/   Só SQL. Toda consulta de dado do aluno filtra pelo dono (user_id).
```

Apoio: `middleware/` (limites de requisição, CORS/CSRF), `lib/` (utilitários sem banco: http, ndjson, bancas, prompts...),
`ai/` (provedores de IA, roteamento, schemas), `security/` (varredura de uploads e de texto), `jobs/` (fila).

Já seguem as camadas: **simulados** (`routes/sets.js` → `services/simulados.js`) e **cadernos** (`routes/cadernos.js` →
`services/cadernos.js`). Ainda com SQL dentro do serviço: `services/edital.js`, `services/provas.js`, `services/desempenho.js`
— migrar para `repositories/` quando forem alterados.

## Uma requisição, do começo ao fim (gerar simulado)

1. Front chama `POST /api/v1/sets` (via Nginx; mesmo domínio, cookie `hc_session`).
2. `app.js`: request-id → helmet → CORS (só `CORS_ORIGINS`) → JSON → cookie → CSRF por origem → usuário da sessão.
3. `routes/sets.js`: `requireAuth`, `geracaoLimit` (Postgres), valida com zod.
4. `services/simulados.prepararGeracao`: confere material/caderno do dono, varre os textos, consome a cota. Erro aqui = status HTTP.
5. Rota abre o fluxo NDJSON (`lib/ndjson.js`); `executarGeracao` chama a IA (`ai/`), normaliza, passa no revisor, grava pelo
   repositório. Falha → devolve a cota. Aluno fechou a página → `AbortSignal` cancela a IA.

## Contrato da API

- Versão atual: `/api/v1` (índice em `src/routes/index.js`). `/api/*` é apelido obsoleto (cabeçalho `Deprecation`).
- Contrato OpenAPI 3.1: `src/openapi.js`, servido em `/api/v1/openapi.json`; `npm run openapi` exporta `docs/openapi.json`.
- Erros sempre `{ "error": "mensagem" }`. Operações longas de IA respondem em NDJSON (`progress`, `stage`, `ping`, `done` | `error`).

## Fila de tarefas (Postgres)

`jobs` com `FOR UPDATE SKIP LOCKED` (cada tarefa roda em um worker só), prioridade (tarefas de fundo negativas), retentativas
com espera exponencial, adiamento de 30 min quando bate o teto diário de IA. Batimento a cada 30 s; tarefa sem batimento há
2 min (worker caiu) volta para a fila. A API avisa os workers com `NOTIFY jobs_novos`.

## Configuração que muda a topologia

| Variável | Padrão | Uso |
|---|---|---|
| `PROCESS_ROLE` / `--papel=` | `all` | `api`, `worker` ou `all` |
| `SERVIR_FRONT` | `true` | `false` quando o front está no Nginx/CDN |
| `CORS_ORIGINS` | vazio | Front em outro domínio (de preferência subdomínio do mesmo site) |
| `TRUST_PROXY` | `1` | Nº de proxies na frente da API (túnel Cloudflare + Nginx = 2) |
| `WORKER_CONCURRENCY` | `2` | Tarefas simultâneas por worker |
| `RATE_LIMIT_PREFIXO` | `hc` | Separa ambientes que dividem o mesmo banco |

## Regras para código novo

1. **Rota nova** → entra na tabela `ROTAS` de `src/openapi.js` (o `test/contrato.test.js` falha se esquecer) e rode `npm run openapi`.
2. **SQL só em `repositories/`**, sempre filtrando pelo dono quando o dado é do aluno.
3. **Regra em `services/`**, sem `req`/`res`; a rota só valida e responde.
4. **Limite de requisição** → `limitador(nome, …)` em `middleware/limites.js`, nunca `rateLimit()` direto.
5. **Tarefa de fundo** → `registerJob` num serviço importado em `src/jobs/tarefas.js`; nada de trabalho longo dentro da requisição.
6. **Texto do usuário no prompt** só via `untrusted()`; resposta de IA sempre validada por schema (`ai/schemas.js`).
7. **Banco** → nova migração `migrations/0NN_*.sql`; nunca editar migração aplicada.
8. **Teste de funcionalidade chama a rota HTTP** (ou o serviço), nunca uma cópia da lógica dentro do teste.
9. Antes de commitar: `npm test` (o CI também valida sintaxe, contrato exportado, compose, Nginx e a imagem Docker).
