// =========================================================
// Cadernos de Questões — Histórico acumulativo de questões do aluno
// Permite criar um caderno por Banca, Concurso e/ou Edital,
// alimentá-lo continuamente com materiais do aluno e provas antigas da banca,
// e revisar/resolver todo o histórico de questões com filtros e anotações.
// =========================================================
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { one, many, query } from '../db.js';
import { ah, HttpError, parseBody, checkId } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { uploader, fileOf } from '../lib/upload.js';
import { BANCA } from '../lib/bancas.js';
import { submitProva, publicStatus } from '../services/provas.js';
import { assertCanUpload } from '../services/quota.js';
import { scanText, SEV } from '../security/index.js';
import { calcularRevisao, paraRevisarHoje, rotuloFase, resumoRevisao, estadoEfetivo } from '../lib/revisao-espacada.js';

const r = Router();
r.use(requireAuth);
r.param('id', checkId);

const perUser = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas operações em pouco tempo. Aguarde alguns minutos.' },
});

const LET = ['A', 'B', 'C', 'D', 'E'];
const uniq = (arr) => [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))];

function normalizeExtraQuestion(q, prova, bancaDefault) {
  const gRaw = String(q.gabarito || '').trim().toUpperCase();
  const alts = Array.isArray(q.alternativas) ? q.alternativas.filter(Boolean).slice(0, 5) : [];
  const isCe = alts.length === 0 || /^[CE]$/.test(gRaw);
  const gabarito = isCe ? (gRaw.startsWith('C') ? 'C' : gRaw.startsWith('E') ? 'E' : '') : gRaw.replace(/[^A-E]/g, '').charAt(0);
  if (!gabarito || !q.enunciado) return null;
  return {
    id: String(q.id),
    provaId: String(prova.id),
    provaTitulo: prova.titulo || prova.file_name || 'Prova anterior',
    provaAno: prova.ano || null,
    banca: prova.banca || bancaDefault,
    formato: isCe ? 'ce' : 'me',
    numero: q.numero || null,
    materia: q.materia || 'Conhecimentos Gerais',
    enunciado: String(q.enunciado).slice(0, 6000),
    alternativas: isCe ? [] : alts,
    gabarito,
    comentario: 'Questão real extraída de prova anterior da banca. Use suas anotações para registrar o fundamento.',
    addedAt: new Date().toISOString(),
  };
}

// Sincroniza automaticamente questões de provas vinculadas que já ficaram READY
async function syncProvasExtras(c) {
  const provaIds = uniq(c.provas_ids).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!provaIds.length) return c;
  const extras = Array.isArray(c.questoes_extras) ? [...c.questoes_extras] : [];
  const existingIds = new Set(extras.map((q) => String(q.id)));
  const existingProvas = new Set(extras.map((q) => String(q.provaId)));
  const missingProvas = provaIds.filter((pid) => !existingProvas.has(pid));
  if (!missingProvas.length) return c;

  const readyProvas = await many(
    `SELECT id, banca, titulo, file_name, orgao, cargo, ano, status
     FROM provas WHERE id = ANY($1::uuid[]) AND status = 'READY'`,
    [missingProvas]
  );
  if (!readyProvas.length) return c;

  let added = 0;
  for (const p of readyProvas) {
    const qRows = await many(
      `SELECT id, numero, materia, enunciado, alternativas, gabarito
       FROM prova_questoes
       WHERE prova_id = $1 AND NOT flagged AND gabarito IS NOT NULL AND length(trim(gabarito)) > 0
       ORDER BY numero ASC NULLS LAST LIMIT 80`,
      [p.id]
    );
    for (const q of qRows) {
      if (existingIds.has(String(q.id))) continue;
      const norm = normalizeExtraQuestion(q, p, c.banca);
      if (norm) {
        extras.push(norm);
        existingIds.add(norm.id);
        added++;
      }
    }
  }
  if (added > 0) {
    const updated = await one(
      'UPDATE cadernos SET questoes_extras=$2, updated_at=now() WHERE id=$1 RETURNING *',
      [c.id, JSON.stringify(extras)]
    );
    return updated || c;
  }
  return c;
}

function summarizeCaderno(c, setsForCaderno = [], editalTitulo = null) {
  const favs = c.favoritas && typeof c.favoritas === 'object' ? c.favoritas : {};
  const notes = c.anotacoes && typeof c.anotacoes === 'object' ? c.anotacoes : {};
  const respExtras = c.respostas_extras && typeof c.respostas_extras === 'object' ? c.respostas_extras : {};
  const extras = Array.isArray(c.questoes_extras) ? c.questoes_extras : [];

  let questoesIa = 0;
  let respondidas = 0;
  let acertos = 0;
  const matSet = new Set(uniq(c.materiais_ids));
  // Estado efetivo da revisão espaçada (inclui erros antigos ainda sem ciclo gravado)
  const revMap = c.revisao_espacada && typeof c.revisao_espacada === 'object' ? c.revisao_espacada : {};
  const revEfetiva = { ...revMap };

  for (const s of setsForCaderno) {
    if (s.material_id) matSet.add(s.material_id);
    const qs = Array.isArray(s.questoes) ? s.questoes : [];
    const r = s.respostas || {};
    questoesIa += qs.length;
    qs.forEach((q, idx) => {
      const a = r[idx];
      if (a != null) {
        respondidas++;
        if (a === q.gabarito) acertos++;
      }
      const key = `set:${s.id}:${idx}`;
      const ef = estadoEfetivo(revMap[key], a ?? null, q.gabarito);
      if (ef) revEfetiva[key] = ef;
    });
  }

  for (const q of extras) {
    const a = respExtras[q.id];
    if (a != null) {
      respondidas++;
      if (a === q.gabarito) acertos++;
    }
    const ef = estadoEfetivo(revMap[`extra:${q.id}`], a ?? null, q.gabarito);
    if (ef) revEfetiva[`extra:${q.id}`] = ef;
  }

  const questoesProvas = extras.length;
  const totalQuestoes = questoesIa + questoesProvas;
  const erros = Math.max(0, respondidas - acertos);
  const taxaAcerto = respondidas > 0 ? Math.round((acertos / respondidas) * 100) : null;
  const favoritasCount = Object.values(favs).filter(Boolean).length;
  const anotacoesCount = Object.values(notes).filter((v) => String(v || '').trim().length > 0).length;
  const revResumo = resumoRevisao(revEfetiva);

  return {
    id: c.id,
    titulo: c.titulo,
    descricao: c.descricao || null,
    banca: c.banca,
    orgao: c.orgao || null,
    cargo: c.cargo || null,
    ano: c.ano || null,
    editalId: c.edital_id || null,
    editalTitulo: editalTitulo || c.edital_titulo || null,
    materiaisCount: matSet.size,
    provasCount: uniq(c.provas_ids).length,
    simuladosCount: setsForCaderno.length,
    totalQuestoes,
    questoesIa,
    questoesProvas,
    respondidas,
    acertos,
    erros,
    taxaAcerto,
    favoritasCount,
    anotacoesCount,
    revisaoHojeCount: revResumo.hoje,
    revisaoAtivasCount: revResumo.ativas,
    dominadasCount: revResumo.dominadas,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

async function buildCadernoDetail(rawCaderno, userId) {
  const c = await syncProvasExtras(rawCaderno);
  const [edital, sets] = await Promise.all([
    c.edital_id ? one('SELECT id, titulo, banca, orgao, cargo, ano FROM editais WHERE id=$1 AND user_id=$2', [c.edital_id, userId]) : Promise.resolve(null),
    many('SELECT * FROM question_sets WHERE user_id=$1 AND caderno_id=$2 ORDER BY created_at DESC', [userId, c.id]),
  ]);

  const allMatIds = uniq([...(c.materiais_ids || []), ...sets.map((s) => s.material_id)]).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const allProvaIds = uniq(c.provas_ids).filter((id) => /^[0-9a-f-]{36}$/i.test(id));

  const [materiaisRows, provasRows] = await Promise.all([
    allMatIds.length
      ? many('SELECT id, file_name, materia, assunto, word_count, edital_id, edital_match, created_at FROM materials WHERE user_id=$1 AND id = ANY($2::uuid[]) ORDER BY created_at DESC', [userId, allMatIds])
      : Promise.resolve([]),
    allProvaIds.length
      ? many('SELECT id, banca, titulo, file_name, orgao, cargo, ano, status, num_questoes, created_at FROM provas WHERE id = ANY($1::uuid[]) ORDER BY created_at DESC', [allProvaIds])
      : Promise.resolve([]),
  ]);

  const favs = c.favoritas && typeof c.favoritas === 'object' ? c.favoritas : {};
  const notes = c.anotacoes && typeof c.anotacoes === 'object' ? c.anotacoes : {};
  const respExtras = c.respostas_extras && typeof c.respostas_extras === 'object' ? c.respostas_extras : {};
  const revisaoMap = c.revisao_espacada && typeof c.revisao_espacada === 'object' ? c.revisao_espacada : {};
  const extras = Array.isArray(c.questoes_extras) ? c.questoes_extras : [];

  const questoes = [];
  const byMateria = new Map();
  const bumpMat = (mat, answered, isOk) => {
    const k = mat || 'Geral';
    const cur = byMateria.get(k) || { materia: k, total: 0, respondidas: 0, acertos: 0 };
    cur.total++;
    if (answered) {
      cur.respondidas++;
      if (isOk) cur.acertos++;
    }
    byMateria.set(k, cur);
  };

  for (const s of sets) {
    const qs = Array.isArray(s.questoes) ? s.questoes : [];
    const r = s.respostas || {};
    qs.forEach((q, idx) => {
      const key = `set:${s.id}:${idx}`;
      const ans = r[idx] ?? null;
      const isOk = ans != null && ans === q.gabarito;
      const mat = s.materia || 'Geral';
      const rev = estadoEfetivo(revisaoMap[key], ans, q.gabarito);
      bumpMat(mat, ans != null, isOk);
      questoes.push({
        key,
        origem: 'ia',
        origemLabel: 'Meu material (IA)',
        fonteTitulo: s.arquivo || 'Texto colado',
        setId: s.id,
        idx,
        banca: s.banca,
        formato: s.formato,
        materia: mat,
        assunto: q.tema || s.assunto || '',
        topico_edital: q.topico_edital || '',
        nivel: q.nivel || s.nivel || 'Médio',
        enunciado: q.enunciado,
        alternativas: q.alternativas || [],
        gabarito: q.gabarito,
        comentario: q.comentario || '',
        trecho: q.trecho || '',
        ancorada: q.ancorada,
        pegadinha: q.pegadinha || '',
        verificada: Boolean(q.verificada),
        contestada: q.contestada || null,
        ans,
        favorita: Boolean(favs[key]),
        anotacao: String(notes[key] || ''),
        revisao: rev ? {
          fase: rev.fase,
          intervaloDias: rev.intervaloDias,
          rotulo: rotuloFase(rev.fase, rev.intervaloDias),
          proximaRevisao: rev.proximaRevisao,
          paraRevisarHoje: paraRevisarHoje(rev),
          dominada: Boolean(rev.dominada),
          acertosSeguidos: rev.acertosSeguidos || 0,
        } : null,
        createdAt: s.created_at,
      });
    });
  }

  for (const q of extras) {
    const key = `extra:${q.id}`;
    const ans = respExtras[q.id] ?? null;
    const isOk = ans != null && ans === q.gabarito;
    const mat = q.materia || 'Conhecimentos Gerais';
    const rev = estadoEfetivo(revisaoMap[key], ans, q.gabarito);
    bumpMat(mat, ans != null, isOk);
    questoes.push({
      key,
      extraId: q.id,
      origem: 'prova',
      origemLabel: 'Prova antiga da banca',
      fonteTitulo: q.provaTitulo || 'Prova da banca',
      provaId: q.provaId || null,
      numeroProva: q.numero || null,
      banca: q.banca || c.banca,
      formato: q.formato || ((q.alternativas || []).length ? 'me' : 'ce'),
      materia: mat,
      assunto: '',
      topico_edital: '',
      nivel: 'Prova real',
      enunciado: q.enunciado,
      alternativas: q.alternativas || [],
      gabarito: q.gabarito,
      comentario: q.comentario || 'Questão oficial extraída de prova anterior da banca.',
      trecho: '',
      pegadinha: '',
      verificada: true,
      ans,
      favorita: Boolean(favs[key]),
      anotacao: String(notes[key] || ''),
      revisao: rev ? {
        fase: rev.fase,
        intervaloDias: rev.intervaloDias,
        rotulo: rotuloFase(rev.fase, rev.intervaloDias),
        proximaRevisao: rev.proximaRevisao,
        paraRevisarHoje: paraRevisarHoje(rev),
        dominada: Boolean(rev.dominada),
        acertosSeguidos: rev.acertosSeguidos || 0,
      } : null,
      createdAt: q.addedAt || c.created_at,
    });
  }

  const summary = summarizeCaderno(c, sets, edital?.titulo || null);
  const porMateria = [...byMateria.values()]
    .map((m) => ({ ...m, taxaAcerto: m.respondidas > 0 ? Math.round((m.acertos / m.respondidas) * 100) : null }))
    .sort((a, b) => b.total - a.total);

  return {
    ...summary,
    edital: edital ? { id: edital.id, titulo: edital.titulo, banca: edital.banca, orgao: edital.orgao, cargo: edital.cargo, ano: edital.ano } : null,
    materiais: materiaisRows.map((m) => ({
      id: m.id,
      fileName: m.file_name || 'Texto colado',
      materia: m.materia || m.edital_match?.disciplina_nome || null,
      assunto: m.assunto || null,
      wordCount: m.word_count,
      coberturaPct: m.edital_match?.cobertura_disciplina_pct ?? null,
      createdAt: m.created_at,
    })),
    provas: provasRows.map((p) => ({
      id: p.id,
      banca: p.banca,
      titulo: p.titulo || p.file_name,
      orgao: p.orgao,
      cargo: p.cargo,
      ano: p.ano,
      status: p.status,
      statusLabel: publicStatus[p.status] || p.status,
      numQuestoes: p.status === 'READY' ? p.num_questoes : null,
      createdAt: p.created_at,
    })),
    simulados: sets.map((s) => ({
      id: s.id,
      banca: s.banca,
      materia: s.materia,
      assunto: s.assunto,
      nivel: s.nivel,
      arquivo: s.arquivo,
      qtd: (s.questoes || []).length,
      createdAt: s.created_at,
    })),
    porMateria,
    questoes,
  };
}

// Lista todos os cadernos do usuário + materiais e provas disponíveis para alimentar
r.get('/', ah(async (req, res) => {
  const [cadernosRows, allSets, materiaisRows, provasRows] = await Promise.all([
    many(
      `SELECT c.*, e.titulo AS edital_titulo
       FROM cadernos c
       LEFT JOIN editais e ON e.id = c.edital_id
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC LIMIT 100`,
      [req.user.id]
    ),
    many('SELECT id, caderno_id, material_id, edital_id, banca, materia, assunto, nivel, formato, arquivo, questoes, respostas, finalizado, created_at FROM question_sets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 300', [req.user.id]),
    many('SELECT id, file_name, materia, assunto, word_count, edital_id, created_at FROM materials WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.user.id]),
    many(
      `SELECT id, banca, titulo, file_name, orgao, cargo, ano, edital_id, status, num_questoes, uploaded_by, created_at
       FROM provas
       WHERE status = 'READY' OR uploaded_by = $1
       ORDER BY (uploaded_by = $1) DESC, created_at DESC LIMIT 150`,
      [req.user.id]
    ),
  ]);

  const setsByCaderno = new Map();
  for (const s of allSets) {
    if (!s.caderno_id) continue;
    const list = setsByCaderno.get(s.caderno_id) || [];
    list.push(s);
    setsByCaderno.set(s.caderno_id, list);
  }

  const cadernos = cadernosRows.map((c) => summarizeCaderno(c, setsByCaderno.get(c.id) || [], c.edital_titulo));

  res.json({
    cadernos,
    materiaisDisponiveis: materiaisRows.map((m) => ({
      id: m.id,
      fileName: m.file_name || 'Texto colado',
      materia: m.materia || null,
      assunto: m.assunto || null,
      wordCount: m.word_count,
      editalId: m.edital_id || null,
      createdAt: m.created_at,
    })),
    provasDisponiveis: provasRows.map((p) => ({
      id: p.id,
      banca: p.banca,
      titulo: p.titulo || p.file_name,
      orgao: p.orgao,
      cargo: p.cargo,
      ano: p.ano,
      editalId: p.edital_id || null,
      status: p.status,
      statusLabel: publicStatus[p.status] || p.status,
      numQuestoes: p.status === 'READY' ? p.num_questoes : null,
      minha: p.uploaded_by === req.user.id,
      createdAt: p.created_at,
    })),
  });
}));

// Cria um novo Caderno de Questões (por Banca, Concurso e/ou Edital)
r.post('/', perUser, ah(async (req, res) => {
  const b = parseBody(z.object({
    titulo: z.string().trim().max(160).optional().default(''),
    descricao: z.string().trim().max(400).optional().default(''),
    banca: z.enum(Object.keys(BANCA), { errorMap: () => ({ message: 'Escolha a banca do caderno.' }) }),
    orgao: z.string().trim().max(120).optional().default(''),
    cargo: z.string().trim().max(120).optional().default(''),
    ano: z.string().trim().regex(/^(\d{4})?$/, 'Ano inválido.').optional().default(''),
    editalId: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => v || null),
    importarExistentes: z.boolean().optional().default(true),
  }), req.body);

  for (const v of [b.titulo, b.descricao, b.orgao, b.cargo]) {
    if (v && SEV[scanText(v).severity] >= SEV.medium) throw new HttpError(422, 'Campos do caderno com conteúdo não permitido.');
  }

  let edital = null;
  if (b.editalId) {
    edital = await one('SELECT * FROM editais WHERE id=$1 AND user_id=$2', [b.editalId, req.user.id]);
    if (!edital) throw new HttpError(404, 'Edital não encontrado.');
  }

  const orgao = b.orgao || edital?.orgao || null;
  const cargo = b.cargo || edital?.cargo || null;
  const ano = b.ano || edital?.ano || null;
  const bancaNome = BANCA[b.banca]?.nome || b.banca.toUpperCase();
  const autoTitulo = [orgao, cargo, ano].filter(Boolean).join(' · ') || edital?.titulo || `Caderno ${bancaNome}`;
  const titulo = b.titulo || autoTitulo;

  let matIds = [];
  let provaIds = [];
  if (b.importarExistentes) {
    if (edital) {
      const [mats, prvs] = await Promise.all([
        many('SELECT id FROM materials WHERE user_id=$1 AND edital_id=$2 ORDER BY created_at DESC LIMIT 50', [req.user.id, edital.id]),
        many('SELECT id FROM provas WHERE (edital_id=$1 OR id=$2) AND (uploaded_by=$3 OR status=\'READY\') ORDER BY created_at DESC LIMIT 20', [edital.id, edital.prova_id || null, req.user.id]),
      ]);
      matIds = mats.map((m) => m.id);
      provaIds = prvs.map((p) => p.id);
    } else {
      const prvs = await many('SELECT id FROM provas WHERE uploaded_by=$1 AND banca=$2 ORDER BY created_at DESC LIMIT 20', [req.user.id, b.banca]);
      provaIds = prvs.map((p) => p.id);
    }
  }

  const c = await one(
    `INSERT INTO cadernos (user_id, titulo, descricao, banca, orgao, cargo, ano, edital_id, materiais_ids, provas_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, titulo, b.descricao || null, b.banca, orgao, cargo, ano, edital ? edital.id : null, JSON.stringify(matIds), JSON.stringify(provaIds)]
  );

  if (b.importarExistentes) {
    if (edital) {
      await query('UPDATE question_sets SET caderno_id=$1 WHERE user_id=$2 AND edital_id=$3 AND caderno_id IS NULL', [c.id, req.user.id, edital.id]);
    } else {
      await query('UPDATE question_sets SET caderno_id=$1 WHERE user_id=$2 AND banca=$3 AND caderno_id IS NULL', [c.id, req.user.id, b.banca]);
    }
  }

  const detail = await buildCadernoDetail(c, req.user.id);
  res.status(201).json({ caderno: detail });
}));

// Abre um Caderno de Questões com todo o seu histórico de questões, materiais e provas
r.get('/:id', ah(async (req, res) => {
  const c = await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!c) throw new HttpError(404, 'Caderno de questões não encontrado.');
  res.json({ caderno: await buildCadernoDetail(c, req.user.id) });
}));

// Alimentar o caderno com um material de estudo já enviado
r.post('/:id/alimentar-material', perUser, ah(async (req, res) => {
  const c = await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!c) throw new HttpError(404, 'Caderno não encontrado.');
  const { materialId } = parseBody(z.object({ materialId: z.string().uuid('Material inválido.') }), req.body);
  const m = await one('SELECT * FROM materials WHERE id=$1 AND user_id=$2', [materialId, req.user.id]);
  if (!m) throw new HttpError(404, 'Material não encontrado.');

  const matIds = uniq([m.id, ...(c.materiais_ids || [])]);
  const updated = await one('UPDATE cadernos SET materiais_ids=$2, updated_at=now() WHERE id=$1 RETURNING *', [c.id, JSON.stringify(matIds)]);
  await query('UPDATE question_sets SET caderno_id=$1 WHERE user_id=$2 AND material_id=$3 AND caderno_id IS NULL', [c.id, req.user.id, m.id]);
  res.json({ caderno: await buildCadernoDetail(updated, req.user.id), material: { id: m.id, fileName: m.file_name, materia: m.materia, detect: m.detect, editalId: m.edital_id || c.edital_id || null, editalMatch: m.edital_match || null } });
}));

// Alimentar o caderno com uma prova antiga da banca (existente na base ou novo arquivo enviado)
r.post('/:id/alimentar-prova', perUser, uploader([{ name: 'prova', maxCount: 1 }, { name: 'gabarito', maxCount: 1 }]), ah(async (req, res) => {
  const c = await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!c) throw new HttpError(404, 'Caderno não encontrado.');

  const file = fileOf(req, 'prova');
  let prova = null;
  let uploadMsg = null;

  if (file) {
    await assertCanUpload(req.user, 'prova');
    const out = await submitProva({
      user: req.user,
      banca: c.banca,
      orgao: req.body?.orgao || c.orgao || '',
      cargo: req.body?.cargo || c.cargo || '',
      ano: req.body?.ano || c.ano || '',
      editalId: c.edital_id || '',
      file,
      gabarito: fileOf(req, 'gabarito'),
      ip: req.ip,
    });
    const pid = out.prova?.id || out.provaId;
    if (pid) prova = await one('SELECT * FROM provas WHERE id=$1', [pid]);
    uploadMsg = out.duplicate
      ? 'Esta prova já estava na base e foi vinculada ao seu caderno!'
      : 'Prova recebida e vinculada ao caderno! Assim que a extração terminar, as questões entram automaticamente no caderno.';
  } else {
    const { provaId } = parseBody(z.object({ provaId: z.string().uuid('Selecione uma prova válida.') }), req.body);
    prova = await one("SELECT * FROM provas WHERE id=$1 AND (status='READY' OR uploaded_by=$2)", [provaId, req.user.id]);
    if (!prova) throw new HttpError(404, 'Prova não encontrada.');
  }

  const provaIds = uniq([prova?.id, ...(c.provas_ids || [])]);
  let extras = Array.isArray(c.questoes_extras) ? [...c.questoes_extras] : [];
  let importadas = 0;

  if (prova && prova.status === 'READY') {
    const existingIds = new Set(extras.map((q) => String(q.id)));
    const qRows = await many(
      `SELECT id, numero, materia, enunciado, alternativas, gabarito
       FROM prova_questoes
       WHERE prova_id = $1 AND NOT flagged AND gabarito IS NOT NULL AND length(trim(gabarito)) > 0
       ORDER BY numero ASC NULLS LAST LIMIT 80`,
      [prova.id]
    );
    for (const q of qRows) {
      if (existingIds.has(String(q.id))) continue;
      const norm = normalizeExtraQuestion(q, prova, c.banca);
      if (norm) {
        extras.push(norm);
        existingIds.add(norm.id);
        importadas++;
      }
    }
  }

  const updated = await one(
    'UPDATE cadernos SET provas_ids=$2, questoes_extras=$3, updated_at=now() WHERE id=$1 RETURNING *',
    [c.id, JSON.stringify(provaIds), JSON.stringify(extras)]
  );

  res.json({
    caderno: await buildCadernoDetail(updated, req.user.id),
    importadas,
    message: uploadMsg || (importadas > 0
      ? `Prova vinculada! +${importadas} questão(ões) reais da prova foram adicionadas ao seu caderno.`
      : 'Prova vinculada ao caderno! O estilo dela será priorizado nas próximas gerações.'),
  });
}));

// Vincular um simulado já gerado ao Caderno
r.post('/:id/vincular-simulado', perUser, ah(async (req, res) => {
  const c = await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!c) throw new HttpError(404, 'Caderno não encontrado.');
  const { setId } = parseBody(z.object({ setId: z.string().uuid('Simulado inválido.') }), req.body);
  const s = await one('SELECT * FROM question_sets WHERE id=$1 AND user_id=$2', [setId, req.user.id]);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');

  await query('UPDATE question_sets SET caderno_id=$2, updated_at=now() WHERE id=$1', [s.id, c.id]);
  const matIds = uniq([s.material_id, ...(c.materiais_ids || [])]);
  const updated = await one('UPDATE cadernos SET materiais_ids=$2, updated_at=now() WHERE id=$1 RETURNING *', [c.id, JSON.stringify(matIds)]);
  res.json({ caderno: await buildCadernoDetail(updated, req.user.id) });
}));

// Interagir com as questões do caderno: responder, favoritar, anotar ou refazer (todas / erradas)
r.patch('/:id/interagir', ah(async (req, res) => {
  const c = await one('SELECT * FROM cadernos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!c) throw new HttpError(404, 'Caderno não encontrado.');

  const b = parseBody(z.object({
    key: z.string().max(120).optional(),
    resposta: z.enum(LET).nullable().optional(),
    favorita: z.boolean().optional(),
    anotacao: z.string().trim().max(1500).optional(),
    reset: z.enum(['all', 'erros']).optional(),
  }), req.body);

  if (b.anotacao && SEV[scanText(b.anotacao).severity] >= SEV.medium) {
    throw new HttpError(422, 'Anotação com conteúdo não permitido.');
  }

  let favs = c.favoritas && typeof c.favoritas === 'object' ? { ...c.favoritas } : {};
  let notes = c.anotacoes && typeof c.anotacoes === 'object' ? { ...c.anotacoes } : {};
  let respExtras = c.respostas_extras && typeof c.respostas_extras === 'object' ? { ...c.respostas_extras } : {};
  let revisaoMap = c.revisao_espacada && typeof c.revisao_espacada === 'object' ? { ...c.revisao_espacada } : {};

  if (b.reset === 'all') {
    respExtras = {};
    revisaoMap = {};
    await query("UPDATE question_sets SET respostas='{}'::jsonb, finalizado=false, updated_at=now() WHERE user_id=$1 AND caderno_id=$2", [req.user.id, c.id]);
  } else if (b.reset === 'erros') {
    const extras = Array.isArray(c.questoes_extras) ? c.questoes_extras : [];
    for (const q of extras) {
      if (respExtras[q.id] != null && respExtras[q.id] !== q.gabarito) delete respExtras[q.id];
    }
    const sets = await many('SELECT id, questoes, respostas FROM question_sets WHERE user_id=$1 AND caderno_id=$2', [req.user.id, c.id]);
    for (const s of sets) {
      const r = { ...(s.respostas || {}) };
      let changed = false;
      (s.questoes || []).forEach((q, idx) => {
        if (r[idx] != null && r[idx] !== q.gabarito) { delete r[idx]; changed = true; }
      });
      if (changed) await query('UPDATE question_sets SET respostas=$2, finalizado=false, updated_at=now() WHERE id=$1', [s.id, JSON.stringify(r)]);
    }
  }

  if (b.key) {
    const MAX_MARCACOES = 3000; // evita que o caderno cresça sem limite
    if ((b.favorita && !favs[b.key] && Object.keys(favs).length >= MAX_MARCACOES)
      || (b.anotacao && !notes[b.key] && Object.keys(notes).length >= MAX_MARCACOES)) {
      throw new HttpError(422, 'Este caderno atingiu o limite de favoritas/anotações.');
    }
    if (b.favorita !== undefined) {
      if (b.favorita) favs[b.key] = true;
      else delete favs[b.key];
    }
    if (b.anotacao !== undefined) {
      if (b.anotacao) notes[b.key] = b.anotacao;
      else delete notes[b.key];
    }
    if (b.resposta !== undefined) {
      let gabarito = null;
      let respostaAnterior = null;
      if (b.key.startsWith('set:')) {
        const [, setId, idxStr] = b.key.split(':');
        const idx = Number(idxStr);
        if (/^[0-9a-f-]{36}$/i.test(setId) && Number.isInteger(idx)) {
          const s = await one('SELECT id, questoes, respostas FROM question_sets WHERE id=$1 AND user_id=$2', [setId, req.user.id]);
          if (s) {
            const r = { ...(s.respostas || {}) };
            respostaAnterior = r[idx] ?? null;
            if (b.resposta === null) delete r[idx];
            else r[idx] = b.resposta;
            await query('UPDATE question_sets SET respostas=$2, updated_at=now() WHERE id=$1', [s.id, JSON.stringify(r)]);
            const q = (s.questoes || [])[idx];
            if (q?.gabarito) gabarito = q.gabarito;
          }
        }
      } else if (b.key.startsWith('extra:')) {
        const qId = b.key.slice(6);
        respostaAnterior = respExtras[qId] ?? null;
        if (b.resposta === null) delete respExtras[qId];
        else respExtras[qId] = b.resposta;
        const extras = Array.isArray(c.questoes_extras) ? c.questoes_extras : [];
        const q = extras.find((item) => String(item.id) === String(qId));
        if (q?.gabarito) gabarito = q.gabarito;
      }

      if (b.resposta !== null && gabarito) {
        const acerto = (b.resposta === gabarito);
        const estadoAnterior = estadoEfetivo(revisaoMap[b.key], respostaAnterior, gabarito);
        const novo = calcularRevisao({ estadoAnterior, acerto });
        if (novo) {
          revisaoMap[b.key] = novo;
        }
      }
    }
  }

  const updated = await one(
    'UPDATE cadernos SET respostas_extras=$2, favoritas=$3, anotacoes=$4, revisao_espacada=$5, updated_at=now() WHERE id=$1 RETURNING *',
    [c.id, JSON.stringify(respExtras), JSON.stringify(favs), JSON.stringify(notes), JSON.stringify(revisaoMap)]
  );
  res.json({ caderno: await buildCadernoDetail(updated, req.user.id) });
}));

r.delete('/:id', ah(async (req, res) => {
  await query('UPDATE question_sets SET caderno_id=NULL WHERE caderno_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  await query('DELETE FROM cadernos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

export default r;

