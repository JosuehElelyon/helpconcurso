// Componente UI puro: Matriz 2D de Pareto (Relevância da Banca × Domínio do Concurseiro).
import { ic } from '../icones.js';
import { esc } from '../util.js';

const QUADRANTES_META = [
  {
    key: 'perigo',
    cls: 'danger',
    title: 'Zona de Perigo',
    tag: 'Urgente',
    tagCls: 'prio-critica',
    emoji: '🚨',
    desc: 'Alta incidência na banca onde seu rendimento está abaixo de 60%. Prioridade máxima.',
    emptyTitle: 'Nenhum ponto crítico detectado',
    emptyHint: 'Excelente! Seus tópicos mais cobrados estão fora da zona de risco.',
    actionMode: 'danger',
  },
  {
    key: 'fortaleza',
    cls: 'fortaleza',
    title: 'Fortaleza',
    tag: 'Zona de Aprovação',
    tagCls: 'prio-segura',
    emoji: '🏆',
    desc: 'Tópicos quentes da banca onde você já domina (≥ 75%). Garantia de pontos.',
    emptyTitle: 'Consolide seus primeiros tópicos',
    emptyHint: 'Resolva simulados nos tópicos críticos e atinja 75%+ de acerto para vê-los aqui.',
    emptyCta: true,
    actionMode: 'review',
  },
  {
    key: 'reforco',
    cls: 'reforco',
    title: 'Atenção Moderada',
    tag: 'Reforço',
    tagCls: 'prio-reforco',
    emoji: '⚡',
    desc: 'Rendimento intermediário (60% a 74%) ou pendente. Poucas revisões colocam você no corte.',
    emptyTitle: 'Nenhum tópico em reforço',
    emptyHint: 'Seus tópicos intermediários já subiram de patamar ou aguardam prática.',
    actionMode: 'reforco',
  },
  {
    key: 'conforto',
    cls: 'conforto',
    title: 'Zona Secundária',
    tag: 'Baixa cobrança',
    tagCls: 'prio-secundaria',
    emoji: '☕',
    desc: 'Baixa incidência histórica nas provas da banca. Foque aqui só após dominar a base.',
    emptyTitle: 'Sem tópicos secundários',
    emptyHint: 'Todos os tópicos relevantes deste edital já estão priorizados acima.',
    actionMode: 'secondary',
  },
];

function renderParetoMetricPill(t, mode) {
  if (mode === 'review') {
    const pct = t.taxaAcerto != null ? `${t.taxaAcerto}% acerto` : 'Dominado';
    return `<span class="pareto-metric-chip ok">${pct}</span>`;
  }
  if (t.questoesNaBanca > 0) {
    return `<span class="pareto-metric-chip hot">🔥 ${t.questoesNaBanca} q. banca</span>`;
  }
  if (t.taxaAcerto != null) {
    const tone = t.taxaAcerto < 60 ? 'bad' : t.taxaAcerto < 75 ? 'warn' : 'muted';
    return `<span class="pareto-metric-chip ${tone}">${t.taxaAcerto}% acerto</span>`;
  }
  return '<span class="pareto-metric-chip muted">Pendente</span>';
}

function renderParetoActions(t, mode, editalId) {
  if (mode === 'secondary') {
    return t.taxaAcerto != null
      ? `<span class="pareto-status-txt">${t.taxaAcerto}% acerto</span>`
      : '<span class="pareto-status-txt">Opcional</span>';
  }
  if (mode === 'review') {
    return `<div class="pareto-card-actions">
      <button type="button" class="btn btn-ghost btn-xs pareto-btn" data-train-topic="${esc(t.materia)}||${esc(t.nome)}" data-edital-id="${esc(editalId || '')}" title="Gerar revisão rápida com IA">${ic('spark', 'sm')} Revisar</button>
    </div>`;
  }

  const iaBtnCls = mode === 'danger' ? 'btn-primary' : 'btn-ghost';
  const reaisBtn = t.questoesNaBanca > 0
    ? `<button type="button" class="btn btn-quiet btn-xs pareto-btn" data-treinar-reais="${esc(t.id)}" data-edital-id="${esc(editalId || '')}" title="Resolver questões reais da banca (custo US$ 0)">${ic('book', 'sm')} Reais</button>`
    : '';
  const iaBtn = `<button type="button" class="btn ${iaBtnCls} btn-xs pareto-btn" data-train-topic="${esc(t.materia)}||${esc(t.nome)}" data-edital-id="${esc(editalId || '')}" title="Gerar questões inéditas com IA sobre este tópico">${ic('spark', 'sm')} Gerar IA</button>`;

  return `<div class="pareto-card-actions">${reaisBtn}${iaBtn}</div>`;
}

function renderParetoItem(t, mode, editalId) {
  const temTaxa = t.taxaAcerto != null;
  const subDetalhes = [
    esc(t.materia || 'Geral'),
    t.probBancaPct > 0 ? `${t.probBancaPct}% da matéria` : '',
    temTaxa ? `${t.taxaAcerto}% acerto` : 'Não praticado',
  ].filter(Boolean).join(' · ');

  return `<article class="pareto-card">
    <div class="pareto-card-top">
      <div class="pareto-topic-name" title="${esc(t.nome)}">${esc(t.nome)}</div>
      ${renderParetoMetricPill(t, mode)}
    </div>
    <div class="pareto-card-foot">
      <div class="pareto-meta-col">
        <div class="pareto-meta-txt">${subDetalhes}</div>
        ${temTaxa ? `<div class="pareto-mini-bar" aria-hidden="true"><i style="width:${Math.max(4, Math.min(100, t.taxaAcerto))}%;background:${t.taxaAcerto >= 75 ? 'var(--ok)' : t.taxaAcerto >= 60 ? 'var(--accent)' : 'var(--bad)'}"></i></div>` : ''}
      </div>
      ${renderParetoActions(t, mode, editalId)}
    </div>
  </article>`;
}

export function MatrizPareto({ quadrantes = {}, editalId = '', expanded = {} }) {
  return `<div class="quadrantes-grid">
    ${QUADRANTES_META.map((cfg) => {
      const lista = Array.isArray(quadrantes[cfg.key]) ? quadrantes[cfg.key] : [];
      const isExp = !!expanded[cfg.key];
      const visiveis = isExp ? lista.slice(0, 20) : lista.slice(0, 5);
      const restantes = lista.length - visiveis.length;

      return `<section class="quadrante-box ${cfg.cls}" aria-label="${esc(cfg.title)}">
        <div class="quadrante-top">
          <div class="quadrante-head">
            <div class="pareto-title-group">
              <span class="pareto-q-ico" aria-hidden="true">${cfg.emoji}</span>
              <div>
                <div class="pareto-title-line">
                  <span class="quadrante-title">${esc(cfg.title)}</span>
                  <span class="prio-badge ${cfg.tagCls}">${esc(cfg.tag)}</span>
                </div>
              </div>
            </div>
            <span class="pareto-count-pill">${lista.length} ${lista.length === 1 ? 'tópico' : 'tópicos'}</span>
          </div>
          <p class="quadrante-sub">${esc(cfg.desc)}</p>
        </div>

        <div class="quadrante-items">
          ${visiveis.length
            ? visiveis.map((t) => renderParetoItem(t, cfg.actionMode, editalId)).join('')
            : `<div class="pareto-empty">
                <div class="pareto-empty-ico" aria-hidden="true">${cfg.emoji}</div>
                <div class="pareto-empty-title">${esc(cfg.emptyTitle)}</div>
                <div class="pareto-empty-hint">${esc(cfg.emptyHint)}</div>
                ${cfg.emptyCta ? `<button type="button" class="btn btn-quiet btn-xs" style="margin-top:6px" data-go="gerar">${ic('spark', 'sm')} Gerar simulado</button>` : ''}
              </div>`}
        </div>

        ${lista.length > 5 ? `<div class="pareto-box-foot">
          <button type="button" class="link-btn pareto-expand-btn" data-pareto-expand="${cfg.key}">
            ${isExp ? 'Recolher lista' : `Ver mais (${restantes > 0 ? `+${Math.min(15, restantes)} neste card` : 'expandir'})`}
          </button>
          ${editalId ? `<button type="button" class="link-btn" data-go="edital">Abrir edital completo →</button>` : ''}
        </div>` : ''}
      </section>`;
    }).join('')}
  </div>`;
}
