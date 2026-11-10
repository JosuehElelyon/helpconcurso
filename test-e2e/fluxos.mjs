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
const EMAIL = `e2e-${RUN}@exemplo.invalid`, SENHA = 'senha-e2e-123', EMAIL_NOVO = `e2e-novo-${RUN}@exemplo.invalid`, EMAIL_ADMIN = `e2e-admin-${RUN}@exemplo.invalid`;
const TELAS = ['home', 'desempenho', 'gerar', 'edital', 'questoes', 'bancas', 'contribuir', 'estrelas', 'conta', 'planos'];
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
const limpar = () => db.query('DELETE FROM users WHERE email = ANY($1)', [[EMAIL, EMAIL_NOVO, EMAIL_ADMIN]]);

const resultados = [];
const ok = (nome, cond) => resultados.push({ nome, ok: !!cond });
let browser, provaE2E = null;
try {
  await limpar();
  const { rows: [u] } = await db.query(
    `INSERT INTO users(name, email, password_hash, role, plano, email_verified_at) VALUES ('Aluno E2E', $1, $2, 'USER', 'aprovacao', now()) RETURNING id`,
    [EMAIL, await bcrypt.hash(SENHA, 11)]);
  // Simulado de edital sem banca (banca nula) — caso que já quebrou a tela
  await db.query(`INSERT INTO question_sets(user_id, banca, materia, nivel, formato, questoes, origem) VALUES ($1, NULL, 'Questão sem banca E2E', 'Prova real', 'me', $2, 'prova_real')`,
    [u.id, JSON.stringify([{ enunciado: 'Questão sem banca E2E: enunciado de teste', alternativas: ['a', 'b', 'c', 'd', 'e'], gabarito: 'A' }])]);

  const { rows: [ed] } = await db.query(
    `INSERT INTO editais (user_id, titulo, banca, verticalizado, text, word_count, active) VALUES ($1, 'Edital E2E', 'fgv', $2, 't', 10, true) RETURNING id`,
    [u.id, JSON.stringify([{ id: 'd1', materia: 'Direito Administrativo', peso: 1, topicos: [{ id: 'd1-t1', codigo: '1', nome: 'Atos administrativos' }, { id: 'd1-t2', codigo: '2', nome: 'Licitações' }] }])]);
  const { rows: [pv] } = await db.query(`INSERT INTO provas (banca, file_name, file_key, status, titulo) VALUES ('fgv', 'e2e.pdf', $1, 'READY', 'Prova E2E') RETURNING id`, [`e2e-${RUN}`]);
  provaE2E = pv.id;
  await db.query('INSERT INTO provas_editais (prova_id, edital_id, user_id) VALUES ($1, $2, $3)', [pv.id, ed.id, u.id]);
  for (let i = 1; i <= 3; i++) {
    await db.query(`INSERT INTO prova_questoes (prova_id, banca, materia, topico, numero, enunciado, alternativas, gabarito) VALUES ($1, 'fgv', 'Direito Administrativo', 'Atos administrativos', $2, $3, $4, 'A')`,
      [pv.id, i, `Questão real E2E ${i} sobre atos administrativos`, JSON.stringify(['a', 'b', 'c', 'd', 'e'])]);
  }

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
  /** Abre cada tela e confere que ela desenhou conteúdo, sem erro de JavaScript nem resposta 5xx da API. */
  async function percorrerTelas(telas, quem) {
    const errosAntes = erros.length, falhas = [];
    for (const t of telas) {
      await page.evaluate((h) => { location.hash = h; }, t);
      await sleep(900);
      const tam = await page.evaluate(() => (document.querySelector('main, .content, #app')?.innerText || '').trim().length);
      if (tam < 20) falhas.push(`${t} (vazia)`);
    }
    const novos = erros.slice(errosAntes);
    if (novos.length) falhas.push(...novos.map((e) => 'JS: ' + e));
    const r5xx = respostas.filter((r) => / 5\d\d$/.test(r));
    if (r5xx.length) falhas.push(...r5xx);
    if (falhas.length) console.log(`Telas com problema (${quem}):\n  ` + falhas.join('\n  '));
    return falhas.length === 0;
  }

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
  ok(`aluno: as ${TELAS.length} telas abrem sem erro`, await percorrerTelas(TELAS, 'aluno'));

  // 1b) Meu edital com tópicos: painel, filtros de tópicos e Simulado Prova Real
  const errosAntesEdital = erros.length;
  await page.evaluate(() => { location.hash = 'edital'; }); await sleep(1500);
  ok('Meu edital com tópicos abre (lista tópico a tópico)', /tópico a tópico/i.test(await texto()) && erros.length === errosAntesEdital);
  const filtros = await page.$$eval('[data-radar-filter]', (bs) => bs.map((b) => b.dataset.radarFilter));
  for (const fl of filtros) { await page.click(`[data-radar-filter="${fl}"]`); await sleep(400); }
  ok('filtros de tópicos do edital aparecem e funcionam', filtros.length >= 2 && erros.length === errosAntesEdital);
  await page.evaluate(() => { location.hash = 'edital'; }); await sleep(800);
  await page.click('#btnSimuladoProvaReal').catch(() => {}); await sleep(800);
  await foto('2a-prova-real-modal');
  const abriuModal = !!(await page.$('#btnIniciarProvaReal'));
  if (abriuModal) { await page.click('#btnIniciarProvaReal'); await sleep(2000); }
  await foto('2b-prova-real-iniciada');
  ok('Simulado Prova Real: abre a configuração e inicia a prova', abriuModal && respondeu(/POST \/api\/v1\/editais\/[^ ]+\/simulado-prova-real 201/) && erros.length === errosAntesEdital);

  // 2) Simulado sem banca abre
  await page.goto(`${BASE}/#questoes`, { waitUntil: 'networkidle0' }); await sleep(800);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Baterias geradas/.test(b.innerText))?.click()); await sleep(800);
  // Clica no simulado pelo nome (a prova real criada acima também aparece na lista)
  await page.evaluate(() => [...document.querySelectorAll('[data-open]')].find((b) => /Questão sem banca E2E/.test(b.innerText))?.click());
  await sleep(1000);
  await foto('2-simulado-sem-banca');
  ok('simulado sem banca abre', /Questão sem banca E2E/.test(await texto()));
  // Interação dentro da tela (os eventos de cada tela ficam no módulo dela): responder salva no servidor
  const alt = await page.$('[data-ans]');
  if (alt) { await alt.click(); await sleep(1500); }
  ok('responder uma questão salva a resposta', !!alt && respondeu(/PATCH \/api\/v1\/sets\/[^ ]+ 200/));

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

  // 5) Admin: todas as telas e as abas do painel de provas/IA
  await db.query(`INSERT INTO users(name, email, password_hash, role, email_verified_at, termos_versao) VALUES ('Admin E2E', $1, $2, 'ADMIN', now(), 'x')`,
    [EMAIL_ADMIN, await bcrypt.hash(SENHA, 11)]);
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  if (await page.$('[data-auth=entrar]')) await page.click('[data-auth=entrar]');
  await page.waitForSelector('#fEmail');
  await page.type('#fEmail', EMAIL_ADMIN); await page.type('#fPass', SENHA);
  await page.click('#authForm button[type=submit]'); await sleep(1500);
  if (await page.$('[data-mclose2]')) await page.click('[data-mclose2]');
  ok(`admin: as ${TELAS.length + 1} telas abrem sem erro`, await percorrerTelas([...TELAS, 'provas'], 'admin'));
  const abas = await page.$$eval('[data-atab]', (bs) => bs.map((b) => b.dataset.atab));
  const errosAntesAbas = erros.length;
  for (const aba of abas) { await page.click(`[data-atab="${aba}"]`); await sleep(1200); }
  await foto('8-admin-painel');
  ok(`admin: as ${abas.length} abas do painel abrem sem erro`, abas.length > 0 && erros.length === errosAntesAbas);

  // 6) Celular
  await page.setViewport({ width: 390, height: 844 }); await page.reload({ waitUntil: 'networkidle0' });
  await foto('7-login-celular');
  ok('sem erros de JavaScript na página', erros.length === 0);
  if (erros.length) console.log('Erros de JavaScript:\n  ' + erros.join('\n  '));
} finally {
  await browser?.close().catch(() => {});
  await limpar().catch(() => {});
  if (provaE2E) await db.query('DELETE FROM provas WHERE id=$1', [provaE2E]).catch(() => {});
  // O login do teste conta no limite de tentativas por IP: zera só esse contador para não atrapalhar quem usa o app local
  await db.query("DELETE FROM limites_requisicao WHERE chave LIKE '%:auth:%'").catch(() => {});
  await db.end();
}

for (const r of resultados) console.log(`${r.ok ? 'OK    ' : 'FALHOU'} ${r.nome}`);
const falhas = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} ok · capturas em ${path.relative(process.cwd(), CAPTURAS)}`);
process.exit(falhas ? 1 : 0);
