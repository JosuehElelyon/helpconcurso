// Front do HelpConcurso — Base de provas (admin).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { brl } from './conta.js';
import { PENDING_ST, SEV_LABEL, fonteBadge, stBadge } from './enviar-provas.js';
import { BANCA, S } from './estado.js';
import { refreshStars } from './estrelas.js';
import { avisoAvatarHtml } from './hoje.js';
import { ic } from './icones.js';
import { confirmBox } from './modal.js';
import { render } from './render.js';
import { $, API, LETRAS, api, esc, fmtDate, on, renderAvatar, toast } from './util.js';

// ---------- Base de provas (admin) ----------
function viewProvas() {
  const tab = S.adminTab || 'revisao', counts = S.adminCounts || {};
  const tabs = [['revisao', `Revisão${counts.IN_REVIEW ? ` (${counts.IN_REVIEW})` : ''}`], ['base', 'Base por banca'], ['monitor', 'Segurança e IA']];
  let body = '';
  if (tab === 'revisao') {
    const list = (S.adminProvas || []).filter((p) => p.status === 'IN_REVIEW');
    body = `<div class="card">${list.length ? list.map((p) => `<div class="prova"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
        <div style="min-width:0"><div class="li-title">${esc(p.titulo || p.fileName)}</div>
          <div class="li-meta">${esc(BANCA()[p.banca]?.nome || p.banca)}${p.bancaInformada && p.bancaInformada !== p.banca ? ` (informada: ${esc(BANCA()[p.bancaInformada]?.nome || p.bancaInformada)})` : ''} · ${p.uploader ? esc(p.uploader.name) : '—'} · ${fmtDate(p.createdAt)}${p.needsOcr ? ' · escaneada' : ''}</div>
          ${p.reviewNote ? `<div class="hint">${esc(p.reviewNote)}</div>` : ''}</div>
        ${p.securitySeverity && !['info', 'low'].includes(p.securitySeverity) ? `<span class="sev ${p.securitySeverity}">${SEV_LABEL[p.securitySeverity]}</span>` : '<span class="sev low">Sem alertas</span>'}</div>
        <div class="row" style="margin-top:8px"><button class="btn btn-primary" data-analisar="${p.id}">${ic('eye', 'sm')} Analisar</button></div></div>`).join('')
      : `<div class="empty">${ic('check')}<div>Nada aguardando revisão.</div></div>`}</div>`;
  } else if (tab === 'base') {
    const b = BANCA()[S.provaBanca], list = (S.adminProvas || []).filter((p) => p.banca === b.id);
    body = `<div class="banca-tabs">${S.bancas.map((x) => `<button class="btab ${x.id === b.id ? 'on' : ''}" data-pb="${x.id}"><span class="bdot" style="background:${x.cor}"></span>${x.nome}<span class="ct">${(S.adminProvas || []).filter((p) => p.banca === x.id && p.status === 'READY').length}</span></button>`).join('')}</div>
    <div class="card">${list.length ? list.map((p) => `<div class="prova">
      <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div style="min-width:0">
        <div class="li-title">${esc(p.titulo || p.fileName)}</div>
        <div class="li-meta">${[p.ano, (p.materias || []).slice(0, 3).join(', '), p.numQuestoes != null ? p.numQuestoes + ' questões' : '', p.source === 'user' && p.uploader ? 'enviada por ' + p.uploader.name : 'admin', p.autoApproved ? 'aprovação automática' : ''].filter(Boolean).map(esc).join(' · ')} ${fonteBadge(p)}${p.gabaritoDefinitivo ? ' <span class="badge brand" style="font-size:11px">✔ Gabarito definitivo</span>' : ''}${p.consensoConcluido === false ? ' <span class="badge" style="background:#ef4444;color:#fff;font-size:11px" title="Houve divergência de gabarito entre modelos gratuitos">⚠ Divergência</span>' : ''}</div></div>${stBadge(p)}</div>
      ${p.error ? `<div class="hint" style="color:var(--bad);margin-top:6px">${esc(p.error)}</div>` : p.reviewNote && ['REJECTED', 'DUPLICATE'].includes(p.status) ? `<div class="hint" style="margin-top:6px">${esc(p.reviewNote)}</div>` : ''}
      <div class="row" style="margin-top:8px;gap:4px">
        <button class="btn btn-quiet" data-analisar="${p.id}">${ic('eye', 'sm')} Detalhes</button>
        ${p.status === 'READY' ? `<button class="btn btn-quiet" data-verq="${p.id}">${ic('list', 'sm')} Questões</button>` : ''}
        ${p.status === 'READY' ? `<button class="btn btn-quiet" data-gabdef="${p.id}">${ic('check', 'sm')} Gabarito definitivo</button>` : ''}
        <a class="btn btn-quiet" href="${API}/admin/provas/${p.id}/arquivo">${ic('download', 'sm')} Arquivo</a>
        ${['READY', 'FAILED', 'QUEUED'].includes(p.status) ? `<button class="btn btn-quiet" data-reproc="${p.id}">${ic('refresh', 'sm')} Reprocessar</button>` : ''}
        <button class="btn btn-quiet" data-delprova="${p.id}" style="color:var(--bad)">${ic('trash', 'sm')} Remover</button>
      </div></div>`).join('') : `<div class="empty" style="padding:24px">${ic('book')}<div>Nenhuma prova da ${b.nome}.</div><button class="btn btn-quiet" data-go="contribuir">Enviar provas</button></div>`}</div>`;
  } else {
    const m = S.monitor;
    body = !m ? '<div class="empty"><span class="spinner sm"></span></div>' : `
    <div class="card card-pad" style="margin-bottom:16px"><h3 style="margin:0 0 4px;font-size:16px">IA por tarefa</h3>
      <p class="hint" style="margin:0 0 12px">${m.ia.mock ? '<b>Modo simulado (AI_MOCK=true)</b> — nenhuma chamada real. ' : ''}Treino: ${m.ia.trainingMode === 'batch' ? 'modo lote (mais barato)' : 'direto'}. Para trocar de fornecedor, altere AI_MODEL_&lt;TAREFA&gt; no .env.</p>
      <table class="tbl"><thead><tr><th>Tarefa</th><th>Principal</th><th>Reserva</th></tr></thead><tbody>${m.ia.routing.map((r) => `<tr><td>${esc(r.label)}</td><td><code>${esc(r.primary)}</code></td><td><code>${esc(r.fallback || '—')}</code></td></tr>`).join('')}</tbody></table></div>
    <div class="card card-pad" style="margin-bottom:16px">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h3 style="margin:0;font-size:16px">Uso e Custos da IA (30 dias)</h3>
        ${m.ia.custoTotal ? `<span class="badge brand" style="font-size:13px">Total estimado: R$ ${Number(m.ia.custoTotal.brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (US$ ${Number(m.ia.custoTotal.usd || 0).toFixed(4)})</span>` : ''}
        ${m.ia.limiteDia ? `<span class="${m.ia.limiteDia.atingido ? 'sev high' : 'badge'}" style="font-size:13px" title="AI_LIMITE_USD_DIA no .env (dia de Brasília)">Hoje: US$ ${Number(m.ia.limiteDia.gastoHojeUsd || 0).toFixed(4)}${m.ia.limiteDia.usd ? ` de US$ ${Number(m.ia.limiteDia.usd).toFixed(2)}${m.ia.limiteDia.atingido ? ' — limite atingido, IA paga pausada até amanhã' : ''}` : ' (sem limite diário)'}</span>` : ''}
        ${m.ia.limiteTotal?.usd ? `<span class="${m.ia.limiteTotal.atingido ? 'sev high' : 'badge'}" style="font-size:13px" title="AI_LIMITE_USD_TOTAL no .env (teto acumulado)">Total acumulado: US$ ${Number(m.ia.limiteTotal.gastoTotalUsd || 0).toFixed(4)} de US$ ${Number(m.ia.limiteTotal.usd).toFixed(2)}${m.ia.limiteTotal.atingido ? ' — teto total atingido, IA paga bloqueada' : ''}</span>` : ''}
      </div>
      ${m.ia.resumoProduto ? `
        <div class="row" style="gap:10px;margin-bottom:14px;flex-wrap:wrap">
          <span class="badge" title="Simulados gerados com IA">${ic('spark', 'sm')} <b>${m.ia.resumoProduto.simuladosIA || 0}</b> simulados IA</span>
          <span class="badge" title="Baterias de revanche geradas">${ic('target', 'sm')} <b>${m.ia.resumoProduto.revanches || 0}</b> revanches</span>
          <span class="badge ok" title="Simulados no formato prova real">${ic('check', 'sm')} <b>${m.ia.resumoProduto.simuladosProvaReal || 0}</b> prova real (custo R$ 0)</span>
          <span class="badge" title="Explicações Por que errei">${ic('brain', 'sm')} <b>${m.ia.resumoProduto.explicacoesTotais || 0}</b> "Por que errei?" (${m.ia.resumoProduto.explicacoesCache || 0} do cache)</span>
        </div>
      ` : ''}
      ${m.ia.usage.length ? `<table class="tbl"><thead><tr><th>Tarefa</th><th>Modelo</th><th>Chamadas</th><th>Falhas</th><th>Reserva</th><th>Tokens entrada</th><th>Tokens saída</th><th>Cache</th><th>Tempo médio</th><th>Custo est.</th></tr></thead><tbody>${m.ia.usage.map((u) => `<tr><td>${esc(u.task)}</td><td><code>${esc(u.provider)}:${esc(u.model)}</code></td><td>${u.chamadas}</td><td>${u.falhas}</td><td>${u.reservas}</td><td>${Number(u.entrada).toLocaleString('pt-BR')}</td><td>${Number(u.saida).toLocaleString('pt-BR')}</td><td>${Number(u.cache).toLocaleString('pt-BR')}${u.cachePct != null ? ` <span class="hint">(${u.cachePct}%)</span>` : ''}</td><td>${u.ms_medio != null ? (u.ms_medio / 1000).toFixed(1) + ' s' : '—'}</td><td><b>R$ ${Number(u.custoBrl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> <span class="hint">(US$ ${Number(u.custoUsd || 0).toFixed(4)})</span></td></tr>`).join('')}</tbody></table>` : '<p class="hint">Sem chamadas ainda.</p>'}
      ${(m.ia.custoPorFuncionalidade || []).length ? `<h3 style="margin:18px 0 8px;font-size:15px">Custo por funcionalidade (${m.ia.periodoDias} dias)</h3>
        <p class="hint" style="margin:0 0 8px">Base para preço e limites dos planos: quanto custa, em média, cada uso.</p>
        <table class="tbl"><thead><tr><th>Funcionalidade</th><th>Chamadas de IA</th><th>Usos</th><th>Custo total</th><th>Custo médio por uso</th></tr></thead><tbody>${m.ia.custoPorFuncionalidade.map((f) => `<tr>
          <td>${esc(f.funcionalidade)}</td><td>${f.chamadas}</td><td>${f.usos ?? '—'}</td>
          <td>R$ ${Number(f.custoBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span class="hint">(US$ ${Number(f.custoUsd).toFixed(4)})</span></td>
          <td>${f.custoMedioBrl != null ? `<b>R$ ${Number(f.custoMedioBrl).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</b> <span class="hint">por ${esc(f.unidade)}</span>` : '—'}</td></tr>`).join('')}</tbody></table>` : ''}
      ${(m.ia.qualidadePorModelo || []).length ? `<h3 style="margin:18px 0 8px;font-size:15px">Qualidade por modelo e versão do prompt (${m.ia.periodoDias} dias)</h3>
        <p class="hint" style="margin:0 0 8px">Descarte = questões que o revisor reprovou. Aprovação = 👍 sobre o total de avaliações dos alunos.</p>
        <table class="tbl"><thead><tr><th>Gerador</th><th>Prompt</th><th>Revisor</th><th>Simulados</th><th>Descarte</th><th>👍 / 👎</th><th>Aprovação</th><th>Erros confirmados</th></tr></thead><tbody>${m.ia.qualidadePorModelo.map((q) => `<tr>
          <td><code>${esc(q.gerador)}</code></td><td>${esc(q.prompt_versao)}</td><td><code>${esc(q.revisor)}</code></td>
          <td>${q.simulados}${q.revisor_indisponivel ? ` <span class="hint">(${q.revisor_indisponivel} sem revisor)</span>` : ''}</td>
          <td>${q.descartePct != null ? q.descartePct + '%' : '—'} <span class="hint">(${q.descartadas}/${q.geradas})</span></td>
          <td>${q.gostei} / ${q.nao_gostei}</td><td>${q.aprovacaoAlunosPct != null ? q.aprovacaoAlunosPct + '%' : '—'}</td><td>${q.erros_confirmados}</td></tr>`).join('')}</tbody></table>` : ''}
      ${m.ia.revisor && m.ia.revisor.geradas ? `<p class="hint" style="margin:10px 0 0">Revisor automático (30 dias): ${m.ia.revisor.geradas} questões geradas, ${m.ia.revisor.descartadas} descartadas por divergência/ambiguidade, ${m.ia.revisor.refeitas} refeitas.</p>` : ''}
      ${(m.ia.qualidade || []).length ? `<h3 style="margin:18px 0 8px;font-size:15px">Qualidade percebida pelos alunos</h3><table class="tbl"><thead><tr><th>Banca</th><th>👍</th><th>👎</th><th>Erros confirmados</th><th>Reportes não confirmados</th></tr></thead><tbody>${m.ia.qualidade.map((q) => `<tr><td>${esc(BANCA()[q.banca]?.nome || q.banca)}</td><td>${q.gostei}</td><td>${q.nao_gostei}</td><td>${q.erros_confirmados}</td><td>${q.erros_nao_confirmados}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="hint" style="margin:10px 0 0">Fila de tarefas: ${Object.entries(m.ia.jobs).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') || 'vazia'}</p></div>
    <div class="card card-pad"><h3 style="margin:0 0 12px;font-size:16px">Eventos de segurança</h3>
      ${m.sec.blockedUsers.length ? `<div class="banner warn">${ic('alert', 'sm')}<div>Envios pausados: ${m.sec.blockedUsers.map((u) => esc(u.name) + ' (' + esc(u.email) + ')').join(', ')}</div></div>` : ''}
      ${m.sec.events.length ? `<table class="tbl"><thead><tr><th>Quando</th><th>Tipo</th><th>Nível</th><th>Usuário</th><th>Arquivo</th><th>Motivos</th></tr></thead><tbody>${m.sec.events.slice(0, 80).map((e) => `<tr><td>${new Date(e.created_at).toLocaleString('pt-BR')}</td><td>${esc(e.kind)}</td><td><span class="sev ${e.severity}">${SEV_LABEL[e.severity] || esc(e.severity)}</span></td><td>${esc(e.name || '—')}</td><td>${esc(e.file_name || '—')}</td><td class="hint">${esc(((e.details?.findings || []).filter((f) => !['info', 'low'].includes(f.severity)).map((f) => f.message).concat(e.details?.reasons || [], e.details?.alertas || [])).slice(0, 3).join(' · '))}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Nenhum evento.</p>'}</div>`;
  }
  return `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1 class="page-title">Base de provas</h1><p class="page-sub">Revise as provas enviadas, acompanhe o treino da IA e monitore segurança e custos.</p></div><div class="row" style="gap:8px"><button class="btn btn-ghost" id="admPedidos" title="Pedidos de upgrade de plano">${ic('crown', 'sm')} Pedidos de plano</button><button class="btn btn-ghost" id="admDiverg" title="Questões em que os dois modelos discordaram do gabarito">${ic('alert', 'sm')} Divergências</button><button class="btn btn-ghost" id="admLote" title="Importa várias provas de links oficiais de uma vez">${ic('download', 'sm')} Importar em lote</button><button class="btn btn-ghost" id="admRotular" title="Completa tópico, comando e pegadinha das questões de provas antigas usando as IAs grátis (provas são públicas)">${ic('brain', 'sm')} Rotular provas antigas</button><button class="btn btn-primary" data-go="contribuir">${ic('upload', 'sm')} Enviar provas</button></div></div>${avisoAvatarHtml()}
  <div class="tabs" style="max-width:520px">${tabs.map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-atab="${k}">${l}</button>`).join('')}</div>${body}`;
}

function reviewHtml(p) {
  const sec = p.security || {}, cls = p.classification || {};
  const findings = (sec.findings || []).filter((f) => f.severity !== 'info');
  return `<div class="li-meta" style="margin-bottom:12px">${esc(p.fileName)} · ${p.pageCount ? p.pageCount + ' pág. · ' : ''}${p.uploader ? 'enviada por ' + esc(p.uploader.name) + ' (' + esc(p.uploader.email) + ')' : 'admin'} · ${stBadge(p)}</div>
  ${p.reviewNote ? `<div class="banner info">${ic('info', 'sm')}<div>${esc(p.reviewNote)}</div></div>` : ''}
  <div class="eyebrow" style="margin:6px 0">Checagem automática pela IA</div>
  <div class="chips" style="margin-bottom:12px">
    <span class="chip">É prova: <b>${cls.e_prova === undefined ? '—' : cls.e_prova ? 'sim' : 'não'}</b>${cls.confianca != null ? ` (${Math.round(cls.confianca * 100)}%)` : ''}</span>
    <span class="chip">Banca detectada: <b>${esc(cls.banca || '—')}</b></span>
    <span class="chip">Instruções para IA: <b>${cls.tentativa_de_instrucao ? 'SIM' : 'não'}</b></span>
    ${cls.orgao ? `<span class="chip">${esc(cls.orgao)}</span>` : ''}${cls.cargo ? `<span class="chip">${esc(cls.cargo)}</span>` : ''}${cls.ano ? `<span class="chip">${esc(cls.ano)}</span>` : ''}
  </div>
  <div class="eyebrow" style="margin:6px 0">Barreiras de segurança</div>
  ${findings.length ? `<div style="margin-bottom:12px">${findings.map((f) => `<div class="trait" style="display:block"><span class="sev ${f.severity}">${SEV_LABEL[f.severity]}</span> ${esc(f.message)} <span class="hint">(${esc(f.where || '')})</span>${f.sample ? `<div class="ex" style="margin-top:4px">${esc(f.sample)}</div>` : ''}</div>`).join('')}</div>` : '<p class="hint">Nenhum alerta.</p>'}
  <div class="eyebrow" style="margin:6px 0">Prévia do texto${p.needsOcr ? ' (PDF escaneado: o texto completo é lido após a aprovação)' : ''}</div>
  <div class="preview" style="max-height:260px">${esc(p.textPreview || '(sem texto extraído ainda)')}</div>
  ${p.status === 'IN_REVIEW' || ['REJECTED', 'FAILED', 'DUPLICATE'].includes(p.status) ? `
  <div class="opts" style="margin-top:18px">
    <div><div class="field"><label for="rvBanca">Banca</label><select class="select" id="rvBanca">${S.bancas.map((b) => `<option value="${b.id}" ${b.id === p.banca ? 'selected' : ''}>${b.nome}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-block" data-aprovar="${p.id}">${ic('check', 'sm')} Aprovar e treinar</button></div>
    <div><div class="field"><label for="rvMotivo">Motivo da recusa (enviado ao usuário)</label><input class="input" id="rvMotivo" maxlength="500" placeholder="Ex.: arquivo incompleto"></div>
      <button class="btn btn-danger btn-block" data-recusar="${p.id}">${ic('x', 'sm')} Recusar</button></div>
  </div>` : ''}
  <div class="row" style="margin-top:14px"><a class="btn btn-quiet" href="${API}/admin/provas/${p.id}/arquivo">${ic('download', 'sm')} Baixar arquivo original</a></div>`;
}

let pollT;
function schedulePoll() {
  clearTimeout(pollT);
  const pendingMine = S.view === 'contribuir' && (S.minhas || []).some((p) => PENDING_ST.includes(p.status));
  const pendingAdmin = S.view === 'provas' && (S.adminProvas || []).some((p) => PENDING_ST.includes(p.status));
  if (!pendingMine && !pendingAdmin) return;
  pollT = setTimeout(async () => {
    try {
      if (S.view === 'contribuir') { S.minhas = (await api('/provas/minhas')).provas; refreshStars(); }
      if (S.view === 'provas') await loadAdmin(false);
      if (!S.modal) render(); else schedulePoll();
    } catch { schedulePoll(); }
  }, 4000);
}
async function loadAdmin(withMonitor) {
  const r = await api('/admin/provas'); S.adminProvas = r.provas; S.adminCounts = r.counts;
  if (withMonitor) { const [ia, sec] = await Promise.all([api('/admin/ia'), api('/admin/seguranca')]); S.monitor = { ia, sec }; }
}

/** Eventos da tela (provas); chamada pela bindApp em eventos.js a cada desenho. */
function ligarAdmin() {
  const abrirPedidos = async () => {
    try {
      const { pedidos } = await api('/admin/pedidos');
      const pend = pedidos.filter((p) => p.status === 'pendente');
      S.modal = {
        title: `Pedidos de plano (${pend.length} pendente${pend.length === 1 ? '' : 's'})`,
        html: pedidos.length ? `<p class="hint" style="margin-top:0">Confirme o pagamento antes de aprovar. Aprovar soma 1 mês (ou 1 ano) ao período do aluno.</p>
          <table class="tbl"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Pedido em</th><th>Situação</th><th></th></tr></thead><tbody>${pedidos.map((p) => `<tr>
            <td><div class="row" style="gap:8px;flex-wrap:nowrap">${renderAvatar({ name: p.name, avatarUrl: p.avatar_url })}<div><b>${esc(p.name)}</b><div class="hint">${esc(p.email)}</div></div></div></td>
            <td>${esc(p.planoNome)} <span class="hint">(${esc(p.periodicidade)})</span></td>
            <td>${brl(p.valor)}</td><td>${new Date(p.created_at).toLocaleString('pt-BR')}</td>
            <td><span class="badge ${p.status === 'pendente' ? 'accent' : p.status === 'aprovado' ? 'brand' : ''}">${esc(p.status)}</span></td>
            <td>${p.status === 'pendente' ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn btn-primary" style="padding:7px 12px" data-pedido="${p.id}:aprovar">Aprovar</button><button class="btn btn-ghost" style="padding:7px 12px" data-pedido="${p.id}:recusar">Recusar</button></div>` : ''}</td>
          </tr>`).join('')}</tbody></table>` : '<p class="hint">Nenhum pedido ainda.</p>',
      };
      render();
    } catch (err) { toast(err.message); }
  };
  on('#admPedidos', 'click', abrirPedidos);
  on('[data-pedido]', 'click', async (e) => {
    const [pid, acao] = e.currentTarget.dataset.pedido.split(':');
    try { await api(`/admin/pedidos/${pid}/${acao}`, { method: 'POST' }); toast(acao === 'aprovar' ? 'Plano ativado e aluno avisado por e-mail.' : 'Pedido recusado.'); await abrirPedidos(); }
    catch (err) { toast(err.message); }
  });
  const abrirDivergencias = async () => {
    try {
      const { divergencias } = await api('/admin/divergencias');
      S.modal = {
        title: `Gabaritos em disputa (${divergencias.length})`,
        html: divergencias.length ? `<p class="hint" style="margin-top:0">Os dois modelos leram respostas diferentes. Essas questões ficam fora do alcance dos alunos até você escolher (ou aplicar o gabarito definitivo da prova).</p>
          <div style="max-height:420px;overflow-y:auto">${divergencias.map((d) => {
            const g = d.divergencia_gabarito || {};
            const opcoes = [...new Set([g.modelo1?.gabarito, g.modelo2?.gabarito].filter(Boolean))];
            return `<div class="card card-pad" style="margin-bottom:10px">
              <div class="hint">${esc(d.prova_titulo || '')} · questão ${d.numero ?? '—'} · ${esc(d.materia || '')}</div>
              <div style="margin:6px 0">${esc(d.enunciado)}</div>
              ${(d.alternativas || []).length ? `<ol type="A" style="margin:0 0 8px 18px">${d.alternativas.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>` : ''}
              <div class="row" style="gap:8px;flex-wrap:wrap">${opcoes.map((l) => `<button class="btn btn-ghost" data-resolver="${d.id}:${l}">Usar ${l}</button>`).join('')}
                <span class="hint">(${esc(g.modelo1?.model || '?')}: ${esc(g.modelo1?.gabarito || '?')} · ${esc(g.modelo2?.model || '?')}: ${esc(g.modelo2?.gabarito || '?')})</span></div>
            </div>`;
          }).join('')}</div>` : '<p class="hint">Nenhuma divergência pendente.</p>',
      };
      render();
    } catch (err) { toast(err.message); }
  };
  on('#admDiverg', 'click', abrirDivergencias);
  on('[data-resolver]', 'click', async (e) => {
    const [qid, letra] = e.currentTarget.dataset.resolver.split(':');
    try { await api(`/admin/questoes/${qid}/gabarito`, { method: 'POST', body: { gabarito: letra } }); toast(`Gabarito ${letra} confirmado.`); await abrirDivergencias(); }
    catch (err) { toast(err.message); }
  });
  on('#admRotular', 'click', async () => { try { const r = await api('/admin/provas/rotular', { method: 'POST' }); toast(r.provas ? `${r.provas} prova(s) na fila para rotular (IAs grátis). Acompanhe em Monitor → Fila de tarefas.` : 'Todas as provas já estão rotuladas.'); } catch (e) { toast(e.message); } });
  on('[data-atab]', 'click', async (e) => { S.adminTab = e.currentTarget.dataset.atab; render(); if (S.adminTab === 'monitor') { try { await loadAdmin(true); } catch (err) { toast(err.message); } render(); } });
  on('[data-pb]', 'click', (e) => { S.provaBanca = e.currentTarget.dataset.pb; render(); });
  on('[data-analisar]', 'click', async (e) => {
    try { const { prova } = await api(`/admin/provas/${e.currentTarget.dataset.analisar}`); S.modal = { title: prova.titulo || prova.fileName, html: reviewHtml(prova) }; render(); }
    catch (err) { toast(err.message); }
  });
  on('[data-aprovar]', 'click', async (e) => {
    const id = e.currentTarget.dataset.aprovar, banca = $('#rvBanca')?.value;
    e.currentTarget.disabled = true;
    try { await api(`/admin/provas/${id}/aprovar`, { method: 'POST', body: { banca } }); S.modal = null; toast('Prova aprovada. O treino começou.'); await loadAdmin(false); }
    catch (err) { toast(err.message); }
    render();
  });
  on('[data-recusar]', 'click', async (e) => {
    const id = e.currentTarget.dataset.recusar, motivo = ($('#rvMotivo')?.value || '').trim();
    if (motivo.length < 3) return toast('Informe o motivo da recusa.');
    try { await api(`/admin/provas/${id}/recusar`, { method: 'POST', body: { motivo } }); S.modal = null; toast('Prova recusada.'); await loadAdmin(false); }
    catch (err) { toast(err.message); }
    render();
  });
  on('[data-reproc]', 'click', async (e) => { try { await api(`/admin/provas/${e.currentTarget.dataset.reproc}/reprocessar`, { method: 'POST' }); await loadAdmin(false); render(); } catch (err) { toast(err.message); } });
  on('[data-delprova]', 'click', (e) => { const id = e.currentTarget.dataset.delprova; confirmBox('Remover esta prova da base?', 'A IA deixa de usar o estilo e as questões dela. O arquivo é apagado.', 'Remover', true, async () => { await api(`/admin/provas/${id}`, { method: 'DELETE' }).catch(() => {}); await loadAdmin(false).catch(() => {}); S.bancas = (await api('/bancas')).bancas; render(); }); });
  on('[data-verq]', 'click', async (e) => {
    const p = (S.adminProvas || []).find((x) => x.id === e.currentTarget.dataset.verq);
    try {
      const { questoes } = await api(`/admin/provas/${p.id}/questoes`);
      S.modal = {
        title: `${questoes.length} questões extraídas · ${p.titulo || p.fileName}`,
        html: questoes.length ? questoes.map((q) => `<div class="qx"><div class="row" style="margin-bottom:6px;gap:6px">
          ${q.numero ? `<span class="q-num">${q.numero}</span>` : ''}
          ${q.materia ? `<span class="badge">${esc(q.materia)}</span>` : ''}
          ${q.gabarito ? `<span class="badge brand">Gabarito: ${esc(q.gabarito)}</span>` : ''}
          ${q.anulada ? '<span class="badge" style="background:var(--bad);color:#fff">ANULADA</span>' : ''}
          ${q.gabarito_alterado ? `<span class="badge" style="background:#eab308;color:#000" title="Original: ${esc(q.gabarito_original || '')}">Alterada (${esc(q.gabarito_original || '')} → ${esc(q.gabarito)})</span>` : ''}
          ${q.gabarito_definitivo ? '<span class="badge brand" style="font-size:11px">✔ Definitivo</span>' : ''}
          ${q.consenso_gabarito === false ? '<span class="badge" style="background:#ef4444;color:#fff" title="Divergência entre modelos de IA">⚠ Divergência</span>' : ''}
          ${q.flagged ? '<span class="sev high">Descartada pela segurança</span>' : ''}
        </div><div class="ex">${esc(q.enunciado)}${(q.alternativas || []).length ? '\n' + q.alternativas.map((a, j) => `${LETRAS[j]}) ${esc(a)}`).join('\n') : ''}</div></div>`).join('') : '<p>Nenhuma questão extraída.</p>',
      };
      render();
    } catch (err) { toast(err.message); }
  });
  on('#admLote', 'click', () => {
    S.modal = {
      title: 'Importar provas em lote (Fontes oficiais)',
      html: `
        <p class="hint" style="margin-bottom:12px">Cole links diretos de PDFs de provas e gabaritos em sites oficiais (Cebraspe, FGV, FCC, Vunesp, Cesgranrio, gov.br, Diários Oficiais). O servidor baixa com validação SSRF e treina automaticamente.</p>
        <div class="field"><label for="loteBanca">Banca padrão</label>
          <select class="select" id="loteBanca">${S.bancas.map((b) => `<option value="${b.id}" ${b.id === S.provaBanca ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="loteTexto">Links das provas (um por linha)</label>
          <textarea class="textarea" id="loteTexto" rows="6" placeholder="https://conhecimento.fgv.br/sites/default/files/concursos/prova.pdf | https://conhecimento.fgv.br/.../gabarito.pdf\nou apenas uma URL de prova por linha"></textarea>
          <span class="hint">Formato por linha: <code>link_prova.pdf | link_gabarito.pdf</code> ou apenas o link da prova.</span>
        </div>
        <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
          <button class="btn btn-quiet" onclick="S.modal=null;render()">Cancelar</button>
          <button class="btn btn-primary" id="btnExecLote">${ic('download', 'sm')} Iniciar importação</button>
        </div>
        <div id="loteRes" style="margin-top:14px"></div>
      `,
    };
    render();
  });
  on('#btnExecLote', 'click', async () => {
    const banca = $('#loteBanca')?.value;
    const texto = ($('#loteTexto')?.value || '').trim();
    if (!texto) return toast('Cole ao menos um link oficial.');
    const resEl = $('#loteRes');
    if (resEl) resEl.innerHTML = '<div class="row"><span class="spinner sm"></span> <span>Validando os links…</span></div>';
    try {
      const r = await api('/admin/provas/lote', { method: 'POST', body: { banca, texto } });
      toast(`${r.enfileiradas} link(s) na fila de importação${r.erros ? `, ${r.erros} recusado(s)` : ''}. As provas aparecem na lista conforme forem baixadas.`);
      await loadAdmin(false);
      S.modal = {
        title: 'Resultado da importação em lote',
        html: `
          <div class="banner ${r.erros ? 'warn' : 'info'}">${ic(r.erros ? 'alert' : 'check', 'sm')}<div><b>${r.enfileiradas} link(s) na fila</b> · ${r.erros} recusado(s) na validação. O download e o treino acontecem em segundo plano; acompanhe na lista de provas.</div></div>
          <div style="max-height:300px;overflow-y:auto;margin-top:12px">
            <table class="tbl"><thead><tr><th>Item</th><th>Status</th><th>Detalhes</th></tr></thead><tbody>${r.resultados.map((x) => `<tr><td>${x.item}</td><td><span class="badge ${x.status === 'na_fila' ? 'brand' : 'sev high'}">${esc(x.status)}</span></td><td class="hint">${esc(x.titulo || x.erro || x.mensagem || x.url)}</td></tr>`).join('')}</tbody></table>
          </div>
          <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-primary" onclick="S.modal=null;render()">Fechar</button></div>
        `,
      };
      render();
    } catch (err) {
      if (resEl) resEl.innerHTML = `<div class="hint" style="color:var(--bad)">${esc(err.message)}</div>`;
    }
  });
  on('[data-gabdef]', 'click', (e) => {
    const p = (S.adminProvas || []).find((x) => x.id === e.currentTarget.dataset.gabdef);
    if (!p) return;
    S.modal = {
      title: `Gabarito definitivo · ${p.titulo || p.fileName}`,
      html: `
        <p class="hint" style="margin-bottom:12px">Informe o gabarito oficial definitivo. Questões anuladas serão excluídas dos simulados e gabaritos alterados serão retificados automaticamente.</p>
        <div class="field"><label for="gdUrl">Link oficial do gabarito definitivo (recomendado)</label>
          <input class="input" id="gdUrl" placeholder="https://conhecimento.fgv.br/.../gabarito_definitivo.pdf" value="${esc(p.gabaritoDefinitivoUrl || '')}">
          <span class="hint">Baixa direto da fonte oficial com selo confirmado.</span>
        </div>
        <div class="field"><label for="gdTexto">Ou cole o texto do gabarito definitivo</label>
          <textarea class="textarea" id="gdTexto" rows="5" placeholder="1 - A\n2 - ANULADA\n3 - ALTERADA PARA C\n4 - D"></textarea>
        </div>
        <div class="field"><label for="gdArquivo">Ou anexe o arquivo (PDF/TXT)</label>
          <input class="input" type="file" id="gdArquivo" accept=".pdf,.txt,.docx,.doc">
        </div>
        <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
          <button class="btn btn-quiet" onclick="S.modal=null;render()">Cancelar</button>
          <button class="btn btn-primary" id="btnAplicarGab" data-pid="${p.id}">${ic('check', 'sm')} Aplicar gabarito definitivo</button>
        </div>
        <div id="gdStatus" style="margin-top:12px"></div>
      `,
    };
    render();
  });
  // Gabarito definitivo em 2 passos: prévia (nada é gravado) → o admin confere → confirma e grava
  const enviarGabarito = async ({ pid, url, text, file }, confirmar) => {
    if (file) {
      const fd = new FormData();
      fd.append('gabarito', file);
      if (url) fd.append('url', url);
      if (text) fd.append('text', text);
      fd.append('confirmar', confirmar ? 'true' : 'false');
      return api(`/admin/provas/${pid}/gabarito-definitivo`, { method: 'POST', form: fd });
    }
    return api(`/admin/provas/${pid}/gabarito-definitivo`, { method: 'POST', body: { url, text, confirmar } });
  };
  const STATUS_GAB = { anulada: ['sev high', 'Anulada'], alterada: ['brand', 'Alterada pela banca'], corrigida: ['accent', 'Extração corrigida'], confirmada: ['', 'Confirmada'] };
  on('#btnAplicarGab', 'click', async (e) => {
    const pid = e.currentTarget.dataset.pid;
    const url = ($('#gdUrl')?.value || '').trim();
    const text = ($('#gdTexto')?.value || '').trim();
    const file = $('#gdArquivo')?.files?.[0];
    if (!url && !text && !file) return toast('Informe o link oficial, cole o texto ou selecione um arquivo.');
    const stEl = $('#gdStatus');
    if (stEl) stEl.innerHTML = '<div class="row"><span class="spinner sm"></span> <span>Lendo o gabarito e montando a prévia…</span></div>';
    try {
      const r = await enviarGabarito({ pid, url, text, file }, false);
      S.gdPendente = { pid, url, text, file };
      const mudancas = (r.resumo.detalhes || []).filter((d) => d.status !== 'confirmada');
      S.modal = {
        title: 'Prévia do gabarito definitivo — confira antes de gravar',
        html: `
          <div class="banner ${mudancas.length ? 'warn' : 'info'}">${ic(mudancas.length ? 'alert' : 'check', 'sm')}<div>
            <b>${r.resumo.atualizadas} de ${r.resumo.totalQuestoesProva} questões encontradas</b> · ${r.resumo.anuladas} anulada(s) · ${r.resumo.alteradas} alterada(s) pela banca · ${r.resumo.corrigidas || 0} correção(ões) da extração${r.resumo.semCorrespondencia ? ` · ${r.resumo.semCorrespondencia} número(s) sem questão correspondente` : ''}${r.resumo.fonteOficial ? ' · <b>✔ baixado da fonte oficial</b>' : ''}
          </div></div>
          <div style="max-height:280px;overflow-y:auto;margin-top:12px">
            ${mudancas.length ? `<table class="tbl"><thead><tr><th>Questão</th><th>O que muda</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${mudancas.map((d) => `<tr><td>${d.numero}</td><td><span class="badge ${STATUS_GAB[d.status]?.[0] || ''}">${STATUS_GAB[d.status]?.[1] || esc(d.status)}</span></td><td>${esc(d.antes || '—')}</td><td>${d.status === 'anulada' ? 'anulada' : esc(d.gabarito || '—')}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Todas as respostas conferem com o que já está na base.</p>'}
          </div>
          <div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px">
            <button class="btn btn-quiet" onclick="S.modal=null;S.gdPendente=null;render()">Cancelar</button>
            <button class="btn btn-primary" id="btnConfirmarGab">${ic('check', 'sm')} Confirmar e gravar</button>
          </div>
          <div id="gdStatus" style="margin-top:12px"></div>`,
      };
      render();
    } catch (err) {
      if (stEl) stEl.innerHTML = `<div class="hint" style="color:var(--bad)">${esc(err.message)}</div>`;
    }
  });
  on('#btnConfirmarGab', 'click', async () => {
    const pend = S.gdPendente;
    if (!pend) return;
    const stEl = $('#gdStatus');
    if (stEl) stEl.innerHTML = '<div class="row"><span class="spinner sm"></span> <span>Gravando…</span></div>';
    try {
      const r = await enviarGabarito(pend, true);
      S.gdPendente = null; S.modal = null;
      toast(`Gabarito definitivo gravado: ${r.resumo.anuladas} anulada(s), ${r.resumo.alteradas} alterada(s), ${r.resumo.corrigidas || 0} corrigida(s).`);
      await loadAdmin(false);
      render();
    } catch (err) {
      if (stEl) stEl.innerHTML = `<div class="hint" style="color:var(--bad)">${esc(err.message)}</div>`;
    }
  });
  schedulePoll();
}

export { viewProvas, reviewHtml, pollT, schedulePoll, loadAdmin, ligarAdmin };
