// Front do HelpConcurso — Gerar questões (wizard).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { openCaderno, refreshCadernos } from './cadernos.js';
import { refreshEditais } from './edital.js';
import { BANCA, S, newWiz } from './estado.js';
import { go } from './eventos.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { saveSetSoon } from './simulado.js';
import { $, API, API_ORIGEM, api, esc, on, toast } from './util.js';

// ---------- Gerar questões (wizard) ----------
function viewGerar() {
  const w = S.wiz || (S.wiz = newWiz());
  const steps = ['Material', 'Matéria', 'Banca', 'Questões'];
  return `<h1 class="page-title">Gerar questões</h1><p class="page-sub">Envie seu material de estudo e escolha em qual banca as questões devem se basear.</p>
  <div class="stepper">${steps.map((s, i) => `<div class="step ${w.step === i + 1 ? 'on' : w.step > i + 1 ? 'done' : ''}"><span class="n">${w.step > i + 1 ? ic('check', 'sm') : i + 1}</span><span class="lbl">${s}</span></div>`).join('')}</div>
  <div class="card card-pad">${[wizStep1, wizStep2, wizStep3, wizStep4][w.step - 1](w)}</div>`;
}
const FT = { pdf: '#B42318', docx: '#1D4ED8', doc: '#1D4ED8', txt: '#6B7684', md: '#6B7684' };
function wizEditalBox(w) {
  const list = S.editais || [];
  const selEd = list.find((e) => e.id === w.editalId);
  const selBanca = selEd?.banca && BANCA()[selEd.banca];
  if (w.editalBusy) {
    return `<div class="edital-box"><div class="row"><span class="spinner sm"></span><b>Lendo e verticalizando seu edital com a IA…</b><span class="hint">Extraindo disciplinas e tópicos do conteúdo programático.</span></div></div>`;
  }
  return `<div class="edital-box">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div style="display:flex;gap:10px;align-items:center">
        <span class="li-icon" style="background:var(--brand);width:36px;height:36px">${ic('target', 'sm')}</span>
        <div>
          <div style="font-weight:800;font-size:14px">Cruzar material com o Edital e Prova do concurso <span class="badge brand">Novo</span></div>
          <div class="hint">Relaciona seu material ao Edital, à Banca e às Provas cadastradas para calcular % de avanço e gerar questões fiéis.</div>
        </div>
      </div>
      <div class="row">
        ${list.length ? `<select class="select" id="wizEditalSel" style="width:auto;min-width:240px;padding:8px 11px;font-size:13.5px">
          <option value="">Sem edital vinculado</option>
          ${list.map((e) => { const b = e.banca && BANCA()[e.banca]; return `<option value="${e.id}" ${w.editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`; }).join('')}
        </select>` : ''}
        <button type="button" class="btn btn-ghost" id="wizToggleEditalUp" style="padding:8px 12px;font-size:13px">${ic('upload', 'sm')} ${w.showEditalUpload ? 'Cancelar' : list.length ? 'Novo edital' : 'Enviar edital'}</button>
      </div>
    </div>
    ${selEd ? `<div class="row" style="margin-top:8px;gap:8px;font-size:12.5px">
      ${selBanca ? `<span class="badge" style="background:${selBanca.cor};color:#fff">Banca: ${esc(selBanca.nome)}</span>` : ''}
      ${selEd.orgao ? `<span class="badge">Órgão: ${esc(selEd.orgao)}</span>` : ''}
      ${selEd.cargo ? `<span class="badge">Cargo: ${esc(selEd.cargo)}</span>` : ''}
      <span class="hint">A banca e as provas vinculadas a este edital serão priorizadas na geração das questões.</span>
    </div>` : ''}
    ${w.showEditalUpload ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">
      <div class="row" style="margin-bottom:10px;gap:10px">
        <div class="field" style="margin:0;min-width:200px"><label for="wizEdBanca">Banca deste edital</label>
          <select class="select" id="wizEdBanca"><option value="">Detectar automaticamente</option>${S.bancas.map((b) => `<option value="${b.id}" ${w.banca === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select>
        </div>
        ${(S.minhas || []).length ? `<div class="field" style="margin:0;flex:1;min-width:220px"><label for="wizEdProva">Vincular a uma prova enviada <span class="hint">(opcional)</span></label>
          <select class="select" id="wizEdProva"><option value="">Nenhuma prova selecionada</option>${(S.minhas || []).map((p) => `<option value="${p.id}">${esc(p.titulo)}</option>`).join('')}</select>
        </div>` : ''}
      </div>
      <label class="drop slim" id="wizEditalDrop" style="padding:18px">
        <input type="file" id="wizEditalFile" class="sr" accept=".pdf,.doc,.docx,.txt">
        <strong style="font-size:14px">${ic('upload', 'sm')} Escolha o arquivo do Edital (ou conteúdo programático)</strong>
        <span class="hint">PDF, DOCX, DOC ou TXT · A IA extrai automaticamente as matérias e tópicos</span>
      </label>
    </div>` : ''}
  </div>`;
}
function wizStep1(w) {
  if (w.uploading) return `<div class="progress-box"><div class="spinner"></div><b>Lendo seu material${w.editalId ? ' e cruzando com o edital' : ''}…</b><div class="hint">Verificando a segurança do arquivo, extraindo o texto, identificando a matéria${w.editalId ? ' e mapeando os tópicos do edital' : ''}.<br>PDFs escaneados podem levar até 1 minuto.</div></div>`;
  const m = w.material;
  if (m) {
    const ext = m.fileName ? m.fileName.split('.').pop().toLowerCase() : 'texto';
    return `${wizEditalBox(w)}<div class="file-card"><span class="ftype" style="background:${FT[ext] || 'var(--brand)'}">${esc(ext.toUpperCase())}</span>
      <div style="flex:1;min-width:0"><div class="li-title">${esc(m.fileName || 'Texto colado')}</div><div class="li-meta">${m.pages ? m.pages + ' páginas · ' : ''}${m.wordCount.toLocaleString('pt-BR')} palavras extraídas${m.editalMatch ? ` · <b style="color:var(--brand)">${m.editalMatch.cobertura_disciplina_pct}% da disciplina no edital</b>` : ''}</div></div>
      <button class="btn btn-quiet" id="resetFile">${ic('refresh', 'sm')} Trocar</button></div>
      ${(w.warnings || []).map((t) => `<div class="banner warn" style="margin:12px 0 0">${ic('alert', 'sm')}<div>${esc(t)}</div></div>`).join('')}
      <div class="preview">${esc(m.preview)}${m.wordCount > 220 ? '…' : ''}</div>
      <div class="wiz-foot"><span></span><button class="btn btn-primary" data-step="2">Continuar ${ic('arrowR', 'sm')}</button></div>`;
  }
  return `${w.err ? `<div class="banner bad">${ic('alert', 'sm')}<div>${esc(w.err)}</div></div>` : ''}
  ${wizEditalBox(w)}
  ${w.mode === 'file' ? `
    <label class="drop" id="drop"><input type="file" id="fileIn" class="sr" accept=".pdf,.doc,.docx,.txt,.md">
      <div class="big">${ic('upload', 'lg')}</div><strong>Arraste seu material de estudo aqui ou clique para escolher</strong><span class="hint">Resumos, anotações, exercícios, apostilas ou trechos de lei · até 25 MB</span>
      <div class="formats"><span class="badge">PDF</span><span class="badge">DOCX</span><span class="badge">DOC</span><span class="badge">TXT</span></div>
    </label>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-quiet" id="modePaste">Prefere colar o texto?</button></div>`
  : `<div class="field"><label for="pasteIn">Cole seu material de estudo</label><textarea class="textarea" id="pasteIn" placeholder="Cole aqui seu resumo, anotações ou o conteúdo da apostila…"></textarea><span class="hint">Mínimo de 60 palavras.</span></div>
    <div class="wiz-foot"><button class="btn btn-ghost" id="modeFile">${ic('arrowL', 'sm')} Enviar arquivo</button><button class="btn btn-primary" id="usePaste">Usar este texto ${ic('arrowR', 'sm')}</button></div>`}`;
}
function donutSvg(pct, size = 76, color = 'var(--brand)') {
  const r = 30, c = 2 * Math.PI * r, off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return `<svg width="${size}" height="${size}" viewBox="0 0 76 76" class="donut"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="8"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${Math.round(pct)}%</text></svg>`;
}
function wizStep2(w) {
  const d = w.material?.detect, em = w.material?.editalMatch;
  const opts = S.materias.map((m) => `<option ${m === w.materia ? 'selected' : ''}>${esc(m)}</option>`).join('');
  return `${d ? `<div class="detect"><span class="li-icon" style="background:var(--brand);width:48px;height:48px">${ic('spark')}</span>
     <div style="flex:1"><div class="eyebrow">${d.origem === 'palavras-chave' ? 'Sugestão por palavras-chave' : 'Matéria identificada pela IA'}</div>
       <div style="font-size:21px;font-weight:800;letter-spacing:-.01em">${esc(d.materia)}</div>
       <div class="conf"><i style="width:${Math.round((d.confianca || 0) * 100)}%"></i></div><div class="hint">Confiança de ${Math.round((d.confianca || 0) * 100)}%</div>
       ${d.resumo ? `<p style="margin:10px 0 0;color:var(--ink-2)">${esc(d.resumo)}</p>` : ''}
       ${(d.temas || []).length ? `<div class="chips" style="margin-top:10px">${d.temas.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
     </div></div>`
    : '<p style="margin-top:0">Não conseguimos identificar a matéria automaticamente. <b>Qual é a matéria deste material?</b></p>'}
  ${em ? `<div class="edital-match-card">
    <div class="row" style="justify-content:space-between;align-items:center;gap:16px">
      <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:240px">
        ${donutSvg(em.cobertura_disciplina_pct, 76, 'var(--brand)')}
        <div>
          <div class="eyebrow" style="color:var(--brand)">Cruzamento com seu Edital · ${esc(em.edital_titulo)}</div>
          <div style="font-size:17px;font-weight:800;margin:2px 0">Cobre ${em.cobertura_disciplina_pct}% de ${esc(em.disciplina_nome)} no edital</div>
          <div class="hint">${(em.topicos_cobertos || []).length} de ${em.total_topicos_disciplina || ((em.topicos_cobertos || []).length + (em.topicos_faltantes || []).length)} tópico(s) desta disciplina identificados no seu material</div>
        </div>
      </div>
      <button type="button" class="btn btn-quiet" data-go="edital">${ic('target', 'sm')} Ver edital completo</button>
    </div>
    ${em.analise ? `<p style="margin:12px 0 0;font-size:13.5px;color:var(--ink-2)">${esc(em.analise)}</p>` : ''}
    ${(em.topicos_cobertos || []).length ? `<div class="eyebrow" style="margin:14px 0 6px">Tópicos do edital abordados neste material</div>
      <div class="edital-topics-list">${em.topicos_cobertos.map((t) => `<div class="edital-topic-hit ${t.nivel_cobertura}">
        <div class="row" style="justify-content:space-between"><span style="font-weight:700;font-size:13.5px">${t.codigo ? `<b>${esc(t.codigo)}.</b> ` : ''}${esc(t.nome)}</span>
          <span class="badge ${t.nivel_cobertura === 'completo' ? 'brand' : 'accent'}">${t.nivel_cobertura === 'completo' ? '✓ Cobertura completa' : '◐ Cobertura parcial'}</span></div>
        ${t.resumo ? `<div class="hint" style="margin-top:3px">${esc(t.resumo)}</div>` : ''}
      </div>`).join('')}</div>` : ''}
    ${(em.topicos_faltantes || []).length ? `<details style="margin-top:10px"><summary>Faltam ${(em.topicos_faltantes || []).length} tópico(s) desta disciplina no edital (ver lacunas)</summary>
      <div class="chips" style="margin-top:8px">${em.topicos_faltantes.map((t) => `<span class="chip">${t.codigo ? esc(t.codigo) + '. ' : ''}${esc(t.nome)}</span>`).join('')}</div></details>` : ''}
  </div>` : ''}
  <hr style="border:0;border-top:1px solid var(--line-2);margin:22px 0">
  <div class="opts" style="margin-top:0">
    <div class="field"><label for="matSel">${d ? 'Confirme ou altere a matéria' : 'Matéria'}</label><select class="select" id="matSel"><option value="">Selecione…</option>${opts}</select></div>
    <div class="field"><label for="assIn">Assunto específico <span class="hint">(opcional)</span></label><input class="input" id="assIn" placeholder="Ex.: Atos administrativos" value="${esc(w.assunto)}"></div>
  </div>
  <div class="wiz-foot"><button class="btn btn-ghost" data-step="1">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="toStep3">Escolher banca ${ic('arrowR', 'sm')}</button></div>`;
}
function wizStep3(w) {
  const cadsForBanca = (S.cadernos || []).filter((c) => !w.banca || c.banca === w.banca);
  return `<div style="margin-bottom:14px"><div class="eyebrow">Matéria</div><b>${esc(w.materia)}${w.assunto ? ` · ${esc(w.assunto)}` : ''}</b></div>
  <div class="field" style="margin-bottom:8px"><label>Em qual banca as questões devem se basear?</label></div>
  <div class="banca-pick">${S.bancas.map((b) => `<button class="bp ${w.banca === b.id ? 'on' : ''}" style="--c:${b.cor}" data-banca="${b.id}">
     <div class="top"><span class="bdot" style="background:${b.cor}"></span><span class="bn">${b.nome}</span><span class="radio"></span></div>
     <div class="fmt">${b.formatoLabel}</div><p>${esc(b.resumo)}</p>
     <div class="tr">${b.provasTreinadas ? `${ic('brain', 'sm')} Aprendeu com ${b.provasTreinadas} prova(s) · ${b.questoesReais || 0} questões reais` : 'Usando o perfil base da banca'}</div></button>`).join('')}</div>
  <div class="opts">
    <div><div class="field" style="margin-bottom:8px"><label>Quantidade de questões</label></div><div class="seg">${[5, 10, 15, 20].map((n) => `<button data-qtd="${n}" class="${w.qtd === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div><div class="field" style="margin-bottom:8px"><label>Nível de dificuldade</label></div><div class="seg">${S.niveis.map((n) => `<button data-nivel="${n}" class="${w.nivel === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
  </div>
  ${(S.cadernos || []).length ? `<div class="edital-subbox" style="margin-top:16px">
    <div class="field" style="margin:0"><label for="wizCadSel">${ic('book', 'sm')} Alimentar qual Caderno de Questões com esta bateria? <span class="hint">(opcional)</span></label>
      <select class="select" id="wizCadSel">
        <option value="">Salvar apenas como simulado avulso</option>
        ${(cadsForBanca.length ? cadsForBanca : S.cadernos).map((c) => { const b = BANCA()[c.banca]; return `<option value="${c.id}" ${w.cadernoId === c.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(c.titulo)} (${c.totalQuestoes} questões)</option>`; }).join('')}
      </select>
    </div>
  </div>` : ''}
  ${S.quota && S.quota.remaining !== null ? `<div class="hint" style="margin-top:16px">${S.quota.remaining > 0 ? `Você ainda pode gerar ${S.quota.remaining} simulado(s) hoje${S.quota.bonus ? ` (inclui ${S.quota.bonus} crédito(s) extra(s))` : ''}.` : 'Você atingiu o limite de hoje. Envie provas para ganhar gerações extras.'}</div>` : ''}
  <div class="wiz-foot"><button class="btn btn-ghost" data-step="2">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="gen" ${w.banca ? '' : 'disabled'}>${ic('spark', 'sm')} Gerar ${w.qtd} questões</button></div>`;
}
function wizStep4(w) {
  if (w.genErr) return `<div class="banner bad">${ic('alert', 'sm')}<div>${esc(w.genErr)}</div></div><div class="wiz-foot"><button class="btn btn-ghost" data-step="3">${ic('arrowL', 'sm')} Voltar</button><button class="btn btn-primary" id="gen">${ic('refresh', 'sm')} Tentar de novo</button></div>`;
  const b = BANCA()[w.banca], pct = Math.min(96, Math.round((w.genCount / w.qtd) * 100));
  const title = w.stage === 'revisando' ? 'Revisor automático conferindo cada questão…' : w.stage === 'refazendo' ? `Refazendo ${w.stageCount || ''} questão(ões) que não passaram na revisão…` : `Elaborando questões no estilo ${esc(b.nome)}…`;
  const sub = w.stage === 'revisando' ? 'Uma segunda IA resolve as questões sem ver o gabarito, usando só o seu material' : w.stage === 'refazendo' ? 'Para o seu caderno sair completo' : w.genCount ? `Questão ${Math.min(w.genCount, w.qtd)} de ${w.qtd}` : 'Analisando seu material e o estilo da banca';
  return `<div class="progress-box"><div class="spinner"></div><b>${title}</b>
    <div class="hint">${sub}</div>
    <div class="bar"><i style="width:${w.genCount ? pct : 4}%"></i></div><div class="hint" style="margin-top:14px">Isso costuma levar de 30 segundos a 2 minutos.</div></div>`;
}

async function uploadMaterial(payload) {
  const w = S.wiz; w.uploading = true; w.err = ''; render();
  try {
    if (payload instanceof FormData) { if (w.editalId) payload.append('editalId', w.editalId); }
    else if (payload && typeof payload === 'object' && w.editalId) payload.editalId = w.editalId;
    const r = payload instanceof FormData ? await api('/materials', { method: 'POST', form: payload }) : await api('/materials', { method: 'POST', body: payload });
    w.material = r.material; w.warnings = r.warnings || [];
    const d = r.material.detect, em = r.material.editalMatch;
    const suggestedMat = em?.disciplina_nome && S.materias.includes(em.disciplina_nome) ? em.disciplina_nome : d?.materia;
    w.materia = suggestedMat && S.materias.includes(suggestedMat) ? suggestedMat : (suggestedMat ? 'Outra' : '');
    if (suggestedMat && w.materia === 'Outra') w.assunto = suggestedMat;
    else if (em?.topicos_cobertos?.length === 1 && !w.assunto) w.assunto = em.topicos_cobertos[0].nome.slice(0, 100);
    if (w.editalId) refreshEditais({ silent: true });
  } catch (e) { w.err = e.message; }
  w.uploading = false; render();
}

async function generate() {
  const w = S.wiz; w.step = 4; w.generating = true; w.genErr = ''; w.genCount = 0; w.stage = ''; render();
  try {
    const res = await fetch(API + '/sets', { method: 'POST', credentials: API_ORIGEM ? 'include' : 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId: w.material.id, materia: w.materia, assunto: w.assunto, banca: w.banca, qtd: w.qtd, nivel: w.nivel, cadernoId: w.cadernoId || null }) });
    if (!res.ok) { let d = {}; try { d = await res.json(); } catch {} throw new Error(d.error || `Erro ${res.status}`); }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', done = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === 'progress') { w.genCount = ev.count; if (S.view === 'gerar' && w.step === 4) render(); }
        else if (ev.type === 'stage') { w.stage = ev.stage; w.stageCount = ev.count; if (S.view === 'gerar' && w.step === 4) render(); }
        else if (ev.type === 'error') throw new Error(ev.message);
        else if (ev.type === 'done') done = ev;
      }
    }
    if (!done) throw new Error('A geração foi interrompida. Tente novamente.');
    S.sets.unshift(done.set);
    refreshCadernos({ silent: true });
    if (done.set.cadernoId) {
      S.wiz = null;
      await openCaderno(done.set.cadernoId);
    } else {
      S.wiz = null; S.active = done.set.id; go('simulado');
    }
    const rv = done.set.revisao;
    toast(`${done.set.questoes.length} questões adicionadas${done.set.cadernoId ? ' ao seu Caderno de Questões' : ''} (${BANCA()[done.set.banca]?.nome || 'várias bancas'})${rv && rv.revisor === 'ok' ? ` · revisor conferiu todas${rv.descartadas ? `, descartou ${rv.descartadas} e refez ${rv.refeitas}` : ''}` : ''}`);
    api('/sets/cota').then((r) => { S.quota = r.quota; }).catch(() => {});
  } catch (e) { w.genErr = e.message; render(); }
  finally { w.generating = false; }
}

// BATERIA DE REVANCHE DA IA: Dispara geração focada em destruir pontos cegos
async function dispararRevanche({ setId, cadernoId, indices = [], keys = [], banca, materia, assunto, qtd = 3 }) {
  S.modal = {
    title: '⚡ Gerando Bateria de Revanche da IA',
    html: `
      <div style="text-align:center;padding:28px 20px">
        <div class="spinner" style="margin:0 auto 16px;width:38px;height:38px"></div>
        <div style="font-weight:800;font-size:16px;color:var(--brand-ink)" id="revancheStage">Analisando pontos cegos e pegadinhas...</div>
        <div class="hint" style="margin-top:6px" id="revancheProgress">A IA está criando questões inéditas no estilo da banca para você dominar o conceito.</div>
      </div>
    `,
  };
  render();

  try {
    const res = await fetch(API + '/sets/revanche', {
      method: 'POST',
      credentials: API_ORIGEM ? 'include' : 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, cadernoId, indices, keys, banca, materia, assunto, qtd }),
    });

    if (!res.ok) {
      let d = {};
      try { d = await res.json(); } catch {}
      throw new Error(d.error || `Erro ${res.status}`);
    }

    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', done = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === 'progress') {
          const el = $('#revancheProgress');
          if (el) el.textContent = `Criando questão ${ev.count} de ${qtd} inédita...`;
        } else if (ev.type === 'stage') {
          const el = $('#revancheStage');
          if (el) {
            if (ev.stage === 'analisando_pontos_cegos') el.textContent = 'Mapeando onde você foi fisgado pela banca...';
            else if (ev.stage === 'revisando') el.textContent = 'Revisando qualidade e conformidade das questões...';
            else el.textContent = 'Finalizando bateria de revanche...';
          }
        } else if (ev.type === 'error') {
          throw new Error(ev.message);
        } else if (ev.type === 'done') {
          done = ev;
        }
      }
    }

    if (!done || !done.set) throw new Error('A geração da revanche foi interrompida.');

    S.modal = null;
    S.sets.unshift(done.set);
    S.active = done.set.id;
    go('simulado');
    toast(`⚡ Bateria de Revanche pronta com ${done.set.questoes.length} questões! Mostre que domina o conceito.`);
  } catch (e) {
    S.modal = null;
    render();
    toast(e.message || 'Falha ao gerar revanche.');
  }
}

function formatTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

let modoProvaTimer = null;
function initModoProvaTimer(s) {
  if (modoProvaTimer) clearInterval(modoProvaTimer);
  if (!s || !s.modoProva || s.finalizado || !s.tempoLimiteMinutos) return;
  modoProvaTimer = setInterval(() => {
    if (S.view !== 'simulado' || S.active !== s.id || s.finalizado) {
      clearInterval(modoProvaTimer);
      return;
    }
    s.tempoGastoSegundos = (s.tempoGastoSegundos || 0) + 1;
    const totalSeg = s.tempoLimiteMinutos * 60;
    const restante = Math.max(0, totalSeg - s.tempoGastoSegundos);
    const el = $('#modoProvaCountdown');
    if (el) {
      el.textContent = formatTempo(restante);
      el.className = 'modo-prova-timer' + (restante <= 300 ? ' danger' : restante <= 900 ? ' warn' : '');
    }
    if (s.tempoGastoSegundos % 20 === 0) {
      saveSetSoon(s, { tempoGastoSegundos: s.tempoGastoSegundos });
    }
    if (restante <= 0) {
      clearInterval(modoProvaTimer);
      toast('Tempo limite atingido! Entregando a sua prova...');
      s.finalizado = true;
      api(`/sets/${s.id}`, { method: 'PATCH', body: { finalizado: true, respostas: s.respostas || {}, tempoGastoSegundos: s.tempoGastoSegundos } })
        .then((r) => { Object.assign(s, r.set); render(); })
        .catch(() => {});
    }
  }, 1000);
}

/** Eventos da tela (gerar); chamada pela bindApp em eventos.js a cada desenho. */
function ligarGerar() {
  const w = S.wiz;
  const fi = $('#fileIn'), drop = $('#drop');
  const send = (file) => { const fd = new FormData(); fd.append('file', file); uploadMaterial(fd); };
  if (fi) fi.onchange = () => fi.files[0] && send(fi.files[0]);
  if (drop) {
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) send(f); });
  }
  const wes = $('#wizEditalSel');
  if (wes) wes.onchange = async () => {
    w.editalId = wes.value;
    const chosen = (S.editais || []).find((x) => x.id === w.editalId);
    if (chosen?.banca && S.bancas.some((b) => b.id === chosen.banca)) w.banca = chosen.banca;
    if (w.material) {
      w.uploading = true; render();
      try { const r = await api(`/materials/${w.material.id}/edital`, { method: 'POST', body: { editalId: w.editalId } }); w.material = r.material; refreshEditais({ silent: true }); }
      catch (e) { toast(e.message); }
      w.uploading = false;
    }
    render();
  };
  on('#wizToggleEditalUp', 'click', () => { w.showEditalUpload = !w.showEditalUpload; render(); });
  const wef = $('#wizEditalFile');
  if (wef) wef.onchange = async () => {
    const f = wef.files[0]; if (!f) return;
    const bancaIn = $('#wizEdBanca')?.value || w.banca || '';
    const provaIn = $('#wizEdProva')?.value || '';
    w.editalBusy = true; w.showEditalUpload = false; render();
    try {
      const fd = new FormData(); fd.append('file', f);
      if (bancaIn) fd.append('banca', bancaIn);
      if (provaIn) fd.append('provaId', provaIn);
      const r = await api('/editais', { method: 'POST', form: fd });
      await refreshEditais({ silent: true });
      w.editalId = r.edital.id;
      if (r.edital.banca && S.bancas.some((b) => b.id === r.edital.banca)) w.banca = r.edital.banca;
      if (w.material) {
        const rm = await api(`/materials/${w.material.id}/edital`, { method: 'POST', body: { editalId: w.editalId } });
        w.material = rm.material;
      }
      toast(`Edital "${r.edital.titulo}" verticalizado (${r.edital.resumo.totalTopicos} tópicos)!`);
    } catch (e) { toast(e.message); }
    w.editalBusy = false; render();
  };
  on('#modePaste', 'click', () => { w.mode = 'paste'; w.err = ''; render(); });
  on('#modeFile', 'click', () => { w.mode = 'file'; render(); });
  on('#usePaste', 'click', () => uploadMaterial({ text: $('#pasteIn').value || '' }));
  on('#resetFile', 'click', () => { S.wiz = newWiz(); render(); });
  on('[data-step]', 'click', (e) => { w.step = +e.currentTarget.dataset.step; w.genErr = ''; render(); });
  const ms = $('#matSel'); if (ms) ms.onchange = () => { w.materia = ms.value; };
  const ai = $('#assIn'); if (ai) ai.oninput = () => { w.assunto = ai.value.trim(); };
  on('#toStep3', 'click', () => { if (!w.materia) return toast('Selecione a matéria do material.'); w.step = 3; render(); });
  on('[data-banca]', 'click', (e) => {
    w.banca = e.currentTarget.dataset.banca;
    if (!w.cadernoId) {
      const matchCad = (S.cadernos || []).find((c) => c.banca === w.banca && (!w.editalId || c.editalId === w.editalId));
      if (matchCad) w.cadernoId = matchCad.id;
    }
    render();
  });
  const wcs = $('#wizCadSel'); if (wcs) wcs.onchange = () => { w.cadernoId = wcs.value; };
  on('[data-qtd]', 'click', (e) => { w.qtd = +e.currentTarget.dataset.qtd; render(); });
  on('[data-nivel]', 'click', (e) => { w.nivel = e.currentTarget.dataset.nivel; render(); });
  on('#gen', 'click', () => { if (!w.generating) generate(); });
}

export { viewGerar, FT, wizEditalBox, wizStep1, donutSvg, wizStep2, wizStep3, wizStep4, uploadMaterial, generate, dispararRevanche, formatTempo, modoProvaTimer, initModoProvaTimer, ligarGerar };
