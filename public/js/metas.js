// Controlador da Tela "Minhas Metas": orquestra APIs separadas (metas, cadernos, materials, editais, sets) e compõe componentes.
import { BANCA, S, newWiz } from './estado.js';
import { ic } from './icones.js';
import { render } from './render.js';
import { api, on, toast } from './util.js';
import { DIAS_SEMANA, loadHoje } from './hoje.js';
import { openCaderno } from './cadernos.js';
import { go } from './eventos.js';
import { GamificacaoBanner } from './components/GamificacaoBanner.js';
import { CardMissaoHoje, CardChamasConstancia, CardRadarAprovacao } from './components/MetasCockpitCards.js';
import { SecaoRitmoAlvo, SecaoEstrategiaTreino, BarraSimulacaoAcao, textoDisponibilidade } from './components/SeletorEstrategia.js';

let simTimer = null;

function initDraftFromMetas(m) {
  const est = m.estrategia || {};
  S.metasDraft = {
    metaDiaria: m.metaDiaria || 20,
    concursoAlvo: m.concursoAlvo || '',
    bancaPreferida: m.bancaPreferida || '',
    dataProva: m.dataProva || '',
    estrategia: {
      modoFoco: est.modoFoco || 'materias',
      cadernoId: est.cadernoId || null,
      materias: [...(est.materias || [])],
      bancaFoco: est.bancaFoco ?? (m.bancaPreferida || ''),
      fonteConteudo: est.fonteConteudo || 'misto',
      materialIds: [...(est.materialIds || [])],
      qtdTreino: Number(est.qtdTreino) || 10,
    },
  };
}

// ---------- Carregamento desacoplado das APIs ----------
async function loadMetas() {
  S.metasBusy = true;
  if (S.view === 'metas') render();
  try {
    const [metas, cadsRes, matsRes, edsRes] = await Promise.all([
      api('/me/metas'),
      api('/cadernos').catch(() => ({ cadernos: S.cadernos || [] })),
      api('/materials').catch(() => ({ materials: S.materiaisDisponiveis || [] })),
      api('/editais').catch(() => ({ editais: S.editais || [], active: S.activeEdital })),
    ]);
    S.metas = metas;
    if (cadsRes?.cadernos) S.cadernos = cadsRes.cadernos;
    if (matsRes?.materials) S.materiaisDisponiveis = matsRes.materials;
    if (edsRes?.active) S.activeEdital = edsRes.active;
    initDraftFromMetas(metas);
    simularDisponibilidade(true);
  } catch (e) {
    toast(e.message || 'Erro ao carregar metas.');
  } finally {
    S.metasBusy = false;
  }
  if (S.view === 'metas') render();
}

function atualizarBadgeDisponibilidade() {
  const el = document.getElementById('simDispStatus');
  if (el && S.metasDraft) {
    el.innerHTML = textoDisponibilidade(S.metasDraft.estrategia, S.metasSimulacao, S.metasSimBusy);
  }
}

function simularDisponibilidade(imediato = false) {
  if (simTimer) clearTimeout(simTimer);
  const run = async () => {
    const d = S.metasDraft;
    if (!d) return;
    S.metasSimBusy = true;
    atualizarBadgeDisponibilidade();
    try {
      S.metasSimulacao = await api('/sets/treino-personalizado/disponibilidade', { method: 'POST', body: d.estrategia });
    } catch {
      S.metasSimulacao = null;
    } finally {
      S.metasSimBusy = false;
      atualizarBadgeDisponibilidade();
    }
  };
  if (imediato) run();
  else simTimer = setTimeout(run, 260);
}

function obterMateriasDoEditalAtivo() {
  const disc = S.activeEdital?.disciplinas || [];
  return disc.map((d) => d.materia).filter(Boolean);
}

function todasMateriasDisponiveis() {
  const ed = obterMateriasDoEditalAtivo();
  const matsUser = (S.materiaisDisponiveis || []).map((x) => x.materia).filter(Boolean);
  const base = S.materias || [];
  const seen = new Set();
  const out = [];
  const add = (nome, origem) => {
    const clean = String(nome || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ nome: clean, doEdital: origem === 'edital' });
  };
  ed.forEach((n) => add(n, 'edital'));
  matsUser.forEach((n) => add(n, 'material'));
  base.forEach((n) => add(n, 'base'));
  return out;
}

// ---------- Composição da Tela ----------
function viewMetas() {
  if (!S.metas && S.metasBusy) {
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando suas metas e planejamento…</div></div>';
  }
  if (!S.metas) {
    loadMetas();
    return '<div class="progress-box" style="padding-top:20vh"><div class="spinner"></div><div class="hint">Carregando suas metas e planejamento…</div></div>';
  }
  if (!S.metasDraft) initDraftFromMetas(S.metas);

  const m = S.metas;
  const d = S.metasDraft;
  const metaAtual = Number(d.metaDiaria) || 20;
  const bMap = BANCA();
  const bancaSel = bMap[m.bancaPreferida];
  const diffDias = d.dataProva
    ? Math.max(0, Math.ceil((new Date(d.dataProva + 'T12:00:00Z') - new Date()) / 86400000))
    : m.diasParaProva;
  const questoesAteProva = diffDias != null ? metaAtual * diffDias : null;
  const editalMats = obterMateriasDoEditalAtivo();

  return `
    <div class="metas-header">
      <div>
        <div class="eyebrow" style="color:var(--brand);font-weight:800">COCKPIT DE RITMO & ESTRATÉGIA</div>
        <h1 class="page-title" style="margin-top:2px">Minhas Metas de Estudo</h1>
        <p class="page-sub">Acompanhe seu avanço diário, suba de patente e personalize exatamente como quer treinar.</p>
      </div>
      <button class="btn btn-ghost" data-go="home">${ic('arrowL', 'sm')} Voltar ao Início</button>
    </div>

    ${GamificacaoBanner({ gamificacao: m.gamificacao })}

    <div class="metas-kpi-grid">
      ${CardMissaoHoje({ metaDiaria: m.metaDiaria, metaSugerida: metaAtual, progressoHoje: m.progressoHoje })}
      ${CardChamasConstancia({ sequencia: m.sequencia, semana: m.semana, diasSemanaLabels: DIAS_SEMANA })}
      ${CardRadarAprovacao({ diasParaProva: m.diasParaProva, concursoAlvo: m.concursoAlvo, bancaNome: bancaSel?.nome })}
    </div>

    <form id="formMetas" class="meta-builder-sec" novalidate>
      ${SecaoRitmoAlvo({ draft: d, bancas: S.bancas || [], hasActiveEdital: !!S.activeEdital })}

      ${SecaoEstrategiaTreino({
        estrategia: d.estrategia,
        bancas: S.bancas || [],
        bancaMap: bMap,
        cadernos: S.cadernos || [],
        materiais: S.materiaisDisponiveis || [],
        materiasDisponiveis: todasMateriasDisponiveis(),
        hasEditalMats: editalMats.length > 0,
      })}

      ${BarraSimulacaoAcao({
        metaDiaria: metaAtual,
        questoesAteProva,
        diffDias,
        estrategia: d.estrategia,
        simulacao: S.metasSimulacao,
        simBusy: S.metasSimBusy,
      })}
    </form>
  `;
}

function recalcularProjecao() {
  const d = S.metasDraft;
  const metaInput = document.getElementById('metaQtd');
  const dataInput = document.getElementById('metaDataProva');
  const projMesEl = document.getElementById('projMes');
  const projProvaEl = document.getElementById('projProva');
  if (!metaInput || !projMesEl || !projProvaEl) return;

  const q = Math.max(1, Math.min(500, Number(metaInput.value) || 20));
  if (d) d.metaDiaria = q;
  projMesEl.textContent = `~${(q * 30).toLocaleString('pt-BR')} questões`;

  const dataVal = dataInput?.value || '';
  if (d) d.dataProva = dataVal;
  if (dataVal) {
    const diffDias = Math.max(0, Math.ceil((new Date(dataVal + 'T12:00:00Z') - new Date()) / 86400000));
    projProvaEl.innerHTML = `~${(q * diffDias).toLocaleString('pt-BR')} questões (${diffDias}d)`;
  } else {
    projProvaEl.innerHTML = '<span style="font-size:13px;color:var(--muted)">Defina a data para simular</span>';
  }
}

async function salvarMetas(silencioso = false) {
  const d = S.metasDraft;
  if (!d) return null;
  const atualizadas = await api('/me/metas', {
    method: 'PATCH',
    body: {
      metaDiaria: Number(d.metaDiaria) || null,
      concursoAlvo: (d.concursoAlvo || '').trim(),
      bancaPreferida: d.bancaPreferida || '',
      dataProva: d.dataProva || '',
      estrategia: d.estrategia,
    },
  });
  S.metas = atualizadas;
  initDraftFromMetas(atualizadas);
  if (S.user) S.user.metaDiaria = atualizadas.metaDiaria;
  if (!silencioso) toast('✓ Metas e estratégia de treino salvas com sucesso!');
  return atualizadas;
}

// ---------- Eventos da Tela de Metas ----------
function ligarMetas() {
  atualizarBadgeDisponibilidade();

  on('[data-preset]', 'click', (e) => {
    if (S.metasDraft) S.metasDraft.metaDiaria = Number(e.currentTarget.dataset.preset);
    render();
  });

  on('#btnMetaMenos', 'click', () => {
    const input = document.getElementById('metaQtd');
    if (input) { input.value = Math.max(1, (Number(input.value) || 20) - 5); recalcularProjecao(); }
  });

  on('#btnMetaMais', 'click', () => {
    const input = document.getElementById('metaQtd');
    if (input) { input.value = Math.min(500, (Number(input.value) || 20) + 5); recalcularProjecao(); }
  });

  on('#metaQtd', 'input', recalcularProjecao);
  on('#metaConcurso', 'input', (e) => { if (S.metasDraft) S.metasDraft.concursoAlvo = e.currentTarget.value; });
  on('#metaBanca', 'change', (e) => {
    const b = e.currentTarget.value;
    if (S.metasDraft) {
      S.metasDraft.bancaPreferida = b;
      if (!S.metasDraft.estrategia.bancaFoco) S.metasDraft.estrategia.bancaFoco = b;
    }
    render();
    simularDisponibilidade();
  });
  on('#metaDataProva', 'change', recalcularProjecao);

  on('#btnPuxarEdital', 'click', () => {
    if (!S.activeEdital || !S.metasDraft) return;
    const ed = S.activeEdital;
    S.metasDraft.concursoAlvo = ed.titulo || S.metasDraft.concursoAlvo;
    if (ed.banca && S.bancas.some((x) => x.id === ed.banca)) {
      S.metasDraft.bancaPreferida = ed.banca;
      S.metasDraft.estrategia.bancaFoco = ed.banca;
    }
    const edMats = obterMateriasDoEditalAtivo();
    if (edMats.length) S.metasDraft.estrategia.materias = [...edMats];
    toast('✨ Dados e matérias importados do seu Edital Ativo!');
    render();
    simularDisponibilidade(true);
  });

  on('[data-modo]', 'click', (e) => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.modoFoco = e.currentTarget.dataset.modo;
    render();
    simularDisponibilidade(true);
  });

  on('[data-pick-caderno]', 'click', (e) => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.cadernoId = e.currentTarget.dataset.pickCaderno;
    render();
    simularDisponibilidade(true);
  });

  on('[data-toggle-mat]', 'click', (e) => {
    if (!S.metasDraft) return;
    const nome = e.currentTarget.dataset.toggleMat;
    const arr = S.metasDraft.estrategia.materias;
    const idx = arr.indexOf(nome);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(nome);
    render();
    simularDisponibilidade();
  });

  on('#btnMatsEdital', 'click', () => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.materias = obterMateriasDoEditalAtivo();
    render();
    simularDisponibilidade(true);
  });

  on('#btnMatsLimpar', 'click', () => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.materias = [];
    render();
    simularDisponibilidade(true);
  });

  on('[data-pick-banca]', 'click', (e) => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.bancaFoco = e.currentTarget.dataset.pickBanca;
    render();
    simularDisponibilidade(true);
  });

  on('[data-pick-fonte]', 'click', (e) => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.fonteConteudo = e.currentTarget.dataset.pickFonte;
    render();
    simularDisponibilidade(true);
  });

  on('[data-toggle-matid]', 'click', (e) => {
    if (!S.metasDraft) return;
    const id = e.currentTarget.dataset.toggleMatid;
    const arr = S.metasDraft.estrategia.materialIds;
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
    render();
    simularDisponibilidade();
  });

  on('[data-qtd-treino]', 'click', (e) => {
    if (!S.metasDraft) return;
    S.metasDraft.estrategia.qtdTreino = Number(e.currentTarget.dataset.qtdTreino) || 10;
    render();
  });

  on('#formMetas', 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarMetas');
    if (btn) btn.disabled = true;
    try {
      await salvarMetas(false);
      await loadHoje();
      render();
      simularDisponibilidade(true);
    } catch (err) {
      toast(err.message || 'Erro ao salvar metas.');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  on('#btnTreinarMeta', 'click', async () => {
    const btn = document.getElementById('btnTreinarMeta');
    if (btn) btn.disabled = true;
    try {
      await salvarMetas(true);
      const res = await api('/sets/treino-personalizado', {
        method: 'POST',
        body: S.metasDraft.estrategia,
      });
      if (res.action === 'open_caderno') {
        await openCaderno(res.cadernoId);
      } else if (res.action === 'open_set' && res.set) {
        S.sets.unshift(res.set);
        S.active = res.set.id;
        await loadHoje();
        go('simulado');
        toast(`🚀 Treino iniciado com ${res.totalQuestoes} questões!`);
      } else if (res.action === 'need_generate') {
        S.wiz = {
          ...newWiz(),
          banca: res.banca || S.metasDraft.bancaPreferida || '',
          materia: res.materia || '',
        };
        toast('Ainda não há questões geradas para este conteúdo — gere com a IA agora!');
        go('gerar');
      }
    } catch (err) {
      toast(err.message || 'Não foi possível iniciar o treino com esse filtro.');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

export { loadMetas, viewMetas, ligarMetas };
