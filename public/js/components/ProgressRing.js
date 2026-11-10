// Componente UI puro: anel circular SVG de progresso (%).
export function ProgressRing({ pct = 0, size = 76, strokeWidth = 8, color = 'var(--brand)', textColor = 'var(--ink)' }) {
  const half = size / 2;
  const r = half - strokeWidth;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const off = c - (clamped / 100) * c;
  const fontSize = Math.round(size * 0.2);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut">
    <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="${strokeWidth}"/>
    <circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${half} ${half})"/>
    <text x="${half}" y="${half + Math.round(fontSize * 0.35)}" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="${textColor}">${Math.round(clamped)}%</text>
  </svg>`;
}
