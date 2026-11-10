// Componentes UI puros: barra de progresso resumida e painel lateral de Edital & Concurso.
import { ic } from '../icones.js';
import { UPLOAD_MAX_MB } from '../lib/upload.js';
import { esc } from '../util.js';

export function ResumoProgressoWizard({ step, material, materia, assunto, edital }) {
  if (step < 2) return '';
  return `<div class="wiz-summary-bar">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-weight:800;font-size:12px;color:var(--brand-ink);text-transform:uppercase;letter-spacing:.04em">
        ${ic('check', 'sm')} Progresso do Simulado:
      </span>
    </div>
    <div class="wiz-summary-chips">
      ${material ? `
        <div class="wiz-summary-chip" data-step="1" title="Clique para trocar o material de estudo">
          <span>📄</span>
          <span><b>Material:</b> ${esc(material.fileName || 'Texto colado')} (${material.wordCount.toLocaleString('pt-BR')} palavras)</span>
          <span class="wiz-chip-edit">alterar</span>
        </div>
      ` : ''}
      ${step >= 3 && materia ? `
        <div class="wiz-summary-chip" data-step="2" title="Clique para alterar a matéria">
          <span>📚</span>
          <span><b>Matéria:</b> ${esc(materia)}${assunto ? ` · ${esc(assunto)}` : ''}</span>
          <span class="wiz-chip-edit">alterar</span>
        </div>
      ` : ''}
      ${edital ? `
        <div class="wiz-summary-chip" title="Edital vinculado a esta bateria">
          <span>🎯</span>
          <span><b>Edital:</b> ${esc(edital.titulo)}</span>
        </div>
      ` : ''}
    </div>
  </div>`;
}

export function PainelEditalAside({ editais = [], editalId = '', editalBusy = false, editalErr = '', showEditalUpload = false, bancas = [], bancaMap = {}, banca = '', minhasProvas = [] }) {
  const selEd = editais.find((e) => e.id === editalId);
  const selBanca = selEd?.banca && bancaMap[selEd.banca];

  if (editalBusy) {
    return `<aside class="wiz-edital-aside"><div class="row" style="gap:12px;align-items:center"><span class="spinner sm"></span><div><b>Lendo e verticalizando seu edital…</b><div class="hint" style="margin-top:4px">Extraindo disciplinas e tópicos com a IA.</div></div></div></aside>`;
  }

  return `<aside class="wiz-edital-aside" aria-label="Vincular edital e concurso">
    <div class="wiz-edital-aside-head">
      <span class="li-icon" style="background:var(--brand);width:40px;height:40px;border-radius:11px">${ic('target', 'sm')}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b style="font-size:15px;color:var(--ink)">Edital & Concurso</b>
          <span class="badge brand" style="font-size:11px">Opcional</span>
        </div>
        <div class="hint" style="font-size:12.5px;margin-top:4px;line-height:1.45">
          Vincule um edital para cruzar tópicos, medir avanço e priorizar a banca do concurso.
        </div>
      </div>
    </div>

    <div class="field" style="margin:0">
      <label for="wizEditalSel" style="font-weight:700;font-size:12.5px">Edital selecionado</label>
      <select class="select" id="wizEditalSel" style="font-size:13.5px;padding:10px 12px">
        <option value="">Sem edital vinculado (estudo livre)</option>
        ${editais.map((e) => {
          const b = e.banca && bancaMap[e.banca];
          return `<option value="${e.id}" ${editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`;
        }).join('')}
      </select>
    </div>

    ${selEd ? `
      <div class="wiz-edital-meta-list">
        ${selBanca ? `<div class="wiz-edital-meta-row"><span>Banca</span><span class="badge" style="background:${selBanca.cor};color:#fff;font-weight:800">${esc(selBanca.nome)}</span></div>` : ''}
        ${selEd.orgao ? `<div class="wiz-edital-meta-row"><span>Órgão</span><b>${esc(selEd.orgao)}</b></div>` : ''}
        ${selEd.cargo ? `<div class="wiz-edital-meta-row"><span>Cargo</span><b>${esc(selEd.cargo)}</b></div>` : ''}
        <div class="wiz-edital-meta-row"><span>Conteúdo</span><b>${selEd.totalTopicos} tópicos</b></div>
      </div>
      <div class="hint" style="font-size:12px;color:var(--brand-ink);font-weight:600;line-height:1.4">
        ✓ A banca e as provas deste edital serão priorizadas ao elaborar suas questões.
      </div>
    ` : ''}

    <div class="wiz-edital-aside-actions">
      <button type="button" class="btn btn-ghost btn-block" id="wizToggleEditalUp" style="font-size:13px">
        ${ic('upload', 'sm')} ${showEditalUpload ? 'Cancelar envio de edital' : editais.length ? 'Cadastrar novo edital' : 'Enviar meu primeiro edital'}
      </button>
    </div>

    ${showEditalUpload ? `<div style="padding-top:14px;border-top:1px dashed var(--line);display:flex;flex-direction:column;gap:12px">
      ${editalErr ? `<div class="banner bad" role="alert" style="margin:0;font-size:12.5px">${ic('alert', 'sm')}<div>${esc(editalErr)}</div></div>` : ''}
      <div class="field" style="margin:0"><label for="wizEdBanca">Banca deste edital</label>
        <select class="select" id="wizEdBanca"><option value="">Detectar automaticamente</option>${bancas.map((b) => `<option value="${b.id}" ${banca === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select>
      </div>
      ${minhasProvas.length ? `<div class="field" style="margin:0"><label for="wizEdProva">Vincular a uma prova <span class="hint">(opcional)</span></label>
        <select class="select" id="wizEdProva"><option value="">Nenhuma prova selecionada</option>${minhasProvas.map((p) => `<option value="${p.id}">${esc(p.titulo)}</option>`).join('')}</select>
      </div>` : ''}
      <label class="drop slim ${editalErr ? 'has-err' : ''}" id="wizEditalDrop" style="padding:18px 14px">
        <input type="file" id="wizEditalFile" class="sr" accept=".pdf,.doc,.docx,.txt">
        <strong style="font-size:13.5px">${ic('upload', 'sm')} Escolher arquivo do Edital</strong>
        <span class="hint" style="font-size:12px">PDF, DOCX, DOC ou TXT · Até ${UPLOAD_MAX_MB} MB</span>
      </label>
    </div>` : ''}
  </aside>`;
}
