// Front do HelpConcurso — Meu Edital (verticalizado + gráficos de avanço).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { EditalVerticalizado } from './components/EditalVerticalizado.js';
import { fonteBadge } from './enviar-provas.js';
import { BANCA, S } from './estado.js';
import { go } from './eventos.js';
import { donutSvg } from './gerar.js';
import { ic } from './icones.js';
import { confirmBox } from './modal.js';
import { render } from './render.js';
import { $, api, esc, on, toast } from './util.js';
import { UPLOAD_MAX_MB, limparInputArquivo, validarArquivoUpload } from './lib/upload.js';

// ---------- Meu Edital (verticalizado + gráficos de avanço) ----------
function viewHomeEditalCard(ed) {
  const rs = ed.resumo || {};
  const b = ed.banca && BANCA()[ed.banca];
  return `<div class="card card-pad edital-home-card">
    <div class="row" style="justify-content:space-between;align-items:center;gap:16px">
      <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:240px">
        ${donutSvg(rs.coberturaPct || 0, 74, 'var(--brand)')}
        <div style="min-width:0">
          <div class="row" style="gap:6px;margin-bottom:4px">
            <span class="eyebrow" style="color:var(--brand)">Edital ativo</span>
            ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ed.banca ? `<span class="badge">${esc(ed.banca)}</span>` : ''}
            ${ed.ano ? `<span class="badge">${esc(ed.ano)}</span>` : ''}
          </div>
          <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ed.titulo)}</div>
          <div class="hint">${rs.topicosEstudados || 0} de ${rs.totalTopicos || 0} tópicos estudados · ${rs.topicosPraticados || 0} praticados em questões${rs.taxaAcertoGeral != null ? ` · <b>${rs.taxaAcertoGeral}% de acerto</b>` : ''}</div>
        </div>
      </div>
      <div class="row">
        <button class="btn btn-ghost" data-go="edital">${ic('target', 'sm')} Ver avanço</button>
        <button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Estudar material</button>
      </div>
    </div>
  </div>`;
}

const TOPIC_STATUS = {
  dominado:  { label: 'Dominado ★', cls: 'READY' },
  praticado: { label: 'Praticado',  cls: 'PROCESSING' },
  estudado:  { label: 'Estudado',   cls: 'brand' },
  pendente:  { label: 'Pendente',   cls: 'PENDING' },
};

function viewEdital() {
  const ed = S.activeEdital;
  const list = S.editais || [];
  const mine = S.minhas || [];
  const efm = S.edForm || (S.edForm = { banca: '', orgao: '', cargo: '', ano: '', provaId: '' });
  const showUpload = S.editalShowForm || !ed;
  const uploadCard = showUpload ? `<div class="card card-pad" style="margin-bottom:18px">
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div><h3 style="margin:0;font-size:17px">${ed ? 'Enviar outro edital' : 'Envie o edital do seu concurso'}</h3>
        <div class="hint">Relacione o edital à banca, ao concurso/cargo e à prova para cruzar automaticamente com seus materiais e simulados.</div></div>
      ${ed ? `<button type="button" class="btn btn-quiet" id="edCancelForm">${ic('x', 'sm')} Fechar</button>` : ''}
    </div>
    ${S.editalErr ? `<div class="banner bad" role="alert">${ic('alert', 'sm')}<div>${esc(S.editalErr)}</div></div>` : ''}
    ${S.editalUploading ? `<div class="progress-box" style="padding:32px 16px"><div class="spinner"></div><b>Analisando e verticalizando seu edital com a IA…</b><div class="hint">Extraindo disciplinas, pesos e tópicos do conteúdo programático e vinculando à banca e prova.</div></div>`
      : `<div class="form-sec" style="margin-bottom:14px">
        <div class="field" style="margin-bottom:8px"><label>Banca organizadora do edital</label></div>
        <div class="banca-tabs" style="flex-wrap:wrap;margin-bottom:12px">
          <button type="button" class="btab ${!efm.banca ? 'on' : ''}" data-edb="">Detectar pela IA</button>
          ${S.bancas.map((b) => `<button type="button" class="btab ${efm.banca === b.id ? 'on' : ''}" data-edb="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}
        </div>
        <div class="up-grid" style="margin-bottom:12px">
          <div class="field" style="margin-bottom:0"><label for="edOrgao">Órgão / Instituição <span class="hint">(opcional)</span></label><input class="input" id="edOrgao" maxlength="120" placeholder="Ex.: Banco do Brasil, TRF-1" value="${esc(efm.orgao)}"></div>
          <div class="field" style="margin-bottom:0"><label for="edCargo">Cargo foco <span class="hint">(opcional)</span></label><input class="input" id="edCargo" maxlength="120" placeholder="Ex.: Agente de Tecnologia" value="${esc(efm.cargo)}"></div>
          <div class="field" style="margin-bottom:0"><label for="edAno">Ano <span class="hint">(opcional)</span></label><input class="input" id="edAno" inputmode="numeric" maxlength="4" placeholder="Ex.: 2024" value="${esc(efm.ano)}"></div>
        </div>
        <div class="field" style="margin-bottom:12px"><label for="edLink">Link oficial do edital <span class="hint">(opcional — Diário Oficial, site da banca ou do órgão)</span></label>
          <div class="row" style="gap:8px"><input class="input" id="edLink" maxlength="500" style="flex:1" placeholder="https://www.in.gov.br/... ou link direto do PDF no site da banca" value="${esc(efm.link || '')}">
          <button type="button" class="btn btn-ghost" id="edImportLink">${ic('upload', 'sm')} Importar do link</button></div>
          <span class="hint">Com o link direto do arquivo, nós baixamos da fonte oficial e o edital ganha o selo <b>✔ Fonte oficial</b>. Se você enviar o arquivo ou colar o texto, o link fica registrado como fonte informada.</span></div>
        ${mine.length ? `<div class="field" style="margin-bottom:4px">
          <label for="edProvaSel">Vincular a uma prova já enviada <span class="hint">(opcional — conecta as questões reais da prova ao edital)</span></label>
          <select class="select" id="edProvaSel">
            <option value="">Nenhuma prova selecionada</option>
            ${mine.filter((p) => !efm.banca || p.banca === efm.banca).map((p) => `<option value="${p.id}" ${efm.provaId === p.id ? 'selected' : ''}>${esc(p.titulo)} (${p.numQuestoes || 0} questões)</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      ${S.editalMode === 'file' ? `
      <label class="drop slim ${S.editalErr ? 'has-err' : ''}" id="edDrop">
        <input type="file" id="edFileIn" class="sr" accept=".pdf,.doc,.docx,.txt">
        <div class="big">${ic('upload')}</div>
        <strong>Arraste o arquivo do Edital aqui ou clique para escolher</strong>
        <span class="hint">PDF (inclusive escaneado), DOCX, DOC ou TXT · Edital completo ou anexo de conteúdo programático · Até ${UPLOAD_MAX_MB} MB por arquivo</span>
      </label>
      <div style="text-align:center;margin-top:12px"><button type="button" class="btn btn-quiet" id="edModePaste">Prefere colar o conteúdo programático?</button></div>`
      : `<div class="field"><label for="edPasteIn">Cole o conteúdo programático do edital</label>
        <textarea class="textarea" id="edPasteIn" placeholder="Cole aqui as disciplinas e os tópicos do edital do seu concurso…"></textarea></div>
      <div class="wiz-foot"><button type="button" class="btn btn-ghost" id="edModeFile">${ic('arrowL', 'sm')} Enviar arquivo</button>
        <button type="button" class="btn btn-primary" id="edUsePaste">${ic('spark', 'sm')} Verticalizar edital</button></div>`}`}
  </div>` : '';

  if (!ed) {
    return `<h1 class="page-title">Meu edital</h1><p class="page-sub">Acompanhe visualmente sua cobertura do edital, o cruzamento com seus resumos, banca e provas, e seu desempenho por tópico.</p>${uploadCard}`;
  }

  const rs = ed.resumo || {};
  const b = ed.banca && BANCA()[ed.banca];
  const provasVinc = ed.provasVinculadas || [];
  const matVinc = ed.materiaisVinculados || [];
  const radar = rs.radar || {};
  const filter = S.editalTopicFilter || 'todos';
  const disciplinas = ed.disciplinas || [];

  const radarHtml = `
    <div class="radar-card" role="region" aria-label="Radar de Desempenho e Probabilidade da Banca">
      <div class="radar-head">
        <div class="radar-title-group">
          <div class="row" style="gap:6px;align-items:center">
            <span class="badge brand" style="font-weight:800">🎯 Radar de Prontidão</span>
            ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ''}
          </div>
          <h3 style="margin:2px 0 0;font-size:18px">Afinidade & Probabilidade da Prova Real</h3>
          <div class="hint">Cruzamento inteligente entre a frequência histórica da banca e seu aproveitamento real.</div>
        </div>
        <div class="row" style="gap:10px;align-items:center">
          <button class="btn btn-ghost btn-sm" data-go="desempenho" title="Ver gráficos completos de evolução, horas e produtividade">${ic('chart', 'sm')} Gráficos & Desempenho</button>
          <span class="badge" style="background:${radar.prontidaoCor || 'var(--brand)'};color:#fff;font-weight:800;font-size:12px;padding:4px 10px">
            ${esc(radar.prontidaoFaixa || 'Em Análise')}
          </span>
        </div>
      </div>

      <div class="radar-score-container">
        <div class="radar-score-row">
          <span><b>Índice de Prontidão da Prova:</b> <span class="radar-score-val" style="color:${radar.prontidaoCor || 'var(--brand)'}">${radar.indiceProntidao || 0}%</span></span>
          <span class="hint">${radar.totalQuestoesNaBanca ? `🔥 ${radar.totalQuestoesNaBanca} questões da banca catalogadas` : 'Sem questões de prova registradas'}</span>
        </div>
        <div class="radar-track" title="Prontidão da Prova: ${radar.indiceProntidao || 0}%">
          <i class="radar-bar" style="width:${Math.max(3, radar.indiceProntidao || 0)}%;background:${radar.prontidaoCor || 'var(--brand)'}"></i>
        </div>
      </div>

      <div class="radar-summary-grid">
        <div class="radar-sum-card critica">
          <span class="radar-sum-num" style="color:#B91C1C">${radar.distribuicaoPrioridades?.critica || 0}</span>
          <span class="radar-sum-lbl">🚨 Prioridade Máxima (Urgentes)</span>
        </div>
        <div class="radar-sum-card reforco">
          <span class="radar-sum-num" style="color:#B45309">${radar.distribuicaoPrioridades?.reforco || 0}</span>
          <span class="radar-sum-lbl">⚠️ Reforçar (< 75%)</span>
        </div>
        <div class="radar-sum-card segura">
          <span class="radar-sum-num" style="color:#15803D">${radar.distribuicaoPrioridades?.segura || 0}</span>
          <span class="radar-sum-lbl">✅ Zona Segura (Dominados)</span>
        </div>
        <div class="radar-sum-card secundaria">
          <span class="radar-sum-num" style="color:var(--ink-2)">${radar.distribuicaoPrioridades?.secundaria || 0}</span>
          <span class="radar-sum-lbl">☕ Secundários</span>
        </div>
      </div>

      ${(radar.topUrgentes || []).length ? `
      <div class="radar-urgentes-title">
        <span>🚨 Tópicos Críticos para Sua Aprovação</span>
        <span class="hint" style="font-weight:normal">(caem muito na banca e seu rendimento precisa subir)</span>
      </div>
      <div class="radar-urgentes-grid">
        ${radar.topUrgentes.map((t) => `
          <div class="radar-urgente-card">
            <div>
              <div class="row" style="justify-content:space-between;margin-bottom:4px">
                <span class="badge" style="background:var(--brand-soft);color:var(--brand);font-size:11px">${esc(t.materia)}</span>
                <span class="prio-badge prio-critica">Urgente</span>
              </div>
              <div style="font-weight:700;font-size:13.5px;color:var(--ink);line-height:1.35;margin-bottom:4px">${esc(t.nome)}</div>
              <div class="hint" style="font-size:12px">
                ${t.questoesNaBanca ? `🔥 <b>${t.questoesNaBanca} q. na banca</b> (${t.probBancaPct}% da matéria)` : 'Incidência relevante'} ·
                <span style="color:${t.taxaAcerto != null ? (t.taxaAcerto >= 70 ? 'var(--ok)' : 'var(--bad)') : 'var(--muted)'};font-weight:700">
                  ${t.taxaAcerto != null ? t.taxaAcerto + '% acerto' : 'Não praticado'}
                </span>
              </div>
            </div>
            <div class="radar-urgente-actions">
              ${t.questoesNaBanca ? `<button type="button" class="btn btn-primary btn-xs" data-treinar-reais="${t.id}" data-edital-id="${esc(ed.id)}">${ic('book', 'sm')} Reais (${t.questoesNaBanca})</button>` : ''}
              <button type="button" class="btn btn-ghost btn-xs" data-train-topic="${esc(t.materia)}||${esc(t.nome)}" data-edital-id="${esc(ed.id)}">${ic('spark', 'sm')} Gerar IA</button>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
    </div>
  `;
  return `<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:18px">
    <div>
      <div class="row" style="gap:8px;margin-bottom:4px">
        ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ed.banca ? `<span class="badge">${esc(ed.banca)}</span>` : ''}
        ${ed.orgao ? `<span class="badge">${esc(ed.orgao)}</span>` : ''}
        ${ed.cargo ? `<span class="badge">${esc(ed.cargo)}</span>` : ''}
        ${ed.ano ? `<span class="badge">${esc(ed.ano)}</span>` : ''}
        ${fonteBadge(ed)}
      </div>
      <h1 class="page-title">${esc(ed.titulo)}</h1>
      <p class="page-sub" style="margin-bottom:0">${rs.totalDisciplinas} disciplina(s) · ${rs.totalTopicos} tópicos mapeados pela IA · ${provasVinc.length} prova(s) e ${matVinc.length} material(is) vinculado(s)</p>
    </div>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" id="btnSimuladoProvaReal" style="display:inline-flex;align-items:center;gap:6px">${ic('timer', 'sm')} <b>Simulado Prova Real</b></button>
      ${list.length > 1 ? `<select class="select" id="edSwitch" style="width:auto;min-width:210px">${list.map((x) => `<option value="${x.id}" ${x.id === ed.id ? 'selected' : ''}>${esc(x.titulo)}</option>`).join('')}</select>` : ''}
      <button class="btn btn-ghost" id="edNewBtn">${ic('upload', 'sm')} Novo edital</button>
      <button class="btn btn-danger" id="edDelBtn" title="Remover edital">${ic('trash', 'sm')}</button>
    </div>
  </div>
  ${uploadCard}
  <div class="hero" style="grid-template-columns:1.15fr 1fr;margin-bottom:18px">
    <div class="card card-pad" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
      ${donutSvg(rs.coberturaPct || 0, 108, 'var(--brand)')}
      <div style="flex:1;min-width:200px">
        <div class="eyebrow" style="color:var(--brand)">Abrangência concluída do edital</div>
        <div style="font-size:24px;font-weight:800;margin:4px 0">${rs.coberturaPct || 0}% do conteúdo coberto</div>
        <p class="hint" style="margin:0 0 12px">Calculado pela IA cruzando seus materiais de estudo e simulados resolvidos com cada tópico do edital.</p>
        <div class="edital-legend">
          <span><i style="background:var(--ok)"></i>Dominados: <b>${rs.topicosDominados || 0}</b></span>
          <span><i style="background:var(--accent)"></i>Praticados: <b>${rs.topicosPraticados || 0}</b></span>
          <span><i style="background:var(--brand)"></i>Estudados: <b>${rs.topicosEstudados || 0}/${rs.totalTopicos || 0}</b></span>
        </div>
      </div>
    </div>
    <div class="stats">
      <div class="card stat"><div class="v">${rs.topicosEstudados || 0}/${rs.totalTopicos || 0}</div><div class="l">Tópicos nos materiais</div></div>
      <div class="card stat"><div class="v">${rs.praticadoPct || 0}%</div><div class="l">Tópicos com questões</div></div>
      <div class="card stat"><div class="v" style="color:var(--ok)">${rs.dominadoPct || 0}%</div><div class="l">Tópicos dominados (≥70%)</div></div>
      <div class="card stat"><div class="v">${rs.taxaAcertoGeral != null ? rs.taxaAcertoGeral + '%' : '—'}</div><div class="l">Taxa de acerto no edital</div></div>
    </div>
  </div>

  ${radarHtml}

  <div class="train-grid" style="margin-bottom:18px">
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div><h3 style="margin:0;font-size:16px">Provas vinculadas a este Edital (${provasVinc.length})</h3>
          <div class="hint">As questões reais destas provas guiam o estilo da IA ao gerar simulados para este edital.</div></div>
        <button type="button" class="btn btn-ghost" id="edSendProva" style="padding:7px 12px;font-size:13px">${ic('upload', 'sm')} Enviar prova</button>
      </div>
      ${provasVinc.length ? `<div class="file-list">${provasVinc.map((p) => `<div class="chip" style="align-items:center;gap:8px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📘 <b>${esc(p.titulo)}</b> ${p.numQuestoes ? `(${p.numQuestoes} questões)` : ''}</span></div>`).join('')}</div>`
        : `<div class="hint">Nenhuma prova vinculada ainda. Envie a prova deste concurso ou vincule uma prova existente em <b>Enviar provas</b>.</div>`}
    </div>
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div><h3 style="margin:0;font-size:16px">Materiais de estudo cruzados (${matVinc.length})</h3>
          <div class="hint">Resumos, apostilas e anotações analisados contra o conteúdo programático.</div></div>
        <button type="button" class="btn btn-primary" data-go="gerar" style="padding:7px 12px;font-size:13px">${ic('upload', 'sm')} Enviar material</button>
      </div>
      ${matVinc.length ? `<div class="file-list">${matVinc.slice(0, 5).map((m) => `<div class="chip" style="align-items:center;gap:8px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 <b>${esc(m.nome)}</b>${m.disciplina ? ` · ${esc(m.disciplina)}` : ''}</span>${m.coberturaDisciplinaPct != null ? `<span class="badge brand">${m.coberturaDisciplinaPct}%</span>` : ''}</div>`).join('')}</div>`
        : `<div class="hint">Nenhum material enviado ainda para este edital. Envie seu primeiro resumo para iniciar o acompanhamento!</div>`}
    </div>
  </div>

  <div class="card card-pad" style="margin-bottom:18px">
    <div class="row" style="justify-content:space-between;margin-bottom:14px">
      <div><h3 style="margin:0;font-size:16px">Gráfico de avanço por disciplina</h3>
        <div class="hint">Comparativo entre conteúdo estudado (materiais enviados) e taxa de acerto nas questões relacionadas.</div></div>
      <div class="edital-legend">
        <span><i style="background:var(--brand)"></i>% Conteúdo estudado</span>
        <span><i style="background:var(--accent)"></i>% Acerto em questões</span>
      </div>
    </div>
    <div class="edital-chart">
      ${(ed.disciplinas || []).map((d) => `<div class="edital-bar-row">
        <div class="edital-bar-head">
          <div><b>${esc(d.materia)}</b> <span class="hint">(${d.estudados}/${d.totalTopicos} tópicos · ${d.questoesRespondidas} questões resolvidas)</span></div>
          <div class="row" style="gap:10px;font-size:12.5px">
            <span style="color:var(--brand);font-weight:800">${d.coberturaPct}% estudado</span>
            <span style="color:#8A5A12;font-weight:800">${d.taxaAcerto != null ? d.taxaAcerto + '% acerto' : 'sem questões'}</span>
          </div>
        </div>
        <div class="edital-dual-bars">
          <div class="edital-track" title="Cobertura de estudo: ${d.coberturaPct}%"><i style="width:${Math.max(d.coberturaPct ? 3 : 0, d.coberturaPct)}%;background:var(--brand)"></i></div>
          <div class="edital-track" title="Taxa de acerto: ${d.taxaAcerto ?? 0}%"><i style="width:${d.taxaAcerto != null ? Math.max(3, d.taxaAcerto) : 0}%;background:${(d.taxaAcerto ?? 0) >= 70 ? 'var(--ok)' : 'var(--accent)'}"></i></div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section-h"><h3>Edital verticalizado tópico a tópico</h3>
    <button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Enviar resumo para avançar no edital</button></div>
  ${EditalVerticalizado({
    disciplinas,
    filter,
    selectedMateria: S.editalMateria || '',
    searchQuery: S.editalSearch || '',
    expandedMap: S.editalExpanded,
    topicStatusMap: TOPIC_STATUS,
  })}`;
}

async function refreshEditais({ silent = false } = {}) {
  try {
    const r = await api('/editais');
    S.editais = r.editais || [];
    S.activeEdital = r.active || null;
    if (S.wiz && !S.wiz.material && !S.wiz.editalId && S.activeEdital) {
      S.wiz.editalId = S.activeEdital.id;
      if (!S.wiz.banca && S.activeEdital.banca && S.bancas.some((b) => b.id === S.activeEdital.banca)) S.wiz.banca = S.activeEdital.banca;
    }
    if (!silent && S.screen === 'app') render();
  } catch { /* opcional */ }
}

/** Eventos da tela (edital); chamada pela bindApp em eventos.js a cada desenho. */
function ligarEdital() {
  const w = S.wiz;
  const efm = S.edForm || (S.edForm = { banca: '', orgao: '', cargo: '', ano: '', provaId: '' });
  on('[data-edb]', 'click', (e) => { efm.banca = e.currentTarget.dataset.edb; render(); });
  ['Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#ed' + k); if (el) el.oninput = () => { efm[k.toLowerCase()] = el.value; }; });
  const eps = $('#edProvaSel');
  if (eps) eps.onchange = () => { efm.provaId = eps.value; };
  const submitEdital = async (payload) => {
    if (efm.ano && !/^\d{4}$/.test(efm.ano)) return toast('Ano inválido.');
    S.editalUploading = true; S.editalErr = ''; render();
    try {
      if (payload instanceof FormData) {
        if (efm.banca) payload.append('banca', efm.banca);
        if (efm.orgao) payload.append('orgao', efm.orgao);
        if (efm.cargo) payload.append('cargo', efm.cargo);
        if (efm.ano) payload.append('ano', efm.ano);
        if (efm.provaId) payload.append('provaId', efm.provaId);
        if (efm.link) payload.append('officialUrl', efm.link);
      } else if (payload && typeof payload === 'object') {
        Object.assign(payload, { banca: efm.banca, orgao: efm.orgao, cargo: efm.cargo, ano: efm.ano, provaId: efm.provaId, officialUrl: efm.link || '' });
      }
      const r = payload instanceof FormData ? await api('/editais', { method: 'POST', form: payload }) : await api('/editais', { method: 'POST', body: payload });
      S.editalShowForm = false; S.edForm = null;
      await refreshEditais({ silent: true });
      const avisoLink = (r.warnings || []).find((w) => /link/i.test(w));
      toast(`Edital verticalizado: ${r.edital.resumo.totalDisciplinas} disciplinas e ${r.edital.resumo.totalTopicos} tópicos!${r.edital.oficialConfirmado ? ' Baixado da fonte oficial ✔' : ''}${avisoLink ? ' ' + avisoLink : ''}`);
    } catch (e) { S.editalErr = e.message; }
    S.editalUploading = false; render();
  };
  const ef = $('#edFileIn'), edDrop = $('#edDrop');
  const sendEditalFile = (file) => {
    const chk = validarArquivoUpload(file, { rotulo: 'O edital' });
    if (!chk.ok) {
      S.editalErr = chk.mensagem;
      limparInputArquivo(ef);
      toast(chk.mensagem);
      render();
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    submitEdital(fd);
  };
  if (ef) ef.onchange = () => { if (ef.files[0]) sendEditalFile(ef.files[0]); };
  if (edDrop) {
    ['dragenter', 'dragover'].forEach((t) => edDrop.addEventListener(t, (e) => { e.preventDefault(); edDrop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => edDrop.addEventListener(t, (e) => { e.preventDefault(); edDrop.classList.remove('over'); }));
    edDrop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) sendEditalFile(f); });
  }
  on('#edModePaste', 'click', () => { S.editalMode = 'paste'; S.editalErr = ''; render(); });
  on('#edModeFile', 'click', () => { S.editalMode = 'file'; render(); });
  on('#edUsePaste', 'click', () => submitEdital({ text: $('#edPasteIn')?.value || '' }));
  const edl = $('#edLink'); if (edl) edl.oninput = () => { efm.link = edl.value.trim(); };
  on('#edImportLink', 'click', () => (efm.link ? submitEdital({ text: '' }) : toast('Cole o link direto do edital no site oficial.')));
  on('#edNewBtn', 'click', () => { S.editalShowForm = true; S.editalErr = ''; render(); });
  on('#edCancelForm', 'click', () => { S.editalShowForm = false; S.editalErr = ''; render(); });
  on('#edSendProva', 'click', () => {
    const ed = S.activeEdital;
    S.cform = { banca: ed?.banca && S.bancas.some((b) => b.id === ed.banca) ? ed.banca : '', orgao: ed?.orgao || '', cargo: ed?.cargo || '', ano: ed?.ano || '', files: [], gabarito: null, editalId: ed?.id || '', editalFile: null };
    go('contribuir');
  });
  const sw = $('#edSwitch');
  if (sw) sw.onchange = async () => {
    try {
      const r = await api(`/editais/${sw.value}/ativar`, { method: 'POST' });
      S.activeEdital = r.edital;
      S.editalMateria = ''; S.editalSearch = ''; S.editalExpanded = null; S.editalTopicFilter = 'todos';
      await refreshEditais({ silent: true }); render();
    } catch (e) { toast(e.message); }
  };

  // Filtros e Dropdown/Acordeão do Edital Verticalizado
  const redrawVerticalizadoPreservandoScroll = (refocusSearch = false, caret = null) => {
    const y = window.scrollY;
    render();
    window.scrollTo({ top: y });
    if (refocusSearch) {
      const inp = $('#edSearchInput');
      if (inp) {
        inp.focus({ preventScroll: true });
        if (caret != null) try { inp.setSelectionRange(caret, caret); } catch {}
      }
    }
  };
  const edSearch = $('#edSearchInput');
  if (edSearch) edSearch.oninput = () => {
    const pos = edSearch.selectionStart;
    S.editalSearch = edSearch.value;
    redrawVerticalizadoPreservandoScroll(true, pos);
  };
  on('#edSearchClear', 'click', () => {
    S.editalSearch = '';
    redrawVerticalizadoPreservandoScroll(true, 0);
  });
  const edMatSel = $('#edMateriaFilter');
  if (edMatSel) edMatSel.onchange = () => {
    S.editalMateria = edMatSel.value;
    S.editalExpanded = null;
    redrawVerticalizadoPreservandoScroll();
  };
  on('#edToggleAll', 'click', () => {
    const discs = S.activeEdital?.disciplinas || [];
    const cur = S.editalExpanded || {};
    const todas = discs.length > 0 && discs.every((d) => Boolean(cur[d.materia]));
    const next = {};
    discs.forEach((d) => { next[d.materia] = !todas; });
    S.editalExpanded = next;
    redrawVerticalizadoPreservandoScroll();
  });
  on('[data-ed-acc]', 'click', (e) => {
    const mat = e.currentTarget.dataset.edAcc;
    const isOpen = e.currentTarget.getAttribute('aria-expanded') === 'true';
    const next = { ...(S.editalExpanded || {}) };
    // Preserva estado padrão da 1ª disciplina se o usuário interagir com outro item antes de fechar a 1ª
    if (!S.editalExpanded && (S.activeEdital?.disciplinas || []).length) {
      const firstMat = S.activeEdital.disciplinas[0].materia;
      if (firstMat && firstMat !== mat && !S.editalSearch && !S.editalMateria && (S.editalTopicFilter || 'todos') === 'todos') {
        next[firstMat] = true;
      }
    }
    next[mat] = !isOpen;
    S.editalExpanded = next;
    redrawVerticalizadoPreservandoScroll();
  });
  on('#edResetFilters', 'click', () => {
    S.editalSearch = '';
    S.editalMateria = '';
    S.editalTopicFilter = 'todos';
    S.editalExpanded = null;
    redrawVerticalizadoPreservandoScroll();
  });
  on('#edDelBtn', 'click', () => {
    const ed = S.activeEdital; if (!ed) return;
    confirmBox('Remover este edital?', `O edital "${ed.titulo}" será excluído. Seus materiais e simulados continuam salvos.`, 'Remover', true, async () => {
      await api(`/editais/${ed.id}`, { method: 'DELETE' }).catch(() => {});
      await refreshEditais();
      toast('Edital removido');
    });
  });
  on('#btnSimuladoProvaReal', 'click', () => {
    const ed = S.activeEdital;
    if (!ed) return;
    const vert = ed.disciplinas || ed.verticalizado || [];
    // Usa o modal do app (S.modal); antes chamava modal()/closeModal(), que não existiam — o botão não abria nada
    S.modal = { title: 'Simulado no Formato da Prova Real', html: `
      <div style="margin-bottom:14px">
        <p style="margin:0 0 12px;font-size:14px">Simule as condições reais do seu concurso com questões oficiais da banca distribuídas conforme o peso das disciplinas do edital.</p>
        <div class="field" style="margin-bottom:12px">
          <label for="prQtdTotal">Quantidade total de questões</label>
          <select class="select" id="prQtdTotal">
            <option value="20">20 questões (Simulado rápido)</option>
            <option value="30" selected>30 questões (Padrão)</option>
            <option value="50">50 questões (Simulado intermediário)</option>
            <option value="70">70 questões (Simulado extenso)</option>
            <option value="100">100 questões (Prova completa)</option>
            <option value="120">120 questões (Padrão CEBRASPE)</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:12px">
          <label for="prTempoMin">Tempo de prova (Cronômetro regressivo)</label>
          <select class="select" id="prTempoMin">
            <option value="60">1 hora (60 minutos)</option>
            <option value="90">1 hora e 30 minutos (90 minutos)</option>
            <option value="120" selected>2 horas (120 minutos)</option>
            <option value="180">3 horas (180 minutos)</option>
            <option value="210">3 horas e 30 minutos (210 minutos)</option>
            <option value="240">4 horas (240 minutos)</option>
            <option value="0">Sem limite de tempo (Livre)</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:6px">
          <label>Disciplinas verticalizadas do edital</label>
          <div style="max-height:120px;overflow-y:auto;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);font-size:13px">
            ${vert.map((d) => `<div>• <b>${esc(d.materia)}</b> <span class="hint">(peso ${Number(d.peso) || 1})</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button type="button" class="btn btn-ghost" data-mclose2>Cancelar</button>
        <button type="button" class="btn btn-primary" id="btnIniciarProvaReal">${ic('timer', 'sm')} Iniciar Prova Real</button>
      </div>
    ` };
    render();
  });
  // Ligado aqui (e não dentro do clique acima) para continuar funcionando depois de qualquer redesenho
  on('#btnIniciarProvaReal', 'click', async (e) => {
    const ed = S.activeEdital;
    const btn = e.currentTarget;
    if (!ed) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner sm"></span> Montando prova...';
    try {
      // "0" = sem limite de tempo; por isso não usa "|| 120" no tempo
      const qtdTotal = Number($('#prQtdTotal')?.value) || 30;
      const tempoMinutos = Number($('#prTempoMin')?.value ?? 120);
      const res = await api(`/editais/${ed.id}/simulado-prova-real`, { method: 'POST', body: { qtdTotal, tempoMinutos } });
      S.modal = null;
      S.sets.unshift(res.set);
      S.active = res.set.id;
      go('simulado');
      toast(`Simulado Prova Real iniciado (${res.count} questões). Boa prova!`);
    } catch (err) {
      toast(err.message || 'Não foi possível gerar a prova real.');
      btn.disabled = false;
      btn.textContent = 'Iniciar Prova Real';
    }
  });
}

export { viewHomeEditalCard, TOPIC_STATUS, viewEdital, refreshEditais, ligarEdital };
