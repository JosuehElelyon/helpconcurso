// =========================================================
// Testes unitários e de integração de Avatares (presets, magic bytes e storage)
// =========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESET_AVATARS, MAX_AVATAR_BYTES, detectImageType } from '../src/lib/avatars.js';
import { putFile, getFile, deleteFile } from '../src/lib/storage.js';
import { migrate, one, query } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('detectImageType: reconhece corretamente PNG pelos magic bytes', () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const res = detectImageType(pngHeader);
  assert.deepEqual(res, { mime: 'image/png', ext: 'png' });
});

test('detectImageType: reconhece corretamente JPEG pelos magic bytes', () => {
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const res = detectImageType(jpegHeader);
  assert.deepEqual(res, { mime: 'image/jpeg', ext: 'jpg' });
});

test('detectImageType: reconhece corretamente WebP pelos magic bytes (RIFF...WEBP)', () => {
  const webpHeader = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x20, 0x00, 0x00, 0x00]),
    Buffer.from('WEBPVP8 '),
  ]);
  const res = detectImageType(webpHeader);
  assert.deepEqual(res, { mime: 'image/webp', ext: 'webp' });
});

test('detectImageType: reconhece corretamente GIF (GIF87a e GIF89a)', () => {
  const gif87 = Buffer.from('GIF87a\x01\x00\x01\x00\x80\x00\x00');
  const gif89 = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00');
  assert.deepEqual(detectImageType(gif87), { mime: 'image/gif', ext: 'gif' });
  assert.deepEqual(detectImageType(gif89), { mime: 'image/gif', ext: 'gif' });
});

test('detectImageType: rejeita explicitamente SVG, HTML, executáveis e arquivos falsos', () => {
  // SVG de usuário não pode ser enviado para evitar XSS em navegadores
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(detectImageType(svg), null);

  // HTML
  assert.equal(detectImageType(Buffer.from('<!DOCTYPE html><html><body>oi</body></html>')), null);

  // Executável MZ
  assert.equal(detectImageType(Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff')), null);

  // Texto comum ou nulo
  assert.equal(detectImageType(Buffer.from('Texto qualquer em utf-8')), null);
  assert.equal(detectImageType(null), null);
  assert.equal(detectImageType(Buffer.alloc(4)), null);
});

test('PRESET_AVATARS: catálogo contém 10 avatares temáticos e todos os SVGs existem e são válidos', async () => {
  assert.equal(PRESET_AVATARS.length, 10);
  const publicDir = path.join(__dirname, '..', 'public');

  for (const preset of PRESET_AVATARS) {
    assert.ok(preset.id.startsWith('avatar-') && preset.id.endsWith('.svg'), `ID inválido: ${preset.id}`);
    assert.ok(preset.nome, `Falta nome para ${preset.id}`);
    assert.ok(preset.categoria, `Falta categoria para ${preset.id}`);
    assert.equal(preset.url, `/avatars/${preset.id}`);

    const filePath = path.join(publicDir, 'avatars', preset.id);
    const content = await fs.readFile(filePath, 'utf8');
    assert.ok(content.includes('<svg'), `Arquivo ${preset.id} não contém tag <svg>`);
    assert.ok(content.includes('</svg>'), `Arquivo ${preset.id} não contém tag </svg>`);
    assert.ok(content.includes('viewBox="0 0 128 128"'), `Arquivo ${preset.id} deve ter viewBox="0 0 128 128"`);
  }
});

test('banco de dados: users possui colunas avatar_url e avatar_key', async () => {
  await migrate();
  const colunas = (await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('avatar_url', 'avatar_key')
  `)).rows.map((r) => r.column_name);

  assert.ok(colunas.includes('avatar_url'), 'users.avatar_url deve existir');
  assert.ok(colunas.includes('avatar_key'), 'users.avatar_key deve existir');
});

test('storage: putFile, getFile e deleteFile manipulam chave de avatar corretamente', async () => {
  const key = `avatars/teste-${Date.now()}.png`;
  const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03, 0x04]);

  await putFile(key, fakePng, 'image/png');
  const recuperado = await getFile(key);
  assert.ok(recuperado.buffer.equals(fakePng));
  assert.equal(recuperado.contentType, 'image/png');

  await deleteFile(key);
  // Após exclusão, getFile deve lançar erro
  await assert.rejects(getFile(key));
});

// ---------- Remoção de metadados (privacidade da foto pública) ----------
import { stripImageMetadata } from '../src/lib/avatars.js';

const seg = (marker, dados) => { const c = Buffer.alloc(4); c[0] = 0xff; c[1] = marker; c.writeUInt16BE(dados.length + 2, 2); return Buffer.concat([c, dados]); };
function exifCom(orient, extra = 'GPS-LATITUDE-SECRETA') { // TIFF little-endian com Orientation + um texto qualquer
  const tiff = Buffer.alloc(8 + 2 + 12 + 4);
  tiff.write('II', 0, 'latin1'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orient, 18);
  return Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, Buffer.from(extra)]);
}
const jpeg = (...segs) => Buffer.concat([Buffer.from([0xff, 0xd8]), ...segs, Buffer.from([0xff, 0xda, 0, 4, 1, 2, 0xaa, 0xbb, 0xff, 0xd9])]);

test('stripImageMetadata: JPEG perde EXIF/GPS, comentário e XMP, mas mantém orientação e os dados da imagem', () => {
  const orig = jpeg(seg(0xe0, Buffer.from('JFIF\0\x01\x01')), seg(0xe1, exifCom(6)), seg(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>autor</x:xmpmeta>')), seg(0xfe, Buffer.from('comentario')));
  const limpo = stripImageMetadata(orig, 'jpg');
  const txt = limpo.toString('latin1');
  assert.ok(!txt.includes('GPS-LATITUDE-SECRETA') && !txt.includes('xmpmeta') && !txt.includes('comentario'));
  assert.ok(txt.includes('JFIF'));
  assert.deepEqual([...limpo.subarray(-6)], [1, 2, 0xaa, 0xbb, 0xff, 0xd9]);
  // a orientação 6 (foto de celular "em pé") continua lá
  assert.ok(limpo.includes(Buffer.from([0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6])));
  // sem orientação (ou orientação 1) não sobra nenhum APP1
  const semRot = stripImageMetadata(jpeg(seg(0xe1, exifCom(1))), 'jpg');
  assert.ok(!semRot.includes(Buffer.from('Exif')));
});

test('stripImageMetadata: PNG perde eXIf/tEXt e WebP perde EXIF/XMP com cabeçalho RIFF corrigido', () => {
  const chunk = (tipo, dados) => { const c = Buffer.alloc(8); c.writeUInt32BE(dados.length, 0); c.write(tipo, 4, 'latin1'); return Buffer.concat([c, dados, Buffer.alloc(4)]); };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', Buffer.alloc(13)), chunk('tEXt', Buffer.from('Author\0Fulano')), chunk('eXIf', Buffer.from('GPS')), chunk('IDAT', Buffer.from('pix')), chunk('IEND', Buffer.alloc(0))]);
  const p = stripImageMetadata(png, 'png').toString('latin1');
  assert.ok(p.includes('IHDR') && p.includes('IDAT') && p.includes('IEND') && !p.includes('Fulano') && !p.includes('eXIf'));

  const wch = (tipo, dados) => { const c = Buffer.alloc(8); c.write(tipo, 0, 'latin1'); c.writeUInt32LE(dados.length, 4); return Buffer.concat([c, dados, Buffer.alloc(dados.length & 1)]); };
  const corpo = Buffer.concat([wch('VP8X', Buffer.from([0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0])), wch('VP8 ', Buffer.from('imagem')), wch('EXIF', Buffer.from('GPS-SECRETO')), wch('XMP ', Buffer.from('xmp'))]);
  const cab = Buffer.from('RIFF0000WEBP', 'latin1'); cab.writeUInt32LE(corpo.length + 4, 4);
  const w = stripImageMetadata(Buffer.concat([cab, corpo]), 'webp');
  assert.ok(!w.toString('latin1').includes('GPS-SECRETO') && w.toString('latin1').includes('imagem'));
  assert.equal(w.readUInt32LE(4), w.length - 8);
  assert.equal(w[20] & 0x0c, 0); // flags de EXIF/XMP desligadas no VP8X
});

test('stripImageMetadata: imagem malformada é recusada', () => {
  assert.throws(() => stripImageMetadata(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0]), 'jpg'));
  assert.throws(() => stripImageMetadata(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0xff, 0xff, 0x49, 0x44, 0x41, 0x54])]), 'png'));
});
