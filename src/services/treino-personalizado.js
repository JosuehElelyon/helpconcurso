// Serviço de Treino Personalizado: filtra questões do aluno / provas oficiais e gera baterias sem IA.
import { BANCA } from '../lib/bancas.js';
import { COMANDOS, PEGADINHAS } from '../lib/cobranca.js';
import { normalizarEstrategia } from '../lib/estrategia.js';
import { HttpError } from '../lib/http.js';
import { visaoSimulado } from '../lib/visao-simulado.js';
import * as cadernosServ from './cadernos.js';
import * as cadernosRepo from '../repositories/cadernos.js';
import * as materiaisRepo from '../repositories/materiais.js';
import * as provasRepo from '../repositories/provas.js';
import * as simuladosRepo from '../repositories/simulados.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function matchMateria(itemMateria, materiasFiltro) {
  if (!materiasFiltro.length) return true;
  const alvo = norm(itemMateria);
  if (!alvo) return false;
  return materiasFiltro.some((f) => {
    const nf = norm(f);
    return nf && (alvo === nf || alvo.includes(nf) || nf.includes(alvo));
  });
}

const formatoDaQuestao = (q) => (Array.isArray(q.alternativas) && q.alternativas.length >= 2 ? 'me' : 'ce');

function coletarDoMeuConteudo(sets, { materias = [], bancaFoco = '', materialIds = [] }) {
  const matSet = new Set(materialIds || []);
  const filtroMaterias = materias || [];
  const candidatas = [];

  for (const s of sets) {
    if (matSet.size > 0 && (!s.material_id || !matSet.has(s.material_id))) continue;
    if (bancaFoco && (!s.banca || s.banca !== bancaFoco)) continue;

    const resps = s.respostas || {};
    const qs = Array.isArray(s.questoes) ? s.questoes : [];
    const setMateriaMatches = matchMateria(s.materia, filtroMaterias);

    qs.forEach((q, idx) => {
      if (!q?.enunciado || !q?.gabarito) return;
      const qMat = q.materia || s.materia || '';
      if (filtroMaterias.length > 0 && !setMateriaMatches && !matchMateria(qMat, filtroMaterias)) return;

      const resp = resps[idx];
      const ineditismoScore = resp == null ? 3 : (resp !== q.gabarito ? 2 : 1);
      candidatas.push({
        _score: ineditismoScore,
        _rnd: Math.random(),
        _formato: formatoDaQuestao(q),
        id: q.id || null,
        numero: idx + 1,
        banca: q.banca || s.banca || bancaFoco || null,
        materia: qMat || 'Geral',
        tema: q.tema || s.assunto || qMat,
        topico_edital: q.topico_edital || '',
        enunciado: q.enunciado,
        alternativas: Array.isArray(q.alternativas) ? q.alternativas : [],
        gabarito: String(q.gabarito).trim().toUpperCase(),
        comentario: q.comentario || '',
        nivel: q.nivel || s.nivel || 'Médio',
        pegadinha: q.pegadinha || '',
        verificada: true,
        ancorada: !!s.material_id,
      });
    });
  }

  candidatas.sort((a, b) => b._score - a._score || a._rnd - b._rnd);
  return candidatas;
}

function formatarQuestaoReal(q, idx) {
  const fmt = formatoDaQuestao(q);
  return {
    _formato: fmt,
    id: q.id,
    numero: idx + 1,
    provaId: q.prova_id,
    provaTitulo: q.prova_titulo || q.file_name || 'Prova anterior',
    provaAno: q.prova_ano || null,
    banca: q.banca,
    materia: q.materia || 'Geral',
    tema: q.topico || q.materia || 'Geral',
    topico_edital: q.topico || '',
    enunciado: q.enunciado,
    alternativas: fmt === 'ce' ? [] : (Array.isArray(q.alternativas) ? q.alternativas : []),
    gabarito: String(q.gabarito).trim().toUpperCase(),
    comentario: `Questão oficial de ${q.prova_titulo || 'prova anterior'}${q.prova_ano ? ` (${q.prova_ano})` : ''}.${q.comando && COMANDOS[q.comando] ? ` Comando: ${COMANDOS[q.comando]}.` : ''}`,
    nivel: 'Prova real',
    pegadinha: q.pegadinha_tipo && PEGADINHAS[q.pegadinha_tipo] ? PEGADINHAS[q.pegadinha_tipo] : '',
    dispositivos: Array.isArray(q.dispositivos) ? q.dispositivos : [],
    verificada: true,
    ancorada: true,
  };
}

/** Pré-calcula quantas questões existem para os filtros escolhidos pelo aluno. */
export async function simularDisponibilidade(user, rawFiltro) {
  const f = normalizarEstrategia(rawFiltro, user.banca_preferida || '');
  if (f.modoFoco === 'caderno') {
    if (!f.cadernoId) return { total: 0, meuConteudo: 0, bancoProvas: 0, caderno: 0 };
    const { cadernos } = await cadernosServ.listar(user);
    const cad = cadernos.find((c) => c.id === f.cadernoId);
    const q = cad?.totalQuestoes || 0;
    return { total: q, meuConteudo: 0, bancoProvas: 0, caderno: q };
  }

  const [sets, reaisCount] = await Promise.all([
    f.fonteConteudo === 'banco_provas' ? Promise.resolve([]) : simuladosRepo.listar(user.id, 200),
    f.fonteConteudo === 'meu_conteudo' ? Promise.resolve(0) : provasRepo.contarReaisPorFiltro({
      materias: f.materias,
      banca: f.bancaFoco || null,
    }),
  ]);

  const meuConteudo = f.fonteConteudo === 'banco_provas' ? 0 : coletarDoMeuConteudo(sets, f).length;
  const total = f.fonteConteudo === 'meu_conteudo'
    ? meuConteudo
    : f.fonteConteudo === 'banco_provas' ? reaisCount : meuConteudo + reaisCount;

  return { total, meuConteudo, bancoProvas: reaisCount, caderno: 0 };
}

/** Cria uma bateria personalizada (question_set) ou abre o caderno/geração conforme filtro. */
export async function iniciarTreinoPersonalizado(user, rawFiltro) {
  const f = normalizarEstrategia(rawFiltro, user.banca_preferida || '');

  if (f.modoFoco === 'caderno') {
    if (!f.cadernoId) throw new HttpError(400, 'Selecione um caderno de questões para treinar.');
    const cad = await cadernosRepo.buscar(f.cadernoId, user.id);
    if (!cad) throw new HttpError(404, 'Caderno não encontrado.');
    return { action: 'open_caderno', cadernoId: cad.id, titulo: cad.titulo };
  }

  const [sets, mats] = await Promise.all([
    f.fonteConteudo === 'banco_provas' ? Promise.resolve([]) : simuladosRepo.listar(user.id, 200),
    materiaisRepo.listarDoAluno(user.id, 60),
  ]);

  const doMeuConteudo = f.fonteConteudo === 'banco_provas' ? [] : coletarDoMeuConteudo(sets, f);
  const reaisRows = f.fonteConteudo === 'meu_conteudo'
    ? []
    : await provasRepo.questoesReaisPorFiltro({ materias: f.materias, banca: f.bancaFoco || null, limite: f.qtdTreino * 3 });
  const doBancoProvas = reaisRows.map(formatarQuestaoReal);

  const escolhidas = [];
  const vistas = new Set();
  const formatoAlvo = f.bancaFoco && BANCA[f.bancaFoco] ? BANCA[f.bancaFoco].formato : null;

  const pushUnique = (q) => {
    if (formatoAlvo && q._formato !== formatoAlvo) return false;
    const chave = norm(q.enunciado).slice(0, 90);
    if (!chave || vistas.has(chave)) return false;
    vistas.add(chave);
    escolhidas.push(q);
    return true;
  };

  if (f.fonteConteudo === 'misto') {
    const metade = Math.ceil(f.qtdTreino / 2);
    for (const q of doMeuConteudo) {
      if (escolhidas.length >= metade) break;
      pushUnique(q);
    }
    for (const q of doBancoProvas) {
      if (escolhidas.length >= f.qtdTreino) break;
      pushUnique(q);
    }
    for (const q of doMeuConteudo) {
      if (escolhidas.length >= f.qtdTreino) break;
      pushUnique(q);
    }
  } else if (f.fonteConteudo === 'meu_conteudo') {
    for (const q of doMeuConteudo) {
      if (escolhidas.length >= f.qtdTreino) break;
      pushUnique(q);
    }
  } else {
    for (const q of doBancoProvas) {
      if (escolhidas.length >= f.qtdTreino) break;
      pushUnique(q);
    }
  }

  if (!escolhidas.length) {
    if (f.fonteConteudo === 'meu_conteudo') {
      const targetMat = f.materialIds.length
        ? mats.find((m) => f.materialIds.includes(m.id))
        : mats.find((m) => matchMateria(m.materia, f.materias));
      return {
        action: 'need_generate',
        materialId: targetMat?.id || null,
        materia: f.materias[0] || targetMat?.materia || '',
        banca: f.bancaFoco || '',
      };
    }
    if (f.fonteConteudo === 'banco_provas') {
      throw new HttpError(404, 'Nenhuma questão oficial encontrada para essa combinação de matérias e banca.');
    }
    throw new HttpError(404, 'Nenhuma questão encontrada para esses filtros no momento.');
  }

  const temMe = escolhidas.some((q) => q._formato === 'me');
  const formatoFinal = formatoAlvo || (temMe ? 'me' : 'ce');
  const questoesFinais = escolhidas
    .filter((q) => q._formato === formatoFinal)
    .map((q, i) => {
      const cleanQ = { ...q, numero: i + 1 };
      delete cleanQ._formato;
      delete cleanQ._score;
      delete cleanQ._rnd;
      return cleanQ;
    });

  const materiasLabel = f.materias.length
    ? (f.materias.length > 2 ? `${f.materias.slice(0, 2).join(', ')} +${f.materias.length - 2}` : f.materias.join(', '))
    : 'Todas as matérias';
  const bancaNome = f.bancaFoco && BANCA[f.bancaFoco] ? BANCA[f.bancaFoco].nome : 'Bancas Mistas';
  const fonteLabel = f.fonteConteudo === 'meu_conteudo' ? 'Meu Conteúdo' : f.fonteConteudo === 'banco_provas' ? 'Provas Oficiais' : 'Treino Misto';

  const setRow = await simuladosRepo.inserir({
    user_id: user.id,
    banca: f.bancaFoco || null,
    materia: materiasLabel,
    assunto: `${fonteLabel} · ${bancaNome}`,
    nivel: 'Personalizado',
    formato: formatoFinal,
    arquivo: `Meta Personalizada · ${materiasLabel}`,
    questoes: questoesFinais,
    respostas: {},
    finalizado: false,
    model: 'meta_treino',
    origem: 'meta_treino',
  });

  return {
    action: 'open_set',
    set: visaoSimulado(setRow),
    totalQuestoes: questoesFinais.length,
  };
}
