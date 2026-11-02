// =====================================================================
// Serviço de Editais Verticalizados e Cruzamento (Material × Edital × Questões)
// =====================================================================
import { one, many, query } from '../db.js';
import { runJSON } from '../ai/index.js';
import { editalParseSchema, editalMatchSchema } from '../ai/schemas.js';
import crypto from 'node:crypto';
import { promptEditalParse, promptEditalMatch, PROMPT_VERSAO } from '../lib/prompts.js';
import { normNome, materiaId, topicoId } from './taxonomia.js';
import { BANCA, MATERIAS } from '../lib/bancas.js';
import { secureUpload, scanText, SEV, logSecurityEvent } from '../security/index.js';
import { sanitizeText } from '../security/text-scan.js';
import { decide } from '../security/policy.js';
import { putFile, makeKey, deleteFile } from '../lib/storage.js';
import { HttpError } from '../lib/http.js';
import { publicStatus } from './provas.js';

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
    many('SELECT id, file_name, materia, assunto, edital_id, edital_match, created_at FROM materials WHERE user_id=$1 ORDER BY created_at DESC', [userId]),
    many('SELECT id, material_id, edital_id, banca, materia, assunto, questoes, respostas, finalizado, created_at FROM question_sets WHERE user_id=$1 ORDER BY created_at DESC', [userId]),
    many('SELECT id, banca, titulo, file_name, status, num_questoes, created_at FROM provas WHERE edital_id=$1 OR id=$2 ORDER BY created_at DESC', [edital.id, edital.prova_id || null]),
  ]);

  const linkedProvaIds = provasRows.map((p) => p.id);
  const realQuestions = (linkedProvaIds.length || edital.banca)
    ? await many(
      `SELECT q.materia, q.enunciado FROM prova_questoes q JOIN provas p ON p.id=q.prova_id
       WHERE NOT q.flagged AND p.status='READY' AND (p.id = ANY($1::uuid[]) OR ($2::text IS NOT NULL AND q.banca=$2))
       LIMIT 400`,
      [linkedProvaIds, edital.banca || null]
    )
    : [];

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
    const rqText = norm(`${rq.materia || ''} ${rq.enunciado || ''}`);
    const disc = vert.find((d) => {
      const dm = norm(d.materia);
      return dm && rqMat && (dm === rqMat || dm.includes(rqMat) || rqMat.includes(dm));
    });
    const candidates = disc ? (disc.topicos || []) : vert.flatMap((d) => d.topicos || []);
    let bestKey = null, bestHits = 0;
    for (const t of candidates) {
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

  // 3) Consolida por disciplina e geral
  let totalTopicos = 0, topicosEstudados = 0, topicosPraticados = 0, topicosDominados = 0;
  let pontosEstudo = 0, totalQuestoes = 0, totalRespondidas = 0, totalAcertos = 0;

  const disciplinas = vert.map((d) => {
    let dEstudados = 0, dPraticados = 0, dDominados = 0, dPontos = 0, dQGeradas = 0, dQResp = 0, dQAcertos = 0, dQBanca = 0;
    const topicos = (d.topicos || []).map((t) => {
      const st = topicStats.get(t.id.toUpperCase());
      const estudado = !!st.cobertura;
      const praticado = st.questoesRespondidas > 0;
      const taxaAcerto = st.questoesRespondidas > 0 ? Math.round((st.questoesAcertos / st.questoesRespondidas) * 100) : null;
      const dominado = praticado && taxaAcerto >= 70 && (st.questoesRespondidas >= 2 || estudado);
      const status = dominado ? 'dominado' : praticado ? 'praticado' : estudado ? 'estudado' : 'pendente';
      const incidenciaBanca = st.questoesNaBanca >= 3 ? 'alta' : st.questoesNaBanca >= 1 ? 'media' : null;

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

      return { ...st, taxaAcerto, status, incidenciaBanca };
    });

    const nTop = topicos.length || 1;
    return {
      id: d.id,
      materia: d.materia,
      peso: d.peso || 1,
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
  const hit = await one('UPDATE editais_canonicos SET usos=usos+1, updated_at=now() WHERE chave=$1 RETURNING *', [chave]);
  if (hit) {
    if (!hit.official_url && meta.officialUrl && meta.oficialConfirmado) {
      await query('UPDATE editais_canonicos SET official_url=$2, oficial_confirmado=true, official_url_tipo=$3 WHERE id=$1', [hit.id, meta.officialUrl, meta.officialUrlTipo]);
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
  const row = await one(
    `INSERT INTO editais_canonicos(chave,titulo,orgao,cargo,banca,ano,verticalizado,prompt_versao,official_url,oficial_confirmado,official_url_tipo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (chave) DO UPDATE SET usos = editais_canonicos.usos + 1, updated_at = now() RETURNING id`,
    [chave, parsed.titulo, parsed.orgao, parsed.cargo, parsed.banca, parsed.ano, JSON.stringify(parsed.verticalizado), PROMPT_VERSAO.edital_parse,
     ...(meta.oficialConfirmado ? [meta.officialUrl, true, meta.officialUrlTipo] : [null, false, null])]
  );
  return { parsed, canonicoId: row.id, reaproveitado: false };
}

const words = (t) => (String(t).match(/\S+/g) || []).length;

/**
 * Cria e verticaliza um edital (via arquivo ou texto), vinculando opcionalmente à banca e à prova.
 */
export async function createEditalForUser({ user, file, text: rawText, banca, orgao, cargo, ano, provaId, ip, signal, officialUrl = null, oficialConfirmado = false, officialUrlTipo = null }) {
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

    await query('UPDATE editais SET active=false WHERE user_id=$1', [user.id]);
    // Só vincula a uma prova enviada pelo próprio aluno (ou qualquer uma, se for admin)
    const validProvaId = /^[0-9a-f-]{36}$/i.test(String(provaId || ''))
      ? (await one('SELECT id FROM provas WHERE id=$1 AND (uploaded_by=$2 OR $3)', [provaId, user.id, user.role === 'ADMIN']))?.id || null
      : null;
    const e = await one(
      `INSERT INTO editais(user_id,titulo,orgao,cargo,banca,ano,prova_id,file_name,file_key,mime_type,size,pages,text,word_count,verticalizado,sha256,security,ocr,active,canonico_id,official_url,oficial_confirmado,official_url_tipo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,true,$19,$20,$21,$22) RETURNING *`,
      [user.id, finalTitulo, finalOrgao, finalCargo, finalBanca, finalAno, validProvaId, file?.name || null, fileKey, file?.mime || null, file?.buffer.length || null, pages, text, words(text), JSON.stringify(parsed.verticalizado), sha, JSON.stringify(security), ocr, canonicoId,
       officialUrl, oficialConfirmado, officialUrlTipo]
    );
    if (validProvaId) {
      await query('UPDATE provas SET edital_id=$2 WHERE id=$1', [validProvaId, e.id]);
    }
    return { editalRow: e, warnings, reaproveitado };
  } catch (err) {
    await deleteFile(fileKey);
    throw err;
  }
}

const STOP_WORDS = new Set(['para', 'como', 'mais', 'pelo', 'pela', 'seus', 'suas', 'sobre', 'entre', 'apos', 'ante', 'cada', 'qual', 'quais', 'quando', 'onde', 'porque', 'este', 'esta', 'esse', 'essa', 'isso', 'aquilo', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'nocoes']);

/**
 * Busca questões reais de provas anteriores para um tópico específico do edital verticalizado.
 */
export async function getQuestoesReaisDoTopico(edital, topicoIdOrCode, limite = 20) {
  const vert = edital?.verticalizado || [];
  let targetTopico = null;
  let targetDisciplina = null;

  for (const d of vert) {
    for (const t of d.topicos || []) {
      if (t.id === topicoIdOrCode || t.codigo === topicoIdOrCode || norm(t.nome) === norm(topicoIdOrCode)) {
        targetTopico = t;
        targetDisciplina = d;
        break;
      }
    }
    if (targetTopico) break;
  }

  if (!targetTopico || !targetDisciplina) return null;

  const kw = norm(targetTopico.nome).split(' ').filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  const pool = await many(
    `SELECT q.id, q.numero, q.materia, q.topico, q.topico_id, q.comando, q.pegadinha_tipo,
            q.dispositivos, q.habilidade, q.enunciado, q.alternativas, q.gabarito,
            p.id AS prova_id, p.titulo AS prova_titulo, p.file_name, p.ano AS prova_ano, p.banca,
            (p.edital_id = $1 OR p.id = $2) AS vinculada
     FROM prova_questoes q
     JOIN provas p ON p.id = q.prova_id
     WHERE p.status = 'READY' AND NOT q.flagged AND q.gabarito IS NOT NULL AND length(trim(q.gabarito)) > 0
       AND ($3::text IS NULL OR q.banca = $3 OR p.edital_id = $1 OR p.id = $2)
       AND (
         ($4::text IS NOT NULL AND q.topico_id = $4)
         OR ($5::text IS NOT NULL AND q.topico ILIKE $5)
         OR (q.materia ILIKE $6)
         OR ($7::text IS NOT NULL AND q.enunciado ILIKE $7)
       )
     LIMIT 100`,
    [
      edital.id,
      edital.prova_id || null,
      edital.banca || null,
      targetTopico.topicoId || null,
      `%${targetTopico.nome}%`,
      `%${targetDisciplina.materia}%`,
      kw[0] ? `%${kw[0]}%` : null,
    ]
  );

  let questoes = [...pool];
  if (!questoes.length) {
    questoes = await many(
      `SELECT q.id, q.numero, q.materia, q.topico, q.topico_id, q.comando, q.pegadinha_tipo,
              q.dispositivos, q.habilidade, q.enunciado, q.alternativas, q.gabarito,
              p.id AS prova_id, p.titulo AS prova_titulo, p.file_name, p.ano AS prova_ano, p.banca,
              false AS vinculada
       FROM prova_questoes q
       JOIN provas p ON p.id = q.prova_id
       WHERE p.status = 'READY' AND NOT q.flagged AND q.gabarito IS NOT NULL AND length(trim(q.gabarito)) > 0
         AND ($1::text IS NULL OR q.banca = $1)
         AND (q.materia ILIKE $2)
       ORDER BY random() LIMIT $3`,
      [edital.banca || null, `%${targetDisciplina.materia}%`, limite]
    );
  }

  questoes.forEach((q) => {
    let score = 0;
    if (q.vinculada) score += 10;
    if (targetTopico.topicoId && q.topico_id === targetTopico.topicoId) score += 20;
    if (q.topico && norm(q.topico).includes(norm(targetTopico.nome))) score += 15;
    const textNorm = norm(`${q.materia || ''} ${q.topico || ''} ${q.enunciado || ''}`);
    for (const w of kw) {
      if (textNorm.includes(w)) score += 3;
    }
    q._score = score + Math.random() * 0.5;
  });

  questoes.sort((a, b) => b._score - a._score);
  const selecionadas = questoes.slice(0, limite).map((q) => ({
    id: q.id,
    numero: q.numero || null,
    provaId: q.prova_id,
    provaTitulo: q.prova_titulo || q.file_name || 'Prova anterior',
    provaAno: q.prova_ano || null,
    banca: q.banca,
    materia: q.materia,
    enunciado: q.enunciado,
    alternativas: Array.isArray(q.alternativas) ? q.alternativas : [],
    gabarito: q.gabarito,
    formato: (Array.isArray(q.alternativas) && q.alternativas.length > 0) ? 'me' : 'ce',
    comando: q.comando || null,
    pegadinha: q.pegadinha_tipo || null,
    habilidade: q.habilidade || null,
    dispositivos: Array.isArray(q.dispositivos) ? q.dispositivos : [],
  }));

  return {
    topico: {
      id: targetTopico.id,
      codigo: targetTopico.codigo,
      nome: targetTopico.nome,
      topicoId: targetTopico.topicoId || null,
    },
    disciplina: {
      id: targetDisciplina.id,
      materia: targetDisciplina.materia,
      materiaId: targetDisciplina.materiaId || null,
    },
    total: selecionadas.length,
    questoes: selecionadas,
  };
}

/**
 * Cria um question_set a partir de questões reais da banca filtradas pelo tópico (custo US$ 0 de IA).
 */
export async function criarSimuladoQuestoesReais({ user, edital, topicoIdOrCode, limite = 10, cadernoId = null }) {
  const result = await getQuestoesReaisDoTopico(edital, topicoIdOrCode, limite);
  if (!result || !result.questoes.length) {
    return {
      created: false,
      count: 0,
      message: 'Nenhuma questão real da banca encontrada para este tópico no momento.',
      topico: result?.topico || null,
    };
  }

  const { topico, disciplina, questoes } = result;
  const isCe = edital.banca === 'cebraspe' || questoes.every((q) => (q.alternativas || []).length === 0);
  const formato = isCe ? 'ce' : 'me';

  const formattedQuestoes = questoes.map((q) => ({
    id: q.id,
    provaId: q.provaId,
    provaTitulo: q.provaTitulo,
    provaAno: q.provaAno,
    enunciado: q.enunciado,
    alternativas: isCe ? [] : (q.alternativas || []),
    gabarito: q.gabarito,
    comentario: q.comando
      ? `[${q.comando}] Questão real de ${q.provaTitulo}${q.provaAno ? ' (' + q.provaAno + ')' : ''}.`
      : `Questão real da banca ${(edital.banca || '').toUpperCase()} extraída de prova anterior (${q.provaTitulo}).`,
    tema: topico.nome,
    topico_edital: `${topico.codigo ? topico.codigo + ' ' : ''}${topico.nome}`,
    nivel: 'Prova real',
    pegadinha: q.pegadinha || '',
    dispositivos: q.dispositivos || [],
    verificada: true,
    ancorada: true,
  }));

  let targetCadernoId = cadernoId || null;
  if (!targetCadernoId) {
    const cad = await one('SELECT id FROM cadernos WHERE user_id=$1 AND edital_id=$2 ORDER BY updated_at DESC LIMIT 1', [user.id, edital.id]);
    if (cad) targetCadernoId = cad.id;
  }

  const taxTopicoId = topico.topicoId || (disciplina.materiaId ? await topicoId(disciplina.materiaId, topico.nome) : null);

  const setRow = await one(
    `INSERT INTO question_sets (
       user_id, caderno_id, edital_id, banca, materia, assunto, nivel, formato,
       arquivo, questoes, respostas, finalizado, model, tokens_in, tokens_out,
       custo_estimado_usd, origem, topico_id, topico_codigo
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      user.id,
      targetCadernoId,
      edital.id,
      edital.banca || 'cebraspe',
      disciplina.materia,
      topico.nome,
      'Prova real',
      formato,
      `${edital.titulo || 'Edital'} · Questões reais da banca`,
      JSON.stringify(formattedQuestoes),
      JSON.stringify({}),
      false,
      'prova_real',
      0,
      0,
      0,
      'prova_real',
      taxTopicoId,
      topico.codigo || topico.id,
    ]
  );

  if (targetCadernoId) {
    await query('UPDATE cadernos SET updated_at=now() WHERE id=$1', [targetCadernoId]);
  }

  return {
    created: true,
    set: setRow,
    count: formattedQuestoes.length,
    topico,
    disciplina,
    cadernoId: targetCadernoId,
  };
}


