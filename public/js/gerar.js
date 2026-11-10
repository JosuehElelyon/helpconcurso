// Controlador da Tela "Gerar questões": orquestra APIs (materials, editais, sets) e compõe componentes do wizard.
import { openCaderno, refreshCadernos } from './cadernos.js';
import { refreshEditais } from './edital.js';
import { BANCA, S, newWiz } from './estado.js';
import { go } from './eventos.js';
import { render } from './render.js';
import { saveSetSoon } from './simulado.js';
import { $, API, API_ORIGEM, api, on, toast } from './util.js';
import { ProgressRing } from './components/ProgressRing.js';
import { StepperFluido } from './components/StepperFluido.js';
import { ResumoProgressoWizard, PainelEditalAside } from './components/WizardEditalAside.js';
import { FT, PassoMaterial, PassoMateria, PassoBancaConfig, PassoGeracaoProgresso } from './components/WizardPassos.js';

// ---------- Gerar questões (wizard composto por componentes) ----------
function viewGerar() {
  const w = S.wiz || (S.wiz = newWiz());
  const steps = [
    { n: 1, title: 'Material', sub: 'Upload ou texto' },
    { n: 2, title: 'Matéria', sub: 'Tópicos e IA' },
    { n: 3, title: 'Banca', sub: 'Estilo e banca' },
    { n: 4, title: 'Questões', sub: 'Simulado pronto' },
  ];
  const progressPct = w.step === 1 ? 14 : w.step === 2 ? 40 : w.step === 3 ? 74 : 100;
  const selEd = (S.editais || []).find((e) => e.id === w.editalId);

  return `<h1 class="page-title">Gerar questões</h1>
  <p class="page-sub">Envie seu material de estudo e escolha em qual banca as questões devem se basear.</p>
  ${StepperFluido({ steps, currentStep: w.step, progressPct, ariaLabel: 'Passos para gerar questões' })}
  ${ResumoProgressoWizard({ step: w.step, material: w.material, materia: w.materia, assunto: w.assunto, edital: selEd })}
  ${[wizStep1, wizStep2, wizStep3, wizStep4][w.step - 1](w)}`;
}

const donutSvg = (pct, size = 76, color = 'var(--brand)') =>
  ProgressRing({ pct, size, strokeWidth: 8, color });

const wizEditalBox = (w) => PainelEditalAside({
  editais: S.editais || [],
  editalId: w.editalId,
  editalBusy: w.editalBusy,
  showEditalUpload: w.showEditalUpload,
  bancas: S.bancas || [],
  bancaMap: BANCA(),
  banca: w.banca,
  minhasProvas: S.minhas || [],
});

const wizStep1 = (w) => PassoMaterial({ w, editalAsideHtml: wizEditalBox(w) });
const wizStep2 = (w) => PassoMateria({ w, materias: S.materias || [] });
const wizStep3 = (w) => PassoBancaConfig({
  w,
  bancas: S.bancas || [],
  bancaMap: BANCA(),
  niveis: S.niveis || [],
  cadernos: S.cadernos || [],
  quota: S.quota,
});
const wizStep4 = (w) => PassoGeracaoProgresso({
  w,
  bancaNome: (BANCA()[w.banca] || {}).nome || 'Banca',
});

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
