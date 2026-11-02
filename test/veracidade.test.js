import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarUrlOficial } from '../src/lib/bancas.js';

test('validarUrlOficial: aceita sites oficiais primários das bancas organizadoras', () => {
  // Cebraspe
  const c1 = validarUrlOficial('cebraspe', 'https://www.cebraspe.org.br/concursos/inss_22');
  assert.equal(c1.valida, true);
  assert.equal(c1.oficial, true);
  assert.equal(c1.tipo, 'banca');
  assert.equal(c1.dominio, 'cebraspe.org.br');

  const c2 = validarUrlOficial('cebraspe', 'http://cespe.unb.br/concursos/tcu_2020');
  assert.equal(c2.valida, true);
  assert.equal(c2.tipo, 'banca');

  // FGV
  const fgv = validarUrlOficial('fgv', 'https://conhecimento.fgv.br/concursos/receita-federal');
  assert.equal(fgv.valida, true);
  assert.equal(fgv.oficial, true);
  assert.equal(fgv.tipo, 'banca');
  assert.equal(fgv.dominio, 'conhecimento.fgv.br');

  // FCC
  const fcc = validarUrlOficial('fcc', 'https://www.concursosfcc.com.br/concursos/tst2024/index.html');
  assert.equal(fcc.valida, true);
  assert.equal(fcc.tipo, 'banca');
  assert.equal(fcc.dominio, 'concursosfcc.com.br');

  // Vunesp
  const vunesp = validarUrlOficial('vunesp', 'https://www.vunesp.com.br/TJSP2301');
  assert.equal(vunesp.valida, true);
  assert.equal(vunesp.tipo, 'banca');
  assert.equal(vunesp.dominio, 'vunesp.com.br');

  // Cesgranrio
  const cesg = validarUrlOficial('cesgranrio', 'https://www.cesgranrio.org.br/concursos/evento.aspx?id=cnu2024');
  assert.equal(cesg.valida, true);
  assert.equal(cesg.tipo, 'banca');
  assert.equal(cesg.dominio, 'cesgranrio.org.br');
});

test('validarUrlOficial: aceita Diários Oficiais e portais governamentais oficiais para qualquer banca', () => {
  // Diário Oficial da União (Imprensa Nacional)
  const dou = validarUrlOficial('cebraspe', 'https://www.in.gov.br/en/web/dou/-/edital-n-1-de-8-de-dezembro-de-2023-532187654');
  assert.equal(dou.valida, true);
  assert.equal(dou.oficial, true);
  assert.equal(dou.tipo, 'diario_oficial');

  // Imprensa Oficial
  const io = validarUrlOficial('vunesp', 'https://www.imprensaoficial.com.br/doe/edital.pdf');
  assert.equal(io.valida, true);
  assert.equal(io.tipo, 'diario_oficial');

  // Poder Judiciário (.jus.br)
  const tj = validarUrlOficial('fgv', 'https://concursos.tjdft.jus.br/editais/edital-abertura.pdf');
  assert.equal(tj.valida, true);
  assert.equal(tj.tipo, 'orgao_publico');

  // Poder Legislativo (.leg.br)
  const leg = validarUrlOficial('fcc', 'https://www.al.sp.leg.br/concurso/edital_2024.pdf');
  assert.equal(leg.valida, true);
  assert.equal(leg.tipo, 'orgao_publico');

  // Portal de órgão executivo (.gov.br)
  const gov = validarUrlOficial('cesgranrio', 'https://www.gov.br/mgi/pt-br/acesso-a-informacao/concursos/cnu/edital');
  assert.equal(gov.valida, true);
  assert.equal(gov.tipo, 'orgao_publico');
});

test('validarUrlOficial: rejeita cursinhos preparatórios, blogs e drives privados com motivo claro', () => {
  const cursinhos = [
    'https://www.estrategiaconcursos.com.br/blog/edital-receita-federal/',
    'https://grancursosonline.com.br/concurso/policia-federal-pf',
    'https://folhadirigida.com.br/concursos/noticias/inss-edital-publicado',
    'https://www.qconcursos.com.br/questoes-de-concursos/provas/inss-2022',
    'https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing',
    'https://www.dropbox.com/s/xyz123/prova_comentada.pdf?dl=0',
  ];

  for (const url of cursinhos) {
    const res = validarUrlOficial('cebraspe', url);
    assert.equal(res.valida, false, `Deveria rejeitar: ${url}`);
    assert.equal(res.oficial, false);
    assert.equal(res.tipo, 'nao_oficial');
    assert.match(res.motivo, /cursinho|repositório|particular/i);
  }
});

test('validarUrlOficial: detecta divergência quando a URL pertence a outra banca', () => {
  // Usuário selecionou FGV, mas colou link do Cebraspe
  const res = validarUrlOficial('fgv', 'https://www.cebraspe.org.br/concursos/prf_21');
  assert.equal(res.valida, false);
  assert.equal(res.oficial, true); // O site é oficial, porém de outra banca!
  assert.equal(res.tipo, 'banca_divergente');
  assert.match(res.motivo, /CEBRASPE/);
  assert.match(res.motivo, /FGV/);
});

test('validarUrlOficial: trata URLs malformadas, protocolos inválidos e domínios desconhecidos', () => {
  assert.equal(validarUrlOficial('fgv', '').valida, false);
  assert.equal(validarUrlOficial('fgv', null).valida, false);
  assert.equal(validarUrlOficial('fgv', 'javascript:alert(1)').valida, false);
  assert.equal(validarUrlOficial('fgv', 'ftp://cebraspe.org.br/prova.pdf').valida, false);

  const desc = validarUrlOficial('cebraspe', 'https://meu-blog-de-estudos.com/prova.pdf');
  assert.equal(desc.valida, false);
  assert.equal(desc.tipo, 'desconhecido');
});
