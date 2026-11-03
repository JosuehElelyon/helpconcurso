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
