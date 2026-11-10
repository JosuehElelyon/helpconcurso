// Front do HelpConcurso — Planos.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { brl } from './conta.js';
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { esc, on } from './util.js';

// ---------- Planos ----------
function viewPlanos() {
  const d = S.planosData;
  if (!d) return '<div class="progress-box"><div class="spinner"></div><div class="hint">Carregando planos…</div></div>';
  const anual = S.planoPeriodo === 'anual';
  const ordem = d.planos.map((p) => p.id);
  const atual = d.atual;
  const pend = S.conta?.pedidoPendente;
  const lim = (v, un) => (v === null ? 'Ilimitado' : `${v}${un ? ' ' + un : ''}`);
  const preco = (p) => {
    if (!p.precoMensal) return '<div class="price"><span class="cur">R$</span><b>0</b><span class="per">para sempre</span></div>';
    if (!anual) return `<div class="price"><span class="cur">R$</span><b>${p.precoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b><span class="per">/mês</span></div>`;
    return `<div class="price"><span class="cur">R$</span><b>${(p.precoAnual / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b><span class="per">/mês</span></div><div class="price-note">${brl(p.precoAnual)} por ano · economize ${brl(p.precoMensal * 12 - p.precoAnual)}</div>`;
  };
  const cta = (p) => {
    if (atual === 'admin') return '<button class="btn btn-ghost btn-block" disabled>Acesso de administrador</button>';
    if (p.id === atual) return '<button class="btn btn-ghost btn-block" disabled>' + ic('check', 'sm') + ' Seu plano atual</button>';
    if (ordem.indexOf(p.id) < ordem.indexOf(atual)) return '<button class="btn btn-ghost btn-block" disabled>Incluído no seu plano</button>';
    if (pend && pend.plano === p.id) return `<button class="btn btn-ghost btn-block" disabled>Pedido enviado · aguardando pagamento</button><button type="button" class="link-btn" id="cancelPedido" style="margin-top:8px">Cancelar pedido</button>`;
    return `<button class="btn ${p.destaque ? 'btn-accent' : 'btn-primary'} btn-block" data-upgrade="${p.id}">Quero o ${esc(p.nome)}</button>`;
  };
  return `<div class="planos-head">
      <div class="eyebrow">Planos</div>
      <h1 class="page-title">Escolha o ritmo da sua aprovação</h1>
      <p class="page-sub">Todos os planos têm questões no estilo da banca, gabarito comentado com o trecho do seu material, questões reais por tópico do edital e revisão espaçada dos erros.</p>
      <div class="seg period" role="tablist" aria-label="Período"><button type="button" class="${!anual ? 'on' : ''}" data-periodo="mensal">Mensal</button><button type="button" class="${anual ? 'on' : ''}" data-periodo="anual">Anual <span class="save">2 meses grátis</span></button></div>
    </div>
    <div class="plan-grid">${d.planos.map((p) => `<article class="plan ${p.destaque ? 'featured' : ''} ${p.id === atual ? 'current' : ''}">
        ${p.destaque ? '<div class="ribbon">Mais escolhido</div>' : ''}
        <h3>${esc(p.nome)}</h3>
        <p class="plan-sub">${esc(p.resumo)}</p>
        ${preco(p)}
        ${cta(p)}
        <ul class="benefits">${p.beneficios.map((b) => `<li>${ic('check', 'sm')}<span>${esc(b)}</span></li>`).join('')}</ul>
      </article>`).join('')}</div>
    <div class="card card-pad compare">
      <h3 class="card-title">Compare os limites</h3>
      <table class="tbl cmp"><thead><tr><th></th>${d.planos.map((p) => `<th>${esc(p.nome)}</th>`).join('')}</tr></thead><tbody>
        <tr><td>Simulados por dia</td>${d.planos.map((p) => `<td>${lim(p.limites.simuladosDia)}</td>`).join('')}</tr>
        <tr><td>Simulados Difícil/Misto por dia</td>${d.planos.map((p) => `<td>${lim(p.limites.dificeisDia)}</td>`).join('')}</tr>
        <tr><td>Editais acompanhados</td>${d.planos.map((p) => `<td>${lim(p.limites.editais)}</td>`).join('')}</tr>
        <tr><td>Cadernos de questões</td>${d.planos.map((p) => `<td>${lim(p.limites.cadernos)}</td>`).join('')}</tr>
        <tr><td>Questões reais por tópico · revisão espaçada</td>${d.planos.map(() => `<td class="yes">${ic('check', 'sm')}</td>`).join('')}</tr>
      </tbody></table>
    </div>
    <div class="faq">
      <details class="card card-pad"><summary>Como funciona o pagamento?</summary><p>Ao pedir o plano, nossa equipe recebe o pedido e envia as instruções de pagamento para o seu e-mail. O plano é ativado assim que o pagamento é confirmado, e você recebe um aviso. O pagamento direto no app (Pix e cartão) chega em breve.</p></details>
      <details class="card card-pad"><summary>A assinatura renova sozinha?</summary><p>Não. O plano vale até o fim do período pago (1 mês ou 1 ano). Depois, se você não renovar, a conta volta para o plano Grátis sem perder nada do que já criou.</p></details>
      <details class="card card-pad"><summary>Ganho gerações extras sem pagar?</summary><p>Sim. Cada prova que você envia e é aprovada na base, e as estrelas que você acumula, viram simulados extras em qualquer plano.</p></details>
    </div>`;
}

/** Eventos da tela (planos); chamada pela bindApp em eventos.js a cada desenho. */
function ligarPlanos() {
  on('[data-periodo]', 'click', (e) => { S.planoPeriodo = e.currentTarget.dataset.periodo; render(); });
  on('[data-upgrade]', 'click', (e) => {
    const p = S.planosData.planos.find((x) => x.id === e.currentTarget.dataset.upgrade);
    const anual = S.planoPeriodo === 'anual';
    S.modal = {
      title: `Plano ${p.nome} · ${anual ? 'anual' : 'mensal'}`,
      html: `<p style="margin-top:0">Valor: <b>${brl(anual ? p.precoAnual : p.precoMensal)}</b> ${anual ? 'por ano' : 'por mês'}.</p>
        <div class="banner info">${ic('info', 'sm')}<div>Ao confirmar, nossa equipe recebe o seu pedido e envia as instruções de pagamento para <b>${esc(S.user.email)}</b>. O plano é ativado assim que o pagamento for confirmado.</div></div>
        <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-ghost" data-mclose2>Voltar</button><button class="btn btn-primary" id="confirmUpgrade" data-plano="${p.id}">${ic('check', 'sm')} Confirmar pedido</button></div>`,
    };
    render();
  });
}

export { viewPlanos, ligarPlanos };
