# Hospedagem do HelpConcurso

Você tem duas opções. Comece pela que for mais rápida para você; dá para migrar depois sem mudar código, só as variáveis do `.env`.

---

## Opção A — Seu computador como servidor (rápido, gratuito)

Funciona em Windows, macOS ou Linux. O computador precisa ficar ligado para o site ficar no ar.

### 1. Instale
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/downloads)

### 2. Baixe e configure
```bash
git clone https://github.com/<seu-usuario>/helpconcurso.git
cd helpconcurso
cp .env.example .env
```
Edite o `.env`:
- `JWT_SECRET`: gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (ou qualquer texto aleatório com mais de 32 caracteres).
- `ANTHROPIC_API_KEY`: crie em https://console.anthropic.com.
- `ADMIN_EMAILS`: seu e-mail.

### 3. Suba tudo
```bash
docker compose up -d --build
```
Acesse http://localhost:3000. Os e-mails de confirmação aparecem em http://localhost:8025 (Mailpit), porque ainda não há SMTP real.

### 4. Deixe acessível ao público (sem abrir portas no roteador)

**Teste rápido (link temporário):**
```bash
# Windows / macOS
docker run --rm cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:3000
# Linux
docker run --rm --network host cloudflare/cloudflared:latest tunnel --url http://localhost:3000
```
O comando mostra um endereço `https://algo-aleatorio.trycloudflare.com`. Coloque-o em `APP_URL` no `.env` e rode `docker compose up -d` de novo. O link muda a cada execução, então serve só para testes.

**Endereço fixo (recomendado):** você precisa de um domínio (por exemplo, `helpconcurso.com.br`) gerenciado no Cloudflare, no plano gratuito.
1. Cloudflare → **Zero Trust → Networks → Tunnels → Create a tunnel** (tipo *Cloudflared*).
2. Copie o **token** e coloque em `CLOUDFLARE_TUNNEL_TOKEN` no `.env`.
3. Em *Public Hostname*, aponte `helpconcurso.seudominio.com.br` para `http://app:3000`.
4. Defina `APP_URL=https://helpconcurso.seudominio.com.br` e rode:
```bash
docker compose --profile publico up -d
```

### 5. E-mail real (para os usuários receberem os códigos)
O Mailpit só captura os e-mails localmente. Para enviar de verdade, escolha um provedor e preencha `SMTP_*` no `.env`. Com `SMTP_HOST` preenchido, o Docker usa o seu provedor no lugar do Mailpit.

| Provedor | Host | Porta | Observação |
|---|---|---|---|
| Brevo | smtp-relay.brevo.com | 587 | Plano gratuito com limite diário; bom para começar |
| Resend | smtp.resend.com | 587 | Usuário `resend`, senha = API key |
| Amazon SES | email-smtp.<região>.amazonaws.com | 587 | Mais barato em volume; exige sair do "sandbox" |
| Gmail | smtp.gmail.com | 587 | Só para testes; exige verificação em 2 etapas e "senha de app" |

Para não cair no spam, verifique seu domínio no provedor (registros SPF e DKIM) e use um `SMTP_FROM` desse domínio.

### 6. Arquivos (S3)
Na opção A, o **MinIO** (que já vem no compose) é o seu "S3 local", e os arquivos ficam em `./data/minio`. Se quiser os arquivos na nuvem mesmo rodando no PC, use o Cloudflare R2 ou o AWS S3 (veja a opção B) e comente a linha `S3_ENDPOINT` do serviço `app` no compose.

### Backup
Tudo fica em `./data/` (banco e arquivos). Faça cópias periódicas dessa pasta, ou um dump do banco:
```bash
docker compose exec db pg_dump -U helpconcurso helpconcurso > backup.sql
```

---

## Opção B — Nuvem (recomendado para produção)

Uma combinação simples e de baixo custo:

| Peça | Serviço sugerido | Alternativas |
|---|---|---|
| App (Docker) | **Render** (Web Service) | Railway, Fly.io, AWS App Runner, uma VPS |
| PostgreSQL | **Render Postgres** | Neon, Supabase, AWS RDS |
| Arquivos (S3) | **Cloudflare R2** | AWS S3, Backblaze B2 |
| E-mail (SMTP) | **Brevo** ou **Resend** | Amazon SES |

### Passo a passo (Render + R2 + Brevo)
1. **R2**: Cloudflare → R2 → crie o bucket `helpconcurso` → *Manage API tokens* → crie um token com permissão de leitura e escrita. Anote o *Access Key ID*, o *Secret* e o endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
2. **Brevo**: crie a conta → *SMTP & API* → anote o login e a chave SMTP. Verifique seu domínio (SPF/DKIM).
3. **Render**: *New → Blueprint* → escolha o repositório do GitHub. O `render.yaml` cria a API (web), o **worker da fila de IA** (mesma imagem, `node src/worker.js`) e o banco; as variáveis comuns ficam no grupo `helpconcurso-comum`. API e worker escalam separados. Preencha as variáveis pedidas:
   - `APP_URL` = a URL do Render (ou o seu domínio)
   - `ADMIN_EMAILS`, `ANTHROPIC_API_KEY`
   - `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `S3_BUCKET=helpconcurso`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (`S3_REGION=auto` já vem configurado)
4. A cada `git push` na branch principal, o Render publica a nova versão.
5. **Domínio próprio**: Render → Settings → Custom Domains. Depois, atualize o `APP_URL`.

### Com AWS (se preferir tudo na Amazon)
- S3: crie o bucket e um usuário IAM com permissão só nesse bucket (`s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`). Deixe `S3_ENDPOINT` **vazio** e `S3_FORCE_PATH_STYLE=false`.
- SES para o SMTP; RDS para o PostgreSQL; App Runner ou ECS para rodar o container (o `Dockerfile` serve para os dois).

---

## Checklist de produção
- [ ] `JWT_SECRET` forte e exclusivo
- [ ] `APP_URL` com `https://` (os cookies passam a ser `Secure`)
- [ ] SMTP com domínio verificado (SPF/DKIM)
- [ ] Bucket S3 **privado** (o app serve os arquivos; nada é público)
- [ ] Limite de gastos configurado no console da Anthropic
- [ ] Backup automático do banco
