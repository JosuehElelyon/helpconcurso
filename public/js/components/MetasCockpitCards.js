// Componente UI puro: os 3 cards superiores gamificados do Cockpit de Metas.
import { ic } from '../icones.js';
import { esc } from '../util.js';
import { ProgressRing } from './ProgressRing.js';

export function CardMissaoHoje({ metaDiaria, metaSugerida, progressoHoje = {} }) {
  const pct = progressoHoje.percentual || 0;
  const done = !!progressoHoje.metaBatida;
  let badgeHoje = '🎯 Hora de começar!';
  if (done) badgeHoje = '🏆 Missão Cumprida!';
  else if (pct >= 50) badgeHoje = '🔥 Reta final hoje!';
  else if (pct > 0) badgeHoje = '⚡ Bom ritmo!';

  return `<div class="meta-card-g brand">
    <div class="meta-card-top">
      <span class="meta-card-lbl">Missão de Hoje</span>
      <span class="badge ${done ? 'ok' : 'brand'}" style="font-size:11px;font-weight:800">${badgeHoje}</span>
    </div>
    <div class="meta-card-body-row">
      ${ProgressRing({ pct, size: 68, strokeWidth: 7, color: done ? 'var(--ok)' : 'var(--brand)', textColor: done ? 'var(--ok)' : 'var(--brand)' })}
      <div>
        <div style="font-size:28px;font-weight:800;line-height:1.1;color:var(--ink)">
          ${progressoHoje.respondidas || 0} <span style="font-size:17px;color:var(--muted);font-weight:700">/ ${metaDiaria || metaSugerida}</span>
        </div>
        <div class="hint" style="font-weight:700;margin-top:4px">
          ${metaDiaria
            ? (done ? 'Você superou a meta do dia!' : `Faltam ${progressoHoje.restantes || 0} questões hoje`)
            : 'Defina e salve sua meta abaixo'}
        </div>
      </div>
    </div>
    <div style="padding-top:10px;border-top:1px solid var(--line-2);display:flex;justify-content:space-between;align-items:center;font-size:12px">
      <span class="hint">Acertos hoje: <b>${progressoHoje.acertos || 0}</b></span>
      <span style="color:var(--brand-ink);font-weight:700">${metaDiaria ? `${pct}% da missão` : `Meta sugerida: ${metaSugerida} q.`}</span>
    </div>
  </div>`;
}

export function CardChamasConstancia({ sequencia = {}, semana = [], diasSemanaLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] }) {
  const atual = sequencia.atual || 0;
  const hojeIdx = semana.length - 1;

  return `<div class="meta-card-g flame">
    <div class="meta-card-top">
      <span class="meta-card-lbl">Chamas da Constância</span>
      <span class="badge" style="background:#FEF3C7;color:#B45309;font-size:11px;font-weight:800">🏆 Recorde: ${sequencia.recorde || 0}d</span>
    </div>
    <div class="meta-card-body-row">
      <div class="meta-flame-badge ${atual > 0 ? 'lit' : ''}">🔥</div>
      <div>
        <div style="font-size:28px;font-weight:800;line-height:1.1;color:${atual > 0 ? '#D97706' : 'var(--ink)'}">
          ${atual} ${atual === 1 ? 'dia' : 'dias'}
        </div>
        <div class="hint" style="font-weight:700;margin-top:4px">
          ${atual > 0 ? 'Ofensiva ativa! Continue amanhã.' : 'Resolva 1 questão hoje para acender!'}
        </div>
      </div>
    </div>
    <div class="meta-week-track" title="Seu ritmo nos últimos 7 dias">
      ${semana.map((diaObj, idx) => {
        const dw = diasSemanaLabels[new Date(`${diaObj.dia}T12:00:00Z`).getUTCDay()];
        const isHoje = idx === hojeIdx;
        const cls = diaObj.metaBatida ? 'hit' : diaObj.respondidas > 0 ? 'partial' : (isHoje ? 'today-pending' : '');
        const ico = diaObj.metaBatida ? '✓' : diaObj.respondidas > 0 ? diaObj.respondidas : (isHoje ? '•' : '');
        return `<div class="meta-day-col">
          <div class="meta-day-dot ${cls}">${ico}</div>
          <span class="meta-day-lbl">${dw}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

export function CardRadarAprovacao({ diasParaProva, concursoAlvo, bancaNome }) {
  return `<div class="meta-card-g radar">
    <div class="meta-card-top">
      <span class="meta-card-lbl">Radar da Aprovação</span>
      ${ic('clock', 'sm')}
    </div>
    <div>
      <div style="font-size:28px;font-weight:800;line-height:1.1;color:#2563EB">
        ${diasParaProva != null ? `${diasParaProva} dias` : 'Sem data'}
      </div>
      <div class="hint" style="font-weight:700;margin-top:4px">
        ${diasParaProva != null ? 'até a data prevista da sua prova' : 'Configure sua data prevista abaixo'}
      </div>
    </div>
    <div style="padding-top:10px;border-top:1px solid var(--line-2);display:flex;flex-direction:column;gap:5px;font-size:12.5px">
      <div class="row" style="justify-content:space-between">
        <span class="hint">🎯 Alvo:</span>
        <b>${esc(concursoAlvo || 'A definir')}</b>
      </div>
      <div class="row" style="justify-content:space-between">
        <span class="hint">🏛️ Banca:</span>
        <b>${bancaNome ? esc(bancaNome) : 'Qualquer banca'}</b>
      </div>
    </div>
  </div>`;
}
