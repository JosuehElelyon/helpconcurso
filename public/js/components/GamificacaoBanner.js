// Componente UI puro: faixa de patente, XP e estatísticas acumuladas (mapeia nivelId do backend).
import { esc } from '../util.js';

const PATENTES_UI = {
  desbravador: { nome: 'Desbravador', icone: '🌱', cor: '#10B981' },
  focado: { nome: 'Focado', icone: '🎯', cor: '#0E7A65' },
  estrategista: { nome: 'Estrategista', icone: '🧠', cor: '#2563EB' },
  implacavel: { nome: 'Implacável', icone: '🔥', cor: '#F59E0B' },
  elite: { nome: 'Elite da Aprovação', icone: '🏆', cor: '#7C3AED' },
  lenda: { nome: 'Lenda dos Concursos', icone: '👑', cor: '#DC2626' },
};

export function GamificacaoBanner({ gamificacao = {} }) {
  const g = gamificacao || {};
  const pat = PATENTES_UI[g.nivelId] || PATENTES_UI.desbravador;
  const prox = g.proximoNivelId ? PATENTES_UI[g.proximoNivelId] : null;

  return `<div class="metas-hero-gamified">
    <div class="metas-patente-box">
      <div class="metas-patente-medal" style="--p-cor:${pat.cor}">${pat.icone}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:15px;font-weight:800;color:var(--ink)">Patente: ${esc(pat.nome)}</span>
          <span class="badge brand" style="font-size:11.5px">${(g.xp || 0).toLocaleString('pt-BR')} XP</span>
        </div>
        <div class="metas-xp-track">
          <div class="metas-xp-fill" style="width:${g.progressoNivelPct || 0}%"></div>
        </div>
        <div class="hint" style="font-size:12px">
          ${prox
            ? `Faltam <b>${(g.xpParaProximo || 0).toLocaleString('pt-BR')} XP</b> para alcançar ${prox.icone} <b>${esc(prox.nome)}</b>`
            : 'Você alcançou a patente máxima! Mantenha o ritmo rumo à posse.'}
        </div>
      </div>
    </div>

    <div class="metas-stats-pills">
      <div class="metas-stat-pill">
        <b>⭐ ${g.estrelasTotal || 0}</b>
        <span>Estrelas</span>
      </div>
      <div class="metas-stat-pill">
        <b>✅ ${g.totalAcertos || 0}</b>
        <span>Acertos (${g.taxaAcertoHistorico || 0}%)</span>
      </div>
      <div class="metas-stat-pill">
        <b>📅 ${g.diasAtivos || 0}</b>
        <span>Dias ativos</span>
      </div>
    </div>
  </div>`;
}
