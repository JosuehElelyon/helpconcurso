// Front do HelpConcurso — Cadernos de Questões + Simulados + Caderno de Erros.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { ST_CLASS } from './enviar-provas.js';
import { BANCA, S, newWiz } from './estado.js';
import { go } from './eventos.js';
import { dispararRevanche } from './gerar.js';
import { setRow } from './hoje.js';
import { ic } from './icones.js';
import { confirmBox } from './modal.js';
import { render } from './render.js';
import { renderExplicacaoCard } from './simulado.js';
import { $, LETRAS, api, esc, on, toast } from './util.js';

// ---------- Cadernos de Questões + Simulados + Caderno de Erros ----------
async function refreshCadernos({ silent = false } = {}) {
  try {
    const r = await api('/cadernos');
    S.cadernos = r.cadernos || [];
    S.materiaisDisponiveis = r.materiaisDisponiveis || [];
    S.provasDisponiveis = r.provasDisponiveis || [];
    if (!silent && S.screen === 'app') render();
  } catch { /* opcional */ }
}

async function openCaderno(id) {
  S.cadernoBusy = true;
  S.view = 'caderno';
  render();
  try {
    const r = await api(`/cadernos/${id}`);
    S.activeCaderno = r.caderno;
  } catch (e) {
    toast(e.message);
    S.view = 'questoes';
  }
  S.cadernoBusy = false;
  render();
  window.scrollTo({ top: 0 });
}

function cadernoCardHtml(c) {
  const b = BANCA()[c.banca] || { nome: c.banca, cor: '#0F6E56' };
  return `<div class="card card-pad cad-card" style="--c:${b.cor}">
    <div>
      <div class="row" style="gap:6px;margin-bottom:8px">
        <span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>
        ${c.orgao ? `<span class="badge">${esc(c.orgao)}</span>` : ''}
        ${c.cargo ? `<span class="badge">${esc(c.cargo)}</span>` : ''}
        ${c.ano ? `<span class="badge">${esc(c.ano)}</span>` : ''}
        ${c.editalTitulo ? `<span class="badge edital-tag" title="Edital vinculado">${ic('target', 'sm')} ${esc(c.editalTitulo)}</span>` : ''}
      </div>
      <div style="font-size:17px;font-weight:800;line-height:1.3;margin-bottom:4px">${esc(c.titulo)}</div>
      <div class="hint">${c.materiaisCount} conteúdo(s) seu(s) · ${c.provasCount} prova(s) antiga(s) da banca${c.favoritasCount ? ` · ★ ${c.favoritasCount} favorita(s)` : ''}</div>
    </div>
    <div class="cad-kpis">
      <div><b>${c.totalQuestoes}</b><span>Questões (${c.questoesIa} IA · ${c.questoesProvas} provas)</span></div>
      <div><b>${c.respondidas}/${c.totalQuestoes}</b><span>Respondidas</span></div>
      <div><b style="color:${(c.taxaAcerto ?? 0) >= 70 ? 'var(--ok)' : 'var(--ink)'}">${c.taxaAcerto != null ? c.taxaAcerto + '%' : '—'}</b><span>Taxa de acerto</span></div>
    </div>
    <div class="row" style="justify-content:space-between;gap:8px">
      <div class="row" style="gap:6px">
        <button type="button" class="btn btn-quiet" style="padding:6px 10px;font-size:12.5px" data-cad-feed-mat="${c.id}" title="Alimentar com mais conteúdo seu">+ Meu conteúdo</button>
        <button type="button" class="btn btn-quiet" style="padding:6px 10px;font-size:12.5px" data-cad-feed-prova="${c.id}" title="Alimentar com provas antigas da banca">+ Prova antiga</button>
      </div>
      <button type="button" class="btn btn-primary" style="padding:8px 14px;font-size:13px" data-open-caderno="${c.id}">${ic('book', 'sm')} Revisar caderno ${ic('arrowR', 'sm')}</button>
    </div>
  </div>`;
}

function getWrongQuestions() {
  const out = [];
  for (const s of S.sets || []) {
    const r = s.respostas || {};
    (s.questoes || []).forEach((q, i) => {
      if (!q.anulada && r[i] != null && r[i] !== q.gabarito) {
        out.push({ setId: s.id, setMateria: s.materia, setAssunto: s.assunto, banca: s.banca, formato: s.formato, createdAt: s.createdAt, idx: i, ans: r[i], q });
      }
    });
  }
  return out;
}

function viewBanco() {
  const f = S.filter, tab = S.bancoTab || 'cadernos';
  const mats = [...new Set(S.sets.map((s) => s.materia))].sort();
  const list = S.sets.filter((s) => (!f.banca || s.banca === f.banca) && (!f.materia || s.materia === f.materia));
  const allWrong = getWrongQuestions();
  const wrongList = allWrong.filter((w) => (!f.banca || w.banca === f.banca) && (!f.materia || w.setMateria === f.materia));
  const cads = (S.cadernos || []).filter((c) => !f.banca || c.banca === f.banca);
  const cf = S.cadForm || (S.cadForm = { banca: S.activeEdital?.banca || 'cebraspe', editalId: S.activeEdital?.id || '', orgao: S.activeEdital?.orgao || '', cargo: S.activeEdital?.cargo || '', ano: S.activeEdital?.ano || '', titulo: '', descricao: '', importarExistentes: true });
  const showNewForm = S.cadernoNewOpen || !(S.cadernos || []).length;

  return `<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:14px">
    <div>
      <h1 class="page-title">Cadernos de questões</h1>
      <p class="page-sub" style="margin-bottom:0">Crie um caderno para cada banca, concurso ou edital, alimente-o com mais conteúdos seus e com provas antigas da banca e revise seu histórico de questões.</p>
    </div>
    <div class="row">
      <button type="button" class="btn btn-ghost" id="btnToggleNewCad">${ic('book', 'sm')} ${S.cadernoNewOpen ? 'Fechar formulário' : '+ Novo caderno'}</button>
      <button type="button" class="btn btn-primary" data-go="gerar">${ic('spark', 'sm')} Gerar questões</button>
    </div>
  </div>

  <div class="tabs" style="max-width:620px;margin-bottom:16px">
    <button type="button" class="${tab === 'cadernos' ? 'on' : ''}" data-btab="cadernos">Meus cadernos (${(S.cadernos || []).length})</button>
    <button type="button" class="${tab === 'simulados' ? 'on' : ''}" data-btab="simulados">Baterias geradas (${S.sets.length})</button>
    <button type="button" class="${tab === 'erros' ? 'on' : ''}" data-btab="erros">Caderno de erros (${allWrong.length})</button>
  </div>

  ${tab === 'cadernos' && showNewForm ? `<form class="card card-pad" id="newCadForm" style="margin-bottom:18px" novalidate>
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div><h3 style="margin:0;font-size:17px">Criar novo Caderno de Questões</h3>
        <div class="hint">Configure o caderno para uma banca específica, um concurso (órgão/cargo) ou um edital cadastrado.</div></div>
      ${(S.cadernos || []).length ? `<button type="button" class="btn btn-quiet" id="btnCancelNewCad">${ic('x', 'sm')} Fechar</button>` : ''}
    </div>
    <div class="field" style="margin-bottom:8px"><label>1. Banca examinadora do caderno</label></div>
    <div class="banca-tabs" style="flex-wrap:wrap;margin-bottom:14px">
      ${S.bancas.map((b) => `<button type="button" class="btab ${cf.banca === b.id ? 'on' : ''}" data-cad-banca="${b.id}"><span class="bdot" style="background:${b.cor}"></span>${b.nome}</button>`).join('')}
    </div>
    <div class="opts" style="margin-top:0;margin-bottom:12px">
      <div class="field" style="margin:0">
        <label for="cadEditalSel">2. Edital vinculado <span class="hint">(opcional — preenche órgão/cargo automaticamente)</span></label>
        <select class="select" id="cadEditalSel">
          <option value="">Sem edital específico (caderno geral da banca/concurso)</option>
          ${(S.editais || []).map((e) => { const b = e.banca && BANCA()[e.banca]; return `<option value="${e.id}" ${cf.editalId === e.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(e.titulo)} (${e.totalTopicos} tópicos)</option>`; }).join('')}
        </select>
      </div>
      <div class="field" style="margin:0">
        <label for="cadTitulo">Nome do caderno <span class="hint">(opcional — gerado automaticamente se vazio)</span></label>
        <input class="input" id="cadTitulo" maxlength="160" placeholder="Ex.: Caderno Reta Final BB — TI (Cesgranrio)" value="${esc(cf.titulo)}">
      </div>
    </div>
    <div class="up-grid" style="margin-bottom:14px">
      <div class="field" style="margin:0"><label for="cadOrgao">Concurso / Órgão <span class="hint">(opcional)</span></label><input class="input" id="cadOrgao" maxlength="120" placeholder="Ex.: Banco do Brasil, PF, TRF-1" value="${esc(cf.orgao)}"></div>
      <div class="field" style="margin:0"><label for="cadCargo">Cargo <span class="hint">(opcional)</span></label><input class="input" id="cadCargo" maxlength="120" placeholder="Ex.: Agente de Tecnologia" value="${esc(cf.cargo)}"></div>
      <div class="field" style="margin:0"><label for="cadAno">Ano <span class="hint">(opcional)</span></label><input class="input" id="cadAno" inputmode="numeric" maxlength="4" placeholder="Ex.: 2024" value="${esc(cf.ano)}"></div>
    </div>
    <label class="row" style="gap:8px;cursor:pointer;font-size:13.5px;margin-bottom:16px">
      <input type="checkbox" id="cadImportar" ${cf.importarExistentes ? 'checked' : ''}>
      <span>Reunir automaticamente neste caderno minhas questões já geradas, meus conteúdos e provas antigas desta banca/edital</span>
    </label>
    <div class="row" style="justify-content:flex-end">
      <button type="submit" class="btn btn-primary" ${S.cadernoBusy ? 'disabled' : ''}>${S.cadernoBusy ? '<span class="spinner sm"></span> Criando…' : `${ic('book', 'sm')} Criar Caderno de Questões`}</button>
    </div>
  </form>` : ''}

  ${tab === 'cadernos'
    ? cads.length
      ? `<div class="cad-grid">${cads.map(cadernoCardHtml).join('')}</div>`
      : `<div class="card"><div class="empty">${ic('book')}<div>Nenhum caderno criado ainda.</div><div class="hint">Use o formulário acima para criar seu primeiro Caderno de Questões por banca, concurso ou edital!</div></div></div>`
    : tab === 'simulados'
      ? `${S.sets.length ? `<div class="filters"><select class="select" id="fBanca"><option value="">Todas as bancas</option>${S.bancas.map((b) => `<option value="${b.id}" ${f.banca === b.id ? 'selected' : ''}>${b.nome}</option>`).join('')}</select>
          <select class="select" id="fMat"><option value="">Todas as matérias</option>${mats.map((m) => `<option ${f.materia === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>` : ''}
         <div class="card">${list.length ? `<div class="list">${list.map(setRow).join('')}</div>` : `<div class="empty">${ic('clip')}<div>${S.sets.length ? 'Nenhuma bateria com esses filtros.' : 'Você ainda não gerou questões.'}</div></div>`}</div>`
      : wrongList.length
        ? `<div class="contrib-stack">${wrongList.map((w) => {
            const b = BANCA()[w.banca] || { nome: w.banca, cor: '#666' };
            const q = w.q;
            const topico = q.topico_edital || q.tema || w.setAssunto || '';
            return `<article class="card q">
              <div class="row" style="justify-content:space-between;margin-bottom:10px">
                <div class="row" style="gap:6px">
                  <span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>
                  <span class="badge">${esc(w.setMateria)}</span>
                  ${topico ? `<span class="badge edital-tag">${ic('target', 'sm')} ${esc(topico)}</span>` : ''}
                </div>
                <div class="row" style="gap:8px">
                  <button type="button" class="btn btn-quiet" data-open="${w.setId}">Abrir bateria</button>
                  <button type="button" class="btn btn-primary" style="padding:7px 12px;font-size:12.5px" data-revanche="${esc(w.setMateria)}||${esc(topico)}||${esc(w.banca)}">${ic('spark', 'sm')} Gerar revanche IA neste tópico</button>
                </div>
              </div>
              <p class="q-text" style="margin-bottom:12px">${esc(q.enunciado)}</p>
              <div class="explain" style="margin-top:0">
                <div class="verdict bad">${ic('x', 'sm')} Você marcou ${esc(w.ans)} · Gabarito correto: <b>${esc(q.gabarito)}</b></div>
                <p>${esc(q.comentario)}</p>
                ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”</div>` : ''}
                ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
              </div>
            </article>`;
          }).join('')}</div>`
        : `<div class="card"><div class="empty">${ic('check')}<div>${allWrong.length ? 'Nenhum erro encontrado para esses filtros.' : 'Nenhum erro registrado ainda! Resolva suas questões para alimentar o Caderno de Erros.'}</div></div></div>`}`;
}

function viewCaderno() {
  if (S.cadernoBusy && !S.activeCaderno) return '<div class="progress-box"><div class="spinner"></div><b>Abrindo seu Caderno de Questões…</b></div>';
  const c = S.activeCaderno;
  if (!c) return `<div class="empty">Caderno não encontrado. <button class="btn btn-quiet" data-go="questoes">Voltar aos cadernos</button></div>`;
  const b = BANCA()[c.banca] || { nome: c.banca, cor: '#0F6E56', formatoLabel: '' };
  const f = S.cadFilter;
  const ft = S.cadernoFeedTab;
  const provasDaBanca = (S.provasDisponiveis || []).filter((p) => p.banca === c.banca && !(c.provas || []).some((cp) => cp.id === p.id));
  const matsDisp = S.materiaisDisponiveis || [];
  const setsSoltos = (S.sets || []).filter((s) => s.cadernoId !== c.id);

  // Filtra as questões do histórico do caderno
  const qNorm = String(f.q || '').trim().toLowerCase();
  const filtered = (c.questoes || []).filter((q) => {
    if (f.origem !== 'all' && q.origem !== f.origem) return false;
    if (f.materia && q.materia !== f.materia) return false;
    if (f.status === 'unanswered' && q.ans != null) return false;
    if (f.status === 'wrong' && (q.ans == null || q.ans === q.gabarito)) return false;
    if (f.status === 'correct' && (q.ans == null || q.ans !== q.gabarito)) return false;
    if (f.status === 'revisao_hoje' && (!q.revisao || !q.revisao.paraRevisarHoje)) return false;
    if (f.status === 'dominadas' && (!q.revisao || !q.revisao.dominada)) return false;
    if (f.status === 'fav' && !q.favorita) return false;
    if (f.status === 'notes' && !q.anotacao) return false;
    if (qNorm && !`${q.enunciado} ${q.materia} ${q.assunto} ${q.topico_edital} ${q.anotacao}`.toLowerCase().includes(qNorm)) return false;
    return true;
  });

  return `<div class="row no-print" style="justify-content:space-between;margin:-6px 0 10px -10px">
    <button class="btn btn-quiet" data-go="questoes">${ic('arrowL', 'sm')} Todos os Cadernos de Questões</button>
    <div class="row" style="gap:6px">
      ${c.editalId ? `<button class="btn btn-quiet" data-open-edital="${c.editalId}">${ic('target', 'sm')} Ver Edital vinculado</button>` : ''}
      <button class="btn btn-quiet" id="printCaderno">${ic('download', 'sm')} Imprimir / PDF</button>
      <button class="btn btn-quiet" id="delCaderno" style="color:var(--bad)">${ic('trash', 'sm')} Excluir caderno</button>
    </div>
  </div>

  <div class="set-head" style="border-top:4px solid ${b.cor}">
    <div style="flex:1;min-width:240px">
      <div class="row" style="gap:6px;margin-bottom:6px">
        <span class="badge" style="background:${b.cor};color:#fff">${esc(b.nome)}</span>
        ${c.orgao ? `<span class="badge">${esc(c.orgao)}</span>` : ''}
        ${c.cargo ? `<span class="badge">${esc(c.cargo)}</span>` : ''}
        ${c.ano ? `<span class="badge">${esc(c.ano)}</span>` : ''}
        ${c.editalTitulo ? `<span class="badge edital-tag">${ic('target', 'sm')} Edital: ${esc(c.editalTitulo)}</span>` : ''}
      </div>
      <h1 class="page-title">${esc(c.titulo)}</h1>
      <div class="hint">${c.totalQuestoes} questões acumuladas (${c.questoesIa} geradas do seu conteúdo · ${c.questoesProvas} de provas antigas da banca) · ${(c.materiais || []).length} conteúdo(s) · ${(c.provas || []).length} prova(s)</div>
    </div>
    <div class="score-box">
      <div><b>${c.totalQuestoes}</b><span>No caderno</span></div>
      <div><b>${c.respondidas}/${c.totalQuestoes}</b><span>Resolvidas</span></div>
      <div><b style="color:var(--ok)">${c.acertos}${c.taxaAcerto != null ? ` (${c.taxaAcerto}%)` : ''}</b><span>Acertos</span></div>
      <div><b style="color:var(--bad)">${c.erros}</b><span>Para revisar</span></div>
      <div><b style="color:var(--brand)">🔔 ${c.revisaoHojeCount || 0}</b><span>Revisar hoje</span></div>
      <div><b style="color:var(--ok)">✔ ${c.dominadasCount || 0}</b><span>Dominadas</span></div>
      <div><b style="color:#8A5A12">★ ${c.favoritasCount}</b><span>Favoritas</span></div>
    </div>
  </div>

  <div class="cad-feed-bar no-print">
    <button type="button" class="btn ${ft === 'material' ? 'btn-primary' : 'btn-ghost'}" data-cad-ftab="${ft === 'material' ? '' : 'material'}">${ic('upload', 'sm')} + Alimentar com meu conteúdo</button>
    <button type="button" class="btn ${ft === 'prova' ? 'btn-primary' : 'btn-ghost'}" data-cad-ftab="${ft === 'prova' ? '' : 'prova'}">${ic('brain', 'sm')} + Alimentar com provas antigas da ${esc(b.nome)}</button>
    ${setsSoltos.length ? `<button type="button" class="btn ${ft === 'simulado' ? 'btn-primary' : 'btn-ghost'}" data-cad-ftab="${ft === 'simulado' ? '' : 'simulado'}">${ic('list', 'sm')} + Anexar bateria já gerada (${setsSoltos.length})</button>` : ''}
  </div>

  ${ft === 'material' ? `<div class="cad-feed-panel no-print">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><b style="font-size:15px">📄 Alimentar caderno com mais conteúdo seu</b>
        <div class="hint">Envie um novo resumo/apostila ou escolha um material já enviado para gerar novas questões inéditas no estilo ${esc(b.nome)} direto neste caderno.</div></div>
      <button type="button" class="btn btn-quiet" data-cad-ftab="">${ic('x', 'sm')} Fechar</button>
    </div>
    <div class="opts" style="margin-top:8px">
      <div>
        <button type="button" class="btn btn-primary btn-block" id="cadGoWizNewMat">${ic('upload', 'sm')} Enviar novo arquivo ou texto e gerar questões neste caderno</button>
      </div>
      ${matsDisp.length ? `<div class="row" style="gap:8px;flex-wrap:nowrap">
        <select class="select" id="cadPickMat" style="flex:1">
          <option value="">Ou escolha um conteúdo que você já enviou…</option>
          ${matsDisp.map((m) => `<option value="${m.id}">${esc(m.fileName)}${m.materia ? ` (${esc(m.materia)})` : ''} · ${m.wordCount} palavras</option>`).join('')}
        </select>
        <button type="button" class="btn btn-ghost" id="cadUseExistingMat" ${S.cadFeedBusy ? 'disabled' : ''}>Gerar +questões</button>
      </div>` : ''}
    </div>
  </div>` : ''}

  ${ft === 'prova' ? `<div class="cad-feed-panel no-print">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><b style="font-size:15px">🏛️ Alimentar caderno com provas antigas da banca (${esc(b.nome)})</b>
        <div class="hint">Importe questões reais de provas anteriores da ${esc(b.nome)} para resolver no seu caderno e refinar ainda mais o estilo da IA neste concurso.</div></div>
      <button type="button" class="btn btn-quiet" data-cad-ftab="">${ic('x', 'sm')} Fechar</button>
    </div>
    <div class="opts" style="margin-top:8px;align-items:flex-end">
      <div>
        <label class="hint" for="cadPickProva" style="display:block;margin-bottom:6px">Escolher prova da ${esc(b.nome)} já disponível na base</label>
        <div class="row" style="gap:8px;flex-wrap:nowrap">
          <select class="select" id="cadPickProva" style="flex:1">
            <option value="">Selecione uma prova da ${esc(b.nome)}…</option>
            ${provasDaBanca.map((p) => `<option value="${p.id}">${esc(p.titulo)}${p.numQuestoes ? ` (${p.numQuestoes} questões)` : ` [${p.statusLabel}]`}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary" id="cadImportProvaBtn" ${S.cadFeedBusy || !provasDaBanca.length ? 'disabled' : ''}>${S.cadFeedBusy ? '<span class="spinner sm"></span>' : 'Importar p/ o caderno'}</button>
        </div>
      </div>
      <div>
        <label class="hint" for="cadUpProvaFile" style="display:block;margin-bottom:6px">Ou envie um novo PDF de prova antiga da ${esc(b.nome)}</label>
        <input type="file" id="cadUpProvaFile" class="input" accept=".pdf,.doc,.docx,.txt" ${S.cadFeedBusy ? 'disabled' : ''}>
      </div>
    </div>
  </div>` : ''}

  ${ft === 'simulado' ? `<div class="cad-feed-panel no-print">
    <div class="row" style="justify-content:space-between;margin-bottom:10px">
      <div><b style="font-size:15px">📚 Anexar bateria de questões já gerada</b>
        <div class="hint">Traga simulados que você gerou anteriormente para dentro do histórico deste caderno.</div></div>
      <button type="button" class="btn btn-quiet" data-cad-ftab="">${ic('x', 'sm')} Fechar</button>
    </div>
    <div class="row" style="gap:10px">
      <select class="select" id="cadPickSet" style="flex:1">
        <option value="">Escolha uma bateria de questões…</option>
        ${setsSoltos.map((s) => `<option value="${s.id}">[${esc(BANCA()[s.banca]?.nome || s.banca)}] ${esc(s.materia)}${s.assunto ? ` · ${esc(s.assunto)}` : ''} (${(s.questoes || []).length} questões)</option>`).join('')}
      </select>
      <button type="button" class="btn btn-primary" id="cadAttachSetBtn" ${S.cadFeedBusy ? 'disabled' : ''}>Adicionar ao caderno</button>
    </div>
  </div>` : ''}

  <div class="cad-sources no-print">
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <b style="font-size:14.5px">📄 Meus conteúdos que alimentam este caderno (${(c.materiais || []).length})</b>
        <button type="button" class="link-btn" style="font-size:12.5px" data-cad-ftab="material">+ Adicionar conteúdo</button>
      </div>
      ${(c.materiais || []).length ? `<div class="file-list">${c.materiais.map((m) => `<div class="chip" style="align-items:center;gap:8px">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 <b>${esc(m.fileName)}</b>${m.materia ? ` · ${esc(m.materia)}` : ''} <span class="hint">(${m.wordCount} pal.)</span></span>
        <button type="button" class="link-btn" style="font-size:12px;white-space:nowrap" data-cad-gen-from-mat="${m.id}">+ Gerar questões</button>
      </div>`).join('')}</div>` : `<div class="hint">Nenhum material vinculado ainda. Clique em <b>+ Alimentar com meu conteúdo</b> para enviar resumos ou anotações.</div>`}
    </div>
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <b style="font-size:14.5px">🏛️ Provas antigas da banca neste caderno (${(c.provas || []).length})</b>
        <button type="button" class="link-btn" style="font-size:12.5px" data-cad-ftab="prova">+ Adicionar prova</button>
      </div>
      ${(c.provas || []).length ? `<div class="file-list">${c.provas.map((p) => `<div class="chip" style="align-items:center;gap:8px">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🏛️ <b>${esc(p.titulo)}</b> ${p.numQuestoes ? `<span class="hint">(${p.numQuestoes} q.)</span>` : ''}</span>
        <span class="st ${ST_CLASS[p.status] || 'READY'}">${esc(p.statusLabel)}</span>
      </div>`).join('')}</div>` : `<div class="hint">Nenhuma prova antiga vinculada ainda. Clique em <b>+ Alimentar com provas antigas</b> para importar questões reais da ${esc(b.nome)}.</div>`}
    </div>
  </div>

  <div class="cad-toolbar no-print">
    <div class="row" style="gap:8px;flex:1">
      <select class="select" id="cadFStatus" style="width:auto;min-width:190px;padding:8px 11px;font-size:13px">
        <option value="all" ${f.status === 'all' ? 'selected' : ''}>Todas as questões (${(c.questoes || []).length})</option>
        <option value="revisao_hoje" ${f.status === 'revisao_hoje' ? 'selected' : ''}>🔔 Revisar hoje (${c.revisaoHojeCount || 0})</option>
        <option value="unanswered" ${f.status === 'unanswered' ? 'selected' : ''}>Não respondidas (${c.totalQuestoes - c.respondidas})</option>
        <option value="wrong" ${f.status === 'wrong' ? 'selected' : ''}>Erradas para revisar (${c.erros})</option>
        <option value="correct" ${f.status === 'correct' ? 'selected' : ''}>Acertadas (${c.acertos})</option>
        <option value="dominadas" ${f.status === 'dominadas' ? 'selected' : ''}>✔ Dominadas (${c.dominadasCount || 0})</option>
        <option value="fav" ${f.status === 'fav' ? 'selected' : ''}>★ Favoritas / Marcadas (${c.favoritasCount})</option>
        <option value="notes" ${f.status === 'notes' ? 'selected' : ''}>📝 Com anotações (${c.anotacoesCount})</option>
      </select>
      <select class="select" id="cadFOrigem" style="width:auto;min-width:185px;padding:8px 11px;font-size:13px">
        <option value="all" ${f.origem === 'all' ? 'selected' : ''}>Todas as origens</option>
        <option value="ia" ${f.origem === 'ia' ? 'selected' : ''}>📄 Meu conteúdo (IA) (${c.questoesIa})</option>
        <option value="prova" ${f.origem === 'prova' ? 'selected' : ''}>🏛️ Provas da banca (${c.questoesProvas})</option>
      </select>
      <select class="select" id="cadFMat" style="width:auto;min-width:170px;padding:8px 11px;font-size:13px">
        <option value="">Todas as matérias</option>
        ${(c.porMateria || []).map((m) => `<option value="${esc(m.materia)}" ${f.materia === m.materia ? 'selected' : ''}>${esc(m.materia)} (${m.total})</option>`).join('')}
      </select>
      <input class="input" id="cadFQ" placeholder="Buscar no caderno…" value="${esc(f.q)}" style="width:auto;min-width:170px;flex:1;padding:8px 11px;font-size:13px">
    </div>
    <div class="row" style="gap:6px">
      ${c.erros > 0 ? `<button type="button" class="btn btn-ghost" id="cadResetErros" style="padding:7px 11px;font-size:12.5px">${ic('refresh', 'sm')} Refazer erradas (${c.erros})</button>` : ''}
      ${c.respondidas > 0 ? `<button type="button" class="btn btn-quiet" id="cadResetAll" style="padding:7px 11px;font-size:12.5px">Limpar respostas</button>` : ''}
    </div>
  </div>

  ${c.erros > 0 ? `
    <div class="card card-pad no-print" style="background:linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%);border:1.5px solid #F59E0B;border-radius:12px;margin:14px 0">
      <div class="row" style="gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div class="row" style="gap:12px;align-items:center">
          <span class="li-icon" style="background:#F59E0B;color:#fff;width:38px;height:38px">${ic('spark')}</span>
          <div>
            <div style="font-weight:800;font-size:15px;color:#92400E">⚡ Bateria de Revanche dos Erros</div>
            <div class="hint" style="color:#78350F">Você tem <b>${c.erros} questão(ões) para revisar</b> neste caderno. Gere uma bateria inédita para destruir esses pontos cegos!</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="btnRevancheCadernoGeral" data-caderno-id="${c.id}" style="background:#D97706;border-color:#B45309;font-weight:800">
          ${ic('spark', 'sm')} Iniciar Revanche dos Erros
        </button>
      </div>
    </div>
  ` : ''}

  ${filtered.length
    ? filtered.map((q, idx) => viewCadernoQ(q, idx)).join('')
    : `<div class="card"><div class="empty">${ic('book')}<div>${(c.questoes || []).length ? 'Nenhuma questão encontrada para esses filtros.' : 'Este caderno ainda não tem questões.'}</div><div class="hint">Use os botões acima para alimentar o caderno com seu conteúdo ou com provas antigas da banca!</div></div></div>`}`;
}

function viewCadernoQ(q, idx) {
  const ce = q.formato === 'ce';
  const answered = q.ans != null;
  const ok = answered && q.ans === q.gabarito;
  const cls = (L) => (!answered ? '' : L === q.gabarito ? 'correct' : L === q.ans ? 'wrong' : '');
  const opts = ce
    ? `<div class="ce">${[['C', 'Certo'], ['E', 'Errado']].map(([L, t]) => `<button type="button" class="alt ${cls(L)}" data-cad-ans="${esc(q.key)}:::${L}" ${answered ? 'disabled' : ''}><span class="tx">${t}</span></button>`).join('')}</div>`
    : `<div class="alts">${(q.alternativas || []).map((a, j) => `<button type="button" class="alt ${cls(LETRAS[j])}" data-cad-ans="${esc(q.key)}:::${LETRAS[j]}" ${answered ? 'disabled' : ''}><span class="lt">${LETRAS[j]}</span><span class="tx">${esc(a)}</span></button>`).join('')}</div>`;
  const noteOpen = S.cadNoteOpen === q.key;

  return `<article class="card q">
    <div class="q-top" style="justify-content:space-between">
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="q-num">#${idx + 1}</span>
        <span class="badge ${q.origem === 'ia' ? 'brand' : 'accent'}" title="Fonte: ${esc(q.fonteTitulo)}">${q.origem === 'ia' ? '📄 Meu material' : '🏛️ Prova da banca'} · ${esc(q.fonteTitulo.slice(0, 32))}</span>
        <span class="badge">${esc(q.materia)}</span>
        ${q.assunto ? `<span class="badge">${esc(q.assunto)}</span>` : ''}
        ${q.topico_edital ? `<span class="badge edital-tag">${ic('target', 'sm')} Edital: ${esc(q.topico_edital)}</span>` : ''}
        ${q.anulada ? '<span class="badge sev high" title="A banca anulou esta questão no gabarito definitivo">Anulada pela banca — não conta</span>' : q.gabaritoAtualizado ? '<span class="badge accent" title="Gabarito conferido com o definitivo oficial">Gabarito atualizado (definitivo)</span>' : ''}
        ${q.revisao?.revancheVencida ? `<span class="badge" style="background:#DCFCE7;color:#166534;font-weight:800;border:1px solid #86EFAC">🏆 Ponto Cego Vencido!</span>` : ''}
        ${q.revisao ? `<span class="badge ${q.revisao.dominada ? 'brand' : q.revisao.paraRevisarHoje ? 'accent' : ''}" title="Repetição Espaçada: ${q.revisao.rotulo}${q.revisao.paraRevisarHoje ? ' · Pendente para revisão hoje!' : ''}">${q.revisao.dominada ? '✔ Dominada' : q.revisao.paraRevisarHoje ? '🔔 Revisar hoje (' + q.revisao.rotulo + ')' : '⏳ ' + q.revisao.rotulo}</span>` : ''}
      </div>
      <div class="row no-print" style="gap:6px">
        <button type="button" class="fav-btn ${q.favorita ? 'on' : ''}" data-cad-fav="${esc(q.key)}" title="Marcar para revisão">${q.favorita ? '★ Favorita' : '☆ Favoritar'}</button>
        <button type="button" class="fav-btn ${q.anotacao ? 'on' : ''}" data-cad-note-toggle="${esc(q.key)}" title="Anotação de estudo">📝 ${q.anotacao ? 'Ver/editar nota' : 'Anotar'}</button>
      </div>
    </div>
    <p class="q-text">${esc(q.enunciado)}</p>
    ${opts}
    ${answered ? `<div class="explain">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
        <div class="verdict ${ok ? 'ok' : 'bad'}" style="margin-bottom:0">${ic(ok ? 'check' : 'x', 'sm')} ${ok ? 'Você acertou' : 'Resposta incorreta'} · Gabarito: ${ce ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : q.gabarito}</div>
        <div class="row no-print" style="gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-quiet" style="padding:4px 10px;font-size:12px" data-cad-clear="${esc(q.key)}">${ic('refresh', 'sm')} Resolver novamente</button>
          ${!ok ? `<button type="button" class="btn btn-ghost btn-pq-errei" style="padding:4px 10px;font-size:12px" data-pq-caderno="${esc(q.key)}">${(S.explicacaoLoading && S.explicacaoLoading['cad:' + q.key]) ? `<span class="spinner sm" style="width:12px;height:12px;display:inline-block;vertical-align:-1px"></span> Analisando...` : `💡 Por que errei?`}</button>` : ''}
          ${!ok ? `<button type="button" class="btn btn-primary btn-sm" style="padding:4px 10px;font-size:12px;background:#D97706;border-color:#B45309" data-revanche-cad-key="${esc(q.key)}">${ic('spark', 'sm')} ⚡ Revanche IA</button>` : ''}
        </div>
      </div>
      <p>${esc(q.comentario)}</p>
      ${q.trecho ? `<div class="trecho">“${esc(q.trecho)}”<div class="hint" style="font-style:normal;margin-top:4px">${q.ancorada ? '✓ Trecho conferido no seu material' : 'Trecho do seu material'}</div></div>` : ''}
      ${q.pegadinha ? `<div class="pega"><b>Pegadinha da banca:</b> ${esc(q.pegadinha)}</div>` : ''}
      ${!ok && (S.explicacoes && S.explicacoes['cad:' + q.key]) ? renderExplicacaoCard(S.explicacoes['cad:' + q.key]) : ''}
    </div>` : ''}
    ${q.anotacao && !noteOpen ? `<div class="cad-note"><b>📝 Minha anotação:</b> ${esc(q.anotacao)}</div>` : ''}
    ${noteOpen ? `<div class="report-box no-print" style="margin-top:12px">
      <label class="hint" style="display:block;margin-bottom:4px">Sua anotação de revisão para esta questão:</label>
      <textarea class="textarea" id="cadNoteIn" maxlength="1500" style="min-height:74px" placeholder="Anote o artigo de lei, macete ou motivo do erro para revisar depois…">${esc(q.anotacao)}</textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px;gap:8px">
        <button type="button" class="btn btn-quiet" data-cad-note-cancel>Cancelar</button>
        <button type="button" class="btn btn-primary" data-cad-note-save="${esc(q.key)}">Salvar anotação</button>
      </div>
    </div>` : ''}
  </article>`;
}

/** Eventos da tela (questoes); chamada pela bindApp em eventos.js a cada desenho. */
function ligarCadernos() {
  const fb = $('#fBanca'), fm = $('#fMat');
  if (fb) fb.onchange = () => { S.filter.banca = fb.value; render(); };
  if (fm) fm.onchange = () => { S.filter.materia = fm.value; render(); };
  on('[data-btab]', 'click', (e) => { S.bancoTab = e.currentTarget.dataset.btab; render(); });
  on('#btnToggleNewCad', 'click', () => { S.cadernoNewOpen = !S.cadernoNewOpen; S.bancoTab = 'cadernos'; render(); });
  on('#btnCancelNewCad', 'click', () => { S.cadernoNewOpen = false; render(); });
  const cf = S.cadForm || (S.cadForm = { banca: 'cebraspe', editalId: '', orgao: '', cargo: '', ano: '', titulo: '', descricao: '', importarExistentes: true });
  on('[data-cad-banca]', 'click', (e) => { cf.banca = e.currentTarget.dataset.cadBanca; render(); });
  const ces = $('#cadEditalSel');
  if (ces) ces.onchange = () => {
    cf.editalId = ces.value;
    const ed = (S.editais || []).find((x) => x.id === cf.editalId);
    if (ed) {
      if (ed.banca && S.bancas.some((b) => b.id === ed.banca)) cf.banca = ed.banca;
      if (ed.orgao && !cf.orgao) cf.orgao = ed.orgao;
      if (ed.cargo && !cf.cargo) cf.cargo = ed.cargo;
      if (ed.ano && !cf.ano) cf.ano = ed.ano;
    }
    render();
  };
  ['Titulo', 'Orgao', 'Cargo', 'Ano'].forEach((k) => { const el = $('#cad' + k); if (el) el.oninput = () => { cf[k.toLowerCase()] = el.value; }; });
  const cim = $('#cadImportar'); if (cim) cim.onchange = () => { cf.importarExistentes = cim.checked; };
  const ncf = $('#newCadForm');
  if (ncf) ncf.onsubmit = async (ev) => {
    ev.preventDefault();
    if (!cf.banca) return toast('Escolha a banca do caderno.');
    if (cf.ano && !/^\d{4}$/.test(cf.ano)) return toast('Ano inválido.');
    S.cadernoBusy = true; render();
    try {
      const r = await api('/cadernos', { method: 'POST', body: cf });
      S.cadernoNewOpen = false; S.cadForm = null;
      S.activeCaderno = r.caderno;
      await refreshCadernos({ silent: true });
      S.view = 'caderno';
      toast(`Caderno "${r.caderno.titulo}" criado com ${r.caderno.totalQuestoes} questão(ões)!`);
    } catch (err) { toast(err.message); }
    S.cadernoBusy = false; render();
  };
  on('[data-revanche]', 'click', (e) => {
    const [mat, top, b] = e.currentTarget.dataset.revanche.split('||');
    S.wiz = newWiz();
    if (S.materias.includes(mat)) S.wiz.materia = mat;
    if (top) S.wiz.assunto = top.slice(0, 100);
    if (b && S.bancas.some((x) => x.id === b)) S.wiz.banca = b;
    go('gerar');
    toast(`Envie seu resumo de ${mat}${top ? ` (${top.slice(0, 40)})` : ''} para gerar uma bateria de revanche!`);
  });
}

/** Eventos da tela (caderno); chamada pela bindApp em eventos.js a cada desenho. */
function ligarCaderno() {
  const c = S.activeCaderno;
  on('[data-cad-ftab]', 'click', (e) => { S.cadernoFeedTab = e.currentTarget.dataset.cadFtab; render(); });
  on('#printCaderno', 'click', () => window.print());
  on('#delCaderno', 'click', () => confirmBox('Excluir este Caderno de Questões?', `O caderno "${c.titulo}" será removido. Seus materiais, provas e baterias avulsas continuam salvos.`, 'Excluir', true, async () => {
    await api(`/cadernos/${c.id}`, { method: 'DELETE' }).catch(() => {});
    S.activeCaderno = null;
    await refreshCadernos({ silent: true });
    go('questoes');
    toast('Caderno excluído');
  }));
  on('#cadGoWizNewMat', 'click', () => {
    S.wiz = newWiz();
    S.wiz.cadernoId = c.id;
    S.wiz.banca = c.banca;
    if (c.editalId) S.wiz.editalId = c.editalId;
    go('gerar');
    toast(`Envie seu conteúdo para gerar novas questões direto no caderno "${c.titulo}"!`);
  });
  const useExistingMat = async (matId) => {
    if (!matId) return toast('Selecione um material.');
    S.cadFeedBusy = true; render();
    try {
      const r = await api(`/cadernos/${c.id}/alimentar-material`, { method: 'POST', body: { materialId: matId } });
      S.activeCaderno = r.caderno;
      S.wiz = newWiz();
      S.wiz.cadernoId = c.id;
      S.wiz.banca = c.banca;
      S.wiz.editalId = c.editalId || r.material.editalId || '';
      S.wiz.material = { id: r.material.id, fileName: r.material.fileName, detect: r.material.detect, editalMatch: r.material.editalMatch, wordCount: 500, preview: '' };
      S.wiz.materia = r.material.materia && S.materias.includes(r.material.materia) ? r.material.materia : (r.material.detect?.materia && S.materias.includes(r.material.detect.materia) ? r.material.detect.materia : '');
      S.wiz.step = 2;
      S.cadFeedBusy = false;
      go('gerar');
      toast('Material selecionado! Confirme a matéria e gere novas questões para o seu caderno.');
    } catch (err) { S.cadFeedBusy = false; toast(err.message); render(); }
  };
  on('#cadUseExistingMat', 'click', () => useExistingMat($('#cadPickMat')?.value));
  on('[data-cad-gen-from-mat]', 'click', (e) => useExistingMat(e.currentTarget.dataset.cadGenFromMat));
  on('#cadImportProvaBtn', 'click', async () => {
    const provaId = $('#cadPickProva')?.value;
    if (!provaId) return toast('Selecione uma prova da banca.');
    S.cadFeedBusy = true; render();
    try {
      const r = await api(`/cadernos/${c.id}/alimentar-prova`, { method: 'POST', body: { provaId } });
      S.activeCaderno = r.caderno;
      S.cadernoFeedTab = '';
      await refreshCadernos({ silent: true });
      toast(r.message);
    } catch (err) { toast(err.message); }
    S.cadFeedBusy = false; render();
  });
  const cup = $('#cadUpProvaFile');
  if (cup) cup.onchange = async () => {
    const file = cup.files[0]; if (!file) return;
    S.cadFeedBusy = true; render();
    try {
      const fd = new FormData(); fd.append('prova', file);
      const r = await api(`/cadernos/${c.id}/alimentar-prova`, { method: 'POST', form: fd });
      S.activeCaderno = r.caderno;
      S.cadernoFeedTab = '';
      await refreshCadernos({ silent: true });
      toast(r.message);
    } catch (err) { toast(err.message); }
    S.cadFeedBusy = false; render();
  };
  on('#cadAttachSetBtn', 'click', async () => {
    const setId = $('#cadPickSet')?.value;
    if (!setId) return toast('Selecione uma bateria de questões.');
    S.cadFeedBusy = true; render();
    try {
      const r = await api(`/cadernos/${c.id}/vincular-simulado`, { method: 'POST', body: { setId } });
      S.activeCaderno = r.caderno;
      S.sets = S.sets.map((s) => (s.id === setId ? { ...s, cadernoId: c.id } : s));
      S.cadernoFeedTab = '';
      await refreshCadernos({ silent: true });
      toast('Bateria de questões adicionada ao caderno!');
    } catch (err) { toast(err.message); }
    S.cadFeedBusy = false; render();
  });
  const fs = $('#cadFStatus'), fo = $('#cadFOrigem'), fm = $('#cadFMat'), fq = $('#cadFQ');
  if (fs) fs.onchange = () => { S.cadFilter.status = fs.value; render(); };
  if (fo) fo.onchange = () => { S.cadFilter.origem = fo.value; render(); };
  if (fm) fm.onchange = () => { S.cadFilter.materia = fm.value; render(); };
  if (fq) fq.oninput = () => {
    S.cadFilter.q = fq.value;
    const pos = fq.selectionStart;
    render();
    const nfq = $('#cadFQ'); if (nfq) { nfq.focus(); try { nfq.setSelectionRange(pos, pos); } catch {} }
  };
  const interagir = async (body, msg) => {
    const y = window.scrollY;
    try {
      const r = await api(`/cadernos/${c.id}/interagir`, { method: 'PATCH', body });
      S.activeCaderno = r.caderno;
      refreshCadernos({ silent: true });
      if (msg) toast(msg);
    } catch (err) { toast(err.message); }
    render(); window.scrollTo({ top: y });
  };
  on('[data-cad-ans]', 'click', (e) => {
    const [key, L] = e.currentTarget.dataset.cadAns.split(':::');
    interagir({ key, resposta: L });
  });
  on('[data-cad-clear]', 'click', (e) => interagir({ key: e.currentTarget.dataset.cadClear, resposta: null }));
  on('[data-cad-fav]', 'click', (e) => {
    const key = e.currentTarget.dataset.cadFav;
    const q = (c.questoes || []).find((x) => x.key === key);
    interagir({ key, favorita: !q?.favorita });
  });
  on('[data-cad-note-toggle]', 'click', (e) => {
    const key = e.currentTarget.dataset.cadNoteToggle;
    S.cadNoteOpen = S.cadNoteOpen === key ? null : key;
    const y = window.scrollY; render(); window.scrollTo({ top: y });
  });
  on('[data-cad-note-cancel]', 'click', () => { S.cadNoteOpen = null; const y = window.scrollY; render(); window.scrollTo({ top: y }); });
  on('[data-cad-note-save]', 'click', (e) => {
    const key = e.currentTarget.dataset.cadNoteSave;
    const anotacao = ($('#cadNoteIn')?.value || '').trim();
    S.cadNoteOpen = null;
    interagir({ key, anotacao }, 'Anotação salva no caderno!');
  });
  on('#cadResetErros', 'click', () => confirmBox('Refazer questões erradas?', `As respostas das ${c.erros} questão(ões) que você errou serão limpas para você tentar novamente.`, 'Refazer erradas', false, () => interagir({ reset: 'erros' }, 'Questões erradas liberadas para revisão!')));
  on('#cadResetAll', 'click', () => confirmBox('Refazer todo o caderno?', 'Todas as respostas deste caderno serão limpas para você resolver novamente.', 'Limpar e refazer', false, () => interagir({ reset: 'all' }, 'Caderno reiniciado!')));
  on('[data-pq-caderno]', 'click', async (e) => {
    const qKey = e.currentTarget.dataset.pqCaderno;
    const stateKey = `cad:${qKey}`;
    S.explicacoes = S.explicacoes || {};
    S.explicacaoLoading = S.explicacaoLoading || {};
    if (S.explicacoes[stateKey]) return;
    S.explicacaoLoading[stateKey] = true;
    const y = window.scrollY; render(); window.scrollTo({ top: y });
    try {
      const q = (c.questoes || []).find((x) => x.key === qKey);
      const res = await api(`/cadernos/${c.id}/questoes/por-que-errei`, {
        method: 'POST',
        body: { key: qKey, resposta: q?.ans },
      });
      S.explicacoes[stateKey] = res;
    } catch (err) {
      toast(err.message || 'Não foi possível gerar a explicação.');
    } finally {
      S.explicacaoLoading[stateKey] = false;
      const y2 = window.scrollY; render(); window.scrollTo({ top: y2 });
    }
  });
  on('#btnRevancheCadernoGeral', 'click', () => {
    dispararRevanche({ cadernoId: c.id });
  });
  on('[data-revanche-cad-key]', 'click', (e) => {
    const qKey = e.currentTarget.dataset.revancheCadKey;
    const q = (c.questoes || []).find((x) => x.key === qKey);
    if (!q) return;
    dispararRevanche({
      cadernoId: c.id,
      keys: [q.key],
      banca: q.banca || c.banca,
      materia: q.materia,
      qtd: 3,
    });
  });
  on('[data-revanche]', 'click', (e) => {
    const [mat, top, b] = e.currentTarget.dataset.revanche.split('||');
    S.wiz = newWiz();
    S.wiz.cadernoId = c.id;
    if (S.materias.includes(mat)) S.wiz.materia = mat;
    if (top) S.wiz.assunto = top.slice(0, 100);
    if (b && S.bancas.some((x) => x.id === b)) S.wiz.banca = b;
    go('gerar');
    toast(`Envie seu resumo de ${mat} para gerar mais questões no seu caderno!`);
  });
}

export { refreshCadernos, openCaderno, cadernoCardHtml, getWrongQuestions, viewBanco, viewCaderno, viewCadernoQ, ligarCadernos, ligarCaderno };
