// Front do HelpConcurso — Minha conta.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { ContaPainel, modalCartaoRecorrenteHtml, modalRedefinirSenhaHtml } from './components/ContaPainel.js';
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { $, API, API_ORIGEM, api, esc, on, toast } from './util.js';

// ---------- Minha conta ----------
async function loadConta() {
  try {
    S.conta = await api('/me/conta');
    if (S.user) Object.assign(S.user, { name: S.conta.perfil.name, avatarUrl: S.conta.perfil.avatarUrl, plano: { id: S.conta.plano.id, nome: S.conta.plano.nome } });
  } catch (e) { toast(e.message); }
  if (['conta', 'planos'].includes(S.view)) render();
}
async function loadPlanos() {
  try { S.planosData = await api('/me/planos'); } catch (e) { toast(e.message); }
  await loadConta();
}
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const diasAte = (iso) => { if (!iso) return null; const d = Math.ceil((new Date(iso + 'T12:00:00') - new Date()) / 86400000); return d; };

async function showAvatarModal() {
  if (!S.avatarPresets) {
    try { const r = await api('/me/avatar/presets'); S.avatarPresets = r.presets; }
    catch { S.avatarPresets = []; }
  }
  const p = S.conta?.perfil || S.user || {};
  const curUrl = p.avatarUrl || '';
  const presetsHtml = (S.avatarPresets || []).map((av) => {
    const isCurrent = curUrl === av.url || curUrl.includes(av.id);
    return `<div class="avatar-preset-item ${isCurrent ? 'on' : ''}" data-choose-preset="${esc(av.id)}" title="${esc(av.nome)}">
      <img src="${esc(av.url)}" alt="${esc(av.nome)}" loading="lazy">
      <div class="av-name">${esc(av.nome)}</div>
      <div class="av-cat">${esc(av.categoria)}</div>
    </div>`;
  }).join('');

  S.modal = {
    title: 'Foto de perfil',
    html: `<div class="stack" style="gap:16px">
      <div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">1. Enviar sua própria foto</div>
        <div class="hint" style="margin-bottom:10px">Envie uma foto do seu computador ou celular (PNG, JPEG, WebP ou GIF até 4 MB).</div>
        <div class="avatar-upload-drop" id="avatarDropZone">
          <input type="file" id="avatarInput" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none">
          <div style="margin-bottom:8px">${ic('upload')}</div>
          <button type="button" class="btn btn-primary btn-sm" id="btnSelectAvatarFile">${ic('upload', 'sm')} Escolher arquivo</button>
          <div class="hint" style="margin-top:6px" id="avatarUploadStatus">Ou arraste e solte uma imagem aqui</div>
        </div>
      </div>
      <div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">2. Ou escolha um avatar temático</div>
        <div class="hint" style="margin-bottom:6px">Avatares exclusivos para o seu perfil de concurseiro:</div>
        <div class="avatar-presets-grid">${presetsHtml}</div>
      </div>
      <div class="row" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:12px">
        ${curUrl ? `<button type="button" class="btn btn-ghost danger-soft btn-sm" id="btnModalRemoveAvatar">${ic('trash', 'sm')} Remover foto (usar iniciais)</button>` : '<div></div>'}
        <button type="button" class="btn btn-quiet btn-sm" data-mclose2>Fechar</button>
      </div>
    </div>`,
  };
  render();
}

function detectarBandeira(num) {
  const d = String(num || '').replace(/\D/g, '');
  if (!d) return 'outro';
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2(22[1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(d)) return 'mastercard';
  if (/^(34|37)/.test(d)) return 'amex';
  if (/^(606282|3841)/.test(d)) return 'hipercard';
  if (/^(4011|4312|4389|4514|4573|5041|5066|5067|509|6277|6362|6363|650|651|655)/.test(d)) return 'elo';
  return 'outro';
}

function validarLuhn(num) {
  const d = String(num || '').replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    alt = !alt;
  }
  return soma % 10 === 0;
}

const BRAND_LABEL = { visa: 'VISA', mastercard: 'MASTERCARD', elo: 'ELO', amex: 'AMEX', hipercard: 'HIPERCARD', outro: 'CARTÃO' };

let mpSdkPromise = null;
function carregarSdkMercadoPago() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (mpSdkPromise) return mpSdkPromise;
  mpSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.async = true;
    s.onload = () => (window.MercadoPago ? resolve(window.MercadoPago) : reject(new Error('SDK não carregado')));
    s.onerror = () => reject(new Error('Falha ao carregar MercadoPago.js'));
    document.head.appendChild(s);
  });
  return mpSdkPromise;
}

function viewConta() {
  const c = S.conta;
  if (!c) return '<div class="progress-box"><div class="spinner"></div><div class="hint">Carregando sua conta…</div></div>';
  return ContaPainel({
    conta: c,
    bancas: S.bancas || [],
    userRole: S.user?.role || 'USER',
    busy: !!S.contaBusy,
    faltamDias: diasAte(c.perfil?.dataProva),
    brlFn: brl,
  });
}

function ligarPreviewCartao() {
  const ccNum = $('#ccNum');
  const ccNome = $('#ccNome');
  const ccVal = $('#ccVal');
  const ccCpf = $('#ccCpf');
  const ccCvv = $('#ccCvv');

  const syncPreview = () => {
    const dig = (ccNum?.value || '').replace(/\D/g, '');
    const brand = detectarBandeira(dig);
    const brandEl = $('#ccPreviewBrand');
    if (brandEl) brandEl.textContent = BRAND_LABEL[brand] || 'CARTÃO';

    const numEl = $('#ccPreviewNum');
    if (numEl) {
      const padded = (dig + '••••••••••••••••').slice(0, 16);
      numEl.textContent = `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
    }
    const nameEl = $('#ccPreviewName');
    if (nameEl) nameEl.textContent = (ccNome?.value.trim() || 'NOME NO CARTÃO').toUpperCase().slice(0, 26);

    const expEl = $('#ccPreviewExp');
    if (expEl) expEl.textContent = ccVal?.value.trim() || 'MM/AA';
  };

  if (ccNum) {
    ccNum.oninput = () => {
      const d = ccNum.value.replace(/\D/g, '').slice(0, 16);
      ccNum.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
      syncPreview();
    };
  }
  if (ccNome) ccNome.oninput = syncPreview;
  if (ccVal) {
    ccVal.oninput = () => {
      const d = ccVal.value.replace(/\D/g, '').slice(0, 4);
      ccVal.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
      syncPreview();
    };
  }
  if (ccCvv) {
    ccCvv.oninput = () => { ccCvv.value = ccCvv.value.replace(/\D/g, '').slice(0, 4); };
  }
  if (ccCpf) {
    ccCpf.oninput = () => {
      const d = ccCpf.value.replace(/\D/g, '').slice(0, 11);
      ccCpf.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    };
  }
  syncPreview();
}

/** Eventos da tela (conta); chamada pela bindApp em eventos.js a cada desenho. */
function ligarConta() {
  const cf = $('#contaForm');
  if (cf) cf.onsubmit = async (ev) => {
    ev.preventDefault();
    const body = { name: $('#cNome').value.trim(), telefone: $('#cTel').value.trim(), concursoAlvo: $('#cAlvo').value.trim(), bancaPreferida: $('#cBanca').value, dataProva: $('#cData').value, metaDiaria: $('#cMeta').value ? Number($('#cMeta').value) : null };
    S.contaBusy = true; render();
    try { S.conta = await api('/me/conta', { method: 'PATCH', body }); Object.assign(S.user, { name: S.conta.perfil.name }); toast('Dados salvos.'); }
    catch (e) { toast(e.message); }
    S.contaBusy = false; render();
  };

  on('#btnAbrirModalSenha', 'click', () => {
    S.modal = { title: 'Redefinir senha', html: modalRedefinirSenhaHtml() };
    render();
    setTimeout(() => $('#sAtual')?.focus(), 40);
  });

  const sf = $('#senhaFormModal');
  if (sf) sf.onsubmit = async (ev) => {
    ev.preventDefault();
    const senhaAtual = $('#sAtual').value;
    const novaSenha = $('#sNova').value;
    const confirma = $('#sConfirma').value;
    if (!senhaAtual) return toast('Informe sua senha atual.');
    if (novaSenha.length < 8) return toast('A nova senha precisa ter ao menos 8 caracteres.');
    if (novaSenha !== confirma) return toast('A confirmação da nova senha não confere.');
    try {
      await api('/me/conta/senha', { method: 'POST', body: { senhaAtual, novaSenha } });
      S.modal = null;
      toast('Senha redefinida com sucesso!');
      render();
    } catch (e) { toast(e.message); }
  };

  const abrirModalCartao = () => {
    S.modal = {
      title: 'Adicionar cartão para cobrança recorrente',
      html: modalCartaoRecorrenteHtml(S.conta?.perfil?.name || S.user?.name || ''),
    };
    render();
    setTimeout(() => $('#ccNum')?.focus(), 40);
  };
  on('#btnAbrirModalCartao', 'click', abrirModalCartao);
  on('#btnAbrirModalCartaoEmpty', 'click', abrirModalCartao);

  const cardForm = $('#cartaoFormModal');
  if (cardForm) {
    ligarPreviewCartao();
    cardForm.onsubmit = async (ev) => {
      ev.preventDefault();
      const digits = ($('#ccNum')?.value || '').replace(/\D/g, '');
      const holderName = ($('#ccNome')?.value || '').trim();
      const valStr = ($('#ccVal')?.value || '').trim();
      const cvv = ($('#ccCvv')?.value || '').replace(/\D/g, '');
      const cpf = ($('#ccCpf')?.value || '').replace(/\D/g, '');
      const recorrenteAtivo = !!$('#ccRecorrente')?.checked;

      if (!validarLuhn(digits)) return toast('Número de cartão inválido. Confira os dígitos.');
      if (holderName.length < 3) return toast('Informe o nome impresso no cartão.');
      const mVal = valStr.match(/^(\d{2})\/(\d{2})$/);
      if (!mVal) return toast('Informe a validade no formato MM/AA.');
      const expMonth = Number(mVal[1]);
      const expYear = 2000 + Number(mVal[2]);
      if (expMonth < 1 || expMonth > 12) return toast('Mês de validade inválido.');
      if (cvv.length < 3 || cvv.length > 4) return toast('Informe um código CVV válido.');
      if (cpf && cpf.length !== 11) return toast('CPF inválido. Preencha os 11 dígitos ou deixe em branco.');

      const btn = $('#btnSalvarCartaoModal');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span> Validando…'; }

      const brand = detectarBandeira(digits);
      const last4 = digits.slice(-4);
      const docLast4 = cpf ? cpf.slice(-4) : null;
      let cardToken = null;

      try {
        const pubKey = S.conta?.cobrancaConfig?.mercadoPagoPublicKey;
        if (pubKey) {
          const MP = await carregarSdkMercadoPago();
          const mp = new MP(pubKey, { locale: 'pt-BR' });
          const tk = await mp.createCardToken({
            cardNumber: digits,
            cardholderName: holderName,
            cardExpirationMonth: String(expMonth).padStart(2, '0'),
            cardExpirationYear: String(expYear),
            securityCode: cvv,
            identificationType: cpf ? 'CPF' : undefined,
            identificationNumber: cpf || undefined,
          });
          cardToken = tk?.id || null;
        }

        const res = await api('/me/conta/cartoes', {
          method: 'POST',
          body: { brand, last4, expMonth, expYear, holderName, docLast4, cardToken, recorrenteAtivo },
        });
        if (res.conta) S.conta = res.conta;
        S.modal = null;
        toast('Cartão salvo para cobrança recorrente!');
        render();
      } catch (e) {
        toast(e.message || 'Não foi possível salvar o cartão.');
        if (btn) { btn.disabled = false; btn.innerHTML = `${ic('check', 'sm')} Salvar cartão`; }
      }
    };
  }

  on('[data-toggle-rec]', 'click', async (e) => {
    const id = e.currentTarget.dataset.toggleRec;
    const next = e.currentTarget.dataset.recNext === '1';
    try {
      const res = await api(`/me/conta/cartoes/${encodeURIComponent(id)}`, { method: 'PATCH', body: { recorrenteAtivo: next } });
      if (res.conta) S.conta = res.conta;
      toast(next ? 'Cobrança recorrente reativada.' : 'Cobrança recorrente pausada para este cartão.');
      render();
    } catch (err) { toast(err.message); }
  });

  on('[data-default-card]', 'click', async (e) => {
    const id = e.currentTarget.dataset.defaultCard;
    try {
      const res = await api(`/me/conta/cartoes/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isDefault: true } });
      if (res.conta) S.conta = res.conta;
      toast('Cartão definido como principal.');
      render();
    } catch (err) { toast(err.message); }
  });

  on('[data-del-card]', 'click', async (e) => {
    const id = e.currentTarget.dataset.delCard;
    try {
      const res = await api(`/me/conta/cartoes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.conta) S.conta = res.conta;
      toast('Cartão removido da sua conta.');
      render();
    } catch (err) { toast(err.message); }
  });

  on('#btnExportarDados', 'click', async () => {
    try {
      const r = await fetch(API + '/me/exportar', { credentials: API_ORIGEM ? 'include' : 'same-origin' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível gerar o arquivo.');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `helpconcurso-meus-dados-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { toast(e.message); }
  });
  on('#btnExcluirConta', 'click', () => {
    S.modal = {
      title: 'Excluir minha conta',
      html: `<p>Isto apaga de vez sua conta, materiais, editais, simulados, cadernos e histórico. <b>Não tem volta.</b> Provas que você enviou continuam na base compartilhada, sem o seu nome.</p>
        <p class="hint">Se quiser guardar uma cópia, use antes "Baixar meus dados".</p>
        <div class="field"><label for="exSenha">Sua senha</label><input class="input" id="exSenha" type="password" autocomplete="current-password"></div>
        <div class="field"><label for="exConf">Digite EXCLUIR para confirmar</label><input class="input" id="exConf" autocomplete="off"></div>
        <div class="row" style="justify-content:flex-end;gap:8px"><button type="button" class="btn btn-ghost" data-mclose2>Cancelar</button><button type="button" class="btn btn-primary danger-soft" id="exConfirmar">Excluir definitivamente</button></div>`,
    };
    render();
  });
}

let timerPix = null;

function pararPollingPix() {
  if (timerPix) { clearInterval(timerPix); timerPix = null; }
}

function exibirModalPix(ped) {
  pararPollingPix();
  const nomePlano = ped.planoNome || ped.plano;
  S.modal = {
    title: `Pagamento Pix · Plano ${esc(nomePlano)}`,
    html: `
      <div style="text-align:center;padding:4px 0">
        <p style="margin:0 0 10px;font-size:14px;color:var(--ink-2)">
          Pague <b>${brl(ped.valor)}</b> com a chave ou QR Code Pix abaixo.<br>
          <span style="font-size:12px;color:var(--muted)">Liberação imediata assim que o banco confirmar.</span>
        </p>

        ${ped.pixQrCodeBase64 ? `
          <div style="margin:14px auto;max-width:210px;padding:12px;background:#fff;border-radius:12px;border:1px solid var(--line-2);box-shadow:0 4px 12px rgba(0,0,0,.06)">
            <img src="data:image/png;base64,${ped.pixQrCodeBase64}" alt="QR Code Pix" style="width:100%;height:auto;display:block">
          </div>
        ` : ''}

        ${ped.pixCopiaCola ? `
          <div style="margin:14px 0;text-align:left">
            <label style="font-size:11.5px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px">PIX COPIA E COLA</label>
            <div style="display:flex;gap:8px">
              <input class="input" id="pixCodeInput" type="text" readonly value="${esc(ped.pixCopiaCola)}" style="font-size:11.5px;font-family:monospace;background:var(--surface-2)">
              <button class="btn btn-secondary" id="btnCopiarPix" type="button" style="white-space:nowrap">${ic('copy', 'sm')} Copiar</button>
            </div>
          </div>
        ` : ''}

        <div class="banner info" style="margin-top:14px;text-align:left;display:flex;align-items:center;gap:10px">
          <div class="spinner" style="width:18px;height:18px;border-width:2px;flex:none"></div>
          <div style="font-size:12px">Aguardando confirmação do Pix em tempo real... O seu plano é liberado automaticamente!</div>
        </div>

        <div class="row" style="justify-content:space-between;align-items:center;margin-top:16px">
          <button type="button" class="btn btn-ghost" id="btnFecharModalPix">Fechar</button>
          <button type="button" class="link-btn danger" id="cancelPedidoPix" style="font-size:12px">Cancelar pedido</button>
        </div>
      </div>
    `,
  };
  render();

  // Polling a cada 3.5 segundos para detectar confirmação do webhook
  timerPix = setInterval(async () => {
    try {
      const res = await api('/me/conta/upgrade');
      if (!res.pedido || res.pedido.status === 'aprovado') {
        pararPollingPix();
        toast('🎉 Pagamento aprovado! Seu plano já está ativo.');
        try {
          const { user } = await api('/auth/me');
          if (user) S.user = user;
          await loadConta();
        } catch {}
        S.modal = null;
        render();
      } else if (res.pedido.status === 'cancelado') {
        pararPollingPix();
        S.modal = null;
        toast('Pedido cancelado.');
        render();
      }
    } catch {}
  }, 3500);
}

/** Eventos da tela (planos+conta); chamada pela bindApp em eventos.js a cada desenho. */
function ligarContaEPlanos() {
  on('#confirmUpgrade', 'click', async (e) => {
    const plano = e.currentTarget.dataset.plano;
    try {
      const r = await api('/me/conta/upgrade', { method: 'POST', body: { plano, periodicidade: S.planoPeriodo } });
      S.conta = r.conta;
      if (r.pedido && (r.pedido.pixCopiaCola || r.pedido.pixQrCodeBase64)) {
        exibirModalPix(r.pedido);
        return;
      }
      S.modal = null;
      toast('Pedido enviado! Você vai receber as instruções de pagamento por e-mail.');
      render();
    } catch (err) { toast(err.message); }
  });
  on('#btnVerPixPendente', 'click', () => {
    if (S.conta?.pedidoPendente) exibirModalPix(S.conta.pedidoPendente);
  });
  on('#btnCopiarPix', 'click', () => {
    const input = document.getElementById('pixCodeInput');
    if (input) {
      input.select();
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(input.value);
      const btn = document.getElementById('btnCopiarPix');
      if (btn) btn.innerHTML = `${ic('check', 'sm')} Copiado!`;
      toast('Código Pix copiado!');
    }
  });
  on('#btnFecharModalPix', 'click', () => {
    pararPollingPix();
    S.modal = null;
    render();
  });
  on('#cancelPedidoPix', 'click', async () => {
    pararPollingPix();
    try {
      S.conta = await api('/me/conta/upgrade', { method: 'DELETE' });
      toast('Pedido cancelado.');
    } catch (err) { toast(err.message); }
    S.modal = null;
    render();
  });
  on('#cancelPedido', 'click', async () => {
    pararPollingPix();
    try { S.conta = await api('/me/conta/upgrade', { method: 'DELETE' }); toast('Pedido cancelado.'); } catch (err) { toast(err.message); }
    render();
  });
}

export { loadConta, loadPlanos, brl, diasAte, showAvatarModal, viewConta, ligarConta, ligarContaEPlanos, exibirModalPix };
