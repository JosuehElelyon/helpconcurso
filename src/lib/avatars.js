// =========================================================
// HelpConcurso — Catálogo de avatares pré-definidos e validação de imagens
// =========================================================

export const PRESET_AVATARS = [
  { id: 'avatar-1.svg', nome: 'Estudante Focado', categoria: 'Estudo', url: '/avatars/avatar-1.svg' },
  { id: 'avatar-2.svg', nome: 'Café & Livros', categoria: 'Estudo', url: '/avatars/avatar-2.svg' },
  { id: 'avatar-3.svg', nome: 'Tribunais & Justiça', categoria: 'Carreira', url: '/avatars/avatar-3.svg' },
  { id: 'avatar-4.svg', nome: 'Carreira Policial', categoria: 'Carreira', url: '/avatars/avatar-4.svg' },
  { id: 'avatar-5.svg', nome: 'Auditor & Fiscal', categoria: 'Carreira', url: '/avatars/avatar-5.svg' },
  { id: 'avatar-6.svg', nome: 'Coruja da Sabedoria', categoria: 'Mascote', url: '/avatars/avatar-6.svg' },
  { id: 'avatar-7.svg', nome: 'Leão da Aprovação', categoria: 'Mascote', url: '/avatars/avatar-7.svg' },
  { id: 'avatar-8.svg', nome: 'Diplomata & Gestão', categoria: 'Carreira', url: '/avatars/avatar-8.svg' },
  { id: 'avatar-9.svg', nome: 'Mente Zen & Foco', categoria: 'Estudo', url: '/avatars/avatar-9.svg' },
  { id: 'avatar-10.svg', nome: 'Rumo à Posse', categoria: 'Geral', url: '/avatars/avatar-10.svg' },
];

export const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Detecta o tipo real da imagem a partir dos "magic bytes" do buffer.
 * Permite somente formatos raster seguros (PNG, JPEG, WebP, GIF).
 * Rejeita explicitamente SVG enviado pelo usuário (para prevenir XSS via XML embutido).
 */
export function detectImageType(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // WebP: 'RIFF'....'WEBP'
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // GIF: GIF87a ou GIF89a
  const head6 = buf.subarray(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') {
    return { mime: 'image/gif', ext: 'gif' };
  }

  return null;
}

// ---------- Remoção de metadados (privacidade) ----------
// A foto fica num link público: tiramos EXIF (GPS, modelo do celular, data), XMP, IPTC e comentários.
// No JPEG mantemos só a orientação (senão a foto do celular aparece deitada). Imagem malformada lança erro.

function orientacaoExif(seg) { // seg = dados do APP1 (sem marcador/tamanho)
  if (seg.length < 14 || seg.toString('latin1', 0, 6) !== 'Exif\0\0') return null;
  const t = seg.subarray(6), le = t.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = (o) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  const ifd = u32(4);
  if (ifd + 2 > t.length) return null;
  const n = u16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > t.length) return null;
    if (u16(e) === 0x0112) { const v = u16(e + 8); return v >= 1 && v <= 8 ? v : null; }
  }
  return null;
}

function app1SoOrientacao(v) { // EXIF mínimo: só a tag Orientation (0x0112)
  const tiff = Buffer.from([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, v, 0, 0, 0, 0, 0, 0]);
  const dados = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const cab = Buffer.alloc(4); cab[0] = 0xff; cab[1] = 0xe1; cab.writeUInt16BE(dados.length + 2, 2);
  return Buffer.concat([cab, dados]);
}

function limparJpeg(buf) {
  const partes = [buf.subarray(0, 2)];
  let i = 2, orient = null;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error('JPEG malformado');
    const m = buf[i + 1];
    if (m === 0xff) { i++; continue; } // preenchimento
    if (m === 0xd9 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { partes.push(buf.subarray(i, i + 2)); i += 2; continue; }
    if (i + 4 > buf.length) throw new Error('JPEG malformado');
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) throw new Error('JPEG malformado');
    const seg = buf.subarray(i, i + 2 + len);
    if (m === 0xda) { partes.push(buf.subarray(i)); i = buf.length; break; } // início dos dados da imagem
    if (m === 0xe1) orient = orient ?? orientacaoExif(seg.subarray(4));
    else if (!(m >= 0xe3 && m <= 0xef) && m !== 0xfe) partes.push(seg); // fica: APP0 (JFIF), APP2 (cor ICC), tabelas, quadro
    i += 2 + len;
  }
  if (orient && orient !== 1) partes.splice(1, 0, app1SoOrientacao(orient));
  return Buffer.concat(partes);
}

const PNG_DESCARTE = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
function limparPng(buf) {
  const partes = [buf.subarray(0, 8)];
  let i = 8;
  while (i < buf.length) {
    if (i + 12 > buf.length) throw new Error('PNG malformado');
    const len = buf.readUInt32BE(i), tipo = buf.toString('latin1', i + 4, i + 8), fim = i + 12 + len;
    if (fim > buf.length) throw new Error('PNG malformado');
    if (!PNG_DESCARTE.has(tipo)) partes.push(buf.subarray(i, fim));
    i = fim;
    if (tipo === 'IEND') break;
  }
  return Buffer.concat(partes);
}

function limparWebp(buf) {
  const partes = [];
  let i = 12;
  while (i < buf.length) {
    if (i + 8 > buf.length) throw new Error('WebP malformado');
    const tipo = buf.toString('latin1', i, i + 4), len = buf.readUInt32LE(i + 4), fim = i + 8 + len + (len & 1);
    if (i + 8 + len > buf.length) throw new Error('WebP malformado');
    const ch = Buffer.from(buf.subarray(i, Math.min(fim, buf.length)));
    if (tipo === 'VP8X' && len >= 1) ch[8] &= ~0x0c; // desliga as flags de EXIF (0x08) e XMP (0x04)
    if (tipo !== 'EXIF' && tipo !== 'XMP ') partes.push(ch);
    i = fim;
  }
  const corpo = Buffer.concat(partes), cab = Buffer.from(buf.subarray(0, 12));
  cab.writeUInt32LE(corpo.length + 4, 4);
  return Buffer.concat([cab, corpo]);
}

export function stripImageMetadata(buf, ext) {
  if (ext === 'jpg') return limparJpeg(buf);
  if (ext === 'png') return limparPng(buf);
  if (ext === 'webp') return limparWebp(buf);
  return buf; // GIF não carrega EXIF
}

