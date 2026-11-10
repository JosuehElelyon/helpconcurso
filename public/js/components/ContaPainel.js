// Componente UI puro: Painel moderno de Minha Conta (Perfil, Gamificação, Dados, Cobrança Recorrente e Modais).
import { PATENTES_UI } from './GamificacaoBanner.js';
import { ic } from '../icones.js';
import { esc, renderAvatar } from '../util.js';

const BRAND_UI = {
  visa: { nome: 'VISA', bg: 'linear-gradient(135deg, #1A1F71 0%, #2B3990 100%)' },
  mastercard: { nome: 'Mastercard', bg: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)' },
  elo: { nome: 'Elo', bg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' },
  amex: { nome: 'Amex', bg: 'linear-gradient(135deg, #0E7490 0%, #155E75 100%)' },
  hipercard: { nome: 'Hipercard', bg: 'linear-gradient(135deg, #991B1B 0%, #B91C1C 100%)' },
  outro: { nome: 'Cartão', bg: 'linear-gradient(135deg, #14202E 0%, #1E3A34 100%)' },
};

function formatarUso(rotulo, usado, limite) {
  if (limite === null || limite === undefined) {
    return `<div class="use-row"><div class="use-head"><span>${esc(rotulo)}</span><b>${usado} · sem limite</b></div></div>`;
  }
  const pct = Math.min(100, Math.round((usado / Math.max(1, limite)) * 100));
  return `<div class="use-row">
    <div class="use-head"><span>${esc(rotulo)}</span><b>${usado} de ${limite}</b></div>
    <div class="use-track ${usado >= limite ? 'full' : ''}"><i style="width:${pct}%"></i></div>
  </div>`;
}

function renderCardCartao(card) {
  const b = BRAND_UI[card.brand] || BRAND_UI.outro;
  const mm = String(card.expMonth || 1).padStart(2, '0');
  const yy = String(card.expYear || '').slice(-2);
  return `<div class="cc-item">
    <div class="cc-item-left">
      <div class="cc-brand-badge" style="background:${b.bg}">${esc(b.nome)}</div>
      <div class="cc-item-info">
        <div class="cc-item-num">
          •••• ${esc(card.last4)}
          ${card.isDefault ? '<span class="badge brand" style="font-size:10.5px;padding:1px 7px">Principal</span>' : ''}
        </div>
        <div class="cc-item-meta">${esc(card.holderName)} · Val. ${mm}/${yy}</div>
      </div>
    </div>
    <div class="cc-item-actions">
      <button type="button" class="cc-rec-pill ${card.recorrenteAtivo ? 'on' : ''}" data-toggle-rec="${esc(card.id)}" data-rec-next="${card.recorrenteAtivo ? '0' : '1'}" title="${card.recorrenteAtivo ? 'Pausar cobrança recorrente' : 'Ativar cobrança recorrente'}">
        <span class="cc-rec-dot"></span>
        ${card.recorrenteAtivo ? 'Recorrente ativo' : 'Recorrência pausada'}
      </button>
      ${!card.isDefault ? `<button type="button" class="btn btn-quiet btn-xs" data-default-card="${esc(card.id)}">Principal</button>` : ''}
      <button type="button" class="btn btn-quiet btn-xs danger-soft" data-del-card="${esc(card.id)}" title="Remover cartão" aria-label="Remover cartão final ${esc(card.last4)}">${ic('trash', 'sm')}</button>
    </div>
  </div>`;
}

export function ContaPainel({
  conta,
  bancas = [],
  userRole = 'USER',
  busy = false,
  faltamDias = null,
  brlFn = (v) => String(v),
}) {
  const p = conta.perfil;
  const pl = conta.plano;
  const uso = conta.uso;
  const g = conta.gamificacao || {};
  const cartoes = Array.isArray(conta.cartoes) ? conta.cartoes : [];
  const pat = PATENTES_UI[g.nivelId] || PATENTES_UI.desbravador;
  const prox = g.proximoNivelId ? PATENTES_UI[g.proximoNivelId] : null;
  const membroTxt = p.membroDesde
    ? new Date(p.membroDesde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—';

  return `
    <!-- 1. Hero Moderno do Perfil -->
    <section class="acc-hero card" aria-label="Resumo do perfil">
      <div class="acc-hero-left">
        <div class="avatar-wrap">
          ${renderAvatar(p, 'xl')}
          <button type="button" class="avatar-edit-btn" id="openAvatarModal" title="Alterar foto de perfil" aria-label="Alterar foto de perfil">${ic('camera', 'sm')}</button>
        </div>
        <div class="acc-identity">
          <div class="eyebrow">Minha conta</div>
          <h1 class="acc-name">${esc(p.name)}</h1>
          <div class="acc-sub">${esc(p.email)} · membro desde ${membroTxt}</div>
          <div class="row" style="margin-top:10px;gap:8px">
            <button type="button" class="btn btn-ghost btn-xs" id="openAvatarModal2">${ic('camera', 'sm')} Alterar foto de perfil</button>
            ${p.avatarUrl ? '<button type="button" class="link-btn danger-soft" id="btnRemoverAvatar" style="font-size:12px">Remover foto</button>' : ''}
          </div>
        </div>
      </div>

      <div class="acc-hero-right">
        <span class="plan-pill p-${esc(pl.id)}">${ic('crown', 'sm')} Plano ${esc(pl.nome)}</span>
        ${faltamDias !== null
          ? `<div class="countdown ${faltamDias < 0 ? 'past' : ''}">${ic('calendar', 'sm')} ${
            faltamDias > 1
              ? `Faltam <b>${faltamDias}</b> dias para a prova`
              : faltamDias === 1
                ? 'A prova é <b>amanhã</b>'
                : faltamDias === 0
                  ? 'A prova é <b>hoje</b>. Boa prova!'
                  : 'Data da prova já passou'
          }</div>`
          : `<button type="button" class="btn btn-quiet btn-xs" data-go="metas">${ic('target', 'sm')} Definir meta & prova</button>`}
      </div>
    </section>

    <!-- 2. Faixa Completa de Gamificação Integrada -->
    <section class="acc-gamif-card" aria-label="Sua evolução e gamificação">
      <div class="acc-gamif-left">
        <div class="metas-patente-medal" style="--p-cor:${pat.cor}">${pat.icone}</div>
        <div style="flex:1;min-width:0">
          <div class="acc-gamif-title-row">
            <span class="acc-gamif-patente">Patente: ${esc(pat.nome)}</span>
            <span class="badge brand">${(g.xp || 0).toLocaleString('pt-BR')} XP</span>
            <span class="badge accent">${esc(g.nivelComunitarioIcone || '☆')} ${esc(g.nivelComunitario || 'Iniciante')}</span>
          </div>
          <div class="metas-xp-track">
            <div class="metas-xp-fill" style="width:${Math.max(3, g.progressoNivelPct || 0)}%"></div>
          </div>
          <div class="hint" style="font-size:12px">
            ${prox
              ? `Faltam <b>${(g.xpParaProximo || 0).toLocaleString('pt-BR')} XP</b> para alcançar ${prox.icone} <b>${esc(prox.nome)}</b>`
              : 'Patente máxima alcançada! Continue no ritmo rumo à aprovação.'}
          </div>
        </div>
      </div>

      <div class="acc-gamif-metrics">
        <button type="button" class="acc-metric-tile" data-go="estrelas" title="Abrir Minhas estrelas">
          <b>⭐ ${g.estrelasTotal || 0}</b>
          <span>Estrelas (${g.estrelasSaldo || 0} disp.)</span>
        </button>
        <button type="button" class="acc-metric-tile" data-go="metas" title="Abrir Minhas metas">
          <b>🔥 ${g.sequenciaAtual || 0}d</b>
          <span>Sequência (rec. ${g.sequenciaRecorde || 0}d)</span>
        </button>
        <button type="button" class="acc-metric-tile" data-go="desempenho" title="Abrir Desempenho & Radar">
          <b>✅ ${g.totalAcertos || 0}</b>
          <span>Acertos (${g.taxaAcertoHistorico || 0}%)</span>
        </button>
        <div class="acc-metric-tile static">
          <b>📅 ${g.diasAtivos || 0}</b>
          <span>Dias ativos</span>
        </div>
      </div>
    </section>

    <!-- 3. Grid Principal Alinhado (2 colunas proporcionadas) -->
    <div class="acc-main-grid">
      <!-- Coluna Esquerda: Dados Pessoais & Objetivo -->
      <form class="card card-pad acc-form-card" id="contaForm" novalidate>
        <div>
          <div class="acc-section-head">
            <h3 class="card-title" style="margin:0">${ic('user', 'sm')} Dados pessoais & Objetivo</h3>
            <span class="hint">Usados no seu plano de estudos</span>
          </div>
          <div class="field"><label for="cNome">Nome completo</label><input class="input" id="cNome" maxlength="80" autocomplete="name" value="${esc(p.name)}" required></div>
          <div class="field"><label for="cEmail">E-mail</label><input class="input" id="cEmail" value="${esc(p.email)}" disabled><span class="hint">Para trocar o e-mail de acesso, fale com o suporte.</span></div>
          <div class="form-2">
            <div class="field"><label for="cTel">Telefone <span class="hint">(opcional)</span></label><input class="input" id="cTel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="(61) 99999-0000" value="${esc(p.telefone)}"></div>
            <div class="field"><label for="cMeta">Meta diária de questões</label><input class="input" id="cMeta" type="number" min="0" max="500" inputmode="numeric" placeholder="Ex.: 30" value="${p.metaDiaria ?? ''}"></div>
          </div>
          <div class="field"><label for="cAlvo">Concurso que você está mirando</label><input class="input" id="cAlvo" maxlength="120" placeholder="Ex.: TRF-1 · Técnico Judiciário" value="${esc(p.concursoAlvo)}"></div>
          <div class="form-2">
            <div class="field"><label for="cBanca">Banca preferida</label><select class="select" id="cBanca"><option value="">Nenhuma</option>${bancas.map((b) => `<option value="${b.id}" ${p.bancaPreferida === b.id ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></div>
            <div class="field"><label for="cData">Data da prova</label><input class="input" id="cData" type="date" value="${esc(p.dataProva)}"></div>
          </div>
        </div>
        <div class="acc-form-foot">
          <button class="btn btn-primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '<span class="spinner sm"></span>' : ic('check', 'sm')} Salvar alterações</button>
        </div>
      </form>

      <!-- Coluna Direita: Plano + Cartão Recorrente + Segurança & LGPD -->
      <div class="acc-right-stack">
        <!-- Assinatura & Cartão Recorrente -->
        <section class="card card-pad plan-card-mini p-${esc(pl.id)} acc-billing-card" aria-label="Plano e cobrança recorrente">
          <div class="acc-section-head">
            <h3 class="card-title" style="margin:0">${ic('crown', 'sm')} Seu plano: ${esc(pl.nome)}</h3>
            ${pl.id !== 'aprovacao' && pl.id !== 'admin'
              ? '<button type="button" class="link-btn" data-go="planos" style="font-size:12.5px">Mudar plano →</button>'
              : ''}
          </div>
          ${pl.ate ? `<div class="hint" style="margin:-6px 0 8px">Válido até ${new Date(pl.ate).toLocaleDateString('pt-BR')}</div>` : ''}

          <div class="acc-usage-list">
            ${formatarUso('Simulados hoje', uso.simuladosHoje, pl.limites.simuladosDia)}
            ${formatarUso('Difícil/Misto hoje', uso.dificeisHoje, pl.limites.dificeisDia)}
            ${formatarUso('Editais acompanhados', uso.editais, pl.limites.editais)}
            ${formatarUso('Cadernos de questões', uso.cadernos, pl.limites.cadernos)}
          </div>

          ${uso.creditosExtras ? `<div class="hint" style="margin-top:4px">+ <b>${uso.creditosExtras}</b> geração(ões) extra(s) por estrelas e provas aprovadas</div>` : ''}

          ${conta.pedidoPendente ? `<div class="banner warn" style="margin:12px 0 0">${ic('info', 'sm')}<div>Pedido do plano <b>${esc(conta.pedidoPendente.planoNome)}</b> (${esc(conta.pedidoPendente.periodicidade)}, ${brlFn(conta.pedidoPendente.valor)}) aguardando confirmação. ${conta.pedidoPendente.pixCopiaCola ? '<button type="button" class="btn btn-sm btn-primary" id="btnVerPixPendente" style="margin-left:8px">Pagar com Pix</button>' : ''} <button type="button" class="link-btn" id="cancelPedido">Cancelar pedido</button></div></div>`
            : pl.id !== 'aprovacao' && pl.id !== 'admin' ? `<button type="button" class="btn btn-accent btn-block" data-go="planos" style="margin-top:10px">${ic('crown', 'sm')} Ver planos e ampliar</button>` : ''}

          <!-- Subseção Cartão Recorrente -->
          <div class="acc-cards-divider"></div>
          <div class="acc-cards-head">
            <div style="display:flex;align-items:center;gap:8px;min-width:0">
              <span class="acc-mini-ico">${ic('creditCard', 'sm')}</span>
              <div style="min-width:0">
                <div style="font-weight:800;font-size:13.5px;color:var(--ink)">Cartão para cobrança recorrente</div>
                <div class="hint" style="font-size:11.5px">Renovação automática sem perder acesso.</div>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-xs" id="btnAbrirModalCartao" style="white-space:nowrap;flex:none">
              ${cartoes.length ? '+ Novo cartão' : '+ Adicionar'}
            </button>
          </div>

          ${cartoes.length
            ? `<div class="cc-list">${cartoes.map(renderCardCartao).join('')}</div>`
            : `<button type="button" class="cc-empty-cta" id="btnAbrirModalCartaoEmpty">
                <div class="cc-empty-brands">
                  <span>VISA</span><span>Mastercard</span><span>Elo</span><span>Amex</span>
                </div>
                <div class="cc-empty-txt"><b>Nenhum cartão cadastrado</b> · Clique para adicionar com segurança</div>
              </button>`}
        </section>

        <!-- Segurança & Privacidade (LGPD) — compacto com Modal de Senha -->
        <section class="card card-pad acc-security-card" aria-label="Segurança e privacidade">
          <div class="acc-section-head">
            <h3 class="card-title" style="margin:0">${ic('shield', 'sm')} Segurança & Privacidade</h3>
          </div>

          <div class="acc-action-row">
            <div class="acc-action-info">
              <span class="acc-action-ico">${ic('key', 'sm')}</span>
              <div>
                <div class="acc-action-title">Senha de acesso</div>
                <div class="hint" style="font-size:12px">Troque sua senha em uma janela segura sem sair da conta.</div>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="btnAbrirModalSenha">Redefinir senha</button>
          </div>

          <div class="acc-lgpd-row">
            <div class="hint" style="margin:0 0 8px">Portabilidade e transparência (LGPD): baixe seus dados ou consulte os termos.</div>
            <div class="row" style="gap:6px;flex-wrap:wrap">
              <button type="button" class="btn btn-quiet btn-xs" id="btnExportarDados">${ic('download', 'sm')} Baixar dados</button>
              <button type="button" class="btn btn-quiet btn-xs" data-open-termos>${ic('shield', 'sm')} Termos</button>
              ${userRole === 'ADMIN' ? '' : '<button type="button" class="btn btn-quiet btn-xs danger-soft" id="btnExcluirConta">Excluir conta</button>'}
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function modalRedefinirSenhaHtml() {
  return `<form id="senhaFormModal" class="stack" style="gap:12px" novalidate>
    <p class="hint" style="margin:0">Por segurança, confirmar sua senha atual encerra outras sessões abertas em outros aparelhos.</p>
    <div class="field"><label for="sAtual">Senha atual</label><input class="input" id="sAtual" type="password" autocomplete="current-password" required></div>
    <div class="field"><label for="sNova">Nova senha</label><input class="input" id="sNova" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres" required></div>
    <div class="field"><label for="sConfirma">Confirmar nova senha</label><input class="input" id="sConfirma" type="password" autocomplete="new-password" minlength="8" placeholder="Repita a nova senha" required></div>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:4px">
      <button type="button" class="btn btn-ghost" data-mclose2>Cancelar</button>
      <button type="submit" class="btn btn-primary" id="btnSalvarSenhaModal">${ic('check', 'sm')} Salvar nova senha</button>
    </div>
  </form>`;
}

export function modalCartaoRecorrenteHtml(nomePadrao = '') {
  return `<form id="cartaoFormModal" class="stack" style="gap:12px" novalidate>
    <!-- Cartão Virtual em Tempo Real -->
    <div class="cc-preview">
      <div class="cc-preview-top">
        <span class="cc-chip"></span>
        <span class="cc-preview-brand" id="ccPreviewBrand">CARTÃO</span>
      </div>
      <div class="cc-preview-num" id="ccPreviewNum">•••• •••• •••• ••••</div>
      <div class="cc-preview-foot">
        <div>
          <div class="cc-lbl">TITULAR</div>
          <div class="cc-val" id="ccPreviewName">${esc((nomePadrao || 'NOME NO CARTÃO').toUpperCase().slice(0, 26))}</div>
        </div>
        <div>
          <div class="cc-lbl">VALIDADE</div>
          <div class="cc-val" id="ccPreviewExp">MM/AA</div>
        </div>
      </div>
    </div>

    <div class="field">
      <label for="ccNum">Número do cartão</label>
      <input class="input" id="ccNum" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="0000 0000 0000 0000" required>
    </div>
    <div class="field">
      <label for="ccNome">Nome impresso no cartão</label>
      <input class="input" id="ccNome" autocomplete="cc-name" maxlength="90" placeholder="Como aparece no cartão" value="${esc(nomePadrao)}" required>
    </div>
    <div class="form-2">
      <div class="field">
        <label for="ccVal">Validade (MM/AA)</label>
        <input class="input" id="ccVal" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/AA" required>
      </div>
      <div class="field">
        <label for="ccCvv">CVV</label>
        <input class="input" id="ccCvv" type="password" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="3 ou 4 dígitos" required>
      </div>
    </div>
    <div class="field">
      <label for="ccCpf">CPF do titular <span class="hint">(opcional, usado na tokenização)</span></label>
      <input class="input" id="ccCpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00">
    </div>

    <label class="cc-check-row">
      <input type="checkbox" id="ccRecorrente" checked>
      <span>Ativar <b>cobrança recorrente automática</b> na renovação da assinatura</span>
    </label>

    <div class="banner info" style="margin:2px 0;font-size:12px">
      ${ic('shield', 'sm')}
      <div>Tokenização segura: o número completo e o CVV nunca são gravados nos servidores do HelpConcurso.</div>
    </div>

    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:4px">
      <button type="button" class="btn btn-ghost" data-mclose2>Cancelar</button>
      <button type="submit" class="btn btn-primary" id="btnSalvarCartaoModal">${ic('check', 'sm')} Salvar cartão</button>
    </div>
  </form>`;
}
