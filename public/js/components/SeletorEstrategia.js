// Componentes UI puros da parte estratégica de Minhas Metas (Ritmo, Estratégia Robusta e Simulação).
import { ic } from '../icones.js';
import { esc } from '../util.js';

const PRESETS = [
  { v: 10, ico: '🌱', nome: 'Leve', sub: '~300 / mês' },
  { v: 20, ico: '⚡', nome: 'Constante', sub: '~600 / mês' },
  { v: 30, ico: '🔥', nome: 'Avançado', sub: '~900 / mês' },
  { v: 50, ico: '🚀', nome: 'Intensivo', sub: '~1.500 / mês' },
];

export function SecaoRitmoAlvo({ draft, bancas = [], hasActiveEdital = false }) {
  const metaAtual = Number(draft.metaDiaria) || 20;
  return `<div class="meta-step-card">
    <div class="meta-step-head">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span class="meta-step-num">1</span>
        <div>
          <h3 style="margin:0;font-size:16.5px;font-weight:800">Ritmo Diário e Concurso-Alvo</h3>
          <p class="hint" style="margin:2px 0 0">Defina sua quantidade diária de questões e o objetivo principal.</p>
        </div>
      </div>
      ${hasActiveEdital ? `<button type="button" class="btn btn-sm btn-ghost" id="btnPuxarEdital">${ic('target', 'sm')} Importar do Edital Ativo</button>` : ''}
    </div>

    <div class="meta-preset-grid">
      ${PRESETS.map((pr) => `
        <button type="button" class="meta-preset-card ${metaAtual === pr.v ? 'on' : ''}" data-preset="${pr.v}">
          <b>${pr.ico} ${pr.v} / dia · ${pr.nome}</b>
          <span>${pr.sub}</span>
        </button>
      `).join('')}
    </div>

    <div class="row" style="gap:16px;flex-wrap:wrap;align-items:flex-end">
      <div class="field" style="margin:0;min-width:170px">
        <label for="metaQtd" style="font-weight:700">Ajuste exato / dia</label>
        <div style="display:flex;align-items:center;gap:6px">
          <button type="button" class="btn btn-secondary" id="btnMetaMenos" style="width:40px;height:40px;font-weight:800">-</button>
          <input class="input" id="metaQtd" type="number" min="1" max="500" value="${metaAtual}" style="width:82px;text-align:center;font-weight:800;font-size:16px">
          <button type="button" class="btn btn-secondary" id="btnMetaMais" style="width:40px;height:40px;font-weight:800">+</button>
        </div>
      </div>

      <div class="field" style="margin:0;flex:1;min-width:220px">
        <label for="metaConcurso" style="font-weight:700">Concurso Alvo</label>
        <input class="input" id="metaConcurso" type="text" maxlength="120" placeholder="Ex.: Banco do Brasil, CNU, TJ-SP, PF..." value="${esc(draft.concursoAlvo || '')}">
      </div>

      <div class="field" style="margin:0;flex:1;min-width:180px">
        <label for="metaBanca" style="font-weight:700">Banca Preferida</label>
        <select class="select" id="metaBanca">
          <option value="">Qualquer banca</option>
          ${bancas.map((b) => `<option value="${b.id}" ${b.id === draft.bancaPreferida ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}
        </select>
      </div>

      <div class="field" style="margin:0;min-width:165px">
        <label for="metaDataProva" style="font-weight:700">Data da Prova</label>
        <input class="input" id="metaDataProva" type="date" value="${draft.dataProva || ''}">
      </div>
    </div>
  </div>`;
}

function SubpainelCadernos({ cadernos = [], bancaMap = {}, selectedId = null }) {
  return `<div class="meta-filter-panel">
    <div class="meta-filter-block-title">
      <span>Selecione um dos seus Cadernos de Questões:</span>
      <button type="button" class="link-btn" data-go="cadernos">+ Gerenciar ou criar caderno</button>
    </div>
    ${cadernos.length ? `
      <div class="meta-caderno-grid">
        ${cadernos.map((c) => {
          const cb = bancaMap[c.banca];
          const on = selectedId === c.id;
          const pctCad = c.respondidas ? Math.round((c.acertos / c.respondidas) * 100) : null;
          return `<button type="button" class="meta-cad-opt ${on ? 'on' : ''}" data-pick-caderno="${c.id}">
            <div class="row" style="justify-content:space-between;align-items:center">
              <span class="badge" style="background:${cb?.cor || 'var(--brand)'};color:#fff;font-size:11px">${cb ? esc(cb.nome) : 'Banca'}</span>
              ${on ? '<span class="badge ok" style="font-size:10.5px">✓ Selecionado</span>' : ''}
            </div>
            <b style="font-size:14px;color:var(--ink)">${esc(c.titulo)}</b>
            <div class="hint" style="font-size:12px">
              ${c.totalQuestoes || 0} questões${pctCad != null ? ` · ${pctCad}% de acerto` : ''}
            </div>
          </button>`;
        }).join('')}
      </div>
    ` : `
      <div class="banner" style="background:var(--surface)">
        ${ic('info', 'sm')}
        <div>Você ainda não criou nenhum caderno. <button type="button" class="link-btn" data-go="cadernos">Criar meu primeiro caderno agora</button> ou escolha <b>Matérias × Banca × Conteúdo</b> acima!</div>
      </div>
    `}
  </div>`;
}

function SubpainelFiltros({ est, bancas = [], materiais = [], materiasDisponiveis = [], hasEditalMats = false }) {
  return `<div class="meta-filter-panel">
    ${est.modoFoco === 'materias' ? `
      <div>
        <div class="meta-filter-block-title">
          <span>1. Quais matérias você quer treinar? <span class="hint">(${est.materias.length ? `${est.materias.length} selecionada(s)` : 'Todas as matérias'})</span></span>
          <div style="display:flex;gap:10px">
            ${hasEditalMats ? '<button type="button" class="link-btn" id="btnMatsEdital">Selecionar do Edital</button>' : ''}
            <button type="button" class="link-btn" id="btnMatsLimpar">Limpar filtro</button>
          </div>
        </div>
        <div class="meta-chips-wrap">
          ${materiasDisponiveis.map((mat) => {
            const isOn = est.materias.includes(mat.nome);
            return `<button type="button" class="meta-filter-chip ${isOn ? 'on' : ''}" data-toggle-mat="${esc(mat.nome)}">
              ${mat.doEdital ? '<span title="Matéria do seu edital">🎯</span>' : ''}
              <span>${esc(mat.nome)}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <div>
      <div class="meta-filter-block-title">
        <span>${est.modoFoco === 'materias' ? '2.' : '1.'} Filtrar questões por Banca Organizadora:</span>
      </div>
      <div class="meta-chips-wrap">
        <button type="button" class="meta-filter-chip ${!est.bancaFoco ? 'on' : ''}" data-pick-banca="">🌐 Qualquer banca</button>
        ${bancas.map((b) => `
          <button type="button" class="meta-filter-chip ${est.bancaFoco === b.id ? 'on' : ''}" data-pick-banca="${b.id}">
            <span class="bdot" style="background:${b.cor}"></span>
            <span>${esc(b.nome)}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div>
      <div class="meta-filter-block-title">
        <span>${est.modoFoco === 'materias' ? '3.' : '2.'} Origem das questões (com seu conteúdo ou provas oficiais):</span>
      </div>
      <div class="meta-fonte-grid">
        <button type="button" class="meta-fonte-card ${est.fonteConteudo === 'meu_conteudo' ? 'on' : ''}" data-pick-fonte="meu_conteudo">
          <div style="font-weight:800;font-size:13.5px">📄 Só Meu Conteúdo</div>
          <div class="hint" style="font-size:12px;margin-top:3px">Questões dos seus PDFs, resumos e simulados gerados.</div>
        </button>
        <button type="button" class="meta-fonte-card ${est.fonteConteudo === 'banco_provas' ? 'on' : ''}" data-pick-fonte="banco_provas">
          <div style="font-weight:800;font-size:13.5px">🏛️ Só Provas da Banca</div>
          <div class="hint" style="font-size:12px;margin-top:3px">Questões reais oficiais anteriores, sem usar seu material.</div>
        </button>
        <button type="button" class="meta-fonte-card ${est.fonteConteudo === 'misto' ? 'on' : ''}" data-pick-fonte="misto">
          <div style="font-weight:800;font-size:13.5px">⚡ Modo Híbrido</div>
          <div class="hint" style="font-size:12px;margin-top:3px">Mescla questões do seu material com provas reais da banca.</div>
        </button>
      </div>

      ${est.fonteConteudo !== 'banco_provas' && materiais.length ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">
          <div class="hint" style="font-weight:700;margin-bottom:6px">
            Materiais específicos enviados por você <span style="font-weight:500">(opcional — vazio usa todos das matérias escolhidas)</span>:
          </div>
          <div class="meta-mat-list">
            ${materiais.slice(0, 12).map((matItem) => {
              const on = est.materialIds.includes(matItem.id);
              return `<button type="button" class="meta-mat-item ${on ? 'on' : ''}" data-toggle-matid="${matItem.id}">
                <span>${on ? '☑️' : '⬜'}</span>
                <div style="min-width:0;text-align:left">
                  <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(matItem.fileName || 'Texto colado')}</div>
                  <div class="hint" style="font-size:11px">${esc(matItem.materia || 'Outra')} · ${matItem.wordCount || 0} pal.</div>
                </div>
              </button>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:800">Questões ao iniciar uma bateria de treino:</span>
      <div class="seg">
        ${[5, 10, 15, 20, 30].map((q) => `<button type="button" data-qtd-treino="${q}" class="${est.qtdTreino === q ? 'on' : ''}">${q} q.</button>`).join('')}
      </div>
    </div>
  </div>`;
}

export function SecaoEstrategiaTreino({ estrategia, bancas = [], bancaMap = {}, cadernos = [], materiais = [], materiasDisponiveis = [], hasEditalMats = false }) {
  return `<div class="meta-step-card">
    <div class="meta-step-head">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span class="meta-step-num">2</span>
        <div>
          <h3 style="margin:0;font-size:16.5px;font-weight:800">Estratégia de Treino da Meta</h3>
          <p class="hint" style="margin:2px 0 0">Escolha como montar sua bateria: por um caderno pronto seu, ou filtrando matérias, banca e origem do conteúdo.</p>
        </div>
      </div>
    </div>

    <div class="meta-mode-grid">
      <button type="button" class="meta-mode-card ${estrategia.modoFoco === 'caderno' ? 'on' : ''}" data-modo="caderno">
        <div class="meta-mode-ico">📓</div>
        <div>
          <div style="font-weight:800;font-size:14px">Caderno de Questões</div>
          <div class="hint" style="font-size:12px;margin-top:2px">Escolher um caderno montado por você para focar.</div>
        </div>
      </button>

      <button type="button" class="meta-mode-card ${estrategia.modoFoco === 'materias' ? 'on' : ''}" data-modo="materias">
        <div class="meta-mode-ico">🎯</div>
        <div>
          <div style="font-weight:800;font-size:14px">Matérias × Banca × Conteúdo</div>
          <div class="hint" style="font-size:12px;margin-top:2px">Combine matérias selecionadas, banca e seu material ou provas.</div>
        </div>
      </button>

      <button type="button" class="meta-mode-card ${estrategia.modoFoco === 'livre' ? 'on' : ''}" data-modo="livre">
        <div class="meta-mode-ico">✨</div>
        <div>
          <div style="font-weight:800;font-size:14px">Mix Inteligente Geral</div>
          <div class="hint" style="font-size:12px;margin-top:2px">Mistura todas as matérias com base no seu histórico e banca.</div>
        </div>
      </button>
    </div>

    ${estrategia.modoFoco === 'caderno'
      ? SubpainelCadernos({ cadernos, bancaMap, selectedId: estrategia.cadernoId })
      : SubpainelFiltros({ est: estrategia, bancas, materiais, materiasDisponiveis, hasEditalMats })}
  </div>`;
}

export function textoDisponibilidade(estrategia, sim, busy) {
  if (!sim || busy) {
    return '<span class="spinner sm"></span> Calculando questões disponíveis para este filtro…';
  }
  if (estrategia?.modoFoco === 'caderno') {
    return estrategia.cadernoId
      ? `📓 Caderno selecionado com <b>${sim.caderno} questões</b> prontas para treinar.`
      : '⚠️ Escolha um dos seus cadernos acima para direcionar sua meta.';
  }
  if (sim.total > 0) {
    const detalhes = [];
    if (sim.meuConteudo > 0) detalhes.push(`${sim.meuConteudo} do seu conteúdo`);
    if (sim.bancoProvas > 0) detalhes.push(`${sim.bancoProvas} oficiais da banca`);
    return `✅ <b style="color:var(--ok)">${sim.total} questões</b> compatíveis encontradas${detalhes.length ? ` (${detalhes.join(' + ')})` : ''}.`;
  }
  if (estrategia?.fonteConteudo === 'meu_conteudo') {
    return '💡 Ainda não há questões geradas para esse filtro do seu conteúdo — ao clicar em Treinar, você pode gerar com a IA.';
  }
  return '⚠️ Nenhuma questão encontrada nessa combinação exata. Tente selecionar mais matérias ou "Qualquer banca".';
}

export function BarraSimulacaoAcao({ metaDiaria, questoesAteProva, diffDias, estrategia, simulacao, simBusy }) {
  const questoesMes = (Number(metaDiaria) || 20) * 30;
  return `<div class="meta-action-bar">
    <div style="flex:1;min-width:260px">
      <div class="meta-proj-metrics">
        <div>
          <div class="hint" style="font-size:11.5px;font-weight:700">PREVISÃO MENSAL</div>
          <div style="font-size:20px;font-weight:800;color:var(--brand)" id="projMes">~${questoesMes.toLocaleString('pt-BR')} questões</div>
        </div>
        <div>
          <div class="hint" style="font-size:11.5px;font-weight:700">ATÉ O DIA DA PROVA</div>
          <div style="font-size:20px;font-weight:800;color:var(--ok)" id="projProva">
            ${questoesAteProva != null ? `~${questoesAteProva.toLocaleString('pt-BR')} questões (${diffDias}d)` : '<span style="font-size:13px;color:var(--muted)">Defina a data para simular</span>'}
          </div>
        </div>
      </div>
      <div id="simDispStatus" class="hint" style="margin-top:8px;font-size:12.5px">
        ${textoDisponibilidade(estrategia, simulacao, simBusy)}
      </div>
    </div>

    <div class="row" style="gap:10px;flex-wrap:wrap">
      <button type="submit" class="btn btn-secondary" id="btnSalvarMetas" style="padding:10px 18px;font-weight:700">
        ${ic('check', 'sm')} Salvar metas
      </button>
      <button type="button" class="btn btn-primary" id="btnTreinarMeta" style="padding:11px 22px;font-size:14.5px;font-weight:800">
        🚀 Salvar e Iniciar Treino Agora
      </button>
    </div>
  </div>`;
}
