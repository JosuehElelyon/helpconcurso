// Front do HelpConcurso — Minha conta.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { $, API, API_ORIGEM, api, esc, on, renderAvatar, toast } from './util.js';

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

function viewConta() {
  const c = S.conta;
  if (!c) return '<div class="progress-box"><div class="spinner"></div><div class="hint">Carregando sua conta…</div></div>';
  const p = c.perfil, pl = c.plano, uso = c.uso;
  const faltam = diasAte(p.dataProva);
  const uso1 = (rotulo, usado, limite) => limite === null || limite === undefined
    ? `<div class="use-row"><div class="use-head"><span>${rotulo}</span><b>${usado} · sem limite</b></div></div>`
    : `<div class="use-row"><div class="use-head"><span>${rotulo}</span><b>${usado} de ${limite}</b></div><div class="use-track ${usado >= limite ? 'full' : ''}"><i style="width:${Math.min(100, Math.round((usado / Math.max(1, limite)) * 100))}%"></i></div></div>`;
  const bancas = S.bancas || [];
  return `<div class="profile-hero card">
      <div class="avatar-wrap">
        ${renderAvatar(p, 'xl')}
        <button type="button" class="avatar-edit-btn" id="openAvatarModal" title="Alterar foto de perfil" aria-label="Alterar foto de perfil">${ic('camera', 'sm')}</button>
      </div>
      <div class="ph-main">
        <div class="eyebrow">Minha conta</div>
        <h1 class="page-title" style="margin:2px 0">${esc(p.name)}</h1>
        <div class="hint">${esc(p.email)} · membro desde ${p.membroDesde ? new Date(p.membroDesde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'}</div>
        <div class="row" style="margin-top:8px;gap:8px">
          <button type="button" class="btn btn-ghost btn-xs" id="openAvatarModal2">${ic('camera', 'sm')} Alterar foto de perfil</button>
          ${p.avatarUrl ? `<button type="button" class="link-btn danger-soft" id="btnRemoverAvatar" style="font-size:12px">Remover foto</button>` : ''}
        </div>
      </div>
      <div class="ph-side">
        <span class="plan-pill p-${esc(pl.id)}">${ic('crown', 'sm')} Plano ${esc(pl.nome)}</span>
        ${faltam !== null ? `<div class="countdown ${faltam < 0 ? 'past' : ''}">${ic('calendar', 'sm')} ${faltam > 1 ? `Faltam <b>${faltam}</b> dias para a prova` : faltam === 1 ? 'A prova é <b>amanhã</b>' : faltam === 0 ? 'A prova é <b>hoje</b>. Boa prova!' : 'Data da prova já passou'}</div>` : ''}
      </div>
    </div>
    <div class="account-grid">
      <form class="card card-pad" id="contaForm" novalidate>
        <h3 class="card-title">${ic('user', 'sm')} Dados pessoais</h3>
        <div class="field"><label for="cNome">Nome</label><input class="input" id="cNome" maxlength="80" autocomplete="name" value="${esc(p.name)}" required></div>
        <div class="field"><label for="cEmail">E-mail</label><input class="input" id="cEmail" value="${esc(p.email)}" disabled><span class="hint">Para trocar o e-mail, fale com o suporte.</span></div>
        <div class="form-2">
          <div class="field"><label for="cTel">Telefone <span class="hint">(opcional)</span></label><input class="input" id="cTel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="(61) 99999-0000" value="${esc(p.telefone)}"></div>
          <div class="field"><label for="cMeta">Meta diária de questões</label><input class="input" id="cMeta" type="number" min="0" max="500" inputmode="numeric" placeholder="Ex.: 30" value="${p.metaDiaria ?? ''}"></div>
        </div>
        <div class="field"><label for="cAlvo">Concurso que você está mirando</label><input class="input" id="cAlvo" maxlength="120" placeholder="Ex.: TRF-1 · Técnico Judiciário" value="${esc(p.concursoAlvo)}"></div>
        <div class="form-2">
          <div class="field"><label for="cBanca">Banca preferida</label><select class="select" id="cBanca"><option value="">Nenhuma</option>${bancas.map((b) => `<option value="${b.id}" ${p.bancaPreferida === b.id ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></div>
          <div class="field"><label for="cData">Data da prova</label><input class="input" id="cData" type="date" value="${esc(p.dataProva)}"></div>
        </div>
        <button class="btn btn-primary" type="submit" ${S.contaBusy ? 'disabled' : ''}>${S.contaBusy ? '<span class="spinner sm"></span>' : ic('check', 'sm')} Salvar alterações</button>
      </form>
      <div class="stack">
        <div class="card card-pad plan-card-mini p-${esc(pl.id)}">
          <h3 class="card-title">${ic('crown', 'sm')} Seu plano: ${esc(pl.nome)}</h3>
          ${pl.ate ? `<div class="hint" style="margin:-6px 0 12px">Válido até ${new Date(pl.ate).toLocaleDateString('pt-BR')}</div>` : ''}
          ${uso1('Simulados hoje', uso.simuladosHoje, pl.limites.simuladosDia)}
          ${uso1('Difícil/Misto hoje', uso.dificeisHoje, pl.limites.dificeisDia)}
          ${uso1('Editais', uso.editais, pl.limites.editais)}
          ${uso1('Cadernos', uso.cadernos, pl.limites.cadernos)}
          ${uso.creditosExtras ? `<div class="hint" style="margin-top:8px">+ ${uso.creditosExtras} geração(ões) extra(s) por estrelas e provas aprovadas</div>` : ''}
          ${c.pedidoPendente ? `<div class="banner warn" style="margin:14px 0 0">${ic('info', 'sm')}<div>Pedido do plano <b>${esc(c.pedidoPendente.planoNome)}</b> (${esc(c.pedidoPendente.periodicidade)}, ${brl(c.pedidoPendente.valor)}) aguardando confirmação. ${c.pedidoPendente.pixCopiaCola ? `<button type="button" class="btn btn-sm btn-primary" id="btnVerPixPendente" style="margin-left:8px">Pagar com Pix</button>` : ''} <button type="button" class="link-btn" id="cancelPedido">Cancelar pedido</button></div></div>`
            : pl.id !== 'aprovacao' && pl.id !== 'admin' ? `<button class="btn btn-accent btn-block" data-go="planos" style="margin-top:14px">${ic('crown', 'sm')} Ver planos e ampliar</button>` : ''}
        </div>
        <form class="card card-pad" id="senhaForm" novalidate>
          <h3 class="card-title">${ic('lock', 'sm')} Segurança</h3>
          <div class="field"><label for="sAtual">Senha atual</label><input class="input" id="sAtual" type="password" autocomplete="current-password" required></div>
          <div class="field"><label for="sNova">Nova senha</label><input class="input" id="sNova" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres" required></div>
          <button class="btn btn-ghost" type="submit">${ic('lock', 'sm')} Trocar senha</button>
        </form>
        <div class="card card-pad">
          <h3 class="card-title">${ic('shield', 'sm')} Seus dados (LGPD)</h3>
          <p class="hint" style="margin-top:0">Baixe uma cópia de tudo o que guardamos sobre você ou exclua sua conta de vez.</p>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost" id="btnExportarDados">${ic('download', 'sm')} Baixar meus dados</button>
            <button type="button" class="btn btn-ghost" data-open-termos>${ic('shield', 'sm')} Termos e privacidade</button>
            ${S.user?.role === 'ADMIN' ? '' : `<button type="button" class="btn btn-ghost danger-soft" id="btnExcluirConta">Excluir minha conta</button>`}
          </div>
        </div>
        <button class="btn btn-ghost btn-block danger-soft" data-logout>${ic('logout', 'sm')} Sair da conta</button>
      </div>
    </div>`;
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
  const sf = $('#senhaForm');
  if (sf) sf.onsubmit = async (ev) => {
    ev.preventDefault();
    const senhaAtual = $('#sAtual').value, novaSenha = $('#sNova').value;
    if (novaSenha.length < 8) return toast('A nova senha precisa ter ao menos 8 caracteres.');
    try { await api('/me/conta/senha', { method: 'POST', body: { senhaAtual, novaSenha } }); toast('Senha alterada.'); $('#sAtual').value = ''; $('#sNova').value = ''; }
    catch (e) { toast(e.message); }
  };
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
