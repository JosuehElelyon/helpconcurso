// Componente UI puro: Painel Gamificado de Estrelas, Níveis e Troca por Gerações.
import { ic } from '../icones.js';
import { esc, fmtDate } from '../util.js';

const KIND_ICON = {
  prova_aprovada: 'upload',
  erro_confirmado: 'flag',
  avaliacao: 'thumbUp',
  troca: 'spark',
};

function starMedallionSvg() {
  return `<svg viewBox="0 0 40 40" class="stars-medallion-svg" aria-hidden="true">
    <defs>
      <linearGradient id="hcStarGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE68A"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
    </defs>
    <path d="M20 4.5l4.6 9.3 10.3 1.5-7.4 7.2 1.8 10.2L20 27.9l-9.3 4.8 1.8-10.2-7.4-7.2 10.3-1.5L20 4.5z" fill="url(#hcStarGold)" stroke="#B45309" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}

export function EstrelasPainel({ stars, kindLabels = {} }) {
  const st = stars;
  const lv = st.level;
  const next = lv.proximo;
  const pctNivel = next
    ? Math.max(0, Math.min(100, Math.round(((st.total - lv.min) / Math.max(1, next.min - lv.min)) * 100)))
    : 100;

  const custoPorGeracao = Math.max(1, st.regras?.porGeracao || 10);
  const canRedeem = Math.floor(st.balance / custoPorGeracao);
  const restoSaldo = st.balance % custoPorGeracao;
  const progressoTrocaPct = canRedeem > 0 ? 100 : Math.round((restoSaldo / custoPorGeracao) * 100);
  const faltamParaTroca = Math.max(0, custoPorGeracao - restoSaldo);

  const history = Array.isArray(st.history) ? st.history : [];

  return `<div class="stars-page-head">
      <div>
        <div class="eyebrow" style="color:var(--brand)">Programa de Contribuição</div>
        <h1 class="page-title">Minhas estrelas</h1>
        <p class="page-sub" style="margin-bottom:0">Ganhe estrelas ajudando a comunidade com provas e revisões, suba de patente e troque por simulados extras.</p>
      </div>
      <button type="button" class="btn btn-primary" data-go="contribuir">${ic('upload', 'sm')} Enviar prova (+${st.regras.provaAprovada} ★)</button>
    </div>

    <div class="stars-layout">
      <!-- Linha 1 · Coluna 1: Jornada de Níveis & XP -->
      <section class="stars-hero-card" aria-label="Seu nível e progresso">
        <div class="stars-hero-top">
          <span class="stars-hero-eyebrow">PATENTE ATUAL</span>
          <div class="stars-hero-pills">
            <span class="stars-stat-pill"><b>${st.total}</b> ★ acumuladas</span>
            <span class="stars-stat-pill accent"><b>+${st.bonusCredits || 0}</b> bônus</span>
          </div>
        </div>

        <div class="stars-level-row">
          <div class="stars-level-emblem" aria-hidden="true">${lv.icone}</div>
          <div class="stars-level-info">
            <h2 class="stars-level-name">${esc(lv.nome)}</h2>
            <p class="stars-level-sub">
              ${next
                ? `Faltam <b>${next.min - st.total} estrela(s)</b> para alcançar <b>${esc(next.nome)}</b>`
                : 'Parabéns! Você atingiu o nível máximo da comunidade.'}
            </p>
          </div>
        </div>

        <div class="stars-xp-wrap">
          <div class="stars-xp-meta">
            <span>Progresso até ${next ? esc(next.nome) : 'o topo'}</span>
            <b>${pctNivel}% · ${st.total}${next ? ` / ${next.min}` : ''} ★</b>
          </div>
          <div class="stars-xp-bar" role="progressbar" aria-valuenow="${pctNivel}" aria-valuemin="0" aria-valuemax="100">
            <i style="width:${Math.max(4, pctNivel)}%"></i>
          </div>
        </div>

        <div class="stars-levels-track">
          ${(st.levels || []).map((l, idx) => {
            const atingido = st.total >= l.min;
            const atual = lv.indice === idx;
            return `<div class="stars-tier-tile ${atual ? 'current' : atingido ? 'done' : 'locked'}">
              <div class="stars-tier-top">
                <span class="stars-tier-ic" aria-hidden="true">${l.icone}</span>
                <span class="stars-tier-min">${l.min} ★</span>
              </div>
              <div class="stars-tier-name">${esc(l.nome)}</div>
              <div class="stars-tier-status">${atual ? 'Atual' : atingido ? 'Desbloqueado' : 'Bloqueado'}</div>
            </div>`;
          }).join('')}
        </div>
      </section>

      <!-- Linha 1 · Coluna 2: Cofre de Estrelas & Resgate -->
      <section class="card card-pad stars-vault-card" aria-label="Saldo e troca por gerações">
        <div class="stars-card-head">
          <div>
            <div class="eyebrow">Cofre & Resgate</div>
            <h3 class="stars-sec-title">Saldo para trocar</h3>
          </div>
          <span class="badge ${canRedeem > 0 ? 'brand' : 'accent'}">
            ${canRedeem > 0 ? `${canRedeem} troca(s) pronta(s)` : `${custoPorGeracao} ★ = 1 extra`}
          </span>
        </div>

        <div class="stars-vault-display ${canRedeem > 0 ? 'ready' : ''}">
          <div class="stars-vault-main">
            <div class="stars-medallion">${starMedallionSvg()}</div>
            <div>
              <div class="stars-vault-num">${st.balance}</div>
              <div class="stars-vault-unit">${st.balance === 1 ? 'estrela disponível' : 'estrelas disponíveis'}</div>
            </div>
          </div>
          <div class="stars-vault-progress">
            <div class="stars-vault-prog-txt">
              ${canRedeem > 0
                ? `<span style="color:var(--ok);font-weight:800">✓ Pronto para resgatar até ${canRedeem} geração(ões) extra(s)!</span>`
                : `<span>Faltam <b>${faltamParaTroca} ★</b> para a próxima geração extra (${restoSaldo}/${custoPorGeracao})</span>`}
            </div>
            <div class="stars-vault-bar">
              <i style="width:${Math.max(4, progressoTrocaPct)}%"></i>
            </div>
          </div>
        </div>

        <div class="stars-redeem-box">
          <div class="stars-stepper" aria-label="Quantidade de gerações para trocar">
            <button type="button" class="stars-step-btn" data-star-step="-1" ${canRedeem ? '' : 'disabled'} aria-label="Diminuir quantidade">−</button>
            <input class="stars-step-input" id="redeemN" type="number" min="1" max="${Math.max(1, canRedeem)}" value="${Math.max(1, Math.min(1, canRedeem))}" ${canRedeem ? '' : 'disabled'} aria-label="Quantidade de gerações extras">
            <button type="button" class="stars-step-btn" data-star-step="1" ${canRedeem ? '' : 'disabled'} aria-label="Aumentar quantidade">+</button>
          </div>
          <button type="button" class="btn btn-primary stars-redeem-btn" id="redeem" ${canRedeem ? '' : 'disabled'}>
            ${ic('spark', 'sm')} ${canRedeem ? 'Trocar por geração extra' : `Junte ${custoPorGeracao} ★ para trocar`}
          </button>
        </div>

        <div class="stars-vault-foot">
          <span>Trocar estrelas <b>não diminui</b> seu nível acumulado.</span>
          <span class="stars-roadmap-tag">Em breve: desconto na mensalidade</span>
        </div>
      </section>

      <!-- Linha 2 · Coluna 1: Missões para Ganhar Estrelas -->
      <section class="card card-pad stars-missions-card" aria-label="Como ganhar estrelas">
        <div class="stars-card-head">
          <div>
            <h3 class="stars-sec-title" style="margin:0">Como ganhar mais estrelas</h3>
            <div class="hint" style="margin-top:2px">Complete missões da comunidade para subir de patente mais rápido.</div>
          </div>
        </div>

        <div class="stars-missions-list">
          <div class="stars-mission-item">
            <div class="stars-mission-ico brand">${ic('upload', 'sm')}</div>
            <div class="stars-mission-body">
              <div class="stars-mission-title">Enviar prova oficial na base</div>
              <div class="stars-mission-desc">Provas aprovadas ajudam todos os alunos e treinam a IA na sua banca.</div>
            </div>
            <div class="stars-mission-right">
              <span class="stars-reward-pill top">+${st.regras.provaAprovada} ★</span>
              <button type="button" class="btn btn-quiet btn-xs" data-go="contribuir">Enviar ${ic('arrowR', 'sm')}</button>
            </div>
          </div>

          <div class="stars-mission-item">
            <div class="stars-mission-ico warn">${ic('flag', 'sm')}</div>
            <div class="stars-mission-body">
              <div class="stars-mission-title">Reportar erro confirmado em questão</div>
              <div class="stars-mission-desc">Encontrou falha no enunciado ou gabarito? Reporte para revisão da IA.</div>
            </div>
            <div class="stars-mission-right">
              <span class="stars-reward-pill">+${st.regras.erroConfirmado} ★</span>
            </div>
          </div>

          <div class="stars-mission-item">
            <div class="stars-mission-ico ok">${ic('thumbUp', 'sm')}</div>
            <div class="stars-mission-body">
              <div class="stars-mission-title">Avaliar questões nos simulados</div>
              <div class="stars-mission-desc">Até ${st.regras.avaliacoesPorDia} avaliações premiadas por dia durante sua prática.</div>
            </div>
            <div class="stars-mission-right">
              <span class="stars-reward-pill">+${st.regras.avaliacao} ★</span>
            </div>
          </div>
        </div>

        <div class="stars-card-note">
          Só contam contribuições verificadas: provas recusadas ou duplicadas e reportes não confirmados não geram estrelas.
        </div>
      </section>

      <!-- Linha 2 · Coluna 2: Extrato de Conquistas -->
      <section class="card card-pad stars-ledger-card" aria-label="Extrato de estrelas">
        <div class="stars-card-head">
          <div>
            <h3 class="stars-sec-title" style="margin:0">Extrato de conquistas</h3>
            <div class="hint" style="margin-top:2px">Registro verificado de ganhos e trocas na sua conta.</div>
          </div>
          <span class="badge">${history.length} ${history.length === 1 ? 'registro' : 'registros'}</span>
        </div>

        <div class="stars-ledger-list">
          ${history.length
            ? history.map((h) => {
                const positivo = h.stars > 0;
                const icName = KIND_ICON[h.kind] || 'star';
                return `<div class="stars-ledger-item">
                  <div class="stars-ledger-ico ${positivo ? 'pos' : 'neg'}">${ic(icName, 'sm')}</div>
                  <div class="stars-ledger-main">
                    <div class="stars-ledger-title">${esc(h.note || kindLabels[h.kind] || h.kind)}</div>
                    <div class="stars-ledger-meta">${esc(kindLabels[h.kind] || h.kind)} · ${fmtDate(h.created_at)}</div>
                  </div>
                  <span class="stars-ledger-val ${positivo ? 'pos' : 'neg'}">${positivo ? '+' : ''}${h.stars} ★</span>
                </div>`;
              }).join('')
            : `<div class="pareto-empty" style="margin-top:8px">
                <div class="pareto-empty-ico" aria-hidden="true">☆</div>
                <div class="pareto-empty-title">Nenhuma movimentação ainda</div>
                <div class="pareto-empty-hint">Avalie uma questão após responder ou envie uma prova antiga para ganhar suas primeiras estrelas!</div>
              </div>`}
        </div>
      </section>
    </div>`;
}
