// Front do HelpConcurso — Resolver simulado.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { BANCA, S } from './estado.js';
import { formatTempo, initModoProvaTimer } from './gerar.js';
import { ic } from './icones.js';
import { placar } from './inicio.js';
import { LETRAS, api, esc, fmtDate, toast } from './util.js';

// ---------- Resolver simulado ----------
function viewPratica() {
  const s = S.sets.find((x) => x.id === S.active);
  if (!s) return `<div class="empty">Simulado não encontrado. <button class="btn btn-quiet" data-go="questoes">Voltar</button></div>`;
  const b = BANCA()[s.banca] || { nome: s.banca || 'Banca', cor: 'var(--brand)', formatoLabel: s.formato === 'ce' ? 'Certo / Errado' : 'Múltipla Escolha' };
  const r = s.respostas || {}, n = s.questoes.length;
  const { resp, ac, er, anuladas } = placar(s), ce = s.formato === 'ce';

  if (s.modoProva && !s.finalizado) {
    setTimeout(() => initModoProvaTimer(s), 50);
    const duvidas = s.duvidas || [];
    const restante = s.tempoLimiteMinutos ? Math.max(0, s.tempoLimiteMinutos * 60 - (s.tempoGastoSegundos || 0)) : null;

    return `<div class="row" style="gap:8px;margin:-6px 0 10px -10px">
      <button class="btn btn-quiet" data-go="questoes">${ic('arrowL', 'sm')} Sair da prova</button>
      ${s.cadernoId ? `<button class="btn btn-quiet" data-open-caderno="${s.cadernoId}">${ic('book', 'sm')} Caderno</button>` : ''}
    </div>
    <div class="modo-prova-header">
      <div>
        <div class="row" style="gap:8px;margin-bottom:4px">
          <span class="badge brand" style="font-weight:800">MODO PROVA OFICIAL</span>
          <span class="badge" style="background:${b.cor};color:#fff">${b.nome}</span>
          <span class="badge">${b.formatoLabel}</span>
        </div>
        <h2 style="margin:0;font-size:18px">${esc(s.materia)}</h2>
        <div class="hint">${esc(s.assunto || 'Simulado completo no padrão da banca')}</div>
      </div>
      <div class="modo-prova-timer-box">
        ${restante !== null ? `
          <div style="text-align:right">
            <div class="hint" style="font-size:11px;text-transform:uppercase;font-weight:700">Tempo restante</div>
            <div class="modo-prova-timer ${restante <= 300 ? 'danger' : restante <= 900 ? 'warn' : ''}" id="modoProvaCountdown">${formatTempo(restante)}</div>
          </div>
        ` : ''}
        <button class="btn btn-ghost" id="toggleNavGrid" style="padding:8px 12px">${ic('grid', 'sm')} Mapa (${resp}/${n})</button>
        <button class="btn btn-primary" id="finishProva">${ic('check', 'sm')} Entregar prova</button>
      </div>
    </div>

    <div class="card card-pad" id="navGridCard" style="${S.navGridOpen ? '' : 'display:none;'}margin-bottom:18px">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <div style="font-weight:800;font-size:14px">Mapa de Questões / Cartão-Resposta</div>
        <div class="edital-legend" style="font-size:12px">
          <span><i style="background:var(--brand)"></i>Respondida (${resp})</span>
          <span><i style="background:#F59E0B"></i>Dúvida 🚩 (${duvidas.length})</span>
          <span><i style="background:var(--line-2)"></i>Em branco (${n - resp})</span>
        </div>
      </div>
      <div class="modo-prova-nav-grid">
        ${s.questoes.map((q, idx) => {
          const isAns = r[idx] != null;
          const isDuv = duvidas.includes(idx);
          return `<button type="button" class="q-nav-btn ${isAns ? 'ans' : ''} ${isDuv ? 'duvida' : ''}" data-goto-q="${idx}" title="Questão ${idx + 1}">${idx + 1}</button>`;
        }).join('')}
      </div>
    </div>

    ${ce ? `<div class="banner info">${ic('info', 'sm')}<div><b>Regra CEBRASPE ativa:</b> Cada item errado desconta 1 acerto. Deixar em branco (sem marcar) não desconta nem pontua. Para deixar em branco, basta clicar na alternativa marcada para desmarcar.</div></div>` : ''}

    ${s.questoes.map((q, i) => viewQModoProva(q, i, r[i], ce, duvidas.includes(i))).join('')}

    <div class="row no-print" style="justify-content:space-between;margin-top:24px">
      <div class="row"><button class="btn btn-ghost" id="copySet">${ic('copy', 'sm')} Copiar questões</button></div>
      <button class="btn btn-primary btn-lg" id="finishProva">${ic('check', 'sm')} Entregar prova oficial</button>
    </div>`;
  }

  // Se modoProva e finalizado:
  let resultadoHeader = '';
  if (s.modoProva && s.finalizado) {
    const rf = s.estatisticas?.resultadoFinal;
    const tempoGasto = s.tempoGastoSegundos || rf?.tempoGastoSegundos || 0;
    const disciplinas = rf?.disciplinas || [];

    resultadoHeader = `<div class="prova-resultado-card">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <span class="badge brand" style="font-weight:800">RESULTADO OFICIAL DO SIMULADO</span>
          <h2 style="margin:4px 0;font-size:22px">${esc(s.materia)}</h2>
          <div class="hint">Banca ${b.nome} · Formato ${b.formatoLabel}</div>
        </div>
        ${s.cadernoId ? `<button class="btn btn-primary" data-open-caderno="${s.cadernoId}">${ic('book', 'sm')} Revisar erros no Caderno</button>` : ''}
      </div>
      <div class="prova-score-main">
        <div class="prova-score-badge">
          <div class="score-val" style="color:${ce ? (ac - er >= 0 ? 'var(--brand)' : 'var(--bad)') : 'var(--brand)'}">
            ${ce ? `${ac - er > 0 ? '+' : ''}${ac - er}` : `${Math.round((ac / Math.max(1, n)) * 100)}%`}
          </div>
          <div class="score-lbl">${ce ? 'Pontos Líquidos' : `${ac} de ${n} acertos`}</div>
        </div>
        <div style="flex:1;min-width:220px">
          <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px">
            <div class="card stat"><div class="v" style="color:var(--ok)">+${ac}</div><div class="l">Acertos</div></div>
            <div class="card stat"><div class="v" style="color:var(--bad)">-${er}</div><div class="l">Erros</div></div>
            <div class="card stat"><div class="v">${n - resp}</div><div class="l">Em Branco (0)</div></div>
            <div class="card stat"><div class="v">${formatTempo(tempoGasto)}</div><div class="l">Tempo Gasto</div></div>
          </div>
        </div>
      </div>
      ${disciplinas.length ? `
        <div style="font-weight:800;font-size:14px;margin-bottom:8px">Desempenho por Disciplina do Edital</div>
        <div class="prova-disc-grid">
          ${disciplinas.map((d) => `
            <div class="prova-disc-item">
              <div class="row" style="justify-content:space-between;margin-bottom:4px;font-size:13px">
                <b>${esc(d.materia)}</b>
                <span>${d.acertos}/${d.total} (${d.taxaAcerto ?? Math.round((d.acertos / Math.max(1, d.total)) * 100)}%)</span>
              </div>
              <div class="edital-track"><i style="width:${Math.round((d.acertos / Math.max(1, d.total)) * 100)}%;background:${(d.acertos / Math.max(1, d.total)) >= 0.7 ? 'var(--ok)' : 'var(--accent)'}"></i></div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${er > 0 ? `
        <div class="card card-pad" style="background:linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%);border:1.5px solid #F59E0B;border-radius:12px;margin-top:16px">
          <div class="row" style="gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
            <div class="row" style="gap:12px;align-items:center">
              <span class="li-icon" style="background:#F59E0B;color:#fff;width:38px;height:38px">${ic('spark')}</span>
              <div>
                <div style="font-weight:800;font-size:15px;color:#92400E">⚡ Bateria de Revanche da IA: Destruir Pontos Cegos</div>
                <div class="hint" style="color:#78350F">Você errou ${er} questão(ões). A IA cria questões inéditas focadas na pegadinha da banca para fixar o conceito!</div>
              </div>
            </div>
            <button class="btn btn-primary" id="btnRevancheSimulado" data-set-id="${s.id}" style="background:#D97706;border-color:#B45309;font-weight:800">
              ${ic('spark', 'sm')} Iniciar Revanche (${Math.min(5, Math.max(3, er))} questões)
            </button>
          </div>
        </div>
      ` : ''}
    </div>`;
  }

  return `<div class="row" style="gap:8px;margin:-6px 0 10px -10px">
    <button class="btn btn-quiet" data-go="questoes">${ic('arrowL', 'sm')} Cadernos e simulados</button>
    ${s.cadernoId ? `<button class="btn btn-quiet" data-open-caderno="${s.cadernoId}">${ic('book', 'sm')} Abrir Caderno de Questões</button>` : ''}
  </div>
  ${resultadoHeader}
  ${!resultadoHeader ? `
  <div class="set-head">
    <div><div class="row" style="margin-bottom:6px">
      ${s.origem === 'revanche' ? `<span class="badge accent" style="background:#FEF3C7;color:#92400E;font-weight:800;border:1px solid #FCD34D">⚡ BATERIA DE REVANCHE · Destruindo Ponto Cego</span>` : ''}
      ${s.estatisticas?.revancheSuperada ? `<span class="badge ok" style="font-weight:800">🏆 Ponto Cego Superado!</span>` : ''}
      <span class="badge" style="background:${b.cor};color:#fff">${b.nome}</span><span class="badge">${esc(s.nivel)}</span><span class="badge">${b.formatoLabel}</span></div>
      <h1 class="page-title">${esc(s.materia)}${s.assunto ? ` <span style="color:var(--muted);font-weight:700">· ${esc(s.assunto)}</span>` : ''}</h1>
      <div class="hint">${n} questões · gerado de ${esc(s.arquivo || 'texto colado')} em ${fmtDate(s.createdAt)}</div>
      ${s.revisao ? `<div class="hint" style="margin-top:4px">${s.revisao.revisor === 'ok' ? `${ic('check', 'sm')} Revisão automática: ${s.revisao.aprovadas} aprovada(s)${s.revisao.descartadas ? `, ${s.revisao.descartadas} descartada(s) e ${s.revisao.refeitas} refeita(s)` : ''}` : s.revisao.revisor === 'indisponivel' ? '⚠ O revisor automático estava indisponível: confira as questões com atenção' : ''}</div>` : ''}</div>
    <div class="score-box"><div><b>${resp}/${n - anuladas}</b><span>Respondidas</span></div><div><b style="color:var(--ok)">${ac}</b><span>Acertos</span></div><div><b style="color:var(--bad)">${er}</b><span>Erros</span></div>${ce ? `<div><b>${ac - er}</b><span>Nota líquida</span></div>` : ''}</div>
  </div>
  ${er > 0 ? `
    <div class="card card-pad" style="background:linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%);border:1.5px solid #F59E0B;border-radius:12px;margin:14px 0">
      <div class="row" style="gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div class="row" style="gap:12px;align-items:center">
          <span class="li-icon" style="background:#F59E0B;color:#fff;width:38px;height:38px">${ic('spark')}</span>
          <div>
            <div style="font-weight:800;font-size:15px;color:#92400E">⚡ Bateria de Revanche da IA: Destruir Pontos Cegos</div>
            <div class="hint" style="color:#78350F">Você errou ${er} questão(ões). A IA cria questões inéditas focadas na pegadinha da banca para fixar o conceito!</div>
          </div>
        </div>
        <button class="btn btn-primary" id="btnRevancheSimulado" data-set-id="${s.id}" style="background:#D97706;border-color:#B45309;font-weight:800">
          ${ic('spark', 'sm')} Iniciar Revanche (${Math.min(5, Math.max(3, er))} questões)
        </button>
      </div>
    </div>
  ` : ''}` : ''}
  ${ce && !resultadoHeader ? `<div class="banner info">${ic('info', 'sm')}<div>No estilo CEBRASPE, cada item errado anula um certo. Na dúvida, você pode deixar o item em branco.</div></div>` : ''}
  ${!s.modoProva ? `<div class="banner info">${ic('info', 'sm')}<div>As questões seguem o conteúdo do <b>seu material</b>. Se ele estiver desatualizado (ex.: lei alterada), a questão também estará. Achou um erro? Use <b>Reportar erro</b> — se a IA confirmar, você ganha estrelas.</div></div>` : ''}
  ${s.questoes.map((q, i) => viewQ(q, i, r[i], ce, (S.feedback[s.id] || {})[i], s)).join('')}
  <div class="row no-print" style="justify-content:space-between;margin-top:20px">
    <div class="row"><button class="btn btn-ghost" id="copySet">${ic('copy', 'sm')} Copiar questões</button><button class="btn btn-ghost" id="printSet">${ic('download', 'sm')} Imprimir / PDF</button><button class="btn btn-danger" id="delSet">${ic('trash', 'sm')} Excluir</button></div>
    <div class="row">${resp ? `<button class="btn btn-ghost" id="resetSet">${ic('refresh', 'sm')} Refazer</button>` : ''}<button class="btn btn-primary" id="finish">${s.finalizado ? 'Ver resultado' : 'Finalizar simulado'}</button></div>
  </div>`;
}

function renderExplicacaoCard(expData) {
  if (!expData) return '';
  const exp = expData.explicacao || expData;
  const isCached = !!expData.cached;
  return `
    <div class="pq-card" role="region" aria-label="Explicação didática do erro">
      <div class="pq-header">
        <div class="pq-title-row">
          <span class="pq-badge-prof">👨‍🏫 Professor Descomplicado</span>
          <h4 class="pq-title">Por que você errou esta questão?</h4>
        </div>
        ${isCached
          ? `<span class="badge brand" title="Explicação reutilizada instantaneamente com custo US$ 0">⚡ Resposta Instantânea</span>`
          : `<span class="badge accent">✨ Nova Análise IA</span>`}
      </div>

      <div class="pq-body">
        <div class="pq-section pq-diagnostico">
          <div class="pq-sec-title">🎯 Onde seu raciocínio foi fisgado</div>
          <p class="pq-text">${esc(exp.diagnostico)}</p>
          ${exp.pegadinha ? `<div class="pq-pega-box">
            <span class="pq-pega-tag">🍌 Casca de banana da banca</span>
            <p class="pq-pega-text">${esc(exp.pegadinha)}</p>
          </div>` : ''}
        </div>

        ${exp.exemploCotidiano ? `
        <div class="pq-section pq-exemplo">
          <div class="pq-sec-title">🍕 Exemplo do Cotidiano (para não esquecer mais)</div>
          <div class="pq-cotidiano-box">
            <p class="pq-text pq-cotidiano-text">${esc(exp.exemploCotidiano)}</p>
          </div>
        </div>` : ''}

        ${exp.fundamentacao ? `
        <div class="pq-section pq-fundamentacao">
          <div class="pq-sec-title">⚖️ Embasamento Legal & Teórico</div>
          <div class="pq-law-box">
            <p class="pq-text pq-law-text">${esc(exp.fundamentacao)}</p>
          </div>
        </div>` : ''}

        ${exp.dicaOuro ? `
        <div class="pq-section pq-dica">
          <div class="pq-sec-title">🧠 Dica de Ouro</div>
          <div class="pq-gold-box">
            <p class="pq-gold-text"><b>💡 Macete:</b> ${esc(exp.dicaOuro)}</p>
          </div>
        </div>` : ''}

        ${exp.visualSvg ? `
        <div class="pq-section pq-visual">
          <div class="pq-sec-title">🎨 Diagrama Visual Conceitual</div>
          <div class="pq-svg-container"><img alt="Diagrama da explicação" style="max-width:100%;height:auto" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(exp.visualSvg)}"></div>
        </div>` : ''}

        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #CBD5E1;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--brand-ink)">Pronto para provar que superou este erro?</div>
            <div class="hint" style="font-size:12px">Gere uma bateria inédita para cravar o conceito na mente.</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm btn-revanche-card" style="background:#D97706;border-color:#B45309">
            ${ic('spark', 'sm')} ⚡ Testar na Revanche IA
          </button>
        </div>
      </div>
    </div>
  `;
}

function viewQModoProva(q, i, ans, ce, isDuvida) {
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button type="button" class="alt ${ans === L ? 'selected-prova' : ''}" data-ans="${i}:${L}"><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${q.alternativas.map((a, j) => `<button type="button" class="alt ${ans === LETRAS[j] ? 'selected-prova' : ''}" data-ans="${i}:${LETRAS[j]}"><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;

  return `<article class="card q" id="q${i}">
    <div class="q-top">
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="q-num">${ce ? 'Item' : 'Questão'} ${i + 1}</span>
        ${q.materia ? `<span class="badge" style="background:var(--brand-soft);color:var(--brand);font-weight:700">${esc(q.materia)}</span>` : ''}
        ${q.tema && q.tema !== q.materia ? `<span class="badge">${esc(q.tema)}</span>` : ''}
        ${q.topico_edital ? `<span class="badge edital-tag">${ic('target', 'sm')} ${esc(q.topico_edital)}</span>` : ''}
      </div>
      <button type="button" class="btn btn-quiet btn-duvida ${isDuvida ? 'active' : ''}" data-toggle-duvida="${i}">
        ${isDuvida ? '🚩 Marcada como dúvida' : '⚐ Marcar dúvida'}
      </button>
    </div>
    <p class="q-text">${esc(q.enunciado)}</p>
    ${opts}
    <div class="q-prova-actions">
      <span class="hint">${ans ? `Marcada: <b>${ans === 'C' ? 'Certo' : ans === 'E' && ce ? 'Errado' : ans}</b>` : 'Não respondida'}</span>
      ${ce && ans ? `<button type="button" class="btn btn-quiet" data-clear-ans="${i}" style="font-size:12px;padding:4px 8px">Deixar em branco</button>` : ''}
    </div>
  </article>`;
}
function viewQ(q, i, ans, ce, fb, s = null) {
  const answered = ans != null, ok = ans === q.gabarito;
  const cls = (L) => (!answered ? '' : L === q.gabarito ? 'correct' : L === ans ? 'wrong' : '');
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button class="alt ${cls(L)}" data-ans="${i}:${L}" ${answered ? 'disabled' : ''}><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${q.alternativas.map((a, j) => `<button class="alt ${cls(LETRAS[j])}" data-ans="${i}:${LETRAS[j]}" ${answered ? 'disabled' : ''}><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;
  const setId = s?.id || S.activeSet?.id || '';
  const expKey = setId ? `set:${setId}:${i}` : null;
  const expData = expKey && S.explicacoes ? S.explicacoes[expKey] : null;
  const expLoading = expKey && S.explicacaoLoading ? S.explicacaoLoading[expKey] : false;

  return `<article class="card q" id="q${i}">
    <div class="q-top"><span class="q-num">${ce ? 'Item' : 'Questão'} ${i + 1}</span>${q.tema ? `<span class="badge">${esc(q.tema)}</span>` : ''}${q.topico_edital ? `<span class="badge edital-tag" title="Tópico do edital cobrado nesta questão">${ic('target', 'sm')} Edital: ${esc(q.topico_edital)}</span>` : ''}${q.nivel ? `<span class="badge">${esc(q.nivel)}</span>` : ''}${q.verificada ? `<span class="badge brand" title="Uma segunda IA resolveu sem ver o gabarito e chegou à mesma resposta">${ic('check', 'sm')} Verificada</span>` : ''}${q.contestada ? '<span class="sev high">Erro confirmado</span>' : ''}${q.anulada ? '<span class="badge sev high" title="A banca anulou esta questão no gabarito definitivo">Anulada pela banca — não conta</span>' : q.gabaritoAtualizado ? '<span class="badge accent" title="Gabarito conferido com o definitivo oficial">Gabarito atualizado (definitivo)</span>' : ''}</div>
    <p class="q-text">${esc(q.enunciado)}</p>${opts}
    ${answered ? `<div class="explain"><div class="verdict ${ok ? 'ok' : 'bad'}">${ic(ok ? 'check' : 'x', 'sm')} ${ok ? 'Você acertou' : 'Resposta incorreta'} · Gabarito: ${ce ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : q.gabarito}</div>
      <p>${esc(q.comentario)}</p>
      ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”<div class="hint" style="font-style:normal;margin-top:4px">${q.ancorada === false ? '⚠ Trecho não localizado exatamente no seu material — confira' : q.ancorada ? '✓ Trecho conferido no seu material' : 'Trecho do seu material'}</div></div>` : ''}
      ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
      ${!ok ? `<div class="row no-print" style="margin-top:12px;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn btn-ghost btn-pq-errei" data-pq-errei="${i}">
          ${expLoading ? `<span class="spinner sm" style="width:13px;height:13px;display:inline-block;vertical-align:-2px"></span> Analisando seu erro...` : `💡 Por que errei?`}
        </button>
        <button type="button" class="btn btn-ghost btn-revanche-q" data-revanche-q-idx="${i}" title="Gera 3 questões inéditas focadas nesta pegadinha para superar o erro">
          ${ic('spark', 'sm')} ⚡ Revanche IA
        </button>
      </div>
      ${expData ? renderExplicacaoCard(expData) : ''}` : ''}
      ${q.contestada ? `<div class="banner warn" style="margin:12px 0 0">${ic('alert', 'sm')}<div><b>Erro confirmado após reporte.</b> ${q.contestada.respostaCorreta ? `Resposta sustentada pelo material: <b>${esc(q.contestada.respostaCorreta)}</b>. ` : ''}${q.contestada.ambigua ? 'A questão é ambígua. ' : ''}${esc(q.contestada.explicacao)}</div></div>` : ''}</div>
    ${viewFeedbackBar(i, fb)}` : ''}
  </article>`;
}
function viewFeedbackBar(i, fb = {}) {
  const st = fb.reportStatus || 'none';
  const res = fb.result || {};
  let rep = '';
  if (S.reportOpen === i) rep = `<div class="report-box"><label class="hint" for="rep${i}">O que está errado nesta questão?</label><textarea class="textarea" id="rep${i}" maxlength="600" style="min-height:70px" placeholder="Ex.: o gabarito deveria ser C, porque o material diz que..."></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-quiet" data-repcancel>Cancelar</button><button class="btn btn-primary" data-repsend="${i}">${ic('flag', 'sm')} Enviar para verificação</button></div></div>`;
  else if (st === 'pending') rep = `<span class="hint"><span class="spinner sm" style="width:12px;height:12px"></span> Erro em verificação pela IA…</span>`;
  else if (st === 'confirmed') rep = `<span class="fb-ok">${ic('star', 'sm')} Erro confirmado${res.estrelas ? ` · +${res.estrelas} estrelas` : ''}. Obrigado!</span>`;
  else if (st === 'rejected') rep = `<div class="hint"><b>Reporte não confirmado:</b> ${esc(res.explicacao || '')}</div>`;
  else if (st === 'failed') rep = `<span class="hint">${esc(res.explicacao || 'Não foi possível verificar.')}</span> <button class="link-btn" data-repopen="${i}">Tentar de novo</button>`;
  else rep = `<button class="link-btn" data-repopen="${i}">${ic('flag', 'sm')} Reportar erro</button>`;
  return `<div class="fb-bar"><span class="hint">Esta questão foi boa?</span>
    <button class="fb-btn ${fb.rating === 1 ? 'on' : ''}" data-rate="${i}:1" aria-label="Gostei" title="Gostei">${ic('thumbUp', 'sm')}</button>
    <button class="fb-btn ${fb.rating === -1 ? 'on bad' : ''}" data-rate="${i}:-1" aria-label="Não gostei" title="Não gostei">${ic('thumbDown', 'sm')}</button>
    <span class="spacer"></span>${rep}</div>`;
}
let saveT;
function saveSetSoon(s, patch) { clearTimeout(saveT); saveT = setTimeout(() => api(`/sets/${s.id}`, { method: 'PATCH', body: patch }).catch(() => toast('Não foi possível salvar suas respostas.')), 700); }
function setText(s) {
  const b = BANCA()[s.banca];
  return `HelpConcurso · ${s.materia}${s.assunto ? ' · ' + s.assunto : ''}${b ? ` · estilo ${b.nome}` : ''}\n\n` + s.questoes.map((q, i) => `${i + 1}. ${q.enunciado}\n${s.formato === 'ce' ? '( ) Certo  ( ) Errado' : q.alternativas.map((a, j) => `${LETRAS[j]}) ${a}`).join('\n')}`).join('\n\n') + '\n\nGABARITO\n' + s.questoes.map((q, i) => `${i + 1}-${q.gabarito}`).join('  ');
}

export { viewPratica, renderExplicacaoCard, viewQModoProva, viewQ, viewFeedbackBar, saveT, saveSetSoon, setText };
