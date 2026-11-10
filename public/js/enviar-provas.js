// Front do HelpConcurso — Enviar provas (todos os usuários).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { schedulePoll } from './admin.js';
import { refreshEditais } from './edital.js';
import { BANCA, S } from './estado.js';
import { go } from './eventos.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { $, api, esc, fmtDate, on, toast } from './util.js';
import { UPLOAD_MAX_MB, limparInputArquivo, validarArquivoUpload } from './lib/upload.js';

// ---------- Enviar provas (todos os usuários) ----------
const PENDING_ST = ['CHECKING', 'QUEUED', 'PROCESSING', 'BATCH_PENDING'];
const ST_CLASS = {
  CHECKING: 'CHECKING',
  IN_REVIEW: 'IN_REVIEW',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  BATCH_PENDING: 'BATCH_PENDING',
  READY: 'READY',
  DUPLICATE: 'DUPLICATE',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
};
const stBadge = (p) => `<span class="st ${ST_CLASS[p.status] || 'PENDING'}">${PENDING_ST.includes(p.status) ? '<span class="spinner sm" style="width:12px;height:12px"></span>' : ''}${esc(p.statusLabel || p.status)}</span>`;
// Selo da fonte: confirmada = arquivo baixado pelo servidor do site oficial; informada = link digitado no envio (não verificado)
const fonteBadge = (x) => x.oficialConfirmado
  ? `<span class="badge" style="background:#047857;color:#fff" title="Arquivo baixado direto da fonte oficial">✔ Fonte oficial</span>`
  : x.officialUrl ? `<a class="badge" href="${esc(x.officialUrl)}" target="_blank" rel="noopener noreferrer" title="Link informado no envio — ainda não verificado">Link informado</a>` : '';
const SEV_LABEL = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo', info: 'Info' };

function viewContribuir() {
  const f = S.cform || (S.cform = { banca: '', orgao: '', cargo: '', ano: '', files: [], gabarito: null, editalId: '', editalFile: null, link: '' });
  const mine = S.minhas || [];
  const editais = S.editais || [];
  const editaisForBanca = f.banca ? editais.filter((e) => !e.banca || e.banca === f.banca) : editais;
  return `<h1 class="page-title">Enviar provas</h1>
  <p class="page-sub">Envie provas anteriores e o edital do concurso para a IA aprender o estilo da banca e cruzar a prova com os tópicos do edital e seus materiais de estudo.</p>
  <div class="contrib-stack">
    <div class="card">
      <div style="padding:18px 20px 12px;border-bottom:1px solid var(--line-2);justify-content:space-between" class="row">
        <div class="row"><h3 style="margin:0;font-size:17px">Minhas contribuições</h3><span class="badge">${mine.length}</span></div>
        <span class="hint">Cada prova aprovada na base vale estrelas e gerações extras</span>
      </div>
      ${mine.length ? mine.map((p) => {
        const b = BANCA()[p.banca];
        const isLinking = S.linkProvaId === p.id;
        return `<div class="prova">
          <div class="contrib-row">
            <div style="min-width:0;flex:1">
              <div class="li-title" style="white-space:normal;line-height:1.35">${esc(p.titulo)}</div>
              <div class="li-meta" style="margin-top:3px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${b ? `<span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>` : ''}
                ${fonteBadge(p)}
                <span>${fmtDate(p.createdAt)}${p.numQuestoes ? ` · <b>${p.numQuestoes} questões na base</b>` : ''}</span>
                ${p.editalTitulo ? `<button type="button" class="badge edital-tag" data-open-edital="${p.editalId}" style="cursor:pointer" title="Abrir edital vinculado">${ic('target', 'sm')} Edital: ${esc(p.editalTitulo)}</button>` : ''}
                <button type="button" class="link-btn" style="font-size:12.5px" data-toggle-link-edital="${p.id}">${p.editalId ? 'Trocar edital' : '+ Vincular edital a esta prova'}</button>
              </div>
            </div>
            ${stBadge(p)}
          </div>
          ${p.motivo ? `<div class="hint" style="margin-top:6px">${esc(p.motivo)}</div>` : ''}
          ${isLinking ? `<div class="edital-subbox" style="margin-top:10px">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <b style="font-size:13.5px">${ic('target', 'sm')} Relacionar Edital a esta prova (${esc(b ? b.nome : p.banca)})</b>
              <button type="button" class="link-btn" data-toggle-link-edital="${p.id}">Fechar</button>
            </div>
            <div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
              ${editais.length ? `<div class="field" style="margin:0;flex:1;min-width:220px">
                <label for="lpEdSel">Escolher um edital já cadastrado</label>
                <select class="select" id="lpEdSel">
                  <option value="">Selecione um edital…</option>
                  ${editais.map((e) => `<option value="${e.id}" ${p.editalId === e.id ? 'selected' : ''}>${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`).join('')}
                </select>
              </div>
              <button type="button" class="btn btn-primary" data-save-link-edital="${p.id}" ${S.linkBusy ? 'disabled' : ''}>Vincular selecionado</button>` : ''}
              <div class="field" style="margin:0;flex:1;min-width:240px">
                <label for="lpEdFile">Ou envie o arquivo do Edital desta prova (PDF, DOCX, TXT · Até ${UPLOAD_MAX_MB} MB)</label>
                <input type="file" id="lpEdFile" class="input" accept=".pdf,.doc,.docx,.txt" data-upload-link-edital="${p.id}" ${S.linkBusy ? 'disabled' : ''}>
              </div>
            </div>
            ${S.linkEditalErr ? `<div class="banner bad" role="alert" style="margin:10px 0 0">${ic('alert', 'sm')}<div>${esc(S.linkEditalErr)}</div></div>` : ''}
            ${S.linkBusy ? `<div class="hint" style="margin-top:8px"><span class="spinner sm"></span> Lendo e verticalizando o edital com a IA e vinculando à prova…</div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('') : `<div class="empty" style="padding:28px">${ic('book')}<div>Você ainda não enviou provas.</div><div class="hint">Use o formulário abaixo para enviar sua primeira prova.</div></div>`}
    </div>

    <form class="card card-pad" id="cForm" novalidate>
      <div style="margin-bottom:14px">
        <h3 style="margin:0 0 4px;font-size:18px">Enviar nova prova</h3>
        <div class="hint">Preencha os dados abaixo para cadastrar a prova na base da banca e, se desejar, já vincular o edital do mesmo concurso.</div>
      </div>

      <div class="form-sec">
        <div class="form-sec-title"><span class="form-sec-num">1</span> Banca examinadora e concurso</div>
        <div class="hint" style="margin-bottom:10px">Escolha a banca organizadora e informe o órgão, cargo e ano da prova.</div>
        <div class="banca-tabs" style="flex-wrap:wrap;margin-bottom:14px">${S.bancas.map((b) => `<button type="button" class="btab ${f.banca === b.id ? 'on' : ''}" data-cb="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}</div>
        <div class="up-grid">
          <div class="field" style="margin-bottom:0"><label for="cOrgao">Órgão / Instituição</label><input class="input" id="cOrgao" maxlength="120" placeholder="Ex.: Banco do Brasil, TRF-1" value="${esc(f.orgao)}"></div>
          <div class="field" style="margin-bottom:0"><label for="cCargo">Cargo</label><input class="input" id="cCargo" maxlength="120" placeholder="Ex.: Agente de Tecnologia" value="${esc(f.cargo)}"></div>
          <div class="field" style="margin-bottom:0"><label for="cAno">Ano da prova</label><input class="input" id="cAno" inputmode="numeric" maxlength="4" placeholder="Ex.: 2024" value="${esc(f.ano)}"></div>
        </div>
      </div>

      <div class="form-sec">
        <div class="form-sec-title"><span class="form-sec-num">2</span> Arquivos da prova e gabarito</div>
        <div class="hint" style="margin-bottom:10px">Envie o caderno de questões (PDF, inclusive escaneado, DOCX, DOC ou TXT · Até ${UPLOAD_MAX_MB} MB por arquivo) e, se estiver em arquivo separado, o gabarito oficial.</div>
        <label class="drop slim ${S.cUploadErr ? 'has-err' : ''}" id="cDrop"><input type="file" id="cFiles" class="sr" multiple accept=".pdf,.doc,.docx,.txt">
          <div class="big" style="width:44px;height:44px">${ic('upload')}</div><strong style="font-size:15px">Arraste os arquivos das provas aqui ou clique para escolher</strong><span class="hint">PDF (inclusive escaneado), DOCX, DOC ou TXT · até 10 arquivos · Até ${UPLOAD_MAX_MB} MB por arquivo</span></label>
        ${S.cUploadErr ? `<div class="banner bad" role="alert" style="margin:12px 0 0">${ic('alert', 'sm')}<div>${esc(S.cUploadErr)}</div></div>` : ''}
        ${f.files.length ? `<div class="file-list">${f.files.map((x, i) => `<span class="chip"><span>📄 ${esc(x.name)}</span><button type="button" class="link-btn" data-rmc="${i}">remover</button></span>`).join('')}</div>` : ''}
        <div class="field" style="margin:14px 0 0"><label for="cGab">Gabarito separado <span class="hint">(opcional, disponível ao enviar 1 prova · Até ${UPLOAD_MAX_MB} MB)</span></label><input type="file" id="cGab" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>${f.gabarito ? `<span class="hint">Selecionado: ${esc(f.gabarito.name)}</span>` : ''}</div>
        <div class="field" style="margin:14px 0 0"><label for="cLink">Link oficial da prova <span class="hint">(opcional — site da banca ou Diário Oficial)</span></label>
          <input class="input" id="cLink" maxlength="500" placeholder="https://conhecimento.fgv.br/.../prova.pdf" value="${esc(f.link)}">
          <span class="hint">Sem arquivo? Cole o link direto do PDF da prova: nós baixamos da fonte oficial e ela ganha o selo <b>✔ Fonte oficial</b>. Com arquivo, o link fica registrado como fonte informada.</span></div>
      </div>

      <div class="form-sec">
        <div class="form-sec-title"><span class="form-sec-num">3</span> Edital deste concurso <span class="badge brand">Conecta Banca + Prova + Estudo</span></div>
        <div class="hint" style="margin-bottom:12px">O edital está diretamente ligado à banca, à prova e ao seu material de estudo. Vincule um edital já enviado ou anexe o PDF do edital agora para a IA verticalizar os tópicos e relacionar com as questões desta prova.</div>
        <div class="edital-subbox">
          <div class="opts" style="margin-top:0">
            <div class="field" style="margin-bottom:0">
              <label for="cEditalSel">Usar edital já cadastrado <span class="hint">(opcional)</span></label>
              <select class="select" id="cEditalSel" ${f.editalFile ? 'disabled' : ''}>
                <option value="">Nenhum edital selecionado</option>
                ${editaisForBanca.map((e) => { const b = e.banca && BANCA()[e.banca]; return `<option value="${e.id}" ${f.editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`; }).join('')}
              </select>
            </div>
            <div class="field" style="margin-bottom:0">
              <label for="cEditalFile">Ou enviar arquivo do Edital junto com a prova <span class="hint">(PDF, DOCX, TXT · Até ${UPLOAD_MAX_MB} MB)</span></label>
              <input type="file" id="cEditalFile" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>
              ${S.cEditalErr ? `<div class="banner bad" role="alert" style="margin:8px 0 0">${ic('alert', 'sm')}<div>${esc(S.cEditalErr)}</div></div>` : ''}
              ${f.editalFile ? `<div class="row" style="justify-content:space-between;margin-top:4px"><span class="hint" style="color:var(--brand)">📋 Edital anexado: <b>${esc(f.editalFile.name)}</b></span><button type="button" class="link-btn" id="cRmEdital" style="font-size:12px">remover</button></div>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${(S.cResults || []).length ? `<div class="file-list" style="margin:16px 0">${S.cResults.map((r) => `<div class="banner ${r.ok ? 'info' : r.dup ? 'warn' : 'bad'}" ${!r.ok && !r.dup ? 'role="alert"' : ''} style="margin:0">${ic(r.ok ? 'check' : 'alert', 'sm')}<div><b>${esc(r.name)}</b>: ${esc(r.msg)}</div></div>`).join('')}</div>` : ''}
      <div style="margin-top:20px">
        <button class="btn btn-primary btn-block" type="submit" ${S.cBusy || (!f.files.length && !f.link) || !f.banca ? 'disabled' : ''}>${S.cBusy ? `<span class="spinner sm"></span> Enviando ${S.cBusy}${f.editalFile ? ' e verticalizando edital' : ''}…` : !f.files.length && f.link ? `${ic('upload', 'sm')} Importar prova do link oficial` : `${ic('upload', 'sm')} Enviar ${f.files.length > 1 ? f.files.length + ' provas' : 'prova'}${f.editalFile ? ' + Edital' : f.editalId ? ' (vinculada ao Edital)' : ''}`}</button>
        <p class="hint" style="margin:10px 0 0;text-align:center">Arquivos com scripts, macros, anexos ou texto escondido com instruções são recusados automaticamente. Envios maliciosos repetidos pausam a conta.</p>
      </div>
    </form>
  </div>`;
}

/** Eventos da tela (contribuir); chamada pela bindApp em eventos.js a cada desenho. */
function ligarEnviarProvas() {
  const f = S.cform;
  on('[data-cb]', 'click', (e) => { f.banca = e.currentTarget.dataset.cb; render(); });
  ['Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#c' + k); if (el) el.oninput = () => { f[k.toLowerCase()] = el.value; }; });
  const cf = $('#cFiles'), cd = $('#cDrop'), cg = $('#cGab'), cef = $('#cEditalFile');
  const addFiles = (list) => {
    const validos = [];
    const errosTamanho = [];
    for (const file of [...list]) {
      const chk = validarArquivoUpload(file, { rotulo: 'O arquivo de prova' });
      if (chk.ok) validos.push(file);
      else errosTamanho.push(chk.mensagem);
    }
    if (errosTamanho.length) {
      S.cUploadErr = errosTamanho.join(' ');
      toast(errosTamanho[0]);
      limparInputArquivo(cf);
    } else {
      S.cUploadErr = '';
    }
    if (validos.length) {
      f.files = f.files.concat(validos).slice(0, 10);
      if (f.files.length > 1) { f.gabarito = null; f.editalFile = null; }
    }
    S.cResults = [];
    render();
  };
  if (cf) cf.onchange = () => addFiles(cf.files);
  if (cd) {
    ['dragenter', 'dragover'].forEach((t) => cd.addEventListener(t, (e) => { e.preventDefault(); cd.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => cd.addEventListener(t, (e) => { e.preventDefault(); cd.classList.remove('over'); }));
    cd.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  }
  if (cg) cg.onchange = () => {
    const file = cg.files[0] || null;
    const chk = validarArquivoUpload(file, { rotulo: 'O arquivo de gabarito' });
    if (!chk.ok) {
      f.gabarito = null;
      S.cUploadErr = chk.mensagem;
      limparInputArquivo(cg);
      toast(chk.mensagem);
    } else {
      S.cUploadErr = '';
      f.gabarito = file;
    }
    render();
  };
  const cl = $('#cLink');
  if (cl) cl.oninput = () => { f.link = cl.value.trim(); const btn = $('#cForm button[type=submit]'); if (btn && !S.cBusy) btn.disabled = (!f.files.length && !f.link) || !f.banca; };
  if (cl) cl.onchange = () => render();
  const ces = $('#cEditalSel'); if (ces) ces.onchange = () => { f.editalId = ces.value; S.cEditalErr = ''; render(); };
  if (cef) cef.onchange = () => {
    const file = cef.files[0] || null;
    const chk = validarArquivoUpload(file, { rotulo: 'O arquivo do edital' });
    if (!chk.ok) {
      f.editalFile = null;
      S.cEditalErr = chk.mensagem;
      limparInputArquivo(cef);
      toast(chk.mensagem);
    } else {
      S.cEditalErr = '';
      f.editalFile = file;
      if (f.editalFile) f.editalId = '';
    }
    render();
  };
  on('#cRmEdital', 'click', () => { f.editalFile = null; S.cEditalErr = ''; render(); });
  on('[data-rmc]', 'click', (e) => { f.files.splice(+e.currentTarget.dataset.rmc, 1); S.cUploadErr = ''; render(); });
  on('[data-open-edital]', 'click', async (e) => {
    const id = e.currentTarget.dataset.openEdital;
    try { await api(`/editais/${id}/ativar`, { method: 'POST' }); } catch {}
    go('edital');
  });
  on('[data-toggle-link-edital]', 'click', (e) => {
    const id = e.currentTarget.dataset.toggleLinkEdital;
    S.linkProvaId = S.linkProvaId === id ? null : id;
    S.linkEditalErr = '';
    render();
  });
  on('[data-save-link-edital]', 'click', async (e) => {
    const id = e.currentTarget.dataset.saveLinkEdital;
    const edId = $('#lpEdSel')?.value || '';
    S.linkBusy = true; render();
    try {
      await api(`/provas/${id}/edital`, { method: 'POST', body: { editalId: edId } });
      S.minhas = (await api('/provas/minhas')).provas;
      await refreshEditais({ silent: true });
      S.linkProvaId = null;
      toast(edId ? 'Edital vinculado à prova com sucesso!' : 'Vínculo de edital removido.');
    } catch (err) { toast(err.message); }
    S.linkBusy = false; render();
  });
  on('[data-upload-link-edital]', 'change', async (e) => {
    const inputEl = e.currentTarget;
    const id = inputEl.dataset.uploadLinkEdital;
    const file = inputEl.files[0]; if (!file) return;
    const chk = validarArquivoUpload(file, { rotulo: 'O arquivo do edital' });
    if (!chk.ok) {
      S.linkEditalErr = chk.mensagem;
      limparInputArquivo(inputEl);
      toast(chk.mensagem);
      render();
      return;
    }
    S.linkBusy = true; S.linkEditalErr = ''; render();
    try {
      const fd = new FormData(); fd.append('edital', file);
      const r = await api(`/provas/${id}/edital`, { method: 'POST', form: fd });
      S.minhas = (await api('/provas/minhas')).provas;
      await refreshEditais({ silent: true });
      S.linkProvaId = null;
      toast(`Edital "${r.editalTitulo}" verticalizado e vinculado à prova!`);
    } catch (err) { S.linkEditalErr = err.message; toast(err.message); }
    S.linkBusy = false; render();
  });
  const form = $('#cForm');
  if (form) form.onsubmit = async (ev) => {
    ev.preventDefault();
    if (!f.banca) return toast('Escolha a banca.');
    if (f.ano && !/^\d{4}$/.test(f.ano)) return toast('Ano inválido.');
    S.cResults = [];
    // Sem arquivo + link: um envio só, o servidor baixa a prova da fonte oficial
    const files = f.files.length ? [...f.files] : [null];
    let sharedEditalId = f.editalId || '';
    for (let i = 0; i < files.length; i++) {
      S.cBusy = files[i] ? `${i + 1}/${files.length}` : 'do link oficial'; render();
      const nome = files[i] ? files[i].name : 'Link oficial';
      const fd = new FormData();
      fd.append('banca', f.banca); fd.append('orgao', f.orgao); fd.append('cargo', f.cargo); fd.append('ano', f.ano);
      if (files[i]) fd.append('prova', files[i]);
      if (f.link && files.length === 1) fd.append('officialUrl', f.link);
      if (f.gabarito && files.length === 1) fd.append('gabarito', f.gabarito);
      if (f.editalFile && i === 0) fd.append('edital', f.editalFile);
      else if (sharedEditalId) fd.append('editalId', sharedEditalId);
      try {
        const r = await api('/provas', { method: 'POST', form: fd });
        if (r.editalId && !sharedEditalId) sharedEditalId = r.editalId;
        const aviso = (r.avisos || []).length ? ` Aviso: ${r.avisos.join(' ')}` : '';
        S.cResults.push(r.duplicate ? { name: nome, dup: true, msg: r.message + aviso } : { name: nome, ok: true, msg: `Recebida. Em verificação.${r.prova?.oficialConfirmado ? ' Baixada da fonte oficial ✔' : ''}${r.editalId ? ' Edital vinculado!' : ''}${aviso}` });
      } catch (e) { S.cResults.push({ name: nome, msg: e.message }); if (e.status === 429) break; }
    }
    S.cBusy = false; f.files = []; f.gabarito = null; f.editalFile = null; f.link = '';
    try { S.minhas = (await api('/provas/minhas')).provas; await refreshEditais({ silent: true }); } catch {}
    render();
  };
  schedulePoll();
}

export { PENDING_ST, ST_CLASS, stBadge, fonteBadge, SEV_LABEL, viewContribuir, ligarEnviarProvas };
