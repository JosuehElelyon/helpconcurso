// Front do HelpConcurso — Base de provas (admin).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { PENDING_ST, SEV_LABEL, fonteBadge, stBadge } from './enviar-provas.js';
import { BANCA, S } from './estado.js';
import { refreshStars } from './estrelas.js';
import { avisoAvatarHtml } from './hoje.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { API, api, esc, fmtDate } from './util.js';

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
        ${m.ia.limiteDia ? `<span class="${m.ia.limiteDia.atingido ? 'sev high' : 'badge'}" style="font-size:13px" title="AI_LIMITE_USD_DIA no .env (dia de Brasília)">Hoje: US$ ${Number(m.ia.limiteDia.gastoHojeUsd || 0).toFixed(4)}${m.ia.limiteDia.usd ? ` de US$ ${Number(m.ia.limiteDia.usd).toFixed(2)}${m.ia.limiteDia.atingido ? ' — limite atingido, IA pausada até amanhã' : ''}` : ' (sem limite diário)'}</span>` : ''}
      </div>
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

export { viewProvas, reviewHtml, pollT, schedulePoll, loadAdmin };
