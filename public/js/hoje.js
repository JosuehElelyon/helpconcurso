// Front do HelpConcurso — Hoje: meta diária, sequência de dias, revisões e tópicos fracos.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { cadernoCardHtml } from './cadernos.js';
import { viewHomeEditalCard } from './edital.js';
import { BANCA, S, isAdmin } from './estado.js';
import { donutSvg } from './gerar.js';
import { ic } from './icones.js';
import { placar, stats } from './inicio.js';
import { render } from './render.js';
import { api, esc, firstName, fmtDate } from './util.js';

// ---------- Hoje: meta diária, sequência de dias, revisões e tópicos fracos ----------
async function loadHoje() {
  try { S.hoje = await api('/me/hoje'); } catch { /* opcional */ }
  if (S.view === 'home') render();
}
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
function tarefasDeHoje() {
  const out = [];
  for (const c of S.cadernos || []) {
    if (c.revisaoHojeCount > 0) out.push(`<button class="hoje-task" data-hoje-revisar="${c.id}"><span class="ht-ic">🔔</span><span class="ht-main"><b>${c.revisaoHojeCount} revis${c.revisaoHojeCount === 1 ? 'ão' : 'ões'}</b> em ${esc(c.titulo)}<span class="hint">Questões que você errou voltam no dia certo para fixar</span></span>${ic('arrowR', 'sm')}</button>`);
  }
  const ed = S.activeEdital;
  if (ed?.disciplinas) {
    const tops = ed.disciplinas.flatMap((d) => (d.topicos || []).map((t) => ({ ...t, materia: d.materia })));
    const fracos = tops.filter((t) => t.status === 'praticado' && t.taxaAcerto != null && t.taxaAcerto < 70).sort((a, b) => a.taxaAcerto - b.taxaAcerto);
    const cai = tops.filter((t) => t.status === 'pendente' && t.incidenciaBanca === 'alta');
    const acao = (t) => (t.questoesNaBanca ? `data-treinar-reais="${t.id}"` : `data-train-topic="${esc(t.materia)}||${esc(t.nome)}"`);
    for (const t of fracos.slice(0, 3)) out.push(`<button class="hoje-task" ${acao(t)}><span class="ht-ic">🎯</span><span class="ht-main"><b>Reforçar:</b> ${esc(t.nome)}<span class="hint">${esc(t.materia)} · ${t.taxaAcerto}% de acerto${t.questoesNaBanca ? ' · treinar com questões reais (grátis)' : ''}</span></span>${ic('arrowR', 'sm')}</button>`);
    for (const t of cai.slice(0, Math.max(0, 2 - fracos.length))) out.push(`<button class="hoje-task" ${acao(t)}><span class="ht-ic">📌</span><span class="ht-main"><b>Começar:</b> ${esc(t.nome)}<span class="hint">${esc(t.materia)} · cai muito nesta banca e você ainda não estudou</span></span>${ic('arrowR', 'sm')}</button>`);
  }
  return out;
}
function viewHoje() {
  const h = S.hoje;
  if (!h) return '';
  const feitas = h.hoje.respondidas, meta = h.meta, pct = meta ? Math.min(100, Math.round((feitas / meta) * 100)) : 0;
  const seq = h.sequencia;
  const titulo = !meta ? 'Defina sua meta diária de questões'
    : h.hoje.metaBatida ? 'Meta de hoje batida! 🎉'
      : feitas ? `Faltam <b>${meta - feitas}</b> questões para sua meta` : `Sua meta de hoje: <b>${meta}</b> questões`;
  const semana = h.semana.map((d) => {
    const wd = new Date(`${d.dia}T12:00:00Z`).getUTCDay(), hojeCls = d.dia === h.dia ? ' today' : '';
    return `<span class="hd-day${d.respondidas ? ' on' : ''}${d.metaBatida ? ' meta' : ''}${hojeCls}" title="${new Date(`${d.dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', timeZone: 'UTC' })}: ${d.respondidas} questão(ões)${d.metaBatida ? ' · meta batida' : ''}"><i>${d.metaBatida ? '★' : d.respondidas ? '✓' : ''}</i><small>${DIAS_SEMANA[wd]}</small></span>`;
  }).join('');
  const tarefas = tarefasDeHoje();
  const prova = h.diasParaProva != null && h.diasParaProva >= 0
    ? `<div class="hoje-prova">${ic('calendar', 'sm')} ${h.diasParaProva === 0 ? '<b>A prova é hoje.</b> Boa prova!' : h.diasParaProva === 1 ? 'A prova é <b>amanhã</b>' : `Faltam <b>${h.diasParaProva}</b> dias para a prova`}</div>` : '';
  return `<section class="card hoje-card" aria-label="Seu dia de estudo">
    <div class="hoje-top">
      <div class="hoje-meta">
        ${meta ? donutSvg(pct, 84, h.hoje.metaBatida ? 'var(--accent)' : 'var(--brand)') : `<span class="li-icon" style="background:var(--brand);width:56px;height:56px">${ic('target')}</span>`}
        <div style="min-width:0">
          <div class="eyebrow" style="color:var(--brand)">Hoje</div>
          <div class="hoje-title">${titulo}</div>
          <div class="hint">${meta ? `${feitas} de ${meta} respondidas hoje${h.hoje.respondidas ? ` · ${h.hoje.acertos} acerto(s)` : ''}` : 'Com uma meta, você acompanha seu ritmo e mantém a sequência.'}</div>
          ${!meta ? '<button class="btn btn-primary btn-sm" data-go="conta" style="margin-top:8px">Definir minha meta</button>' : ''}
        </div>
      </div>
      <div class="hoje-streak">
        <div class="hs-fire ${seq.atual ? 'on' : ''}"><span>🔥</span><b>${seq.atual}</b></div>
        <div><b>${!seq.atual ? 'Comece sua sequência' : seq.atual === 1 ? '1 dia seguido' : `${seq.atual} dias seguidos`}</b><div class="hint">${!seq.atual ? (seq.recorde ? `Seu recorde: ${seq.recorde} dia(s). Responda 1 questão hoje` : 'Responda 1 questão por dia para acender o fogo') : !h.hoje.respondidas ? 'Responda 1 questão hoje para não perder a sequência' : `Recorde: ${seq.recorde} dia(s)`}</div></div>
        <div class="hd-week" aria-label="Últimos 7 dias">${semana}</div>
      </div>
    </div>
    ${prova}
    <div class="hoje-tasks">
      <div class="hint" style="font-weight:700;margin-bottom:6px">Para fazer hoje</div>
      ${tarefas.length ? tarefas.join('') : `<button class="hoje-task" data-go="gerar"><span class="ht-ic">✨</span><span class="ht-main"><b>Gerar um simulado</b> a partir do seu material<span class="hint">Nada pendente: avance em um tópico novo</span></span>${ic('arrowR', 'sm')}</button>`}
    </div>
  </section>`;
}

// Novidade: foto de perfil — aparece para todos (aluno e admin) até escolher uma foto ou dispensar
const avisoAvatarKey = () => `hc_aviso_avatar_${S.user?.id}`;
function avisoAvatarHtml() {
  if (!S.user || S.user.avatarUrl) return '';
  try { if (localStorage.getItem(avisoAvatarKey())) return ''; } catch { /* modo privado */ }
  return `<div class="card card-pad row avatar-news" style="justify-content:space-between;margin-bottom:18px">
    <div style="display:flex;gap:14px;align-items:center;min-width:0">
      <div class="avatar-news-pics" aria-hidden="true"><img src="/avatars/avatar-6.svg" alt=""><img src="/avatars/avatar-7.svg" alt=""><img src="/avatars/avatar-10.svg" alt=""></div>
      <div style="min-width:0"><div class="row" style="gap:6px"><span class="badge accent">Novidade</span><b>Coloque sua foto de perfil</b></div>
        <div class="hint">Envie uma foto sua ou escolha um dos 10 avatares de concurseiro.</div></div>
    </div>
    <div class="row" style="gap:8px"><button class="btn btn-primary btn-sm" data-aviso-avatar="abrir">${ic('camera', 'sm')} Escolher foto</button><button class="btn btn-quiet btn-sm" data-aviso-avatar="fechar">Agora não</button></div>
  </div>`;
}

function viewHome() {
  const st = stats(), h = new Date().getHours();
  return `<h1 class="page-title">${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(firstName(S.user.name))}</h1>
  <p class="page-sub">O que vamos estudar hoje?</p>
  ${avisoAvatarHtml()}
  ${viewHoje()}
  <div class="hero">
    <div class="hero-main">
      <div class="eyebrow">Gerador de questões</div>
      <h2>Envie seu resumo e receba questões no estilo da banca.</h2>
      <p>Identificamos a matéria do arquivo e criamos questões inéditas com gabarito comentado.</p>
      <button class="btn btn-primary" data-go="gerar">${ic('upload', 'sm')} Enviar material</button>
      <div class="hero-steps"><span>1 · Upload</span><span>2 · Matéria</span><span>3 · Banca</span><span>4 · Questões</span></div>
    </div>
    <div class="stats">
      <div class="card stat"><div class="v">${st.qs}</div><div class="l">Questões geradas</div></div>
      <div class="card stat"><div class="v">${st.taxa}</div><div class="l">Taxa de acerto</div></div>
      <div class="card stat"><div class="v">${st.feitos}</div><div class="l">Simulados concluídos</div></div>
      <div class="card stat"><div class="v">${st.provas}</div><div class="l">Provas na base da IA</div></div>
    </div>
  </div>
  <div class="section-h"><h3>Meu edital</h3><button class="btn btn-quiet" data-go="edital">${S.activeEdital ? 'Ver painel completo' : 'Enviar edital'} ${ic('arrowR', 'sm')}</button></div>
  ${S.activeEdital ? viewHomeEditalCard(S.activeEdital) : `<div class="card card-pad row" style="justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;gap:14px;align-items:center"><span class="li-icon" style="background:var(--brand);width:44px;height:44px">${ic('target')}</span>
      <div><div style="font-weight:800">Cruze seus estudos com o edital da sua prova</div><div class="hint">Envie o edital do seu concurso para ver quais tópicos cada resumo cobre, sua % de avanço e o vínculo de cada questão com o edital.</div></div></div>
    <button class="btn btn-ghost" data-go="edital">${ic('upload', 'sm')} Enviar meu edital</button></div>`}
  <div class="section-h"><h3>Meus Cadernos de Questões</h3><button class="btn btn-quiet" data-go="questoes">${S.cadernos.length ? 'Ver todos os cadernos' : 'Criar meu 1º caderno'} ${ic('arrowR', 'sm')}</button></div>
  ${S.cadernos.length ? `<div class="cad-grid" style="margin-bottom:8px">${S.cadernos.slice(0, 3).map(cadernoCardHtml).join('')}</div>` : `<div class="card card-pad row" style="justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;gap:14px;align-items:center"><span class="li-icon" style="background:var(--brand);width:44px;height:44px">${ic('book')}</span>
      <div><div style="font-weight:800">Crie um Caderno de Questões por banca, concurso ou edital</div><div class="hint">Alimente seu caderno continuamente com seus próprios conteúdos e com provas antigas da banca e revise todo o seu histórico de questões em um só lugar.</div></div></div>
    <button class="btn btn-primary" data-new-caderno-home="1">${ic('book', 'sm')} Criar caderno de questões</button></div>`}
  <div class="section-h"><h3>Bancas</h3><button class="btn btn-quiet" data-go="${isAdmin() ? 'provas' : 'contribuir'}">${isAdmin() ? 'Base de provas' : 'Enviar provas'} ${ic('arrowR', 'sm')}</button></div>
  <div class="banca-strip">${S.bancas.map((b) => `<button class="banca-tile" style="--c:${b.cor}" data-bancatile="${b.id}"><div class="bn">${b.nome}</div><div class="bf">${b.formato === 'ce' ? 'Certo ou Errado' : 'Múltipla escolha'}</div><div class="bc">${b.provasTreinadas} prova(s) treinada(s)</div></button>`).join('')}</div>
  <div class="section-h"><h3>Simulados recentes</h3>${S.sets.length ? `<button class="btn btn-quiet" data-go="questoes">Ver todos ${ic('arrowR', 'sm')}</button>` : ''}</div>
  <div class="card">${!S.loaded ? '<div class="empty"><span class="spinner sm"></span></div>' : S.sets.length ? `<div class="list">${S.sets.slice(0, 5).map(setRow).join('')}</div>` : `<div class="empty">${ic('clip')}<div>Nenhum simulado ainda.</div><div class="hint">Envie seu primeiro material para começar.</div></div>`}</div>`;
}
function setRow(s) {
  const b = BANCA()[s.banca] || { cor: '#999', nome: '?' };
  const { n, resp, ac } = placar(s);
  return `<button class="list-item" data-open="${s.id}"><span class="li-icon" style="background:${b.cor}">${esc(b.nome.slice(0, 4))}</span>
    <span class="li-main"><div class="li-title">${esc(s.materia)}${s.assunto ? ` · ${esc(s.assunto)}` : ''}</div><div class="li-meta">${n} questões · ${esc(s.arquivo || 'texto colado')} · ${fmtDate(s.createdAt)}</div></span>
    ${s.finalizado ? `<span class="badge brand">${ac}/${n} acertos</span>` : resp ? `<span class="badge accent">${resp}/${n} respondidas</span>` : '<span class="badge">Novo</span>'}
  </button>`;
}

export { loadHoje, DIAS_SEMANA, tarefasDeHoje, viewHoje, avisoAvatarKey, avisoAvatarHtml, viewHome, setRow };
