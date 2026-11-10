// A4 — camadas do back: SQL só em repositories/. Rotas e serviços não importam o banco (exceto a saúde do serviço).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', 'src');
const PERMITIDOS = new Set(['routes/sistema.js']); // /health usa db.ping()

function arquivos(pasta) {
  return fs.readdirSync(path.join(RAIZ, pasta)).filter((f) => f.endsWith('.js')).map((f) => `${pasta}/${f}`);
}

test('A4: rotas e serviços não importam src/db.js (SQL só em repositories/)', () => {
  const violacoes = [...arquivos('routes'), ...arquivos('services')]
    .filter((f) => !PERMITIDOS.has(f))
    .filter((f) => /from\s+['"]\.\.\/db\.js['"]/.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
  assert.deepEqual(violacoes, [], `Mova o SQL destes arquivos para repositories/: ${violacoes.join(', ')}`);
});

test('A4: rotas não importam repositories/ (passam pelo serviço)', () => {
  const violacoes = arquivos('routes')
    .filter((f) => /from\s+['"]\.\.\/repositories\//.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
  assert.deepEqual(violacoes, [], `Rota deve chamar um serviço: ${violacoes.join(', ')}`);
});
