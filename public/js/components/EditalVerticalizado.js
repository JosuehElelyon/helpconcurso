// Componente UI puro: Edital Verticalizado com filtros (busca digitada, dropdown de matérias, abas) e acordeões por disciplina.
import { ic } from '../icones.js';
import { esc } from '../util.js';

const FILTROS_TOPICO = [
  ['todos', 'Todos os tópicos'],
  ['critica', '🚨 Urgentes'],
  ['reforco', '⚠️ Reforçar'],
  ['segura', '✅ Zona segura'],
  ['quentes', '🔥 Cobrados pela banca'],
];

function normalizar(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function passaFiltroStatus(t, filter) {
  if (filter === 'critica') return t.prioridade === 'critica';
  if (filter === 'reforco') return t.prioridade === 'reforco';
  if (filter === 'segura') return t.prioridade === 'segura';
  if (filter === 'quentes') return (t.questoesNaBanca || 0) > 0;
  return true;
}

export function filtrarDisciplinasEdital(disciplinas = [], { filter = 'todos', selectedMateria = '', searchQuery = '' } = {}) {
  const q = normalizar(searchQuery);
  const out = [];

  for (const d of disciplinas) {
    if (selectedMateria && d.materia !== selectedMateria) continue;
    const matMatch = q ? normalizar(d.materia).includes(q) : true;
    const topicosFiltrados = (d.topicos || []).filter((t) => {
      if (!passaFiltroStatus(t, filter)) return false;
      if (!q || matMatch) return true;
      const textoTop = normalizar(`${t.codigo || ''} ${t.nome || ''} ${t.resumo || ''}`);
      return textoTop.includes(q);
    });

    if ((filter !== 'todos' || q) && !topicosFiltrados.length) continue;
    out.push({ disc: d, topicos: topicosFiltrados });
  }
  return out;
}

export function EditalVerticalizadoLista({
  disciplinas = [],
  filter = 'todos',
  selectedMateria = '',
  searchQuery = '',
  expandedMap = null,
  topicStatusMap = {},
}) {
  const filtradas = filtrarDisciplinasEdital(disciplinas, { filter, selectedMateria, searchQuery });
  const totalTopicosVisiveis = filtradas.reduce((acc, item) => acc + item.topicos.length, 0);
  const forceOpenAll = Boolean(selectedMateria || normalizar(searchQuery) || filter !== 'todos');

  if (!filtradas.length) {
    return `<div class="card card-pad" style="text-align:center;padding:32px">
      <div class="empty">
        ${ic('search')}
        <div>Nenhuma matéria ou tópico encontrado para os filtros atuais.</div>
        <div class="hint" style="margin-bottom:12px">Tente limpar a busca ou selecionar "Todas as matérias".</div>
        <button type="button" class="btn btn-ghost btn-sm" id="edResetFilters">Limpar filtros</button>
      </div>
    </div>`;
  }

  return `
    <div class="edvert-summary-row">
      <span class="hint">Mostrando <b>${filtradas.length}</b> ${filtradas.length === 1 ? 'disciplina' : 'disciplinas'} · <b>${totalTopicosVisiveis}</b> ${totalTopicosVisiveis === 1 ? 'tópico' : 'tópicos'}</span>
    </div>
    <div class="edvert-list">
      ${filtradas.map(({ disc: d, topicos }, idx) => {
        const hasExplicit = expandedMap && Object.prototype.hasOwnProperty.call(expandedMap, d.materia);
        const isOpen = hasExplicit ? Boolean(expandedMap[d.materia]) : (forceOpenAll || idx === 0);
        const pct = Number(d.coberturaPct || 0);

        return `<section class="card edvert-acc ${isOpen ? 'open' : ''}" aria-label="${esc(d.materia)}">
          <button type="button" class="edvert-acc-btn" data-ed-acc="${esc(d.materia)}" aria-expanded="${isOpen ? 'true' : 'false'}">
            <span class="edvert-chev" aria-hidden="true">${ic('chevronD', 'sm')}</span>
            <div class="edvert-acc-main">
              <div class="edvert-acc-title-row">
                <span class="edvert-acc-title">${esc(d.materia)}</span>
                ${d.peso && Number(d.peso) > 1 ? `<span class="badge">Peso ${Number(d.peso)}</span>` : ''}
                ${d.questoesNaBanca ? `<span class="badge accent">🔥 ${d.questoesNaBanca} q. na banca</span>` : ''}
              </div>
              <div class="hint" style="font-size:12.5px">
                ${d.estudados || 0} de ${d.totalTopicos || topicos.length} tópicos estudados · ${d.dominados || 0} dominado(s)
                ${topicos.length !== (d.topicos || []).length ? ` · <b>${topicos.length} no filtro</b>` : ''}
              </div>
            </div>
            <div class="edvert-acc-right">
              <div class="edvert-acc-track" aria-hidden="true"><i style="width:${Math.max(pct ? 4 : 0, pct)}%"></i></div>
              <span class="badge ${pct >= 70 ? 'brand' : ''}">${pct}% concluído</span>
            </div>
          </button>

          ${isOpen ? `<div class="edvert-acc-body">
            <div class="edital-topic-table">
              ${topicos.map((t) => {
                const st = topicStatusMap[t.status] || topicStatusMap.pendente || { label: 'Pendente', cls: 'PENDING' };
                return `<div class="edital-topic-row">
                  <div style="flex:1;min-width:200px">
                    <div class="row" style="gap:6px;align-items:baseline;flex-wrap:wrap">
                      <span style="font-weight:700;font-size:14px"><span class="hint" style="margin-right:6px">${esc(t.codigo)}.</span>${esc(t.nome)}</span>
                      <span class="prio-badge prio-${t.prioridade || 'secundaria'}">${esc(t.prioridadeLabel || 'Secundário')}</span>
                    </div>
                    ${t.resumo ? `<div class="hint" style="margin-top:2px">${esc(t.resumo)}</div>` : ''}
                    ${(t.materiaisNomes || []).length ? `<div class="hint" style="margin-top:3px;color:var(--brand)">📄 Material: ${t.materiaisNomes.map(esc).join(', ')} (${t.cobertura === 'completo' ? 'completo' : 'parcial'})</div>` : ''}
                  </div>
                  <div class="row" style="gap:8px;flex-wrap:nowrap">
                    ${t.questoesNaBanca ? `<span class="badge ${t.incidenciaBanca === 'alta' ? 'accent' : ''}" title="Questões reais das provas da banca neste tópico: ${t.questoesNaBanca} (${t.probBancaPct}% da matéria)">${t.incidenciaBanca === 'alta' ? '🔥 ' : '📌 '}${t.questoesNaBanca} na banca (${t.probBancaPct}%)</span>` : ''}
                    ${t.questoesGeradas ? `<span class="badge" title="Questões resolvidas / geradas neste tópico">${t.questoesRespondidas}/${t.questoesGeradas} q.${t.taxaAcerto != null ? ` · ${t.taxaAcerto}%` : ''}</span>` : ''}
                    <span class="st ${st.cls}">${st.label}</span>
                    ${t.questoesNaBanca ? `<button type="button" class="btn btn-ghost" data-treinar-reais="${t.id}" title="Treinar com questões reais da banca neste tópico (custo US$ 0)">${ic('book', 'sm')} Reais (${t.questoesNaBanca})</button>` : ''}
                    <button type="button" class="btn btn-quiet" data-train-topic="${esc(d.materia)}||${esc(t.nome)}" title="Gerar questões com IA focadas neste tópico">${ic('spark', 'sm')} Gerar</button>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        </section>`;
      }).join('')}
    </div>
  `;
}

export function EditalVerticalizado({
  disciplinas = [],
  filter = 'todos',
  selectedMateria = '',
  searchQuery = '',
  expandedMap = null,
  topicStatusMap = {},
}) {
  const todasAbertas = expandedMap && disciplinas.length > 0 && disciplinas.every((d) => Boolean(expandedMap[d.materia]));

  return `
    <div class="edvert-controls card card-pad">
      <div class="edvert-controls-top">
        <div class="edvert-search-wrap">
          <span class="edvert-search-ico" aria-hidden="true">${ic('search', 'sm')}</span>
          <input
            type="search"
            class="input edvert-search-input"
            id="edSearchInput"
            value="${esc(searchQuery)}"
            placeholder="Buscar matéria ou tópico (ex.: Português, Crase, SQL)…"
            aria-label="Buscar matéria ou tópico no edital verticalizado"
          >
          ${searchQuery ? `<button type="button" class="edvert-clear-btn" id="edSearchClear" title="Limpar busca" aria-label="Limpar busca">${ic('x', 'sm')}</button>` : ''}
        </div>

        <select class="select edvert-materia-select" id="edMateriaFilter" aria-label="Filtrar por matéria do edital">
          <option value="">Todas as matérias (${disciplinas.length})</option>
          ${disciplinas.map((d) => `<option value="${esc(d.materia)}" ${selectedMateria === d.materia ? 'selected' : ''}>${esc(d.materia)} (${d.totalTopicos || (d.topicos || []).length} tóp. · ${d.coberturaPct || 0}%)</option>`).join('')}
        </select>

        <button type="button" class="btn btn-ghost edvert-toggle-all" id="edToggleAll">
          ${todasAbertas ? 'Recolher tudo' : 'Expandir tudo'}
        </button>
      </div>

      <div class="tabs edvert-tabs" role="tablist" aria-label="Filtrar tópicos">
        ${FILTROS_TOPICO.map(([k, l]) => `<button type="button" role="tab" aria-selected="${filter === k}" class="${filter === k ? 'on' : ''}" data-radar-filter="${k}">${l}</button>`).join('')}
      </div>
    </div>

    <div id="edVerticalizadoBody">
      ${EditalVerticalizadoLista({ disciplinas, filter, selectedMateria, searchQuery, expandedMap, topicStatusMap })}
    </div>
  `;
}
