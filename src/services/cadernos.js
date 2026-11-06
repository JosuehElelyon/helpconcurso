// Regra de negócio dos Cadernos de Questões: histórico acumulativo por banca/concurso/edital que reúne simulados,
// materiais, provas antigas (questões reais copiadas em questoes_extras), favoritas, anotações e revisão espaçada.
// Não conhece HTTP: recebe dados já validados e devolve objetos prontos para a API.
import { HttpError } from '../lib/http.js';
import { BANCA } from '../lib/bancas.js';
import { scanText, SEV } from '../security/index.js';
import { calcularRevisao, paraRevisarHoje, rotuloFase, resumoRevisao, estadoEfetivo } from '../lib/revisao-espacada.js';
import * as cadernos from '../repositories/cadernos.js';
import * as simulados from '../repositories/simulados.js';
import * as materiais from '../repositories/materiais.js';
import * as provas from '../repositories/provas.js';
import * as editais from '../repositories/editais.js';
import { submitProva, publicStatus } from './provas.js';
import { assertCanUpload, assertLimitePlano } from './quota.js';
import { aplicarSituacaoOficial, carregarSituacaoOficial } from './situacao-oficial.js';
import { registrarAtividade } from './atividade.js';
import { obterOuGerarExplicacao } from './explicacao.js';
import { questaoDoCaderno } from './revanche.js';

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_MARCACOES = 3000; // favoritas/anotações por caderno: evita que cresça sem limite
const uniq = (arr) => [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))];
const objeto = (v) => (v && typeof v === 'object' ? v : {});

async function buscarDoAluno(id, userId, msg = 'Caderno não encontrado.') {
  const c = await cadernos.buscar(id, userId);
  if (!c) throw new HttpError(404, msg);
  return c;
}

// ---------- Questões reais copiadas de provas ----------

/** Questão de prova → item do caderno (formato C/E ou múltipla escolha deduzido do gabarito/alternativas). */
export function normalizeExtraQuestion(q, prova, bancaDefault) {
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

/** Acrescenta às extras as questões válidas da prova que ainda não estão no caderno. */
async function copiarQuestoesDaProva(prova, extras, bancaDefault) {
  const existentes = new Set(extras.map((q) => String(q.id)));
  let importadas = 0;
  for (const q of await provas.questoesValidas(prova.id)) {
    if (existentes.has(String(q.id))) continue;
    const norm = normalizeExtraQuestion(q, prova, bancaDefault);
    if (norm) { extras.push(norm); existentes.add(norm.id); importadas++; }
  }
  return importadas;
}

/** Provas vinculadas que ficaram prontas depois de entrar no caderno: copia as questões delas. */
async function sincronizarProvas(c) {
  const provaIds = uniq(c.provas_ids).filter((id) => UUID.test(id));
  if (!provaIds.length) return c;
  const extras = Array.isArray(c.questoes_extras) ? [...c.questoes_extras] : [];
  const jaTem = new Set(extras.map((q) => String(q.provaId)));
  const prontas = await provas.prontasPorIds(provaIds.filter((pid) => !jaTem.has(pid)));
  let novas = 0;
  for (const p of prontas) novas += await copiarQuestoesDaProva(p, extras, c.banca);
  return novas > 0 ? (await cadernos.definirQuestoesExtras(c.id, extras)) || c : c;
}

// ---------- Resumo e detalhe ----------

/** Números do caderno (lista e cabeçalho). Questão anulada não conta acerto/erro nem revisão. */
export function resumir(c, setsDoCaderno = [], editalTitulo = null) {
  const favs = objeto(c.favoritas), notes = objeto(c.anotacoes), respExtras = objeto(c.respostas_extras);
  const extras = Array.isArray(c.questoes_extras) ? c.questoes_extras : [];
  const revMap = objeto(c.revisao_espacada);
  const revEfetiva = { ...revMap }; // inclui erros antigos ainda sem ciclo gravado
  const matSet = new Set(uniq(c.materiais_ids));
  let questoesIa = 0, respondidas = 0, acertos = 0;

  const contar = (key, q, a) => {
    if (q?.anulada) { delete revEfetiva[key]; return; }
    if (a != null) { respondidas++; if (a === q.gabarito) acertos++; }
    const ef = estadoEfetivo(revMap[key], a ?? null, q.gabarito);
    if (ef) revEfetiva[key] = ef;
  };
  for (const s of setsDoCaderno) {
    if (s.material_id) matSet.add(s.material_id);
    const qs = Array.isArray(s.questoes) ? s.questoes : [];
    questoesIa += qs.length;
    qs.forEach((q, idx) => contar(`set:${s.id}:${idx}`, q, (s.respostas || {})[idx]));
  }
  for (const q of extras) contar(`extra:${q.id}`, q, respExtras[q.id]);

  const rev = resumoRevisao(revEfetiva);
  return {
    id: c.id, titulo: c.titulo, descricao: c.descricao || null, banca: c.banca, orgao: c.orgao || null, cargo: c.cargo || null, ano: c.ano || null,
    editalId: c.edital_id || null, editalTitulo: editalTitulo || c.edital_titulo || null,
    materiaisCount: matSet.size, provasCount: uniq(c.provas_ids).length, simuladosCount: setsDoCaderno.length,
    totalQuestoes: questoesIa + extras.length, questoesIa, questoesProvas: extras.length,
    respondidas, acertos, erros: Math.max(0, respondidas - acertos), taxaAcerto: respondidas > 0 ? Math.round((acertos / respondidas) * 100) : null,
    favoritasCount: Object.values(favs).filter(Boolean).length,
    anotacoesCount: Object.values(notes).filter((v) => String(v || '').trim().length > 0).length,
    revisaoHojeCount: rev.hoje, revisaoAtivasCount: rev.ativas, dominadasCount: rev.dominadas,
    createdAt: c.created_at, updatedAt: c.updated_at,
  };
}

const visaoRevisao = (rev) => (rev ? {
  fase: rev.fase, intervaloDias: rev.intervaloDias, rotulo: rotuloFase(rev.fase, rev.intervaloDias), proximaRevisao: rev.proximaRevisao,
  paraRevisarHoje: paraRevisarHoje(rev), dominada: Boolean(rev.dominada), acertosSeguidos: rev.acertosSeguidos || 0,
} : null);

/** Caderno completo: questões (IA + provas) com resposta, favorita, anotação e fase da revisão; materiais, provas e simulados. */
export async function detalhar(cadernoBruto, userId) {
  const c = await sincronizarProvas(cadernoBruto);
  const [edital, sets] = await Promise.all([
    c.edital_id ? editais.buscarResumo(c.edital_id, userId) : null,
    simulados.listarDoCaderno(userId, c.id),
  ]);
  const matIds = uniq([...(c.materiais_ids || []), ...sets.map((s) => s.material_id)]).filter((id) => UUID.test(id));
  const provaIds = uniq(c.provas_ids).filter((id) => UUID.test(id));
  const [materiaisRows, provasRows] = await Promise.all([materiais.porIds(userId, matIds), provas.resumoPorIds(provaIds)]);

  const favs = objeto(c.favoritas), notes = objeto(c.anotacoes), respExtras = objeto(c.respostas_extras), revisaoMap = objeto(c.revisao_espacada);
  const situacao = await carregarSituacaoOficial([c.questoes_extras, ...sets.map((s) => s.questoes)]);
  const extras = situacao(Array.isArray(c.questoes_extras) ? c.questoes_extras : []);
  for (const s of sets) s.questoes = situacao(s.questoes);

  const questoes = [];
  const porMateriaMap = new Map();
  const somarMateria = (mat, respondida, certa) => {
    const k = mat || 'Geral';
    const cur = porMateriaMap.get(k) || { materia: k, total: 0, respondidas: 0, acertos: 0 };
    cur.total++;
    if (respondida) { cur.respondidas++; if (certa) cur.acertos++; }
    porMateriaMap.set(k, cur);
  };
  const comum = (key, q, ans) => ({
    ans, favorita: Boolean(favs[key]), anotacao: String(notes[key] || ''), anulada: Boolean(q.anulada), gabaritoAtualizado: Boolean(q.gabaritoAtualizado),
    revisao: visaoRevisao(q.anulada ? null : estadoEfetivo(revisaoMap[key], ans, q.gabarito)),
  });

  for (const s of sets) {
    (Array.isArray(s.questoes) ? s.questoes : []).forEach((q, idx) => {
      const key = `set:${s.id}:${idx}`;
      const ans = (s.respostas || {})[idx] ?? null;
      const mat = s.materia || 'Geral';
      somarMateria(mat, ans != null && !q.anulada, ans != null && ans === q.gabarito && !q.anulada);
      questoes.push({
        key, origem: 'ia', origemLabel: 'Meu material (IA)', fonteTitulo: s.arquivo || 'Texto colado', setId: s.id, idx,
        banca: s.banca, formato: s.formato, materia: mat, assunto: q.tema || s.assunto || '', topico_edital: q.topico_edital || '',
        nivel: q.nivel || s.nivel || 'Médio', enunciado: q.enunciado, alternativas: q.alternativas || [], gabarito: q.gabarito,
        comentario: q.comentario || '', trecho: q.trecho || '', ancorada: q.ancorada, pegadinha: q.pegadinha || '',
        verificada: Boolean(q.verificada), contestada: q.contestada || null, ...comum(key, q, ans), createdAt: s.created_at,
      });
    });
  }
  for (const q of extras) {
    const key = `extra:${q.id}`;
    const ans = respExtras[q.id] ?? null;
    const mat = q.materia || 'Conhecimentos Gerais';
    somarMateria(mat, ans != null && !q.anulada, ans != null && ans === q.gabarito && !q.anulada);
    questoes.push({
      key, extraId: q.id, origem: 'prova', origemLabel: 'Prova antiga da banca', fonteTitulo: q.provaTitulo || 'Prova da banca',
      provaId: q.provaId || null, numeroProva: q.numero || null, banca: q.banca || c.banca,
      formato: q.formato || ((q.alternativas || []).length ? 'me' : 'ce'), materia: mat, assunto: '', topico_edital: '', nivel: 'Prova real',
      enunciado: q.enunciado, alternativas: q.alternativas || [], gabarito: q.gabarito,
      comentario: q.comentario || 'Questão oficial extraída de prova anterior da banca.', trecho: '', pegadinha: '', verificada: true,
      ...comum(key, q, ans), createdAt: q.addedAt || c.created_at,
    });
  }

  return {
    ...resumir(c, sets, edital?.titulo || null),
    edital: edital ? { id: edital.id, titulo: edital.titulo, banca: edital.banca, orgao: edital.orgao, cargo: edital.cargo, ano: edital.ano } : null,
    materiais: materiaisRows.map((m) => ({
      id: m.id, fileName: m.file_name || 'Texto colado', materia: m.materia || m.edital_match?.disciplina_nome || null, assunto: m.assunto || null,
      wordCount: m.word_count, coberturaPct: m.edital_match?.cobertura_disciplina_pct ?? null, createdAt: m.created_at,
    })),
    provas: provasRows.map((p) => ({
      id: p.id, banca: p.banca, titulo: p.titulo || p.file_name, orgao: p.orgao, cargo: p.cargo, ano: p.ano, status: p.status,
      statusLabel: publicStatus[p.status] || p.status, numQuestoes: p.status === 'READY' ? p.num_questoes : null, createdAt: p.created_at,
    })),
    simulados: sets.map((s) => ({ id: s.id, banca: s.banca, materia: s.materia, assunto: s.assunto, nivel: s.nivel, arquivo: s.arquivo, qtd: (s.questoes || []).length, createdAt: s.created_at })),
    porMateria: [...porMateriaMap.values()]
      .map((m) => ({ ...m, taxaAcerto: m.respondidas > 0 ? Math.round((m.acertos / m.respondidas) * 100) : null }))
      .sort((a, b) => b.total - a.total),
    questoes,
  };
}

export async function abrir(user, id) {
  return detalhar(await buscarDoAluno(id, user.id, 'Caderno de questões não encontrado.'), user.id);
}

/** Cadernos do aluno + materiais e provas disponíveis para alimentar. */
export async function listar(user) {
  const [cadernosRows, sets, materiaisRows, provasRows] = await Promise.all([
    cadernos.listarComEdital(user.id), simulados.listarResumo(user.id), materiais.listarDoAluno(user.id), provas.disponiveisPara(user.id),
  ]);
  // Situação oficial (anulada / gabarito definitivo) de todas as questões numa consulta só
  const situacao = await carregarSituacaoOficial([...sets.map((s) => s.questoes), ...cadernosRows.map((c) => c.questoes_extras)]);
  for (const s of sets) s.questoes = situacao(s.questoes);
  for (const c of cadernosRows) if (Array.isArray(c.questoes_extras)) c.questoes_extras = situacao(c.questoes_extras);

  const setsPorCaderno = new Map();
  for (const s of sets) if (s.caderno_id) setsPorCaderno.set(s.caderno_id, [...(setsPorCaderno.get(s.caderno_id) || []), s]);

  return {
    cadernos: cadernosRows.map((c) => resumir(c, setsPorCaderno.get(c.id) || [], c.edital_titulo)),
    materiaisDisponiveis: materiaisRows.map((m) => ({
      id: m.id, fileName: m.file_name || 'Texto colado', materia: m.materia || null, assunto: m.assunto || null,
      wordCount: m.word_count, editalId: m.edital_id || null, createdAt: m.created_at,
    })),
    provasDisponiveis: provasRows.map((p) => ({
      id: p.id, banca: p.banca, titulo: p.titulo || p.file_name, orgao: p.orgao, cargo: p.cargo, ano: p.ano, editalId: p.edital_id || null,
      status: p.status, statusLabel: publicStatus[p.status] || p.status, numQuestoes: p.status === 'READY' ? p.num_questoes : null,
      minha: p.uploaded_by === user.id, createdAt: p.created_at,
    })),
  };
}

// ---------- Criar e alimentar ----------

/** Cria o caderno; com importarExistentes, já puxa materiais, provas e simulados do mesmo edital (ou da banca). */
export async function criar(user, b) {
  await assertLimitePlano(user, 'cadernos');
  for (const v of [b.titulo, b.descricao, b.orgao, b.cargo]) {
    if (v && SEV[scanText(v).severity] >= SEV.medium) throw new HttpError(422, 'Campos do caderno com conteúdo não permitido.');
  }
  const edital = b.editalId ? await editais.buscar(b.editalId, user.id) : null;
  if (b.editalId && !edital) throw new HttpError(404, 'Edital não encontrado.');

  const orgao = b.orgao || edital?.orgao || null;
  const cargo = b.cargo || edital?.cargo || null;
  const ano = b.ano || edital?.ano || null;
  const bancaNome = BANCA[b.banca]?.nome || b.banca.toUpperCase();
  const titulo = b.titulo || [orgao, cargo, ano].filter(Boolean).join(' · ') || edital?.titulo || `Caderno ${bancaNome}`;

  let materiaisIds = [], provasIds = [];
  if (b.importarExistentes) {
    if (edital) {
      [materiaisIds, provasIds] = await Promise.all([materiais.idsDoEdital(user.id, edital.id), provas.idsDoEdital(user.id, edital.id, edital.prova_id)]);
    } else {
      provasIds = await provas.idsEnviadasDaBanca(user.id, b.banca);
    }
  }
  const c = await cadernos.inserir({ userId: user.id, titulo, descricao: b.descricao, banca: b.banca, orgao, cargo, ano, editalId: edital?.id || null, materiaisIds, provasIds });
  if (b.importarExistentes) await simulados.vincularSoltos(user.id, c.id, edital ? { editalId: edital.id } : { banca: b.banca });
  return detalhar(c, user.id);
}

export async function alimentarComMaterial(user, id, materialId) {
  const c = await buscarDoAluno(id, user.id);
  const m = await materiais.buscar(materialId, user.id);
  if (!m) throw new HttpError(404, 'Material não encontrado.');
  const atualizado = await cadernos.definirMateriais(c.id, uniq([m.id, ...(c.materiais_ids || [])]));
  await simulados.vincularSoltos(user.id, c.id, { materialId: m.id });
  return {
    caderno: await detalhar(atualizado, user.id),
    material: { id: m.id, fileName: m.file_name, materia: m.materia, detect: m.detect, editalId: m.edital_id || c.edital_id || null, editalMatch: m.edital_match || null },
  };
}

/** Prova antiga: arquivo novo (vai para a base) ou prova já existente; se pronta, as questões entram no caderno. */
export async function alimentarComProva(user, id, { arquivo, gabarito, provaId, orgao, cargo, ano, ip }) {
  const c = await buscarDoAluno(id, user.id);
  let prova = null, mensagemEnvio = null;
  if (arquivo) {
    await assertCanUpload(user, 'prova');
    const out = await submitProva({
      user, banca: c.banca, orgao: orgao || c.orgao || '', cargo: cargo || c.cargo || '', ano: ano || c.ano || '',
      editalId: c.edital_id || '', file: arquivo, gabarito, ip,
    });
    const pid = out.prova?.id || out.provaId;
    if (pid) prova = await provas.buscar(pid);
    mensagemEnvio = out.duplicate
      ? 'Esta prova já estava na base e foi vinculada ao seu caderno!'
      : 'Prova recebida e vinculada ao caderno! Assim que a extração terminar, as questões entram automaticamente no caderno.';
  } else {
    if (!provaId) throw new HttpError(400, 'Selecione uma prova válida.');
    prova = await provas.buscarAcessivel(provaId, user.id);
    if (!prova) throw new HttpError(404, 'Prova não encontrada.');
  }

  const extras = Array.isArray(c.questoes_extras) ? [...c.questoes_extras] : [];
  const importadas = prova?.status === 'READY' ? await copiarQuestoesDaProva(prova, extras, c.banca) : 0;
  const atualizado = await cadernos.definirProvas(c.id, uniq([prova?.id, ...(c.provas_ids || [])]), extras);
  return {
    caderno: await detalhar(atualizado, user.id),
    importadas,
    message: mensagemEnvio || (importadas > 0
      ? `Prova vinculada! +${importadas} questão(ões) reais da prova foram adicionadas ao seu caderno.`
      : 'Prova vinculada ao caderno! O estilo dela será priorizado nas próximas gerações.'),
  };
}

export async function vincularSimulado(user, id, setId) {
  const c = await buscarDoAluno(id, user.id);
  const s = await simulados.buscar(setId, user.id);
  if (!s) throw new HttpError(404, 'Simulado não encontrado.');
  await simulados.vincularAoCaderno(s.id, user.id, c.id);
  return detalhar(await cadernos.definirMateriais(c.id, uniq([s.material_id, ...(c.materiais_ids || [])])), user.id);
}

// ---------- Interagir ----------

/**
 * Responder, favoritar, anotar ou refazer (todas / só as erradas). Cada mudança altera só a sua chave no banco
 * (mescla atômica), então ações seguidas — ou um PATCH do simulado ao mesmo tempo — não se sobrescrevem.
 */
export async function interagir(user, id, b) {
  const c = await buscarDoAluno(id, user.id);
  if (b.anotacao && SEV[scanText(b.anotacao).severity] >= SEV.medium) throw new HttpError(422, 'Anotação com conteúdo não permitido.');

  if (b.reset === 'all') {
    await Promise.all([
      cadernos.definirMapa(c.id, user.id, 'respostas_extras', {}),
      cadernos.definirMapa(c.id, user.id, 'revisao_espacada', {}),
      simulados.limparRespostasDoCaderno(user.id, c.id),
    ]);
  } else if (b.reset === 'erros') {
    const respExtras = { ...objeto(c.respostas_extras) };
    for (const q of Array.isArray(c.questoes_extras) ? c.questoes_extras : []) {
      if (respExtras[q.id] != null && respExtras[q.id] !== q.gabarito) delete respExtras[q.id];
    }
    await cadernos.definirMapa(c.id, user.id, 'respostas_extras', respExtras);
    for (const s of await simulados.listarDoCaderno(user.id, c.id)) {
      const r = { ...(s.respostas || {}) };
      let mudou = false;
      (s.questoes || []).forEach((q, idx) => { if (r[idx] != null && r[idx] !== q.gabarito) { delete r[idx]; mudou = true; } });
      if (mudou) await simulados.redefinirRespostas(s.id, user.id, r);
    }
  }

  if (b.key) {
    const favs = objeto(c.favoritas), notes = objeto(c.anotacoes);
    if ((b.favorita && !favs[b.key] && Object.keys(favs).length >= MAX_MARCACOES)
      || (b.anotacao && !notes[b.key] && Object.keys(notes).length >= MAX_MARCACOES)) {
      throw new HttpError(422, 'Este caderno atingiu o limite de favoritas/anotações.');
    }
    if (b.favorita !== undefined) {
      await (b.favorita ? cadernos.mesclarMapa(c.id, user.id, 'favoritas', { [b.key]: true }) : cadernos.removerDoMapa(c.id, user.id, 'favoritas', b.key));
    }
    if (b.anotacao !== undefined) {
      await (b.anotacao ? cadernos.mesclarMapa(c.id, user.id, 'anotacoes', { [b.key]: b.anotacao }) : cadernos.removerDoMapa(c.id, user.id, 'anotacoes', b.key));
    }
    if (b.resposta !== undefined) await responder(user, c, b.key, b.resposta);
  }

  return detalhar(await cadernos.buscar(c.id, user.id), user.id);
}

/** Grava a resposta de uma questão do caderno e, se respondida, atualiza atividade do dia e revisão espaçada. */
async function responder(user, c, key, resposta) {
  let q = null, anterior = null;
  if (key.startsWith('set:')) {
    const [, setId, idxStr] = key.split(':');
    const idx = Number(idxStr);
    if (!UUID.test(setId) || !Number.isInteger(idx) || idx < 0) return;
    const s = await simulados.buscar(setId, user.id);
    if (!s) return;
    anterior = (s.respostas || {})[idx] ?? null;
    await simulados.definirResposta(s.id, user.id, idx, resposta);
    q = (await aplicarSituacaoOficial(s.questoes || []))[idx];
  } else if (key.startsWith('extra:')) {
    const qid = key.slice(6);
    anterior = objeto(c.respostas_extras)[qid] ?? null;
    await (resposta === null ? cadernos.removerDoMapa(c.id, user.id, 'respostas_extras', qid) : cadernos.mesclarMapa(c.id, user.id, 'respostas_extras', { [qid]: resposta }));
    const q0 = (Array.isArray(c.questoes_extras) ? c.questoes_extras : []).find((item) => String(item.id) === String(qid));
    q = q0 ? (await aplicarSituacaoOficial([q0]))[0] : null;
  }
  if (resposta === null || !q?.gabarito || q.anulada) return;

  const acerto = resposta === q.gabarito;
  await registrarAtividade(user.id, { respondidas: 1, acertos: acerto ? 1 : 0 }); // meta diária e sequência
  const novo = calcularRevisao({ estadoAnterior: estadoEfetivo(objeto(c.revisao_espacada)[key], anterior, q.gabarito), acerto });
  if (novo) await cadernos.mesclarMapa(c.id, user.id, 'revisao_espacada', { [key]: novo });
}

// ---------- "Por que errei?" e exclusão ----------

/** Só questões que estão neste caderno (R7): nada de buscar qualquer questão da base pelo id. */
export async function explicarErro(user, id, { key, resposta }) {
  const c = await buscarDoAluno(id, user.id);
  const found = await questaoDoCaderno(c, key, user.id);
  if (!found) throw new HttpError(404, 'Questão não encontrada.');
  const q = found.q;
  return obterOuGerarExplicacao({
    user, questao: q, respostaAluno: found.resposta || resposta || '', banca: c.banca,
    materia: q.materia || found.set?.materia || c.titulo || 'Geral',
    formato: found.set ? found.set.formato : (q.alternativas?.length ? 'me' : 'ce'),
  });
}

export async function excluir(user, id) {
  await simulados.desvincularDoCaderno(user.id, id);
  await cadernos.excluir(id, user.id);
}
