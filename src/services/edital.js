// =====================================================================
// Serviço de Editais Verticalizados e Cruzamento (Material × Edital × Questões)
// =====================================================================
import { runJSON } from '../ai/index.js';
import { editalParseSchema, editalMatchSchema } from '../ai/schemas.js';
import crypto from 'node:crypto';
import { promptEditalParse, promptEditalMatch, PROMPT_VERSAO } from '../lib/prompts.js';
import { normNome, materiaId, topicoId } from './taxonomia.js';
import { BANCA, MATERIAS } from '../lib/bancas.js';
import { COMANDOS, PEGADINHAS } from '../lib/cobranca.js';
import { secureUpload, scanText, SEV, logSecurityEvent } from '../security/index.js';
import { sanitizeText } from '../security/text-scan.js';
import { decide } from '../security/policy.js';
import { putFile, makeKey, deleteFile } from '../lib/storage.js';
import { HttpError } from '../lib/http.js';
import { assertLimitePlano } from './quota.js';
import { publicStatus } from './provas.js';
import * as simuladosRepo from '../repositories/simulados.js';
import * as editaisRepo from '../repositories/editais.js';
import * as provasRepo from '../repositories/provas.js';
import * as materiaisRepo from '../repositories/materiais.js';
import * as cadernosRepo from '../repositories/cadernos.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const cleanStr = (s, max = 220) => {
  const c = String(s || '').trim().slice(0, max);
  return SEV[scanText(c).severity] >= SEV.medium ? '' : c;
};

/**
 * Em editais longos (30–80 páginas, com tabelas enormes de vagas/cidades no meio),
 * preserva o início (órgão, cargo, banca, quadro de provas) e captura o Anexo de
 * Conteúdo(s) Programático(s) (que normalmente fica no terço final do PDF).
 */
export function extractProgrammaticSample(text) {
  const t = String(text || '');
  if (t.length <= 50000) return t;
  const re = /(anexo\s+[ivx0-9]+\s*[-–—:\s]*conte[úu]dos?\s+program[áa]ticos?|conte[úu]dos?\s+program[áa]ticos?|objetos?\s+de\s+avalia[çc][ãa]o|programa\s+das?\s+provas?|l[íi]ngua\s+portuguesa\s*[:\n\r–-]+\s*1[\.\s])/ig;
  let bestIdx = -1;
  for (const m of t.matchAll(re)) {
    // Prioriza ocorrências após os primeiros 20% do edital (pula sumário e cláusulas iniciais)
    if (bestIdx < 0 || m.index > t.length * 0.2) bestIdx = m.index;
  }
  const head = t.slice(0, 8000);
  // Se encontramos o Anexo de Conteúdo Programático nos últimos 42 mil caracteres, pegamos dele até o fim
  if (bestIdx >= t.length - 42000 && bestIdx > 8000) {
    return `${head}\n\n[... TABELAS DE VAGAS E TRECHO INTERMEDIÁRIO OMITIDOS ...]\n\n${t.slice(bestIdx)}`;
  }
  // Se encontramos no meio do documento, pegamos um bloco a partir dele + os últimos 24 mil caracteres (onde ficam os anexos finais)
  if (bestIdx > 8000) {
    const mid = t.slice(bestIdx, bestIdx + 18000);
    const tail = t.slice(Math.max(bestIdx + 18000, t.length - 24000));
    return `${head}\n\n[... TRECHO INTERMEDIÁRIO OMITIDO ...]\n\n${mid}\n\n[... ANEXOS FINAIS DO EDITAL ...]\n\n${tail}`;
  }
  // Fallback: início (quadro de provas) + final do documento (anexo de conteúdo programático)
  return `${head}\n\n[... TRECHO INTERMEDIÁRIO OMITIDO ...]\n\n${t.slice(-40000)}`;
}

/** Extrai disciplinas e tópicos numerados do edital via IA e normaliza IDs. */
export async function parseEdital(text, fileName, userId, signal, meta = {}) {
  const sample = extractProgrammaticSample(text);
  const { data } = await runJSON('edital_parse', {
    ...promptEditalParse({ sample, fileName, banca: meta.banca, orgao: meta.orgao, cargo: meta.cargo, ano: meta.ano }),
    maxTokens: 6000,
    userId,
    signal,
  }, editalParseSchema);
  const bancaNorm = norm(data.banca).replace(/\s+/g, '');
  const bancaId = Object.keys(BANCA).find((k) => bancaNorm.includes(k) || (k === 'cebraspe' && bancaNorm.includes('cespe'))) || cleanStr(data.banca, 40);

  const verticalizado = [];
  data.disciplinas.forEach((d, di) => {
    const matRaw = cleanStr(d.materia, 100);
    if (!matRaw) return;
    const matKnown = MATERIAS.find((m) => norm(m) === norm(matRaw));
    const dId = `D${di + 1}`;
    const topicos = [];
    (d.topicos || []).forEach((t, ti) => {
      const nome = cleanStr(t.nome, 220);
      if (!nome) return;
      topicos.push({
        id: `${dId}-T${ti + 1}`,
        codigo: cleanStr(t.codigo || String(ti + 1), 30),
        nome,
      });
    });
    if (topicos.length) {
      verticalizado.push({
        id: dId,
        materia: matKnown || matRaw,
        peso: d.peso || 1,
        topicos,
      });
    }
  });

  return {
    titulo: cleanStr(data.titulo, 180) || cleanStr(fileName, 140) || 'Meu Edital',
    orgao: cleanStr(data.orgao, 120) || null,
    cargo: cleanStr(data.cargo, 120) || null,
    banca: bancaId || null,
    ano: /^\d{4}$/.test(String(data.ano || '').trim()) ? String(data.ano).trim() : null,
    verticalizado,
  };
}

/** Cruza um material de estudo com o edital verticalizado do aluno. */
export async function matchMaterialWithEdital(text, edital, userId, signal) {
  const vert = edital?.verticalizado || [];
  if (!vert.length) return null;
  const { data } = await runJSON('edital_match', {
    ...promptEditalMatch({ text, verticalizado: vert, titulo: edital.titulo }),
    maxTokens: 2200,
    userId,
    signal,
  }, editalMatchSchema);

  // Localiza a disciplina correspondente no edital para garantir IDs e contagens consistentes
  let disc = vert.find((d) => d.id.toLowerCase() === String(data.disciplina_id || '').toLowerCase())
    || vert.find((d) => norm(d.materia) === norm(data.disciplina_nome))
    || vert.find((d) => norm(d.materia).includes(norm(data.disciplina_nome)) || norm(data.disciplina_nome).includes(norm(d.materia)))
    || vert[0];

  const topicMap = new Map((disc.topicos || []).map((t) => [t.id.toUpperCase(), t]));
  const cobertos = [];
  const seenIds = new Set();

  for (const tc of data.topicos_cobertos || []) {
    const rawId = String(tc.id || '').toUpperCase().replace(/^\[|\]$/g, '').trim();
    let real = topicMap.get(rawId);
    if (!real) {
      const nTc = norm(tc.nome);
      real = (disc.topicos || []).find((t) => !seenIds.has(t.id) && (norm(t.nome) === nTc || norm(t.nome).includes(nTc) || nTc.includes(norm(t.nome))));
    }
    if (!real || seenIds.has(real.id)) continue;
    seenIds.add(real.id);
    cobertos.push({
      id: real.id,
      codigo: real.codigo,
      nome: real.nome,
      nivel_cobertura: tc.nivel_cobertura === 'completo' ? 'completo' : 'parcial',
      resumo: cleanStr(tc.resumo, 240),
    });
  }

  const faltantes = (disc.topicos || []).filter((t) => !seenIds.has(t.id)).map((t) => ({
    id: t.id,
    codigo: t.codigo,
    nome: t.nome,
  }));

  const totalDisc = (disc.topicos || []).length || 1;
  const pontos = cobertos.reduce((acc, c) => acc + (c.nivel_cobertura === 'completo' ? 1 : 0.5), 0);
  const pct = Math.min(100, Math.round((pontos / totalDisc) * 100));

  return {
    edital_id: edital.id,
    edital_titulo: edital.titulo,
    disciplina_id: disc.id,
    disciplina_nome: disc.materia,
    cobertura_disciplina_pct: pct,
    total_topicos_disciplina: totalDisc,
    topicos_cobertos: cobertos,
    topicos_faltantes: faltantes,
    analise: cleanStr(data.analise, 500),
  };
}

/** Tenta associar uma questão a um tópico do edital (por ID "[D1-T1]" ou por similaridade de texto). */
function resolveQuestionTopic(q, disc, allTopicsById) {
  const raw = String(q.topico_edital || q.topicoEdital || '').trim();
  if (raw) {
    const idMatch = raw.match(/\b(D\d+-T\d+)\b/i);
    if (idMatch && allTopicsById.has(idMatch[1].toUpperCase())) return allTopicsById.get(idMatch[1].toUpperCase());
    const nRaw = norm(raw);
    for (const t of allTopicsById.values()) {
      if (norm(t.nome) === nRaw || nRaw.includes(norm(t.nome)) || norm(t.nome).includes(nRaw)) return t;
    }
  }
  if (disc && q.tema) {
    const nTema = norm(q.tema);
    if (nTema.length >= 4) {
      const hit = (disc.topicos || []).find((t) => norm(t.nome).includes(nTema) || nTema.includes(norm(t.nome)));
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Calcula o avanço completo do aluno no edital:
 * - Cobertura por materiais enviados (completo/parcial por tópico)
 * - Questões geradas, respondidas e acertadas por tópico e por disciplina
 * - Status de cada tópico: pendente | estudado | praticado | dominado
 */
export async function buildEditalDashboard(edital, userId) {
  const [materials, sets, provasRows] = await Promise.all([
    materiaisRepo.listarParaPainel(userId),
    simuladosRepo.listarParaPainel(userId),
    provasRepo.doEdital(edital.id, edital.prova_id),
  ]);

  const linkedProvaIds = provasRows.map((p) => p.id);
  const realQuestions = (linkedProvaIds.length || edital.banca) ? await provasRepo.questoesParaIncidencia(linkedProvaIds, edital.banca) : [];

  const vert = edital.verticalizado || [];
  const allTopicsById = new Map();
  const topicStats = new Map();

  for (const d of vert) {
    for (const t of d.topicos || []) {
      const key = t.id.toUpperCase();
      const kw = norm(t.nome).split(' ').filter((w) => w.length >= 4);
      allTopicsById.set(key, { ...t, disciplinaId: d.id, materia: d.materia, kw });
      topicStats.set(key, {
        id: t.id,
        codigo: t.codigo,
        nome: t.nome,
        cobertura: null, // null | 'parcial' | 'completo'
        resumo: '',
        materiaisCount: 0,
        materiaisNomes: [],
        questoesGeradas: 0,
        questoesRespondidas: 0,
        questoesAcertos: 0,
        questoesNaBanca: 0,
      });
    }
  }

  // Cruza questões reais da banca/provas vinculadas com os tópicos do edital (Mapa de Calor da Banca)
  for (const rq of realQuestions) {
    const rqMat = norm(rq.materia);
    const rqTop = norm(rq.topico);
    const rqText = norm(`${rq.materia || ''} ${rq.topico || ''} ${rq.enunciado || ''}`);
    const disc = vert.find((d) => {
      const dm = norm(d.materia);
      return dm && rqMat && (dm === rqMat || dm.includes(rqMat) || rqMat.includes(dm));
    });
    const candidates = disc ? (disc.topicos || []) : vert.flatMap((d) => d.topicos || []);
    let bestKey = null, bestHits = 0;
    for (const t of candidates) {
      if (rqTop && (norm(t.nome) === rqTop || norm(t.nome).includes(rqTop) || rqTop.includes(norm(t.nome)))) {
        bestKey = t.id.toUpperCase();
        bestHits = 999;
        break;
      }
      const info = allTopicsById.get(t.id.toUpperCase());
      if (!info || !info.kw.length) continue;
      let hits = 0;
      for (const w of info.kw) if (rqText.includes(w)) hits++;
      if (hits > bestHits) { bestHits = hits; bestKey = t.id.toUpperCase(); }
    }
    if (bestKey && bestHits >= 1) {
      const st = topicStats.get(bestKey);
      if (st) st.questoesNaBanca++;
    }
  }

  // 1) Materiais que foram cruzados com este edital
  const linkedMatIds = new Set();
  for (const m of materials) {
    if (m.edital_id === edital.id && m.edital_match?.topicos_cobertos) {
      linkedMatIds.add(m.id);
      for (const tc of m.edital_match.topicos_cobertos) {
        const st = topicStats.get(String(tc.id || '').toUpperCase());
        if (!st) continue;
        st.materiaisCount++;
        const label = m.file_name || 'Resumo colado';
        if (!st.materiaisNomes.includes(label)) st.materiaisNomes.push(label);
        if (tc.nivel_cobertura === 'completo' || !st.cobertura) st.cobertura = tc.nivel_cobertura;
        if (!st.resumo && tc.resumo) st.resumo = tc.resumo;
      }
    }
  }

  // 2) Simulados vinculados ao edital, a um material do edital, ou da mesma disciplina do edital
  for (const s of sets) {
    const isLinked = s.edital_id === edital.id || (s.material_id && linkedMatIds.has(s.material_id));
    const disc = vert.find((d) => norm(d.materia) === norm(s.materia) || norm(d.materia).includes(norm(s.materia)) || norm(s.materia).includes(norm(d.materia)));
    if (!isLinked && !disc) continue;
    const resps = s.respostas || {};
    (s.questoes || []).forEach((q, idx) => {
      let top = resolveQuestionTopic(q, disc, allTopicsById);
      // Se o simulado foi feito sobre uma disciplina do edital e tem apenas 1 tópico coberto no material, associa a ele
      if (!top && disc && disc.topicos?.length === 1) top = disc.topicos[0];
      if (!top) return;
      const st = topicStats.get(top.id.toUpperCase());
      if (!st) return;
      st.questoesGeradas++;
      if (resps[idx] != null) {
        st.questoesRespondidas++;
        if (resps[idx] === q.gabarito) st.questoesAcertos++;
      }
    });
  }

  // 3) Consolida por disciplina e geral com Radar de Probabilidade da Banca (F6)
  let totalTopicos = 0, topicosEstudados = 0, topicosPraticados = 0, topicosDominados = 0;
  let pontosEstudo = 0, totalQuestoes = 0, totalRespondidas = 0, totalAcertos = 0;
  let totalQuestoesNaBancaEdital = 0;
  let sumRadarWeight = 0;
  let sumRadarScore = 0;
  const allEnrichedTopics = [];

  const disciplinas = vert.map((d) => {
    let dEstudados = 0, dPraticados = 0, dDominados = 0, dPontos = 0, dQGeradas = 0, dQResp = 0, dQAcertos = 0, dQBanca = 0;
    const rawDQBanca = (d.topicos || []).reduce((acc, t) => acc + (topicStats.get(t.id.toUpperCase())?.questoesNaBanca || 0), 0);
    const dPeso = Number(d.peso) || 1;

    const topicos = (d.topicos || []).map((t) => {
      const st = topicStats.get(t.id.toUpperCase());
      const estudado = !!st.cobertura;
      const praticado = st.questoesRespondidas > 0;
      const taxaAcerto = st.questoesRespondidas > 0 ? Math.round((st.questoesAcertos / st.questoesRespondidas) * 100) : null;
      const dominado = praticado && taxaAcerto >= 70 && (st.questoesRespondidas >= 2 || estudado);
      const status = dominado ? 'dominado' : praticado ? 'praticado' : estudado ? 'estudado' : 'pendente';
      const incidenciaBanca = st.questoesNaBanca >= 3 ? 'alta' : st.questoesNaBanca >= 1 ? 'media' : null;

      // Radar F6: Probabilidade na banca e Prioridade de estudo
      const probBancaPct = rawDQBanca > 0
        ? Math.round((st.questoesNaBanca / rawDQBanca) * 100)
        : Math.round(100 / Math.max(1, (d.topicos || []).length));

      let relevanciaBanca = 'baixa';
      if (st.questoesNaBanca >= 5 || (rawDQBanca > 0 && probBancaPct >= 30 && st.questoesNaBanca >= 2)) relevanciaBanca = 'muito_alta';
      else if (st.questoesNaBanca >= 2 || (rawDQBanca > 0 && probBancaPct >= 15 && st.questoesNaBanca >= 1)) relevanciaBanca = 'alta';
      else if (st.questoesNaBanca >= 1 || (rawDQBanca > 0 && probBancaPct >= 8 && st.questoesNaBanca >= 1)) relevanciaBanca = 'media';

      let prioridade = 'secundaria';
      if ((relevanciaBanca === 'muito_alta' || relevanciaBanca === 'alta') && (taxaAcerto === null || taxaAcerto < 60)) {
        prioridade = 'critica';
      } else if (((relevanciaBanca === 'muito_alta' || relevanciaBanca === 'alta') && taxaAcerto >= 60 && taxaAcerto < 75) ||
                 (relevanciaBanca === 'media' && (taxaAcerto === null || taxaAcerto < 70))) {
        prioridade = 'reforco';
      } else if (taxaAcerto !== null && taxaAcerto >= 75 && praticado) {
        prioridade = 'segura';
      }

      const prioridadeLabels = {
        critica: '🚨 Prioridade Máxima',
        reforco: '⚠️ Reforçar',
        segura: '✅ Zona Segura',
        secundaria: '☕ Secundário',
      };
      const prioridadeLabel = prioridadeLabels[prioridade] || '☕ Secundário';

      // Ponderação para o Índice de Prontidão da Prova
      const topicWeight = Math.max(1, st.questoesNaBanca) * dPeso;
      const studentScore = taxaAcerto != null ? taxaAcerto : (estudado ? 35 : 0);
      sumRadarWeight += topicWeight;
      sumRadarScore += topicWeight * studentScore;

      totalTopicos++;
      const pt = st.cobertura === 'completo' ? 1 : st.cobertura === 'parcial' ? 0.5 : praticado ? 0.5 : 0;
      dPontos += pt;
      pontosEstudo += pt;
      if (estudado || praticado) { dEstudados++; topicosEstudados++; }
      if (praticado) { dPraticados++; topicosPraticados++; }
      if (dominado) { dDominados++; topicosDominados++; }
      dQGeradas += st.questoesGeradas;
      dQResp += st.questoesRespondidas;
      dQAcertos += st.questoesAcertos;
      dQBanca += st.questoesNaBanca;
      totalQuestoes += st.questoesGeradas;
      totalRespondidas += st.questoesRespondidas;
      totalAcertos += st.questoesAcertos;
      totalQuestoesNaBancaEdital += st.questoesNaBanca;

      const topicItem = {
        ...st,
        materia: d.materia,
        disciplinaId: d.id,
        pesoDisciplina: dPeso,
        taxaAcerto,
        status,
        incidenciaBanca,
        probBancaPct,
        relevanciaBanca,
        prioridade,
        prioridadeLabel,
      };

      allEnrichedTopics.push(topicItem);
      return topicItem;
    });

    const nTop = topicos.length || 1;
    return {
      id: d.id,
      materia: d.materia,
      peso: dPeso,
      totalTopicos: topicos.length,
      estudados: dEstudados,
      praticados: dPraticados,
      dominados: dDominados,
      coberturaPct: Math.min(100, Math.round((dPontos / nTop) * 100)),
      questoesGeradas: dQGeradas,
      questoesRespondidas: dQResp,
      questoesAcertos: dQAcertos,
      questoesNaBanca: dQBanca,
      taxaAcerto: dQResp > 0 ? Math.round((dQAcertos / dQResp) * 100) : null,
      topicos,
    };
  });

  const denom = totalTopicos || 1;
  const indiceProntidao = sumRadarWeight > 0 ? Math.min(100, Math.round(sumRadarScore / sumRadarWeight)) : 0;
  let prontidaoFaixa = 'Risco Alto';
  let prontidaoCor = 'var(--bad)';
  if (indiceProntidao >= 85) { prontidaoFaixa = 'Zona de Aprovação'; prontidaoCor = 'var(--ok)'; }
  else if (indiceProntidao >= 70) { prontidaoFaixa = 'Competitivo'; prontidaoCor = 'var(--brand)'; }
  else if (indiceProntidao >= 50) { prontidaoFaixa = 'Em Evolução'; prontidaoCor = 'var(--accent)'; }

  const topUrgentes = allEnrichedTopics
    .filter((t) => t.prioridade === 'critica')
    .sort((a, b) => b.questoesNaBanca - a.questoesNaBanca || (a.taxaAcerto ?? 0) - (b.taxaAcerto ?? 0))
    .slice(0, 6);

  const topMaisCobrados = allEnrichedTopics
    .filter((t) => t.questoesNaBanca > 0)
    .sort((a, b) => b.questoesNaBanca - a.questoesNaBanca)
    .slice(0, 6);

  const distribuicaoPrioridades = {
    critica: allEnrichedTopics.filter((t) => t.prioridade === 'critica').length,
    reforco: allEnrichedTopics.filter((t) => t.prioridade === 'reforco').length,
    segura: allEnrichedTopics.filter((t) => t.prioridade === 'segura').length,
    secundaria: allEnrichedTopics.filter((t) => t.prioridade === 'secundaria').length,
  };

  const radar = {
    indiceProntidao,
    prontidaoFaixa,
    prontidaoCor,
    totalQuestoesNaBanca: totalQuestoesNaBancaEdital,
    distribuicaoPrioridades,
    topUrgentes,
    topMaisCobrados,
  };
  const materiaisVinculados = materials
    .filter((m) => m.edital_id === edital.id)
    .map((m) => ({
      id: m.id,
      fileName: m.file_name || 'Resumo colado',
      materia: m.materia,
      coberturaPct: m.edital_match?.cobertura_disciplina_pct ?? 0,
      topicosCount: (m.edital_match?.topicos_cobertos || []).length,
      createdAt: m.created_at,
    }));
  const provasVinculadas = provasRows.map((p) => ({
    id: p.id,
    banca: p.banca,
    titulo: p.titulo || p.file_name,
    status: p.status,
    statusLabel: publicStatus[p.status] || p.status,
    numQuestoes: p.num_questoes,
    createdAt: p.created_at,
  }));

  return {
    id: edital.id,
    titulo: edital.titulo,
    orgao: edital.orgao,
    cargo: edital.cargo,
    banca: edital.banca,
    ano: edital.ano,
    provaId: edital.prova_id || null,
    fileName: edital.file_name,
    pages: edital.pages,
    active: edital.active,
    officialUrl: edital.official_url || null,
    oficialConfirmado: !!edital.oficial_confirmado,
    officialUrlTipo: edital.official_url_tipo || null,
    createdAt: edital.created_at,
    provasVinculadas,
    materiaisVinculados,
    resumo: {
      totalDisciplinas: disciplinas.length,
      totalTopicos,
      topicosEstudados,
      topicosPraticados,
      topicosDominados,
      coberturaPct: Math.min(100, Math.round((pontosEstudo / denom) * 100)),
      praticadoPct: Math.round((topicosPraticados / denom) * 100),
      dominadoPct: Math.round((topicosDominados / denom) * 100),
      questoesGeradas: totalQuestoes,
      questoesRespondidas: totalRespondidas,
      questoesAcertos: totalAcertos,
      taxaAcertoGeral: totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : null,
      radar,
    },
    disciplinas,
  };
}


/**
 * Edital canônico (Fase 1 da base de conhecimento): o mesmo edital — mesmo texto e mesmo cargo pedido —
 * é extraído pela IA uma única vez; os próximos alunos reaproveitam o resultado (custo zero, resposta na hora).
 * Disciplinas e tópicos ganham o ID da taxonomia própria (materiaId/topicoId).
 */
async function parseEditalCanonico(text, fileName, userId, signal, meta) {
  const chave = crypto.createHash('sha256').update(normNome(text)).update(`|cargo:${normNome(meta.cargo)}`).digest('hex');
  const hit = await editaisRepo.usarCanonico(chave);
  if (hit) {
    if (!hit.official_url && meta.officialUrl && meta.oficialConfirmado) {
      await editaisRepo.confirmarFonteDoCanonico(hit.id, meta.officialUrl, meta.officialUrlTipo);
    }
    return {
      parsed: { titulo: hit.titulo, orgao: hit.orgao, cargo: hit.cargo, banca: hit.banca, ano: hit.ano, verticalizado: hit.verticalizado },
      canonicoId: hit.id,
      reaproveitado: true,
    };
  }
  const parsed = await parseEdital(text, fileName, userId, signal, meta);
  if (!parsed.verticalizado.length) return { parsed, canonicoId: null, reaproveitado: false };
  for (const d of parsed.verticalizado) {
    d.materiaId = await materiaId(d.materia);
    for (const t of d.topicos) t.topicoId = await topicoId(d.materiaId, t.nome);
  }
  const row = await editaisRepo.inserirCanonico({
    chave, titulo: parsed.titulo, orgao: parsed.orgao, cargo: parsed.cargo, banca: parsed.banca, ano: parsed.ano,
    verticalizado: parsed.verticalizado, promptVersao: PROMPT_VERSAO.edital_parse,
    ...(meta.oficialConfirmado ? { officialUrl: meta.officialUrl, oficialConfirmado: true, officialUrlTipo: meta.officialUrlTipo } : {}),
  });
  return { parsed, canonicoId: row.id, reaproveitado: false };
}

const words = (t) => (String(t).match(/\S+/g) || []).length;

/**
 * Cria e verticaliza um edital (via arquivo ou texto), vinculando opcionalmente à banca e à prova.
 */
export async function createEditalForUser({ user, file, text: rawText, banca, orgao, cargo, ano, provaId, ip, signal, officialUrl = null, oficialConfirmado = false, officialUrlTipo = null }) {
  await assertLimitePlano(user, 'editais');
  let text, pages = null, sha = null, ocr = false, warnings = [], security;
  if (file) {
    const s = await secureUpload(file.buffer, file.name, 'material', { ocr: 'full', userId: user.id, ip, signal });
    ({ text, pages } = s); sha = s.sha256; ocr = s.ocrDone;
    if (s.removed.length) warnings.push(`Removemos ${s.removed.length} trecho(s) suspeito(s) do edital.`);
    if (ocr) warnings.push('Edital escaneado: o texto foi lido por OCR.');
    security = { findings: s.findings, decision: s.decision };
  } else {
    const raw = String(rawText || '').slice(0, 400000);
    const scan = scanText(raw, { where: 'edital_colado' });
    const d = decide('material', scan.findings);
    if (d.verdict === 'block') {
      await logSecurityEvent({ userId: user.id, kind: 'edital_bloqueado', severity: d.severity, fileName: 'edital colado', details: { findings: scan.findings }, ip });
      throw new HttpError(422, 'Não aceitamos este texto: ele contém instruções que tentam manipular o sistema.');
    }
    text = scan.text;
    if (d.verdict === 'sanitize') {
      const s2 = sanitizeText(text);
      text = s2.text;
      if (s2.removed.length) warnings.push(`Removemos ${s2.removed.length} trecho(s) suspeito(s).`);
    }
    security = { findings: scan.findings, decision: d };
  }

  if (words(text) < 40) throw new HttpError(422, 'O edital tem pouco texto para extrair o conteúdo programático (mínimo de 40 palavras).');

  const fileKey = file ? await putFile(makeKey(`editais/${user.id}`, file.name), file.buffer, file.mime) : null;
  try {
    const { parsed, canonicoId, reaproveitado } = await parseEditalCanonico(text, file?.name || [orgao, cargo, ano].filter(Boolean).join(' · ') || 'Edital', user.id, signal, { banca, orgao, cargo, ano, officialUrl, oficialConfirmado, officialUrlTipo });
    if (reaproveitado) warnings.push('Este edital já tinha sido lido antes: reaproveitamos o conteúdo programático na hora.');
    if (!parsed.verticalizado.length) throw new HttpError(422, 'Não conseguimos identificar as disciplinas e tópicos neste arquivo. Envie o edital ou o anexo de conteúdo programático.');

    const finalBanca = (banca && BANCA[banca]) ? banca : parsed.banca;
    const finalOrgao = cleanStr(orgao, 120) || parsed.orgao;
    const finalCargo = cleanStr(cargo, 120) || parsed.cargo;
    const finalAno = /^\d{4}$/.test(String(ano || '').trim()) ? String(ano).trim() : parsed.ano;
    const finalTitulo = ([finalOrgao, finalCargo, finalAno].filter(Boolean).length >= 2)
      ? [finalOrgao, finalCargo, finalAno].filter(Boolean).join(' · ')
      : parsed.titulo;

    await editaisRepo.desativarTodos(user.id);
    // Só vincula a uma prova enviada pelo próprio aluno (ou qualquer uma, se for admin)
    const validProvaId = /^[0-9a-f-]{36}$/i.test(String(provaId || '')) ? await provasRepo.idEnviadaPor(provaId, user.id, user.role === 'ADMIN') : null;
    const e = await editaisRepo.inserir({
      userId: user.id, titulo: finalTitulo, orgao: finalOrgao, cargo: finalCargo, banca: finalBanca, ano: finalAno, provaId: validProvaId,
      fileName: file?.name || null, fileKey, mimeType: file?.mime || null, size: file?.buffer.length || null, pages, text, wordCount: words(text),
      verticalizado: parsed.verticalizado, sha256: sha, security, ocr, canonicoId, officialUrl, oficialConfirmado, officialUrlTipo,
    });
    if (validProvaId) await provasRepo.vincularEdital(validProvaId, e.id, user.id);
    return { editalRow: e, warnings, reaproveitado };
  } catch (err) {
    await deleteFile(fileKey);
    throw err;
  }
}

const STOP_WORDS = new Set(['para', 'como', 'mais', 'pelo', 'pela', 'seus', 'suas', 'sobre', 'entre', 'apos', 'ante', 'cada', 'qual', 'quais', 'quando', 'onde', 'porque', 'este', 'esta', 'esse', 'essa', 'isso', 'aquilo', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'nocoes']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Formato de uma questão real, pelo que ela é (não pelo edital): C/E sem alternativas e gabarito C/E; ME com 2+ alternativas e letra
const formatoDaQuestao = (q) => {
  const alts = Array.isArray(q.alternativas) ? q.alternativas : [];
  const g = String(q.gabarito || '').trim().toUpperCase();
  if (!alts.length && /^[CE]$/.test(g)) return 'ce';
  if (alts.length >= 2 && /^[A-E]$/.test(g) && 'ABCDE'.indexOf(g) < alts.length) return 'me';
  return null; // inconsistente (ex.: sem alternativas e gabarito "B") — fica de fora
};

/**
 * Questões reais de provas anteriores para um tópico do edital verticalizado.
 * nivel = 'topico' (rótulo/tópico da taxonomia ou palavras do tópico no enunciado) ou 'disciplina' (só a matéria bate).
 * Sem banca no edital, só entram provas vinculadas a ele (não mistura bancas).
 */
export async function getQuestoesReaisDoTopico(edital, topicoIdOrCode, limite = 20, { formato = null } = {}) {
  const vert = edital?.verticalizado || [];
  let targetTopico = null;
  let targetDisciplina = null;
  for (const d of vert) {
    targetTopico = (d.topicos || []).find((t) => t.id === topicoIdOrCode || t.codigo === topicoIdOrCode || norm(t.nome) === norm(topicoIdOrCode)) || null;
    if (targetTopico) { targetDisciplina = d; break; }
  }
  if (!targetTopico || !targetDisciplina) return null;

  const kw = norm(targetTopico.nome).split(' ').filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  const pool = await provasRepo.questoesReaisDoTopico({
    editalId: edital.id, provaOrigemId: edital.prova_id, banca: edital.banca,
    topicoId: targetTopico.topicoId, topicoNome: targetTopico.nome, materia: targetDisciplina.materia,
  });

  const avaliadas = pool.map((q) => {
    const texto = norm(`${q.topico || ''} ${q.enunciado || ''}`);
    const hits = kw.filter((w) => texto.includes(w)).length;
    const doTopico = (targetTopico.topicoId && q.topico_id === targetTopico.topicoId) || (q.topico && norm(q.topico).includes(norm(targetTopico.nome))) || hits >= Math.min(2, kw.length || 1);
    return { ...q, nivel: doTopico ? 'topico' : 'disciplina', formato: formatoDaQuestao(q), _score: (doTopico ? 100 : 0) + (q.vinculada ? 10 : 0) + hits * 3 };
  }).filter((q) => q.formato && (!formato || q.formato === formato));
  // Ordem determinística (sem sorteio): mais aderentes primeiro; empate pelo id
  avaliadas.sort((a, b) => b._score - a._score || String(a.id).localeCompare(String(b.id)));

  const selecionadas = avaliadas.slice(0, limite).map((q) => ({
    id: q.id,
    numero: q.numero || null,
    provaId: q.prova_id,
    provaTitulo: q.prova_titulo || q.file_name || 'Prova anterior',
    provaAno: q.prova_ano || null,
    banca: q.banca,
    materia: q.materia,
    enunciado: q.enunciado,
    alternativas: Array.isArray(q.alternativas) ? q.alternativas : [],
    gabarito: String(q.gabarito).trim().toUpperCase(),
    formato: q.formato,
    nivel: q.nivel,
    comando: q.comando || null,
    pegadinha: q.pegadinha_tipo || null,
    habilidade: q.habilidade || null,
    dispositivos: Array.isArray(q.dispositivos) ? q.dispositivos : [],
  }));

  return {
    topico: { id: targetTopico.id, codigo: targetTopico.codigo, nome: targetTopico.nome, topicoId: targetTopico.topicoId || null },
    disciplina: { id: targetDisciplina.id, materia: targetDisciplina.materia, materiaId: targetDisciplina.materiaId || null },
    total: selecionadas.length,
    doTopico: avaliadas.filter((q) => q.nivel === 'topico').length,
    daDisciplina: avaliadas.filter((q) => q.nivel === 'disciplina').length,
    questoes: selecionadas,
  };
}

/**
 * Cria um question_set com questões reais da banca filtradas pelo tópico (custo US$ 0 de IA).
 * Um simulado tem um formato só: o da banca do edital; sem banca, o formato mais comum entre as questões encontradas.
 */
export async function criarSimuladoQuestoesReais({ user, edital, topicoIdOrCode, limite = 10, cadernoId = null }) {
  // Caderno só do próprio aluno (C1)
  let targetCadernoId = null;
  if (cadernoId) {
    const cad = UUID_RE.test(String(cadernoId)) ? await cadernosRepo.buscar(cadernoId, user.id) : null;
    if (!cad) throw new HttpError(404, 'Caderno não encontrado.');
    targetCadernoId = cad.id;
  }

  let formato = BANCA[edital.banca]?.formato || null;
  if (!formato) {
    const amostra = await getQuestoesReaisDoTopico(edital, topicoIdOrCode, 400);
    const ce = (amostra?.questoes || []).filter((q) => q.formato === 'ce').length;
    formato = ce > (amostra?.questoes || []).length / 2 ? 'ce' : 'me';
  }
  const result = await getQuestoesReaisDoTopico(edital, topicoIdOrCode, limite, { formato });
  if (!result || !result.questoes.length) {
    return { created: false, count: 0, message: 'Nenhuma questão real da banca encontrada para este tópico no momento.', topico: result?.topico || null };
  }

  const { topico, disciplina, questoes } = result;
  const formattedQuestoes = questoes.map((q) => ({
    id: q.id,
    provaId: q.provaId,
    provaTitulo: q.provaTitulo,
    provaAno: q.provaAno,
    enunciado: q.enunciado,
    alternativas: formato === 'ce' ? [] : q.alternativas,
    gabarito: q.gabarito,
    comentario: `Questão real de ${q.provaTitulo}${q.provaAno ? ' (' + q.provaAno + ')' : ''}.${q.comando && COMANDOS[q.comando] ? ' Comando: ' + COMANDOS[q.comando] + '.' : ''}${q.nivel === 'disciplina' ? ' Questão da disciplina, não necessariamente deste tópico.' : ''}`,
    tema: q.nivel === 'topico' ? topico.nome : disciplina.materia,
    // Só atribui ao tópico do edital o que é do tópico (C3)
    topico_edital: q.nivel === 'topico' ? `${topico.codigo ? topico.codigo + ' ' : ''}${topico.nome}` : '',
    nivel: 'Prova real',
    pegadinha: q.pegadinha && PEGADINHAS[q.pegadinha] ? PEGADINHAS[q.pegadinha] : '',
    dispositivos: q.dispositivos || [],
    verificada: true,
    ancorada: true,
  }));

  if (!targetCadernoId) targetCadernoId = await cadernosRepo.maisRecenteDoEdital(user.id, edital.id);
  const taxTopicoId = topico.topicoId || (disciplina.materiaId ? await topicoId(disciplina.materiaId, topico.nome) : null);

  // Edital sem banca: banca nula (antes forçava 'cebraspe' — R10 tinha corrigido só o Simulado Prova Real)
  const setRow = await simuladosRepo.inserir({
    user_id: user.id, caderno_id: targetCadernoId, edital_id: edital.id, banca: edital.banca || null, materia: disciplina.materia,
    assunto: topico.nome, nivel: 'Prova real', formato, arquivo: `${edital.titulo || 'Edital'} · Questões reais da banca`,
    questoes: formattedQuestoes, respostas: {}, finalizado: false, model: 'prova_real', origem: 'prova_real',
    topico_id: taxTopicoId, topico_codigo: topico.codigo || topico.id,
  });
  if (targetCadernoId) await cadernosRepo.tocar(targetCadernoId);

  const doTopico = formattedQuestoes.filter((q) => q.topico_edital).length;
  return { created: true, set: setRow, count: formattedQuestoes.length, doTopico, daDisciplina: formattedQuestoes.length - doTopico, topico, disciplina, cadernoId: targetCadernoId };
}

/**
 * Cria um simulado completo no formato da prova real (F3):
 * - Distribui as questões entre as disciplinas do edital verticalizado conforme os pesos
 * - Prioriza questões reais da banca de provas anteriores (custo US$ 0 de IA)
 * - Define formato da banca (ex: CEBRASPE = C/E, FGV/FCC = Múltipla Escolha)
 * - Configura modo_prova = true com tempo limite (cronômetro) e rastreamento de dúvidas
 */
export async function criarSimuladoProvaReal({
  user,
  edital,
  qtdTotal = 30,
  tempoMinutos = 120,
  cadernoId = null,
}) {
  let targetCadernoId = null;
  if (cadernoId) {
    const cad = UUID_RE.test(String(cadernoId)) ? await cadernosRepo.buscar(cadernoId, user.id) : null;
    if (!cad) throw new HttpError(404, 'Caderno não encontrado.');
    targetCadernoId = cad.id;
  }
  if (!targetCadernoId) targetCadernoId = await cadernosRepo.maisRecenteDoEdital(user.id, edital.id);

  let formato = BANCA[edital.banca]?.formato || null;
  if (!formato) {
    formato = (edital.banca && edital.banca.toLowerCase().includes('cebraspe')) ? 'ce' : 'me';
  }

  // R10: Buscar questões já resolvidas ou geradas para o aluno neste edital/caderno para priorizar ineditismo
  const jaUsadas = await simuladosRepo.idsDeQuestoesJaUsadas(user.id, edital.id, targetCadernoId);
  const jaUsadasSet = new Set(jaUsadas);

  const vert = Array.isArray(edital.verticalizado) ? edital.verticalizado : [];
  if (!vert.length) {
    throw new HttpError(422, 'O edital não possui disciplinas verticalizadas para montar o simulado.');
  }

  const totalPeso = vert.reduce((acc, d) => acc + Math.max(1, Number(d.peso) || 1), 0);
  const metasPorDisciplina = vert.map((d) => {
    const p = Math.max(1, Number(d.peso) || 1);
    const alvo = Math.max(1, Math.round((p / totalPeso) * qtdTotal));
    return { disciplina: d, peso: p, alvo };
  });

  let somaAlvos = metasPorDisciplina.reduce((a, b) => a + b.alvo, 0);
  while (somaAlvos > qtdTotal) {
    const maior = metasPorDisciplina.filter((m) => m.alvo > 1).sort((a, b) => b.alvo - a.alvo)[0];
    if (!maior) break;
    maior.alvo--;
    somaAlvos--;
  }
  while (somaAlvos < qtdTotal) {
    const maiorPeso = [...metasPorDisciplina].sort((a, b) => b.peso - a.peso)[0];
    if (!maiorPeso) break;
    maiorPeso.alvo++;
    somaAlvos++;
  }

  const selectedQuestoes = [];
  const questoesUsadasIds = new Set();
  const resumoDisciplinas = [];

  for (const meta of metasPorDisciplina) {
    const d = meta.disciplina;
    const dMatId = await materiaId(d.materia);

    // R10: Casar matéria estritamente pela taxonomia e nome completo (evita que %Direito% misture penal com constitucional)
    const pool = await provasRepo.questoesReaisDaDisciplina({
      editalId: edital.id, provaOrigemId: edital.prova_id, banca: edital.banca,
      materiaId: dMatId !== 'outra' ? dMatId : null, materia: d.materia, jaUsadas,
    });

    const validas = pool
      .map((q) => ({ ...q, formato: formatoDaQuestao(q) }))
      .filter((q) => q.formato === formato && !questoesUsadasIds.has(q.id));

    const pontuadas = validas.map((q) => {
      const qText = norm(`${q.topico || ''} ${q.enunciado || ''}`);
      let bestTopico = null;
      let bestHits = 0;
      for (const t of (d.topicos || [])) {
        const kw = norm(t.nome).split(' ').filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
        const hits = kw.filter((w) => qText.includes(w)).length;
        if (hits > bestHits) {
          bestHits = hits;
          bestTopico = t;
        }
      }
      const jaFeita = jaUsadasSet.has(q.id);
      return {
        ...q,
        topicoEdital: bestTopico ? `${bestTopico.codigo ? bestTopico.codigo + ' ' : ''}${bestTopico.nome}` : '',
        topicoNome: bestTopico ? bestTopico.nome : (q.topico || d.materia),
        // R10: Questões ainda não feitas pelo aluno recebem prioridade máxima (+40 pontos)
        _score: (bestHits > 0 ? 50 : 0) + (q.vinculada ? 20 : 0) + (jaFeita ? 0 : 40),
        _rnd: Math.random(),
      };
    });

    // R10: Desempata com aleatoriedade controlada para não entregar sempre a mesma fatia
    pontuadas.sort((a, b) => b._score - a._score || a._rnd - b._rnd);

    const escolhidas = pontuadas.slice(0, meta.alvo);
    for (const q of escolhidas) {
      questoesUsadasIds.add(q.id);
      selectedQuestoes.push({
        ...q,
        disciplinaMateria: d.materia,
        disciplinaId: d.id,
      });
    }

    resumoDisciplinas.push({
      disciplinaId: d.id,
      materia: d.materia,
      peso: meta.peso,
      alvo: meta.alvo,
      obtidas: escolhidas.length,
    });
  }

  if (!selectedQuestoes.length) {
    return {
      created: false,
      message: 'Nenhuma questão real da banca encontrada para as matérias deste edital no momento.',
      resumoDisciplinas,
    };
  }

  const formattedQuestoes = selectedQuestoes.map((q, idx) => ({
    id: q.id,
    numero: idx + 1,
    provaId: q.prova_id,
    provaTitulo: q.prova_titulo || q.file_name || 'Prova anterior',
    provaAno: q.prova_ano || null,
    banca: q.banca,
    materia: q.disciplinaMateria,
    tema: q.topicoNome || q.disciplinaMateria,
    topico_edital: q.topicoEdital || '',
    enunciado: q.enunciado,
    alternativas: formato === 'ce' ? [] : (Array.isArray(q.alternativas) ? q.alternativas : []),
    gabarito: String(q.gabarito).trim().toUpperCase(),
    comentario: `Questão real de ${q.prova_titulo || 'prova anterior'}${q.prova_ano ? ' (' + q.prova_ano + ')' : ''}.${q.comando && COMANDOS[q.comando] ? ' Comando: ' + COMANDOS[q.comando] + '.' : ''}`,
    nivel: 'Prova real',
    pegadinha: q.pegadinha_tipo && PEGADINHAS[q.pegadinha_tipo] ? PEGADINHAS[q.pegadinha_tipo] : '',
    dispositivos: Array.isArray(q.dispositivos) ? q.dispositivos : [],
    verificada: true,
    ancorada: true,
  }));

  const estatisticasIniciais = {
    distribuicaoDisciplinas: resumoDisciplinas.map((r) => ({
      disciplinaId: r.disciplinaId,
      materia: r.materia,
      peso: r.peso,
      totalQuestoes: formattedQuestoes.filter((q) => q.materia === r.materia).length,
      respondidas: 0,
      acertos: 0,
      erros: 0,
    })),
    tempoLimiteMinutos: tempoMinutos > 0 ? Number(tempoMinutos) : null,
    tempoGastoSegundos: 0,
  };

  const setRow = await simuladosRepo.inserir({
    user_id: user.id, caderno_id: targetCadernoId, edital_id: edital.id, banca: edital.banca || null,
    materia: edital.titulo || 'Simulado Geral', assunto: `${edital.orgao || ''} ${edital.cargo || ''} · Simulado Prova Real`.trim(),
    nivel: 'Prova real', formato, arquivo: `Simulado Prova Real · ${edital.titulo || 'Edital'}`,
    questoes: formattedQuestoes, respostas: {}, finalizado: false, model: 'prova_real', origem: 'prova_real',
    modo_prova: true, tempo_limite_minutos: tempoMinutos > 0 ? Number(tempoMinutos) : null, tempo_gasto_segundos: 0, duvidas: [],
    estatisticas: estatisticasIniciais,
  });

  if (targetCadernoId) await cadernosRepo.tocar(targetCadernoId);

  return {
    created: true,
    set: setRow,
    count: formattedQuestoes.length,
    formato,
    tempoMinutos: tempoMinutos > 0 ? Number(tempoMinutos) : null,
    distribuicao: resumoDisciplinas,
    cadernoId: targetCadernoId,
  };
}

// ---------- Operações da rota de editais (sem SQL na rota) ----------

export async function editalDoAluno(user, id) {
  const e = await editaisRepo.buscar(id, user.id);
  if (!e) throw new HttpError(404, 'Edital não encontrado.');
  return e;
}

/** Editais do aluno e o painel do ativo (ou do mais recente). */
export async function listarEditais(user) {
  const rows = await editaisRepo.listar(user.id);
  const ativo = rows.find((x) => x.active) || rows[0] || null;
  return { rows, active: ativo ? await buildEditalDashboard(ativo, user.id) : null };
}

export async function ativarEdital(user, id) {
  const e = await editalDoAluno(user, id);
  await editaisRepo.ativar(e.id, user.id);
  return buildEditalDashboard({ ...e, active: true }, user.id);
}

/** Exclui o edital (e o arquivo); se era o ativo, o mais recente passa a ser. */
export async function excluirEdital(user, id) {
  const e = await editaisRepo.excluir(id, user.id);
  if (!e) return;
  await deleteFile(e.file_key);
  if (e.active) await editaisRepo.ativarMaisRecente(user.id);
}
