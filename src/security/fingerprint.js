// Impressão digital de texto (MinHash) para achar a MESMA prova em arquivos diferentes
// (outro PDF, versão escaneada, nome diferente). Compara o início do texto (~1.200 palavras).
const N = 64;
const SEEDS = Array.from({ length: N }, (_, i) => (Math.imul(i + 1, 0x9e3779b1) >>> 0));
function fnv(str, seed) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13;
  return h >>> 0;
}
export function normalizeForFingerprint(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/---\s*pagina\s*\d+\s*---/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}
export function fingerprint(text, maxWords = 1200) {
  const w = normalizeForFingerprint(text).split(' ').filter((x) => x.length > 1).slice(0, maxWords);
  if (w.length < 30) return null;
  const sh = new Set();
  for (let i = 0; i + 5 <= w.length; i++) sh.add(w.slice(i, i + 5).join(' '));
  const mins = new Array(N).fill(0xffffffff);
  for (const s of sh) for (let k = 0; k < N; k++) { const h = fnv(s, SEEDS[k]); if (h < mins[k]) mins[k] = h; }
  return mins;
}
export function similarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let eq = 0; for (let i = 0; i < a.length; i++) if (a[i] === b[i]) eq++;
  return eq / a.length;
}
