// =====================================================================
// Sprint 5 — Testes automatizados: "Por que errei?" sob Demanda (F4)
// Cache global, analogias do cotidiano, fundamentação legal e diagrama SVG
// =====================================================================
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, one, query } from '../src/db.js';
import { obterOuGerarExplicacao, sanitizeSvg, calcularQuestaoHash } from '../src/services/explicacao.js';
import { HttpError } from '../src/lib/http.js';

after(() => pool.end());

const RUN = Date.now().toString(36);

async function getOrCreateTestUser(role = 'USER') {
  const email = `aluno-explicacao-${RUN}@teste.com`;
  let u = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!u) {
    u = await one(
      `INSERT INTO users (name, email, password_hash, role, plano)
       VALUES ($1, $2, 'hash', $3, 'aprovacao') RETURNING *`,
      [`Aluno Explicacao ${RUN}`, email, role]
    );
  }
  return u;
}

test('F4: sanitizeSvg descarta SVG perigoso (inclusive variações que furavam a regex) e preserva o legítimo', () => {
  const dangerous = `
    <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
      <script>alert('xss')</script>
      <rect width="100" height="100" onclick="alert('click')" fill="#fff" />
      <a href="javascript:steal()"><text x="10" y="20">Link perigoso</text></a>
    </svg>
  `;
  assert.equal(sanitizeSvg(dangerous), '', 'SVG com script/evento/link perigoso é descartado inteiro');
  const bypasses = [
    '<svg><rect onload=alert(1) /></svg>',
    '<svg><a href=" &#106;avascript:x"><text>x</text></a></svg>',
    '<svg><foreignObject><div>x</div></foreignObject></svg>',
    '<svg><image href="https://evil.example/x.png"/></svg>',
  ];
  for (const b of bypasses) assert.equal(sanitizeSvg(b), '', b);
  const ok = sanitizeSvg('<svg viewBox="0 0 10 10"><rect width="5" height="5" fill="#fff"/><text x="1" y="2">Data: art. 5º</text></svg>');
  assert.ok(ok.includes('<rect') && ok.includes('art. 5º'), 'SVG legítimo é preservado');
});

test('F4: calcularQuestaoHash gera hash determinístico e estável para enunciados iguais', () => {
  const h1 = calcularQuestaoHash('Acerca dos atos administrativos, julgue o item.', ['A', 'B']);
  const h2 = calcularQuestaoHash('Acerca dos atos administrativos,  julgue o item. ', ['A', 'B']);
  assert.equal(h1, h2, 'Normalização deve resultar em hashes idênticos para variações de espaço e pontuação');
});

test('F4: obterOuGerarExplicacao recusa quando o aluno acertou a questão (HTTP 400)', async () => {
  const user = await getOrCreateTestUser();
  const questao = {
    enunciado: 'O ato administrativo vinculado admite discricionariedade?',
    alternativas: ['Sim', 'Não'],
    gabarito: 'B',
  };

  await assert.rejects(
    () => obterOuGerarExplicacao({
      user,
      questao,
      respostaAluno: 'B', // Resposta certa!
      banca: 'cebraspe',
      materia: 'Direito Administrativo',
      formato: 'me',
    }),
    (err) => err instanceof HttpError && err.status === 400
  );
});

test('F4: obterOuGerarExplicacao gera na primeira vez (cache miss) e grava no banco de dados', async () => {
  const user = await getOrCreateTestUser();
  const questao = {
    enunciado: `Questão de Atos Administrativos para teste de explicação ${RUN}`,
    alternativas: ['Competência discricionária', 'Forma livre', 'Finalidade pública', 'Objeto ilícito', 'Motivo dispensado'],
    gabarito: 'C',
  };

  const res1 = await obterOuGerarExplicacao({
    user,
    questao,
    respostaAluno: 'A', // Errou
    banca: 'fgv',
    materia: 'Direito Administrativo',
    formato: 'me',
  });

  assert.equal(res1.cached, false, 'Primeira chamada deve ser cache miss');
  assert.ok(res1.explicacao, 'Deve retornar a explicação gerada');
  assert.ok(res1.explicacao.diagnostico, 'Deve conter diagnóstico');
  assert.ok(res1.explicacao.pegadinha, 'Deve conter a pegadinha');
  assert.ok(res1.explicacao.exemploCotidiano, 'Deve conter analogia do cotidiano');
  assert.ok(res1.explicacao.fundamentacao, 'Deve conter fundamentação legal');
  assert.ok(res1.explicacao.dicaOuro, 'Deve conter dica de ouro');
  assert.ok(res1.explicacao.visualSvg, 'Deve conter diagrama visual SVG');

  // Segunda chamada com os mesmos parâmetros para a mesma questão
  const res2 = await obterOuGerarExplicacao({
    user,
    questao,
    respostaAluno: 'A',
    banca: 'fgv',
    materia: 'Direito Administrativo',
    formato: 'me',
  });

  assert.equal(res2.cached, true, 'Segunda chamada para a mesma questão e alternativa deve ser cache hit (custo zero)');
  assert.equal(res2.explicacao.id, res1.explicacao.id, 'Deve retornar o mesmo registro do banco');
  assert.equal(res2.explicacao.diagnostico, res1.explicacao.diagnostico);
});

test('F4: cache global é compartilhado entre usuários diferentes para a mesma questão', async () => {
  const user1 = await getOrCreateTestUser();
  const user2 = await one(
    `INSERT INTO users (name, email, password_hash, role, plano)
     VALUES ($1, $2, 'hash', 'USER', 'gratis') RETURNING *`,
    [`Outro Aluno ${RUN}`, `outro-aluno-${RUN}@teste.com`]
  );

  const questao = {
    enunciado: `Questão Compartilhada Globalmente ${RUN}`,
    alternativas: ['Alt 1', 'Alt 2', 'Alt 3', 'Alt 4', 'Alt 5'],
    gabarito: 'E',
  };

  // Aluno 1 erra marcando 'B' -> gera
  const r1 = await obterOuGerarExplicacao({
    user: user1,
    questao,
    respostaAluno: 'B',
    banca: 'cebraspe',
    materia: 'Direito Constitucional',
    formato: 'me',
  });
  assert.equal(r1.cached, false);

  // Aluno 2 erra marcando 'B' -> recebe instantaneamente do cache global
  const r2 = await obterOuGerarExplicacao({
    user: user2,
    questao,
    respostaAluno: 'B',
    banca: 'cebraspe',
    materia: 'Direito Constitucional',
    formato: 'me',
  });
  assert.equal(r2.cached, true, 'Aluno 2 deve receber do cache global gravado pelo Aluno 1');
  assert.equal(r2.explicacao.id, r1.explicacao.id);
});

test('F4: questão vinculada a prova_questoes (com id UUID) consulta e armazena questao_id', async () => {
  const user = await getOrCreateTestUser();
  const prova = await one(
    `INSERT INTO provas (banca, banca_informada, file_name, file_key, status, titulo, text)
     VALUES ('fcc', 'fcc', 'fcc.pdf', 'fcc/p', 'READY', 'Prova FCC Teste', 'texto') RETURNING id`
  );
  const qDb = await one(
    `INSERT INTO prova_questoes (prova_id, banca, materia, numero, enunciado, alternativas, gabarito, topico)
     VALUES ($1, 'fcc', 'Direito Tributário', 1, $2, '["Imunidade","Isenção","Não incidência","Anistia","Remissão"]'::jsonb, 'A', 'Imunidades') RETURNING *`,
    [prova.id, `Enunciado FCC com UUID ${RUN}`]
  );

  const res = await obterOuGerarExplicacao({
    user,
    questao: {
      id: qDb.id,
      enunciado: qDb.enunciado,
      alternativas: qDb.alternativas,
      gabarito: qDb.gabarito,
      materia: qDb.materia,
    },
    respostaAluno: 'B',
    banca: 'fcc',
    materia: 'Direito Tributário',
    formato: 'me',
  });

  assert.equal(res.cached, false);
  const row = await one('SELECT questao_id FROM questao_explicacoes WHERE id=$1', [res.explicacao.id]);
  assert.equal(row.questao_id, qDb.id, 'Deve associar o questao_id da prova_questoes ao registro de explicação');
});

