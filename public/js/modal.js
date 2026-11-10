// Front do HelpConcurso — Modal.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { $, api, esc, toast } from './util.js';

// ---------- Modal ----------
function viewModal() {
  const m = S.modal;
  if (m.html) return `<div class="modal-bg" data-mclose><div class="modal wide" role="dialog" aria-modal="true"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h4 style="margin:0">${esc(m.title)}</h4><button class="icon-btn" data-mclose2 aria-label="Fechar">${ic('x', 'sm')}</button></div>${m.html}</div></div>`;
  return `<div class="modal-bg" data-mclose><div class="modal" role="dialog" aria-modal="true"><h4>${esc(m.title)}</h4><p>${esc(m.text)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-mclose2>Cancelar</button><button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" id="mOk">${esc(m.ok)}</button></div></div></div>`;
}
const confirmBox = (title, text, ok, danger, fn) => { S.modal = { title, text, ok, danger, fn }; render(); };

async function abrirModalTermos({ exigirAceite = false } = {}) {
  let t;
  try { t = await api('/termos'); }
  catch { return toast('Não foi possível carregar os termos agora. Tente de novo em instantes.'); }
  const lista = (itens) => `<ul style="padding-left:20px;margin:6px 0">${itens.map((i) => `<li style="margin-bottom:4px">${esc(i)}</li>`).join('')}</ul>`;
  const secao = (sec) => `<h4 style="margin:14px 0 6px;color:var(--brand)">${esc(sec.titulo)}</h4>${(sec.paragrafos || []).map((p) => `<p style="margin:4px 0">${esc(p)}</p>`).join('')}${sec.itens ? lista(sec.itens) : ''}`;
  const operador = (o) => `<div style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:10px 12px">
      <b>${esc(o.fornecedor)}</b> <span class="hint">· ${esc(o.pais || '')}</span>
      ${o.modelos?.length ? `<div class="hint">Modelos: ${esc(o.modelos.join(', '))}</div>` : ''}
      <div class="hint" style="margin-top:2px">${esc(o.recebe || o.dados || '')}${o.finalidade ? ' — ' + esc(o.finalidade) : ''}</div>
      ${o.privacidade ? `<div style="font-size:12px;margin-top:4px">${esc(o.privacidade)}</div>` : ''}
    </div>`;
  const precisaAceitar = S.user && S.user.termosVersao !== t.versao;
  S.modal = {
    title: 'Termos de Uso e Política de Privacidade (LGPD)',
    html: `
      <div style="max-height:65vh;overflow-y:auto;padding-right:8px;font-size:13.5px;line-height:1.6">
        <p class="hint" style="margin-top:0">Versão ${esc(t.versao)} · Controlador: ${esc(t.controlador.nome)} · Encarregado (LGPD): ${esc(t.encarregado.nome)}${t.encarregado.contato ? ` — ${esc(t.encarregado.contato)}` : ''}</p>
        ${t.secoes.map(secao).join('')}
        <h4 style="margin:14px 0 6px;color:var(--brand)">Fornecedores de inteligência artificial</h4>
        <div style="display:flex;flex-direction:column;gap:8px">${t.operadoresIA.map(operador).join('')}</div>
        ${t.operadoresInfra.length ? `<h4 style="margin:14px 0 6px;color:var(--brand)">Outros fornecedores</h4><div style="display:flex;flex-direction:column;gap:8px">${t.operadoresInfra.map(operador).join('')}</div>` : ''}
        <div class="row" style="margin-top:20px;justify-content:flex-end;gap:8px">
          ${precisaAceitar ? `<button type="button" class="btn btn-primary" id="btnAceitarTermos">${exigirAceite ? 'Li e aceito os termos atualizados' : 'Li e aceito'}</button>` : '<button type="button" class="btn btn-primary" data-mclose2>Fechar</button>'}
        </div>
      </div>`,
  };
  render();
}
async function aceitarTermosAgora() {
  try { const r = await api('/me/termos/aceite', { method: 'POST' }); S.user.termosVersao = r.user.termosVersao; S.modal = null; toast('Aceite registrado.'); render(); }
  catch (e) { toast(e.message); }
}
async function confirmarExclusaoConta() {
  try {
    await api('/me/conta', { method: 'DELETE', body: { senha: $('#exSenha').value, confirmacao: $('#exConf').value.trim() } });
    S.modal = null; S.user = null; S.screen = 'auth'; S.auth = 'entrar'; S.authOk = 'Sua conta foi excluída.'; render();
  } catch (e) { toast(e.message); }
}

/** Termos mudaram desde o último aceite (ex.: novo fornecedor)? Mostra para aceitar de novo. */
async function conferirTermos() {
  try { const t = await api('/termos'); if (S.user && S.user.termosVersao !== t.versao) await abrirModalTermos({ exigirAceite: true }); }
  catch { /* sem bloqueio: tenta de novo no próximo acesso */ }
}

export { viewModal, confirmBox, abrirModalTermos, aceitarTermosAgora, confirmarExclusaoConta, conferirTermos };
