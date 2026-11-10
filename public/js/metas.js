// Front do HelpConcurso — Minhas Metas & Planejamento de Estudos.
import { S } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { api, esc, on, toast } from './util.js';
import { loadHoje } from './hoje.js';

// ---------- Carregamento e Estado ----------
async function loadMetas() {
  S.metasBusy = true;
  if (S.view === 'metas') render();
  try {
    S.metas = await api('/me/metas');
  } catch (e) {
    toast(e.message || 'Erro ao carregar metas.');
  } finally {
    S.metasBusy = false;
  }
  if (S.view === 'metas') render();
}

// ---------- Render da Tela de Metas ----------
function viewMetas() {
  if (!S.metas && S.metasBusy) {
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando suas metas e planejamento…</div></div>';
  }
  if (!S.metas) {
    loadMetas();
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando suas metas e planejamento…</div></div>';
  }

  const m = S.metas;
  const p = m.progressoHoje || {};
  const seq = m.sequencia || {};
  const metaAtual = Number(m.metaDiaria) || 20;
  const diasProva = m.diasParaProva;

  // Projeção calculada
  const questoesMes = metaAtual * 30;
  const questoesAteProva = diasProva != null ? metaAtual * diasProva : null;

  return `
    <div class="metas-header">
      <div>
        <div class="eyebrow" style="color:var(--brand);font-weight:800">PLANEJAMENTO & RITMO</div>
        <h1 class="page-title" style="margin-top:2px">Minhas Metas de Estudo</h1>
        <p class="page-sub">Defina o seu ritmo diário, conecte seu concurso-alvo e veja a simulação do seu volume até a prova.</p>
      </div>
      <button class="btn btn-ghost" data-go="home">${ic('arrowL', 'sm')} Voltar ao Início</button>
    </div>

    <!-- Cards de Cockpit da Meta -->
    <div class="desemp-kpi-grid" style="margin-top:16px">
      <!-- Progresso Hoje -->
      <div class="desemp-kpi-card brand">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Meta de Hoje</span>
          ${ic('target', 'sm')}
        </div>
        <div>
          <div class="desemp-kpi-val" style="color:var(--brand)">
            ${p.respondidas || 0} <span style="font-size:18px;color:var(--muted);font-weight:600">/ ${m.metaDiaria || '—'}</span>
          </div>
          <div class="hint" style="font-weight:700">questões respondidas hoje</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="desemp-bar-track" style="height:10px;margin-bottom:6px">
            <div class="desemp-bar-fill" style="width:${p.percentual || 0}%;background:${p.metaBatida ? 'var(--ok)' : 'var(--brand)'}"></div>
          </div>
          <div class="row" style="justify-content:space-between;align-items:center">
            <span class="hint">${p.percentual || 0}% concluído</span>
            ${p.metaBatida
              ? '<span class="badge ok" style="font-size:11px">✓ Meta Batida!</span>'
              : `<span class="badge" style="font-size:11px;background:var(--line-2)">Faltam ${p.restantes || 0} q.</span>`}
          </div>
        </div>
      </div>

      <!-- Sequência (Fogo) -->
      <div class="desemp-kpi-card accent">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Constância</span>
          <span style="font-size:18px">🔥</span>
        </div>
        <div>
          <div class="desemp-kpi-val" style="color:var(--accent)">${seq.atual || 0} dias</div>
          <div class="hint" style="font-weight:700">sequência consecutiva</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="row" style="justify-content:space-between;align-items:baseline">
            <span class="hint">Recorde pessoal:</span>
            <b>${seq.recorde || 0} dias seguidos</b>
          </div>
          <div class="hint" style="margin-top:4px">Responda ao menos 1 questão por dia para não apagar o fogo.</div>
        </div>
      </div>

      <!-- Reta Final da Prova -->
      <div class="desemp-kpi-card ok">
        <div class="desemp-kpi-top">
          <span class="desemp-kpi-lbl">Contagem Regressiva</span>
          ${ic('clock', 'sm')}
        </div>
        <div>
          <div class="desemp-kpi-val" style="color:var(--ok)">
            ${diasProva != null ? `${diasProva} dias` : '—'}
          </div>
          <div class="hint" style="font-weight:700">até a sua prova</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line-2)">
          <div class="row" style="justify-content:space-between;align-items:baseline">
            <span class="hint">Concurso Alvo:</span>
            <b style="text-align:right">${esc(m.concursoAlvo || 'Não definido')}</b>
          </div>
          <div class="row" style="justify-content:space-between;align-items:baseline;margin-top:4px">
            <span class="hint">Banca:</span>
            <b>${esc(m.bancaPreferida ? m.bancaPreferida.toUpperCase() : 'Não definida')}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Formulário de Definição de Metas -->
    <div class="card card-pad" style="margin-top:22px">
      <h3 class="card-title">${ic('spark', 'sm')} Ajustar minhas metas de estudo</h3>
      <p class="hint" style="margin-top:-6px;margin-bottom:20px">Personalize suas metas para que o HelpConcurso calcule seu ritmo ideal e envie recomendações diárias.</p>

      <form id="formMetas" novalidate>
        <!-- Meta Diária -->
        <div class="field" style="margin-bottom:24px">
          <label for="metaQtd" style="font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px">
            ${ic('target', 'sm')} Meta diária de questões resolvidas
          </label>
          <div class="hint" style="margin-bottom:12px">Quantas questões você pretende resolver a cada dia de estudo.</div>

          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px">
              <button type="button" class="btn btn-secondary" id="btnMetaMenos" style="width:42px;height:42px;font-size:18px;font-weight:800" title="Diminuir 5">-</button>
              <input class="input" id="metaQtd" type="number" min="1" max="500" value="${metaAtual}" style="width:100px;text-align:center;font-size:18px;font-weight:800">
              <button type="button" class="btn btn-secondary" id="btnMetaMais" style="width:42px;height:42px;font-size:18px;font-weight:800" title="Aumentar 5">+</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-sm ${metaAtual === 10 ? 'btn-primary' : 'btn-ghost'}" data-preset="10">10 / dia (Leve)</button>
              <button type="button" class="btn btn-sm ${metaAtual === 20 ? 'btn-primary' : 'btn-ghost'}" data-preset="20">20 / dia (Constante)</button>
              <button type="button" class="btn btn-sm ${metaAtual === 30 ? 'btn-primary' : 'btn-ghost'}" data-preset="30">30 / dia (Avançado)</button>
              <button type="button" class="btn btn-sm ${metaAtual === 50 ? 'btn-primary' : 'btn-ghost'}" data-preset="50">50 / dia (Intensivo)</button>
            </div>
          </div>
        </div>

        <!-- Concurso Alvo e Banca -->
        <div class="row" style="gap:16px;flex-wrap:wrap;margin-bottom:20px">
          <div class="field" style="flex:1;min-width:260px">
            <label for="metaConcurso" style="font-weight:700">Concurso Alvo</label>
            <input class="input" id="metaConcurso" type="text" maxlength="120" placeholder="Ex.: Banco do Brasil, CNU, TJ-SP, PF..." value="${esc(m.concursoAlvo || '')}">
            <div class="hint">O concurso principal para o qual você está se preparando.</div>
          </div>

          <div class="field" style="flex:1;min-width:200px">
            <label for="metaBanca" style="font-weight:700">Banca Organizadora</label>
            <select class="select" id="metaBanca">
              <option value="">Selecione uma banca</option>
              ${(S.bancas || []).map((b) => `<option value="${b.id}" ${b.id === m.bancaPreferida ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}
            </select>
            <div class="hint">Banca preferida para direcionamento de questões.</div>
          </div>

          <div class="field" style="flex:1;min-width:200px">
            <label for="metaDataProva" style="font-weight:700">Data Prevista da Prova</label>
            <input class="input" id="metaDataProva" type="date" value="${m.dataProva || ''}">
            <div class="hint">Usado para ativar o contador regressivo.</div>
          </div>
        </div>

        <!-- Simulador Tático de Impacto (Projeção ao Vivo) -->
        <div class="card card-pad" id="simuladorBox" style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:12px;margin:24px 0">
          <div style="font-weight:800;font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px">
            ${ic('spark', 'sm')} <span>Projeção de Impacto nos seus Estudos</span>
          </div>
          <div class="row" style="gap:24px;margin-top:14px;flex-wrap:wrap">
            <div>
              <div class="hint">Volume mensal estimado</div>
              <div style="font-size:22px;font-weight:800;color:var(--brand)" id="projMes">~${questoesMes.toLocaleString('pt-BR')} questões</div>
            </div>
            <div id="projProvaWrap">
              <div class="hint">Total até o dia da prova</div>
              <div style="font-size:22px;font-weight:800;color:var(--ok)" id="projProva">
                ${diasProva != null ? `~${(questoesAteProva || 0).toLocaleString('pt-BR')} questões (${diasProva} dias)` : '<span style="font-size:14px;color:var(--muted)">Defina a data da prova para simular</span>'}
              </div>
            </div>
          </div>
        </div>

        <div class="row" style="justify-content:flex-end;gap:12px;margin-top:20px">
          <button type="button" class="btn btn-ghost" data-go="home">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btnSalvarMetas" style="padding:10px 24px;font-size:14px">
            ${ic('check', 'sm')} Salvar minhas metas
          </button>
        </div>
      </form>
    </div>
  `;
}

function recalcularProjecao() {
  const metaInput = document.getElementById('metaQtd');
  const dataInput = document.getElementById('metaDataProva');
  const projMesEl = document.getElementById('projMes');
  const projProvaEl = document.getElementById('projProva');
  if (!metaInput || !projMesEl || !projProvaEl) return;

  const q = Math.max(1, Math.min(500, Number(metaInput.value) || 20));
  projMesEl.textContent = `~${(q * 30).toLocaleString('pt-BR')} questões`;

  const dataVal = dataInput?.value;
  if (dataVal) {
    const diffDias = Math.max(0, Math.ceil((new Date(dataVal + 'T12:00:00Z') - new Date()) / (1000 * 60 * 60 * 24)));
    projProvaEl.innerHTML = `~${(q * diffDias).toLocaleString('pt-BR')} questões (${diffDias} dias)`;
  } else {
    projProvaEl.innerHTML = '<span style="font-size:14px;color:var(--muted)">Defina a data da prova para simular</span>';
  }
}

// ---------- Eventos da Tela de Metas ----------
function ligarMetas() {
  on('[data-preset]', 'click', (e) => {
    const v = Number(e.currentTarget.dataset.preset);
    const input = document.getElementById('metaQtd');
    if (input) {
      input.value = v;
      recalcularProjecao();
      document.querySelectorAll('[data-preset]').forEach((b) => {
        b.className = b.dataset.preset === String(v) ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost';
      });
    }
  });

  on('#btnMetaMenos', 'click', () => {
    const input = document.getElementById('metaQtd');
    if (input) {
      input.value = Math.max(1, (Number(input.value) || 20) - 5);
      recalcularProjecao();
    }
  });

  on('#btnMetaMais', 'click', () => {
    const input = document.getElementById('metaQtd');
    if (input) {
      input.value = Math.min(500, (Number(input.value) || 20) + 5);
      recalcularProjecao();
    }
  });

  on('#metaQtd', 'input', recalcularProjecao);
  on('#metaDataProva', 'change', recalcularProjecao);

  on('#formMetas', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarMetas');
    if (btn) btn.disabled = true;

    const metaDiaria = Number(document.getElementById('metaQtd')?.value) || null;
    const concursoAlvo = document.getElementById('metaConcurso')?.value?.trim() || '';
    const bancaPreferida = document.getElementById('metaBanca')?.value || '';
    const dataProva = document.getElementById('metaDataProva')?.value || '';

    try {
      const atualizadas = await api('/me/metas', {
        method: 'PATCH',
        body: { metaDiaria, concursoAlvo, bancaPreferida, dataProva },
      });
      S.metas = atualizadas;
      if (S.user) {
        S.user.metaDiaria = atualizadas.metaDiaria;
      }
      toast('✓ Metas de estudo atualizadas com sucesso! Foco na aprovação.');
      await loadHoje();
      render();
    } catch (err) {
      toast(err.message || 'Erro ao salvar metas.');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

export { loadMetas, viewMetas, ligarMetas };
