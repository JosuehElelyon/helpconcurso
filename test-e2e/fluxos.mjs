// Teste de ponta a ponta no NAVEGADOR contra o ambiente local (docker compose up → http://localhost:3000).
//   npm run e2e                       (usa o Edge ou o Chrome instalado; outro: E2E_BROWSER=caminho\do\navegador.exe)
//   E2E_URL=http://localhost:3000     (padrão)   E2E_VER=1 abre o navegador visível
// Cria alunos temporários direto no banco do .env (DATABASE_URL) e apaga tudo no fim. Capturas em test-e2e/capturas/.
// Não entra no CI (precisa de navegador e do ambiente rodando); rode antes de entregar mudança de tela.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CAPTURAS = path.join(DIR, 'capturas');
const BASE = (process.env.E2E_URL || 'http://localhost:3000').replace(/\/$/, '');
const RUN = Date.now().toString(36);
const EMAIL = `e2e-${RUN}@exemplo.invalid`, SENHA = 'senha-e2e-123', EMAIL_NOVO = `e2e-novo-${RUN}@exemplo.invalid`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NAVEGADORES = [
  process.env.E2E_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const navegador = NAVEGADORES.find((p) => fs.existsSync(p));
if (!navegador) { console.error('Nenhum navegador encontrado. Defina E2E_BROWSER com o caminho do Chrome/Edge.'); process.exit(2); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL não definido (rode com npm run e2e, que lê o .env).'); process.exit(2); }

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const limpar = () => db.query('DELETE FROM users WHERE email = ANY($1)', [[EMAIL, EMAIL_NOVO]]);

const resultados = [];
const ok = (nome, cond) => resultados.push({ nome, ok: !!cond });
let browser;
try {
  await limpar();
  const { rows: [u] } = await db.query(
    `INSERT INTO users(name, email, password_hash, role, plano, email_verified_at) VALUES ('Aluno E2E', $1, $2, 'USER', 'aprovacao', now()) RETURNING id`,
    [EMAIL, await bcrypt.hash(SENHA, 11)]);
  // Simulado de edital sem banca (banca nula) — caso que já quebrou a tela
  await db.query(`INSERT INTO question_sets(user_id, banca, materia, nivel, formato, questoes, origem) VALUES ($1, NULL, 'Questão sem banca E2E', 'Prova real', 'me', $2, 'prova_real')`,
    [u.id, JSON.stringify([{ enunciado: 'Questão sem banca E2E: enunciado de teste', alternativas: ['a', 'b', 'c', 'd', 'e'], gabarito: 'A' }])]);

  fs.mkdirSync(CAPTURAS, { recursive: true });
  browser = await puppeteer.launch({ executablePath: navegador, headless: !process.env.E2E_VER, args: ['--no-first-run'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const erros = [], respostas = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('response', (r) => { if (r.url().includes('/api/')) respostas.push(`${r.request().method()} ${r.url().replace(BASE, '')} ${r.status()}`); });
  const foto = (nome) => page.screenshot({ path: path.join(CAPTURAS, `${nome}.png`) });
  const texto = () => page.evaluate(() => document.body.innerText);
  const respondeu = (re) => respostas.some((r) => re.test(r));

  // 1) Login → termos ainda não aceitos abrem o modal pedindo aceite
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#fEmail');
  await page.type('#fEmail', EMAIL); await page.type('#fPass', SENHA);
  await page.click('#authForm button[type=submit]');
  await page.waitForSelector('#btnAceitarTermos', { timeout: 15000 }).catch(() => {});
  await foto('1-termos-ao-entrar');
  const t1 = await texto();
  ok('login abre o app', await page.$('.sidebar, .nav-item'));
  ok('termos pedem aceite ao entrar', await page.$('#btnAceitarTermos'));
  ok('termos citam fornecedor real e base compartilhada', /Anthropic/.test(t1) && /compartilhad/i.test(t1));
  ok('termos sem afirmações antigas', !/Claude 3\.5|retenção zero|ponta a ponta/i.test(t1));
  await page.click('#btnAceitarTermos'); await sleep(800);
  ok('aceite registrado e modal fechado', !(await page.$('#btnAceitarTermos')) && respondeu(/POST \/api\/v1\/me\/termos\/aceite 200/));

  // 2) Simulado sem banca abre
  await page.goto(`${BASE}/#questoes`, { waitUntil: 'networkidle0' }); await sleep(800);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Baterias geradas/.test(b.innerText))?.click()); await sleep(800);
  const item = await page.$('[data-open]');
  if (item) { await item.click(); await sleep(1000); }
  await foto('2-simulado-sem-banca');
  ok('simulado sem banca abre', /Questão sem banca E2E/.test(await texto()));

  // 3) Minha conta: exportar e excluir
  await page.goto(`${BASE}/#conta`, { waitUntil: 'networkidle0' }); await sleep(800);
  await foto('3-minha-conta');
  ok('botões de LGPD em Minha conta', (await page.$('#btnExportarDados')) && (await page.$('#btnExcluirConta')));
  await page.click('#btnExportarDados'); await sleep(1500);
  ok('exportar dados responde 200', respondeu(/GET \/api\/v1\/me\/exportar 200/));
  await page.click('#btnExcluirConta'); await page.waitForSelector('#exSenha');
  await page.type('#exSenha', 'senha-errada'); await page.type('#exConf', 'EXCLUIR');
  await page.click('#exConfirmar'); await sleep(1000);
  ok('senha errada não exclui', respondeu(/DELETE \/api\/v1\/me\/conta 400/) && (await page.$('#exSenha')));
  await page.$eval('#exSenha', (el) => { el.value = ''; }); await page.type('#exSenha', SENHA);
  await page.click('#exConfirmar'); await sleep(1500);
  await foto('4-conta-excluida');
  ok('exclusão volta ao login com aviso', /Sua conta foi excluída/.test(await texto()));

  // 4) Cadastro: termos no modal, campos preservados e aceite obrigatório
  await page.click('[data-auth=criar]'); await page.waitForSelector('#fName');
  await page.type('#fName', 'Aluno E2E'); await page.type('#fEmail', EMAIL_NOVO); await page.type('#fPass', 'senha-12345');
  await page.click('label [data-open-termos]'); await sleep(1200);
  await foto('5-termos-no-cadastro');
  ok('modal dos termos aparece no cadastro', /Política de Privacidade/.test(await texto()) && (await page.$('.modal')));
  await page.click('[data-mclose2]'); await sleep(500);
  ok('campos digitados continuam após fechar o modal',
    (await page.$eval('#fName', (e) => e.value)) === 'Aluno E2E' && (await page.$eval('#fPass', (e) => e.value)) === 'senha-12345');
  await page.click('#authForm button[type=submit]'); await sleep(800);
  await foto('6-cadastro-sem-aceite');
  ok('cadastro sem aceite é barrado no front', /aceite os Termos/i.test(await texto()) && !respondeu(/POST \/api\/v1\/auth\/register/));

  // 5) Celular
  await page.setViewport({ width: 390, height: 844 }); await page.reload({ waitUntil: 'networkidle0' });
  await foto('7-login-celular');
  ok('sem erros de JavaScript na página', erros.length === 0);
  if (erros.length) console.log('Erros de JavaScript:\n  ' + erros.join('\n  '));
} finally {
  await browser?.close().catch(() => {});
  await limpar().catch(() => {});
  // O login do teste conta no limite de tentativas por IP: zera só esse contador para não atrapalhar quem usa o app local
  await db.query("DELETE FROM limites_requisicao WHERE chave LIKE '%:auth:%'").catch(() => {});
  await db.end();
}

for (const r of resultados) console.log(`${r.ok ? 'OK    ' : 'FALHOU'} ${r.nome}`);
const falhas = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} ok · capturas em ${path.relative(process.cwd(), CAPTURAS)}`);
process.exit(falhas ? 1 : 0);
