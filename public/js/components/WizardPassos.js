// Componentes UI puros dos 4 passos do Wizard de Geração de Questões.
import { ic } from '../icones.js';
import { esc } from '../util.js';
import { ProgressRing } from './ProgressRing.js';

export const FT = { pdf: '#B42318', docx: '#1D4ED8', doc: '#1D4ED8', txt: '#6B7684', md: '#6B7684' };

export function PassoMaterial({ w, editalAsideHtml }) {
  if (w.uploading) {
    return `<div class="wiz-section-card"><div class="progress-box"><div class="spinner"></div><b style="font-size:17px;color:var(--ink)">Lendo seu material${w.editalId ? ' e cruzando com o edital' : ''}…</b><div class="hint" style="margin-top:10px;line-height:1.6">Verificando a segurança do arquivo, extraindo o texto, identificando a matéria${w.editalId ? ' e mapeando os tópicos do edital' : ''}.<br>PDFs escaneados podem levar até 1 minuto.</div></div></div>`;
  }
  const m = w.material;
  if (m) {
    const ext = m.fileName ? m.fileName.split('.').pop().toLowerCase() : 'texto';
    return `<div class="wiz-step1-grid">
      <div class="wiz-section-card">
        <div class="wiz-step-header">
          <span class="wiz-step-badge">Passo 1 concluído</span>
          <h2 class="wiz-step-headline">Material de Estudo Carregado</h2>
          <p class="wiz-step-desc">Seu conteúdo foi lido e analisado com sucesso. Confira a prévia e avance para confirmar a matéria.</p>
        </div>

        <div class="wiz-file-success">
          <span class="ftype" style="background:${FT[ext] || 'var(--brand)'}">${esc(ext.toUpperCase())}</span>
          <div style="flex:1;min-width:0">
            <div class="li-title" style="font-size:16px">${esc(m.fileName || 'Texto colado')}</div>
            <div class="li-meta" style="margin-top:4px">${m.pages ? m.pages + ' páginas · ' : ''}${m.wordCount.toLocaleString('pt-BR')} palavras extraídas${m.editalMatch ? ` · <b style="color:var(--brand)">${m.editalMatch.cobertura_disciplina_pct}% da disciplina no edital</b>` : ''}</div>
          </div>
          <button class="btn btn-quiet" id="resetFile" style="white-space:nowrap">${ic('refresh', 'sm')} Trocar</button>
        </div>

        ${(w.warnings || []).map((t) => `<div class="banner warn" style="margin:16px 0 0">${ic('alert', 'sm')}<div>${esc(t)}</div></div>`).join('')}

        <div style="margin-top:20px">
          <div style="font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">Prévia do texto extraído</div>
          <div class="preview">${esc(m.preview)}${m.wordCount > 220 ? '…' : ''}</div>
        </div>

        <div class="wiz-foot">
          <span class="hint">Pronto para identificar os tópicos do seu material.</span>
          <button class="btn btn-primary" data-step="2" style="padding:11px 24px;font-size:14.5px">Avançar para Matéria ${ic('arrowR', 'sm')}</button>
        </div>
      </div>

      ${editalAsideHtml}
    </div>`;
  }

  return `<div class="wiz-step1-grid">
    <div class="wiz-section-card">
      <div class="wiz-step-header">
        <span class="wiz-step-badge">Passo 1 de 4</span>
        <h2 class="wiz-step-headline">Envie seu Material de Estudo</h2>
        <p class="wiz-step-desc">Suba resumos, apostilas ou cole seu texto. A IA elaborará questões inéditas exclusivamente a partir deste conteúdo.</p>
      </div>

      ${w.err ? `<div class="banner bad" style="margin-bottom:20px">${ic('alert', 'sm')}<div>${esc(w.err)}</div></div>` : ''}

      <div class="wiz-mode-tabs">
        <button type="button" class="wiz-mode-tab ${w.mode !== 'paste' ? 'on' : ''}" id="modeFile">${ic('upload', 'sm')} Enviar Arquivo</button>
        <button type="button" class="wiz-mode-tab ${w.mode === 'paste' ? 'on' : ''}" id="modePaste">${ic('clip', 'sm')} Colar Texto</button>
      </div>

      ${w.mode === 'file' ? `
        <label class="drop" id="drop">
          <input type="file" id="fileIn" class="sr" accept=".pdf,.doc,.docx,.txt,.md">
          <div class="big">${ic('upload', 'lg')}</div>
          <strong>Arraste seu arquivo aqui ou clique para escolher</strong>
          <span class="hint">Resumos, anotações de aula, apostilas ou trechos de lei</span>
          <div class="formats">
            <span class="badge">PDF</span>
            <span class="badge">DOCX</span>
            <span class="badge">DOC</span>
            <span class="badge">TXT</span>
            <span class="badge" style="background:var(--surface);border:1px solid var(--line-2);color:var(--muted)">Até 25 MB</span>
          </div>
        </label>
      ` : `
        <div class="field" style="margin:0">
          <label for="pasteIn" style="font-weight:700">Cole seu material de estudo</label>
          <textarea class="textarea" id="pasteIn" style="min-height:200px;font-size:14px" placeholder="Cole aqui seu resumo, anotações ou o conteúdo da apostila…"></textarea>
          <span class="hint" style="margin-top:4px">Mínimo de 60 palavras para que a IA identifique os tópicos com precisão.</span>
        </div>
        <div class="wiz-foot">
          <button class="btn btn-ghost" id="modeFile">${ic('arrowL', 'sm')} Enviar arquivo</button>
          <button class="btn btn-primary" id="usePaste">Usar este texto ${ic('arrowR', 'sm')}</button>
        </div>
      `}
    </div>

    ${editalAsideHtml}
  </div>`;
}

export function PassoMateria({ w, materias = [] }) {
  const d = w.material?.detect;
  const em = w.material?.editalMatch;
  const opts = materias.map((m) => `<option ${m === w.materia ? 'selected' : ''}>${esc(m)}</option>`).join('');

  return `<div class="wiz-pane-stack">
    <div class="wiz-section-card">
      <div class="wiz-step-header">
        <span class="wiz-step-badge">Passo 2 de 4</span>
        <h2 class="wiz-step-headline">Confirme a Matéria e os Tópicos</h2>
        <p class="wiz-step-desc">A inteligência artificial analisou seu material. Revise o diagnóstico abaixo e ajuste se necessário.</p>
      </div>

      ${d ? `
        <div class="wiz-detect-card">
          <div class="detect">
            <span class="li-icon" style="background:var(--brand);width:50px;height:50px;border-radius:12px">${ic('spark')}</span>
            <div style="flex:1">
              <div class="eyebrow" style="color:var(--brand);font-weight:800">
                ${d.origem === 'palavras-chave' ? 'Sugestão por palavras-chave' : 'Matéria identificada pela IA'}
              </div>
              <div style="font-size:22px;font-weight:800;letter-spacing:-.01em;margin-top:4px">${esc(d.materia)}</div>
              <div class="conf"><i style="width:${Math.round((d.confianca || 0) * 100)}%"></i></div>
              <div class="hint" style="font-size:12.5px">Confiança de ${Math.round((d.confianca || 0) * 100)}% na identificação</div>
              ${d.resumo ? `<p style="margin:12px 0 0;color:var(--ink-2);font-size:14px;line-height:1.55">${esc(d.resumo)}</p>` : ''}
              ${(d.temas || []).length ? `<div class="chips" style="margin-top:14px">${d.temas.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
          </div>
        </div>
      ` : `
        <div class="banner warn">${ic('info', 'sm')}<div>Não conseguimos identificar a matéria automaticamente. Por favor, selecione abaixo a disciplina deste material.</div></div>
      `}
    </div>

    ${em ? `
      <div class="wiz-section-card">
        <div class="row" style="justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap">
          <div style="display:flex;gap:18px;align-items:center;flex:1;min-width:240px">
            ${ProgressRing({ pct: em.cobertura_disciplina_pct, size: 76, strokeWidth: 8, color: 'var(--brand)' })}
            <div>
              <div class="eyebrow" style="color:var(--brand);font-weight:800">Cruzamento com seu Edital · ${esc(em.edital_titulo)}</div>
              <div style="font-size:18px;font-weight:800;margin:4px 0">Cobre ${em.cobertura_disciplina_pct}% de ${esc(em.disciplina_nome)} no edital</div>
              <div class="hint">${(em.topicos_cobertos || []).length} de ${em.total_topicos_disciplina || ((em.topicos_cobertos || []).length + (em.topicos_faltantes || []).length)} tópico(s) desta disciplina identificados no material</div>
            </div>
          </div>
          <button type="button" class="btn btn-quiet" data-go="edital">${ic('target', 'sm')} Ver edital completo</button>
        </div>
        ${em.analise ? `<p style="margin:14px 0 0;font-size:14px;color:var(--ink-2);line-height:1.55">${esc(em.analise)}</p>` : ''}
        ${(em.topicos_cobertos || []).length ? `
          <div class="eyebrow" style="margin:18px 0 8px">Tópicos do edital abordados neste material</div>
          <div class="edital-topics-list" style="gap:10px">${em.topicos_cobertos.map((t) => `
            <div class="edital-topic-hit ${t.nivel_cobertura}" style="padding:12px 14px">
              <div class="row" style="justify-content:space-between;align-items:center">
                <span style="font-weight:700;font-size:13.5px">${t.codigo ? `<b>${esc(t.codigo)}.</b> ` : ''}${esc(t.nome)}</span>
                <span class="badge ${t.nivel_cobertura === 'completo' ? 'brand' : 'accent'}">${t.nivel_cobertura === 'completo' ? '✓ Cobertura completa' : '◐ Cobertura parcial'}</span>
              </div>
              ${t.resumo ? `<div class="hint" style="margin-top:4px">${esc(t.resumo)}</div>` : ''}
            </div>
          `).join('')}</div>
        ` : ''}
        ${(em.topicos_faltantes || []).length ? `
          <details style="margin-top:14px"><summary style="cursor:pointer;font-weight:700;font-size:13px;color:var(--ink-2)">Faltam ${(em.topicos_faltantes || []).length} tópico(s) desta disciplina no edital (ver lacunas)</summary>
            <div class="chips" style="margin-top:10px">${em.topicos_faltantes.map((t) => `<span class="chip">${t.codigo ? esc(t.codigo) + '. ' : ''}${esc(t.nome)}</span>`).join('')}</div>
          </details>
        ` : ''}
      </div>
    ` : ''}

    <div class="wiz-section-card">
      <div class="opts" style="margin-top:0">
        <div class="field" style="margin:0">
          <label for="matSel" style="font-weight:700">${d ? 'Confirme ou altere a matéria' : 'Matéria'}</label>
          <select class="select" id="matSel"><option value="">Selecione…</option>${opts}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="assIn" style="font-weight:700">Assunto específico <span class="hint">(opcional)</span></label>
          <input class="input" id="assIn" placeholder="Ex.: Atos administrativos, Lei 8.112..." value="${esc(w.assunto)}">
        </div>
      </div>

      <div class="wiz-foot">
        <button class="btn btn-ghost" data-step="1">${ic('arrowL', 'sm')} Voltar ao material</button>
        <button class="btn btn-primary" id="toStep3" style="padding:11px 24px;font-size:14.5px">Avançar para Escolha da Banca ${ic('arrowR', 'sm')}</button>
      </div>
    </div>
  </div>`;
}

export function PassoBancaConfig({ w, bancas = [], bancaMap = {}, niveis = [], cadernos = [], quota = null }) {
  const cadsForBanca = cadernos.filter((c) => !w.banca || c.banca === w.banca);
  return `<div class="wiz-pane-stack">
    <div class="wiz-section-card">
      <div class="wiz-step-header">
        <span class="wiz-step-badge">Passo 3 de 4</span>
        <h2 class="wiz-step-headline">Escolha a Banca Organizadora</h2>
        <p class="wiz-step-desc">Selecione o perfil da banca que guiará o estilo de enunciado, armadilhas e cobrança.</p>
      </div>

      <div class="banca-pick">
        ${bancas.map((b) => `
          <button class="bp ${w.banca === b.id ? 'on' : ''}" style="--c:${b.cor}" data-banca="${b.id}" type="button">
            <div class="top">
              <span class="bdot" style="background:${b.cor}"></span>
              <span class="bn">${b.nome}</span>
              <span class="radio"></span>
            </div>
            <div class="fmt">${b.formatoLabel}</div>
            <p>${esc(b.resumo)}</p>
            <div class="tr">
              ${b.provasTreinadas ? `${ic('brain', 'sm')} Aprendeu com ${b.provasTreinadas} prova(s) · ${b.questoesReais || 0} questões reais` : 'Usando o perfil base da banca'}
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="wiz-section-card">
      <h3 style="margin:0 0 18px;font-size:17px;font-weight:800">Formato e Destino do Simulado</h3>

      <div class="opts" style="margin-top:0">
        <div>
          <div class="field" style="margin-bottom:10px"><label style="font-weight:700">Quantidade de questões</label></div>
          <div class="seg">${[5, 10, 15, 20].map((n) => `<button type="button" data-qtd="${n}" class="${w.qtd === n ? 'on' : ''}">${n}</button>`).join('')}</div>
        </div>
        <div>
          <div class="field" style="margin-bottom:10px"><label style="font-weight:700">Nível de dificuldade</label></div>
          <div class="seg">${niveis.map((n) => `<button type="button" data-nivel="${n}" class="${w.nivel === n ? 'on' : ''}">${n}</button>`).join('')}</div>
        </div>
      </div>

      ${cadernos.length ? `
        <div class="edital-subbox" style="margin-top:24px;padding:18px">
          <div class="field" style="margin:0">
            <label for="wizCadSel" style="font-weight:700;margin-bottom:6px">${ic('book', 'sm')} Alimentar qual Caderno de Questões com esta bateria? <span class="hint">(opcional)</span></label>
            <select class="select" id="wizCadSel">
              <option value="">Salvar apenas como simulado avulso</option>
              ${(cadsForBanca.length ? cadsForBanca : cadernos).map((c) => {
                const b = bancaMap[c.banca];
                return `<option value="${c.id}" ${w.cadernoId === c.id ? 'selected' : ''}>${b ? `[${b.nome}] ` : ''}${esc(c.titulo)} (${c.totalQuestoes} questões)</option>`;
              }).join('')}
            </select>
          </div>
        </div>
      ` : ''}

      ${quota && quota.remaining !== null ? `
        <div style="margin-top:20px;display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--brand-ink);background:var(--brand-soft);padding:12px 16px;border-radius:12px;border:1px solid #C6E2DA">
          <span>⚡</span>
          <div>${quota.remaining > 0 ? `Você pode gerar <b>${quota.remaining} simulado(s)</b> hoje${quota.bonus ? ` (inclui ${quota.bonus} crédito(s) extra(s))` : ''}.` : 'Você atingiu o limite de hoje. Envie provas para ganhar gerações extras.'}</div>
        </div>
      ` : ''}

      <div class="wiz-foot">
        <button class="btn btn-ghost" data-step="2">${ic('arrowL', 'sm')} Voltar à matéria</button>
        <button class="btn btn-primary" id="gen" ${w.banca ? '' : 'disabled'} style="padding:12px 26px;font-size:15px;font-weight:800">
          ${ic('spark', 'sm')} Gerar Simulado com IA (${w.qtd} questões)
        </button>
      </div>
    </div>
  </div>`;
}

export function PassoGeracaoProgresso({ w, bancaNome = 'Banca' }) {
  if (w.genErr) {
    return `<div class="wiz-section-card">
      <div class="banner bad">${ic('alert', 'sm')}<div>${esc(w.genErr)}</div></div>
      <div class="wiz-foot">
        <button class="btn btn-ghost" data-step="3">${ic('arrowL', 'sm')} Voltar</button>
        <button class="btn btn-primary" id="gen">${ic('refresh', 'sm')} Tentar de novo</button>
      </div>
    </div>`;
  }
  const pct = Math.min(96, Math.round((w.genCount / w.qtd) * 100));
  const isRevisando = w.stage === 'revisando';
  const isRefazendo = w.stage === 'refazendo';
  const title = isRevisando ? 'Revisor automático conferindo cada questão…' : isRefazendo ? `Refazendo ${w.stageCount || ''} questão(ões) que não passaram na revisão…` : `Elaborando questões no estilo ${esc(bancaNome)}…`;
  const sub = isRevisando ? 'Uma segunda IA resolve as questões sem ver o gabarito, usando exclusivamente o seu material' : isRefazendo ? 'Refazendo com outro modelo para garantir conformidade pedagógica' : w.genCount ? `Elaborando questão ${Math.min(w.genCount, w.qtd)} de ${w.qtd}…` : 'Analisando o material e mapeando os comandos da banca';

  return `<div class="wiz-section-card">
    <div class="progress-box" style="padding:36px 20px">
      <div class="spinner"></div>
      <b style="font-size:19px;letter-spacing:-.01em;color:var(--ink)">${title}</b>
      <div class="hint" style="font-size:14.5px;margin-top:8px">${sub}</div>
      <div class="bar"><i style="width:${w.genCount ? pct : 6}%"></i></div>
      <div style="font-size:13px;color:var(--muted);font-weight:600;margin-top:12px">
        ${w.genCount ? `${Math.min(w.genCount, w.qtd)} de ${w.qtd} questões elaboradas (${pct}%)` : 'Iniciando pipeline de inteligência artificial...'}
      </div>

      <div class="wiz-stage-timeline" style="gap:12px;margin-top:28px">
        <div class="wiz-stage-item done">
          <span class="wiz-stage-icon">✓</span>
          <span>1. Leitura profunda e extração do material</span>
        </div>
        <div class="wiz-stage-item ${isRevisando || isRefazendo ? 'done' : 'active'}">
          <span class="wiz-stage-icon">${isRevisando || isRefazendo ? '✓' : '2'}</span>
          <span>2. Elaboração das questões inéditas no padrão ${esc(bancaNome)}</span>
        </div>
        <div class="wiz-stage-item ${isRevisando || isRefazendo ? 'active' : ''}">
          <span class="wiz-stage-icon">${isRevisando || isRefazendo ? '🤖' : '3'}</span>
          <span>3. Revisor automático independente (segunda IA sem gabarito)</span>
        </div>
      </div>

      <div class="hint" style="margin-top:24px;font-size:12.5px">Tempo estimado: 30 segundos a 2 minutos · Transmissão em tempo real.</div>
    </div>
  </div>`;
}
