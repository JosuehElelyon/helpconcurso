// Front do HelpConcurso — Radar de Desempenho & Produtividade Visual.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { api, esc, on, toast } from './util.js';

// ---------- Radar de Desempenho & Produtividade Visual ----------
async function loadDesempenho(editalId = null) {
  S.desempBusy = true;
  if (S.view === 'desempenho') render();
  try {
    const q = editalId ? `?editalId=${encodeURIComponent(editalId)}` : '';
    S.desempenho = await api('/me/desempenho' + q);
    if (!S.desempEditalId && S.desempenho?.editalAtivo?.id) {
      S.desempEditalId = S.desempenho.editalAtivo.id;
    }
  } catch (e) {
    toast(e.message || 'Erro ao carregar dados de desempenho.');
  } finally {
    S.desempBusy = false;
  }
  if (S.view === 'desempenho') render();
}

function renderGaugeSvg(pct = 0, cor = 'var(--brand)', faixa = '') {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const r = 70;
  const c = Math.PI * r;
  const offset = c * (1 - p / 100);
  return `
    <svg viewBox="0 0 200 110" class="gauge-svg" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto" aria-label="Prontidão ${p}%">
      <path d="M 30 85 A 70 70 0 0 1 170 85" fill="none" stroke="var(--line-2)" stroke-width="14" stroke-linecap="round"/>
      <path d="M 30 85 A 70 70 0 0 1 170 85" fill="none" stroke="${cor}" stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" style="transition:stroke-dashoffset 0.6s ease"/>
      <text x="100" y="78" text-anchor="middle" font-size="28" font-weight="900" fill="var(--ink)">${p}%</text>
      <text x="100" y="98" text-anchor="middle" font-size="12" font-weight="800" fill="${cor}">${esc(faixa || 'Em Análise')}</text>
    </svg>
  `;
}

function renderDonutDuploSvg(acertos = 0, erros = 0, pct = 0) {
  const total = acertos + erros;
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || (total > 0 ? (acertos / total) * 100 : 0))));
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  return `
    <svg viewBox="0 0 90 90" style="width:72px;height:72px;flex:none">
      <circle cx="45" cy="45" r="${r}" fill="none" stroke="#FCA5A5" stroke-width="8"/>
      <circle cx="45" cy="45" r="${r}" fill="none" stroke="#10B981" stroke-width="8"
              stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
              transform="rotate(-90 45 45)" stroke-linecap="round"/>
      <text x="45" y="49" text-anchor="middle" font-size="14" font-weight="900" fill="var(--ink)">${p}%</text>
    </svg>
  `;
}

function renderEvolucaoSvg(dias = []) {
  if (!dias.length) return '<div class="empty" style="padding:24px">Sem dados de evolução nos últimos dias.</div>';

  const w = 640, h = 230;
  const padLeft = 40, padRight = 50, padTop = 30, padBottom = 40;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const maxResp = Math.max(10, ...dias.map((d) => d.respondidas || 0));
  const n = dias.length;
  const colW = plotW / n;
  const barW = Math.max(8, Math.min(24, colW * 0.55));

  const y80 = padTop + plotH * (1 - 0.80);
  const y50 = padTop + plotH * (1 - 0.50);

  const linePoints = [];
  const barElements = [];

  dias.forEach((d, idx) => {
    const cx = padLeft + idx * colW + colW / 2;
    const resp = d.respondidas || 0;
    const ac = d.acertos || 0;
    const err = Math.max(0, resp - ac);

    const totalBarH = (resp / maxResp) * (plotH - 10);
    const acH = resp > 0 ? (ac / resp) * totalBarH : 0;
    const errH = totalBarH - acH;

    const barY = padTop + plotH - totalBarH;
    const barX = cx - barW / 2;

    const diaLabel = esc(d.label || '');
    const semLabel = esc(d.diaSemana || '');
    const taxa = d.taxaPct != null ? `${d.taxaPct}%` : '—';
    const tooltip = `${diaLabel} (${semLabel}): ${resp} questões, ${ac} acertos (${taxa})`;

    barElements.push(`
      <g class="chart-col" tabindex="0">
        <title>${tooltip}</title>
        ${err > 0 ? `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${errH.toFixed(1)}" rx="3" fill="#F87171" opacity="0.9"/>` : ''}
        ${ac > 0 ? `<rect x="${barX.toFixed(1)}" y="${(barY + errH).toFixed(1)}" width="${barW.toFixed(1)}" height="${acH.toFixed(1)}" rx="3" fill="#10B981"/>` : ''}
        <text x="${cx.toFixed(1)}" y="${(h - 18).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)">${diaLabel}</text>
        <text x="${cx.toFixed(1)}" y="${(h - 6).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="600" fill="var(--muted)">${semLabel}</text>
      </g>
    `);

    if (d.taxaPct != null) {
      const ly = padTop + plotH * (1 - d.taxaPct / 100);
      linePoints.push({ x: cx, y: ly, taxa: d.taxaPct, dia: diaLabel });
    }
  });

  const polylineStr = linePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const pointsElements = linePoints.map((p) => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="var(--brand)" stroke="#FFFFFF" stroke-width="2">
      <title>${p.dia}: ${p.taxa}% de acerto</title>
    </circle>
  `).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" class="desemp-svg" role="img" aria-label="Gráfico de evolução dos últimos 14 dias">
      <line x1="${padLeft}" y1="${padTop}" x2="${w - padRight}" y2="${padTop}" stroke="var(--line-2)" stroke-width="1"/>
      <text x="${padLeft - 6}" y="${padTop + 4}" text-anchor="end" font-size="9.5" fill="var(--muted)">100%</text>

      <line x1="${padLeft}" y1="${y80.toFixed(1)}" x2="${w - padRight}" y2="${y80.toFixed(1)}" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="${w - padRight + 6}" y="${y80 + 3}" text-anchor="start" font-size="9" font-weight="800" fill="#D97706">Meta 80%</text>

      <line x1="${padLeft}" y1="${y50.toFixed(1)}" x2="${w - padRight}" y2="${y50.toFixed(1)}" stroke="var(--line-2)" stroke-width="1"/>
      <text x="${padLeft - 6}" y="${y50 + 4}" text-anchor="end" font-size="9.5" fill="var(--muted)">50%</text>

      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${w - padRight}" y2="${padTop + plotH}" stroke="var(--line)" stroke-width="1.5"/>
      <text x="${padLeft - 6}" y="${padTop + plotH + 4}" text-anchor="end" font-size="9.5" fill="var(--muted)">0%</text>

      ${barElements.join('')}
      ${polylineStr ? `<polyline points="${polylineStr}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${pointsElements}
    </svg>
  `;
}

function viewDesempenho() {
  if (!S.desempenho && S.desempBusy) {
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando painel de inteligência de desempenho…</div></div>';
  }
  if (!S.desempenho) {
    loadDesempenho(S.desempEditalId);
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando painel de inteligência de desempenho…</div></div>';
  }

  const d = S.desempenho;
  const res = d.resumo || {};
  const radar = d.radar || {};
  const evol = d.evolucao || [];
  const disc = d.disciplinas || [];
  const quad = radar.quadrantes || {};

  const editaisOpts = (S.editais || []).map((e) => `
    <option value="${e.id}" ${e.id === S.desempEditalId ? 'selected' : ''}>${esc(e.titulo || e.cargo || 'Edital')}</option>
  `).join('');

  return `
    <div class="desemp-header">
      <div>
        <h1 class="page-title">Radar de Desempenho & Produtividade</h1>
        <p class="page-sub">Seu centro de inteligência para aprovação: métricas de tempo, evolução diária e probabilidade da banca.</p>
      </div>
      <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
        ${(S.editais || []).length > 1 ? `
          <select class="select" id="selDesempEdital" style="width:auto;min-width:220px;padding:8px 12px;font-size:13px">
            <option value="">Todos os Editais (Visão Geral)</option>
            ${editaisOpts}
          </select>
        ` : ''}
        <button class="btn btn-ghost btn-sm" id="btnRefreshDesemp">${ic('refresh', 'sm')} Atualizar</button>
      </div>
    </div>

    <!-- Diagnóstico Pedagógico do Concurseiro -->
    <div class="card card-pad" style="background:linear-gradient(135deg,#FAFDFB 0%,#F3F9F6 100%);border-left:5px solid var(--brand);margin-bottom:22px">
      <div class="row" style="gap:14px;align-items:center">
        <span class="li-icon" style="background:var(--brand);width:44px;height:44px;color:#fff">${ic('award')}</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:15px;color:var(--brand-ink)">Diagnóstico de Inteligência do Concurseiro</div>
          <div style="font-size:13.5px;color:var(--ink-2);margin-top:2px;line-height:1.45">${esc(res.diagnostico || '')}</div>
        </div>
      </div>
    </div>

    <!-- Grid Cockpit de KPIs -->
    <div class="hint" style="margin:-8px 0 10px">Tempo, aproveitamento e simulados consideram os <b>últimos 90 dias</b>.</div>
    <div class="desemp-kpi-grid">
      <div class="desemp-kpi-card brand">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Índice de Prontidão</span>
          ${ic('target', 'sm')}
        </div>
        ${renderGaugeSvg(radar.indiceProntidao, radar.prontidaoCor, radar.prontidaoFaixa)}
        <div class="desemp-kpi-sub hint" style="text-align:center;margin-top:4px">
          ${radar.totalQuestoesNaBanca ? `🔥 <b>${radar.totalQuestoesNaBanca} questões</b> da banca catalogadas` : 'Sem questões oficiais vinculadas'}
        </div>
      </div>

      <div class="desemp-kpi-card accent">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Tempo & Velocidade</span>
          ${ic('clock', 'sm')}
        </div>
        <div>
          <div class="desemp-kpi-val" style="color:var(--brand)">${esc(res.tempoFormatado || '0s')}</div>
          <div class="hint" style="font-weight:700">Dedicados em simulados</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="row" style="justify-content:space-between;align-items:baseline">
            <span class="hint">Velocidade:</span>
            <b>${esc(res.mediaVelocidadeFormatada || '0s')} / questão</b>
          </div>
          <div class="row" style="justify-content:space-between;align-items:baseline;margin-top:4px">
            <span class="hint">Ritmo:</span>
            <b>${res.questoesPorHora || 0} q./hora</b>
          </div>
          <div style="margin-top:8px">
            ${res.ritmoIdeal ? '<span class="badge ok" style="font-size:11px">⚡ Ritmo Ideal para Prova</span>' : '<span class="badge accent" style="font-size:11px">⏱️ Ritmo Moderado</span>'}
          </div>
        </div>
      </div>

      <div class="desemp-kpi-card ok">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Aproveitamento Geral</span>
          ${ic('check', 'sm')}
        </div>
        <div class="row" style="gap:14px;align-items:center">
          ${renderDonutDuploSvg(res.totalAcertos, res.totalErros, res.taxaGeralPct)}
          <div>
            <div class="desemp-kpi-val" style="color:var(--ok)">${res.taxaGeralPct || 0}%</div>
            <div class="hint">Taxa de Acerto Global</div>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2);font-size:13px">
          <span style="color:var(--ok);font-weight:700">✓ ${res.totalAcertos || 0} acertos</span> ·
          <span style="color:var(--bad);font-weight:700">✗ ${res.totalErros || 0} erros</span>
          <div class="hint" style="margin-top:2px">${res.totalRespondidas || 0} questões respondidas</div>
        </div>
      </div>

      <div class="desemp-kpi-card brand">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Simulados & Formato Real</span>
          ${ic('book', 'sm')}
        </div>
        <div>
          <div class="desemp-kpi-val">${res.simuladosConcluidos || 0}</div>
          <div class="hint">Simulados concluídos</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="row" style="justify-content:space-between;align-items:baseline">
            <span class="hint">Modo Prova Real:</span>
            <b>${res.simuladosModoProva || 0} feitos</b>
          </div>
          <div class="row" style="justify-content:space-between;align-items:baseline;margin-top:4px">
            <span class="hint">Sequência atual:</span>
            <b>🔥 ${S.hoje?.sequencia?.atual || 0} dias</b>
          </div>
          <div style="margin-top:8px">
            <button class="btn btn-primary btn-block btn-sm" data-go="gerar">${ic('spark', 'sm')} Gerar Simulado</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico de Evolução Diária (14 Dias) -->
    <div class="desemp-chart-box">
      <div class="desemp-chart-head">
        <div>
          <h3 style="margin:0;font-size:17px">Evolução Diária de Rendimento & Volume de Questões</h3>
          <div class="hint">Acompanhe seu volume de prática e a tendência da taxa de acerto ao longo dos últimos 14 dias.</div>
        </div>
        <div class="desemp-chart-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#10B981"></span> Acertos</span>
          <span class="legend-item"><span class="legend-dot" style="background:#F87171"></span> Erros</span>
          <span class="legend-item"><span class="legend-line" style="background:var(--brand)"></span> Taxa Diária (%)</span>
          <span class="legend-item"><span class="legend-line" style="background:#D97706;border:1px dashed #D97706"></span> Meta (80%)</span>
        </div>
      </div>
      <div class="desemp-svg-wrap">
        ${renderEvolucaoSvg(evol)}
      </div>
      <div class="hint" style="margin-top:10px;text-align:right">Dica: passe o mouse ou toque sobre as colunas para ver detalhes diários.</div>
    </div>

    <!-- Gráfico Comparativo por Disciplina vs Linha de Corte (80%) -->
    <div class="desemp-chart-box">
      <div class="desemp-chart-head">
        <div>
          <h3 style="margin:0;font-size:17px">Desempenho por Matéria vs Linha de Corte de Aprovação (80%)</h3>
          <div class="hint">Identifique quais matérias já estão na zona segura e quais precisam de reforço imediato.</div>
        </div>
        <div class="desemp-chart-legend">
          <span class="legend-item"><span class="legend-cut-indicator"></span> Linha de Corte (80%)</span>
          <span class="legend-item"><span class="legend-dot" style="background:var(--ok)"></span> Zona de Corte (≥ 80%)</span>
          <span class="legend-item"><span class="legend-dot" style="background:var(--brand)"></span> Competitivo (65%–79%)</span>
          <span class="legend-item"><span class="legend-dot" style="background:var(--bad)"></span> Abaixo do Corte (&lt; 65%)</span>
        </div>
      </div>
      <div class="desemp-disc-list">
        ${disc.length ? disc.map((m) => {
          const temPratica = (m.questoesRespondidas || 0) > 0;
          const taxa = temPratica && m.taxaAcerto != null ? m.taxaAcerto : 0;
          const corBarra = !temPratica ? 'transparent' : taxa >= 80 ? 'var(--ok)' : taxa >= 65 ? 'var(--brand)' : 'var(--bad)';
          const badgeCorte = !temPratica
            ? '<span class="badge" style="background:var(--line-2);color:var(--muted);font-size:11.5px">Pendente de Treino</span>'
            : taxa >= 80
              ? `<span class="badge ok" style="font-size:11.5px">✓ Zona de Corte (${taxa}%)</span>`
              : taxa >= 65
                ? `<span class="badge brand" style="font-size:11.5px">⚡ Competitivo (${taxa}%)</span>`
                : `<span class="badge bad" style="font-size:11.5px">🚨 Abaixo do Corte (${taxa}%)</span>`;

          return `
            <div class="desemp-disc-item">
              <div class="desemp-disc-head">
                <div class="desemp-disc-title">
                  <span class="desemp-disc-name">${esc(m.materia)}</span>
                  ${m.peso > 1 ? `<span class="badge brand" style="font-size:11px">Peso ${m.peso}</span>` : ''}
                  ${m.questoesNaBanca ? `<span class="badge" style="background:#FEF3C7;color:#92400E;font-size:11px">🔥 ${m.questoesNaBanca} na banca</span>` : ''}
                </div>
                <div class="desemp-disc-stats">
                  <span class="hint">${m.questoesAcertos || 0}/${m.questoesRespondidas || 0} acertadas</span>
                  ${badgeCorte}
                </div>
              </div>
              <div class="desemp-bar-wrap">
                <div class="desemp-bar-track" title="${temPratica ? taxa + '% de aproveitamento' : 'Nenhuma questão respondida nesta matéria ainda'}">
                  <div class="desemp-cut-line" title="Linha de corte da aprovação: 80%"></div>
                  ${temPratica && taxa > 0 ? `<div class="desemp-bar-fill" style="width:${taxa}%;background:${corBarra}"></div>` : ''}
                </div>
                <div class="desemp-bar-scale">
                  <span>0%</span>
                  <span class="desemp-scale-corte" title="Linha de corte recomendada: 80%">▲ Corte (80%)</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          `;
        }).join('') : '<div class="empty" style="padding:24px">Nenhuma matéria registrada ainda.</div>'}
      </div>
    </div>

    <!-- Matriz 2D de Relevância da Banca × Domínio do Aluno (Quadrantes da Aprovação) -->
    <div class="section-h" style="margin-top:24px">
      <div>
        <h3 style="margin:0;font-size:18px">Matriz de Pareto: Relevância da Banca × Domínio do Concurseiro</h3>
        <div class="hint">Mapeamento tático dos seus tópicos de estudo dividido em 4 quadrantes de decisão.</div>
      </div>
    </div>

    <div class="quadrantes-grid">
      <!-- Quadrante 1: Zona de Perigo -->
      <div class="quadrante-box danger">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:#B91C1C">🚨 Zona de Perigo (Urgente)</span>
            <span class="badge bad" style="font-weight:800">${(quad.perigo || []).length}</span>
          </div>
          <div class="quadrante-sub">Alta incidência na prova onde seu rendimento está baixo (< 60%). Máxima prioridade de estudo.</div>
          <div class="quadrante-items">
            ${(quad.perigo || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)} · ${t.questoesNaBanca ? `🔥 <b>${t.questoesNaBanca} q. na banca</b>` : 'Relevante'}</div>
                </div>
                <div class="row" style="gap:4px">
                  ${t.questoesNaBanca ? `<button type="button" class="btn btn-ghost btn-sm" data-treinar-reais="${t.id}" title="Resolver reais a custo US$ 0">${ic('book', 'sm')} Reais</button>` : ''}
                  <button type="button" class="btn btn-primary btn-sm" data-treinar-topico="${t.id}">${ic('spark', 'sm')}</button>
                </div>
              </div>
            `).join('')}
            ${!(quad.perigo || []).length ? '<div class="hint" style="padding:14px;text-align:center">Parabéns! Nenhum ponto cego crítico detectado.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Quadrante 2: Fortaleza -->
      <div class="quadrante-box fortaleza">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:#15803D">🏆 Fortaleza (Zona de Aprovação)</span>
            <span class="badge ok" style="font-weight:800">${(quad.fortaleza || []).length}</span>
          </div>
          <div class="quadrante-sub">Tópicos quentes da banca onde você tem domínio comprovado (≥ 75%). Aqui você garante seus pontos.</div>
          <div class="quadrante-items">
            ${(quad.fortaleza || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)} · <b style="color:var(--ok)">${t.taxaAcerto}% acerto</b></div>
                </div>
                <span class="badge ok" style="font-size:11px">Dominado</span>
              </div>
            `).join('')}
            ${!(quad.fortaleza || []).length ? '<div class="hint" style="padding:14px;text-align:center">Resolva mais simulados para consolidar sua fortaleza.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Quadrante 3: Atenção Moderada -->
      <div class="quadrante-box reforco">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:#B45309">⚠️ Atenção Moderada (Reforço)</span>
            <span class="badge accent" style="font-weight:800">${(quad.reforco || []).length}</span>
          </div>
          <div class="quadrante-sub">Tópicos com rendimento intermediário (60% a 74%). Suba para a zona de corte com revisões.</div>
          <div class="quadrante-items">
            ${(quad.reforco || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)} · <b>${t.taxaAcerto != null ? t.taxaAcerto + '%' : 'Pendente'}</b></div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" data-treinar-topico="${t.id}">${ic('spark', 'sm')} Praticar</button>
              </div>
            `).join('')}
            ${!(quad.reforco || []).length ? '<div class="hint" style="padding:14px;text-align:center">Nenhum tópico em reforço no momento.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Quadrante 4: Zona de Conforto -->
      <div class="quadrante-box conforto">
        <div>
          <div class="quadrante-head">
            <span class="quadrante-title" style="color:var(--ink-2)">☕ Zona Secundária</span>
            <span class="badge" style="font-weight:800">${(quad.conforto || []).length}</span>
          </div>
          <div class="quadrante-sub">Tópicos com baixa incidência histórica nas provas anteriores da banca. Não gaste tempo excessivo aqui.</div>
          <div class="quadrante-items">
            ${(quad.conforto || []).slice(0, 5).map((t) => `
              <div class="quadrante-item">
                <div style="min-width:0">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nome)}</div>
                  <div class="hint" style="font-size:11.5px">${esc(t.materia)}</div>
                </div>
                <span class="badge" style="font-size:11px">Baixa Cobrança</span>
              </div>
            `).join('')}
            ${!(quad.conforto || []).length ? '<div class="hint" style="padding:14px;text-align:center">Sem tópicos secundários listados.</div>' : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Eventos da tela (desempenho); chamada pela bindApp em eventos.js a cada desenho. */
function ligarDesempenho() {
  on('#btnRefreshDesemp', 'click', () => loadDesempenho(S.desempEditalId));
  on('#selDesempEdital', 'change', (e) => {
    S.desempEditalId = e.target.value;
    loadDesempenho(S.desempEditalId);
  });
}

export { loadDesempenho, renderGaugeSvg, renderDonutDuploSvg, renderEvolucaoSvg, viewDesempenho, ligarDesempenho };
