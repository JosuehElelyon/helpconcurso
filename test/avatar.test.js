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
