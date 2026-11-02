// V3: importação pelo link oficial — defesas contra SSRF e validação do arquivo baixado (sem rede: "obter" simulado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { ipNaoPublico, lookupSeguro, baixarDaFonteOficial } = await import('../src/lib/fonte-oficial.js');

const PDF = Buffer.from('%PDF-1.4\n%prova\n');
const resposta = (status, headers = {}, buffer = null) => async () => ({ status, headers, buffer });

test('ipNaoPublico: recusa redes internas, loopback, link-local, CGNAT e IPv6 local; aceita IP público', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.9', '172.31.255.255', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'lixo']) {
    assert.equal(ipNaoPublico(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '200.152.38.1', '172.32.0.1', '2804:14c::1', '64:ff9b::aaf6:ff09', '64:ff9b::170.246.255.9']) assert.equal(ipNaoPublico(ip), false, ip);
  assert.equal(ipNaoPublico('64:ff9b::7f00:1'), true, 'NAT64 de 127.0.0.1');
});

test('lookupSeguro: nome que resolve para endereço interno é recusado na conexão', async () => {
  const erro = await new Promise((res) => lookupSeguro('localhost', {}, (e) => res(e)));
  assert.equal(erro?.code, 'EDESTINO');
});

test('baixa o PDF do site da banca e devolve a URL final e o tipo da fonte', async () => {
  const d = await baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/provas/receita.pdf', { obter: resposta(200, { 'content-type': 'application/pdf' }, PDF) });
  assert.equal(d.name, 'receita.pdf');
  assert.equal(d.tipo, 'banca');
  assert.equal(d.url, 'https://conhecimento.fgv.br/provas/receita.pdf');
  assert.ok(d.buffer.equals(PDF));
});

test('segue redirecionamento só dentro das fontes oficiais', async () => {
  const chamadas = [];
  const obter = async (url) => {
    chamadas.push(url.toString());
    return chamadas.length === 1 ? { status: 302, headers: { location: 'https://arquivos.conhecimento.fgv.br/x.pdf' } } : { status: 200, headers: { 'content-type': 'application/pdf' }, buffer: PDF };
  };
  const d = await baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/provas/x', { obter });
  assert.equal(d.url, 'https://arquivos.conhecimento.fgv.br/x.pdf');
  // Redirecionar para fora do catálogo (ou para IP interno pelo nome) é recusado
  await assert.rejects(baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/provas/x', { obter: resposta(302, { location: 'https://evil.com/x.pdf' }) }), /fora das fontes oficiais/);
  await assert.rejects(baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/provas/x', { obter: resposta(302, { location: 'http://169.254.169.254/latest' }) }), /fora das fontes oficiais/);
});

test('recusa: domínio fora do catálogo, http, página HTML, erro da fonte e excesso de redirecionamentos', async () => {
  const pdf = resposta(200, { 'content-type': 'application/pdf' }, PDF);
  await assert.rejects(baixarDaFonteOficial('fgv', 'https://www.qconcursos.com/prova.pdf', { obter: pdf }), /cursinho/);
  await assert.rejects(baixarDaFonteOficial('fgv', 'http://conhecimento.fgv.br/prova.pdf', { obter: pdf }), /https/);
  await assert.rejects(baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/concurso', { obter: resposta(200, { 'content-type': 'text/html; charset=utf-8' }, Buffer.from('<html>')) }), /página/);
  await assert.rejects(baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/x.pdf', { obter: resposta(404) }), /404/);
  await assert.rejects(baixarDaFonteOficial('fgv', 'https://conhecimento.fgv.br/x', { obter: resposta(301, { location: 'https://conhecimento.fgv.br/x' }) }), /redireciona demais/);
});
