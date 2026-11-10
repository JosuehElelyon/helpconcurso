// Front do HelpConcurso — Enviar provas (todos os usuários).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { BANCA, S } from './estado.js';
import { ic } from './icones.js';
import { esc, fmtDate } from './util.js';

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
                <label for="lpEdFile">Ou envie o arquivo do Edital desta prova (PDF, DOCX, TXT)</label>
                <input type="file" id="lpEdFile" class="input" accept=".pdf,.doc,.docx,.txt" data-upload-link-edital="${p.id}" ${S.linkBusy ? 'disabled' : ''}>
              </div>
            </div>
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
        <div class="hint" style="margin-bottom:10px">Envie o caderno de questões (PDF, inclusive escaneado, DOCX, DOC ou TXT) e, se estiver em arquivo separado, o gabarito oficial.</div>
        <label class="drop slim" id="cDrop"><input type="file" id="cFiles" class="sr" multiple accept=".pdf,.doc,.docx,.txt">
          <div class="big" style="width:44px;height:44px">${ic('upload')}</div><strong style="font-size:15px">Arraste os arquivos das provas aqui ou clique para escolher</strong><span class="hint">PDF (inclusive escaneado), DOCX, DOC ou TXT · até 10 arquivos por vez</span></label>
        ${f.files.length ? `<div class="file-list">${f.files.map((x, i) => `<span class="chip"><span>📄 ${esc(x.name)}</span><button type="button" class="link-btn" data-rmc="${i}">remover</button></span>`).join('')}</div>` : ''}
        <div class="field" style="margin:14px 0 0"><label for="cGab">Gabarito separado <span class="hint">(opcional, disponível ao enviar 1 prova)</span></label><input type="file" id="cGab" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>${f.gabarito ? `<span class="hint">Selecionado: ${esc(f.gabarito.name)}</span>` : ''}</div>
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
              <label for="cEditalFile">Ou enviar arquivo do Edital junto com a prova <span class="hint">(PDF, DOCX, TXT)</span></label>
              <input type="file" id="cEditalFile" class="input" accept=".pdf,.doc,.docx,.txt" ${f.files.length > 1 ? 'disabled' : ''}>
              ${f.editalFile ? `<div class="row" style="justify-content:space-between;margin-top:4px"><span class="hint" style="color:var(--brand)">📋 Edital anexado: <b>${esc(f.editalFile.name)}</b></span><button type="button" class="link-btn" id="cRmEdital" style="font-size:12px">remover</button></div>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${(S.cResults || []).length ? `<div class="file-list" style="margin:16px 0">${S.cResults.map((r) => `<div class="banner ${r.ok ? 'info' : r.dup ? 'warn' : 'bad'}" style="margin:0">${ic(r.ok ? 'check' : 'alert', 'sm')}<div><b>${esc(r.name)}</b>: ${esc(r.msg)}</div></div>`).join('')}</div>` : ''}
      <div style="margin-top:20px">
        <button class="btn btn-primary btn-block" type="submit" ${S.cBusy || (!f.files.length && !f.link) || !f.banca ? 'disabled' : ''}>${S.cBusy ? `<span class="spinner sm"></span> Enviando ${S.cBusy}${f.editalFile ? ' e verticalizando edital' : ''}…` : !f.files.length && f.link ? `${ic('upload', 'sm')} Importar prova do link oficial` : `${ic('upload', 'sm')} Enviar ${f.files.length > 1 ? f.files.length + ' provas' : 'prova'}${f.editalFile ? ' + Edital' : f.editalId ? ' (vinculada ao Edital)' : ''}`}</button>
        <p class="hint" style="margin:10px 0 0;text-align:center">Arquivos com scripts, macros, anexos ou texto escondido com instruções são recusados automaticamente. Envios maliciosos repetidos pausam a conta.</p>
      </div>
    </form>
  </div>`;
}

export { PENDING_ST, ST_CLASS, stBadge, fonteBadge, SEV_LABEL, viewContribuir };
