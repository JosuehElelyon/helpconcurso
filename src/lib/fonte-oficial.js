// Importação pelo link oficial (V3 em docs/PLANO-ACAO.md): o servidor baixa a prova/edital direto do site da banca,
// do Diário Oficial ou de órgão público. É o que permite marcar oficial_confirmado=true — a origem do arquivo é conhecida.
//
// Defesas contra SSRF (o servidor buscar algo que não deveria):
// - só https e só domínios do catálogo (validarUrlOficial), inclusive em cada redirecionamento (máx. 3);
// - o IP é checado NA CONEXÃO (lookup próprio): IP privado, loopback, link-local, CGNAT etc. é recusado — isso também
//   fecha o DNS rebinding (o nome não pode resolver para um IP público na validação e um interno na conexão);
// - limite de tamanho (UPLOAD_MAX_MB) e de tempo (20 s); página HTML é recusada (o link tem de ser do arquivo).
// O arquivo baixado segue o mesmo caminho de um upload (secureUpload): antivírus, macros, texto escondido, injeção.
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { validarUrlOficial } from './bancas.js';
import { HttpError } from './http.js';
import { fixName } from './upload.js';
import { config } from '../config.js';

const v4ParaNum = (ip) => ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
const BLOQUEIOS_V4 = [ // [início, prefixo]
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([ini, pre]) => [v4ParaNum(ini), 2 ** (32 - pre)]);

/** true para qualquer IP que não seja público na internet (o servidor nunca deve se conectar a ele por um link de usuário). */
export function ipNaoPublico(ip) {
  if (net.isIPv4(ip)) { const n = v4ParaNum(ip); return BLOQUEIOS_V4.some(([ini, tam]) => n >= ini && n < ini + tam); }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    const mapeado = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapeado) return ipNaoPublico(mapeado[1]);
    // NAT64 (64:ff9b::/96, redes com DNS64): vale o IPv4 embutido nos últimos 32 bits
    const nat64 = s.match(/^64:ff9b::(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
    if (nat64) {
      if (nat64[1]) return ipNaoPublico(nat64[1]);
      const n = parseInt(nat64[2], 16) * 65536 + parseInt(nat64[3], 16);
      return ipNaoPublico([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'));
    }
    return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s) || s.startsWith('2001:db8') || s.startsWith('64:ff9b');
  }
  return true;
}

// Lookup usado na conexão: só entrega endereços públicos (a conexão nunca vai para um IP interno)
export function lookupSeguro(host, opts, cb) {
  dns.lookup(host, { all: true }, (err, addrs) => {
    if (err) return cb(err);
    const publicos = addrs.filter((a) => !ipNaoPublico(a.address));
    if (!publicos.length) return cb(Object.assign(new Error('Endereço de destino não permitido.'), { code: 'EDESTINO' }));
    if (opts?.all) cb(null, publicos); else cb(null, publicos[0].address, publicos[0].family);
  });
}

// GET https de baixo nível: devolve { status, headers, buffer }. Injetável nos testes.
function obterHttps(url, { maxBytes, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: lookupSeguro, timeout: timeoutMs, headers: { 'user-agent': 'HelpConcurso/1.4 (+importacao-de-fonte-oficial)', accept: '*/*' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) { res.resume(); return resolve({ status: res.statusCode, headers: res.headers, buffer: null }); }
      const tam = Number(res.headers['content-length'] || 0);
      if (tam > maxBytes) { res.destroy(); return reject(new HttpError(413, 'O arquivo da fonte oficial passa do tamanho máximo.')); }
      const partes = []; let total = 0;
      res.on('data', (c) => { total += c.length; if (total > maxBytes) { res.destroy(); reject(new HttpError(413, 'O arquivo da fonte oficial passa do tamanho máximo.')); } else partes.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(partes) }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new HttpError(504, 'A fonte oficial demorou demais para responder.')));
    req.on('error', (e) => reject(e instanceof HttpError ? e : new HttpError(502, e.code === 'EDESTINO' ? 'O link aponta para um endereço não permitido.' : 'Não foi possível baixar o arquivo da fonte oficial.')));
  });
}

const nomeDoArquivo = (url, headers) => {
  const cd = String(headers['content-disposition'] || '');
  const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
  let nome = m ? decodeURIComponent(m[1]) : decodeURIComponent(url.pathname.split('/').pop() || '') || 'documento-oficial';
  const tipo = String(headers['content-type'] || '');
  if (!/\.(pdf|docx?|txt)$/i.test(nome)) nome += /pdf/.test(tipo) ? '.pdf' : /wordprocessingml/.test(tipo) ? '.docx' : /msword/.test(tipo) ? '.doc' : /text\/plain/.test(tipo) ? '.txt' : '';
  return fixName(nome);
};

/**
 * Baixa o arquivo do link oficial. Devolve { buffer, name, mime, url, tipo } — url é o endereço final (após redirecionamentos).
 * @param {string} banca  banca informada ('' aceita site de qualquer banca do catálogo)
 */
export async function baixarDaFonteOficial(banca, rawUrl, { obter = obterHttps, maxBytes = config.security.uploadMaxMb * 1024 * 1024, timeoutMs = 20000 } = {}) {
  let v = validarUrlOficial(banca, rawUrl);
  if (!v.valida) throw new HttpError(422, v.motivo);
  let url = new URL(v.urlNormalizada);
  for (let salto = 0; salto <= 3; salto++) {
    if (url.protocol !== 'https:') throw new HttpError(422, 'Para importar pelo link, ele precisa começar com https://.');
    const r = await obter(url, { maxBytes, timeoutMs });
    if (r.status >= 300 && r.status < 400) {
      if (!r.headers.location || salto === 3) throw new HttpError(422, 'O link redireciona demais ou para lugar nenhum.');
      const destino = new URL(r.headers.location, url).toString();
      v = validarUrlOficial(banca, destino);
      if (!v.valida) throw new HttpError(422, `O link redireciona para fora das fontes oficiais (${v.dominio || 'endereço inválido'}).`);
      url = new URL(v.urlNormalizada);
      continue;
    }
    if (r.status !== 200) throw new HttpError(422, `A fonte oficial respondeu com erro (${r.status}). Confira o link.`);
    const tipo = String(r.headers['content-type'] || '').toLowerCase();
    if (tipo.includes('text/html')) throw new HttpError(422, 'Esse link abre uma página, não o arquivo. Use o link direto do PDF (ou DOCX) da prova/edital.');
    if (!r.buffer?.length) throw new HttpError(422, 'A fonte oficial devolveu um arquivo vazio.');
    return { buffer: r.buffer, name: nomeDoArquivo(url, r.headers), mime: tipo.split(';')[0] || 'application/octet-stream', url: url.toString(), tipo: v.tipo };
  }
  throw new HttpError(422, 'O link redireciona demais.');
}
