// Taxonomia própria do HelpConcurso (matéria → tópico). Ver docs/ARQUITETURA-CONHECIMENTO.md.
// IDs são slugs determinísticos: o mesmo nome (sem acento/maiúsculas/pontuação) sempre cai no mesmo ID,
// então edital, prova real e questão gerada se encontram sem precisar de IA.
import * as taxonomiaRepo from '../repositories/taxonomia.js';
import { MATERIAS } from '../lib/bancas.js';

export const normNome = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const slug = (s) => normNome(s).replace(/\s+/g, '-').slice(0, 80);

// Variações comuns de nome de matéria em editais e provas
const SINONIMOS = {
  'Língua Portuguesa': ['portugues', 'lingua portuguesa e interpretacao de texto', 'interpretacao de textos'],
  'Raciocínio Lógico': ['raciocinio logico matematico', 'raciocinio logico e matematico', 'rlm', 'logica'],
  'Informática': ['nocoes de informatica', 'tecnologia da informacao', 'conhecimentos de informatica'],
  'Direito Constitucional': ['nocoes de direito constitucional'],
  'Direito Administrativo': ['nocoes de direito administrativo'],
  'Ética no Serviço Público': ['etica', 'etica no servico publico e legislacao'],
  'Conhecimentos Bancários': ['conhecimentos bancarios e atualidades do mercado financeiro'],
  'Língua Inglesa': ['ingles'],
};

let materiaIndex = null; // nome_norm/sinônimo → id

/** Cria (se faltar) as matérias-semente. Idempotente; chamado na subida do servidor. */
export async function ensureTaxonomiaSeed() {
  for (const nome of MATERIAS) {
    await taxonomiaRepo.semearMateria(slug(nome), nome, normNome(nome), SINONIMOS[nome]);
  }
  materiaIndex = null;
}

async function loadMateriaIndex() {
  if (materiaIndex) return materiaIndex;
  const rows = await taxonomiaRepo.materias();
  const idx = new Map();
  for (const r of rows) {
    idx.set(r.nome_norm, r.id);
    for (const s of r.sinonimos || []) idx.set(normNome(s), r.id);
  }
  materiaIndex = idx;
  return idx;
}

/** Mapeia um nome de matéria (livre) para o ID da taxonomia. Sem correspondência → 'outra'. */
export async function materiaId(nome) {
  const idx = await loadMateriaIndex();
  const n = normNome(nome);
  if (!n) return 'outra';
  if (idx.has(n)) return idx.get(n);
  // "Noções de Direito Administrativo e Legislação" → contém o nome de uma matéria conhecida
  let best = null;
  for (const [k, id] of idx) if (k.length >= 5 && n.includes(k) && (!best || k.length > best.k.length)) best = { k, id };
  return best ? best.id : 'outra';
}

/** Garante o tópico (filho da matéria) e devolve o ID. Nomes iguais após normalização viram o mesmo tópico. */
export async function topicoId(matId, nome) {
  const n = normNome(nome);
  if (!matId || n.length < 3) return null;
  const id = `${matId}/${slug(nome)}`;
  const limpo = String(nome).trim().replace(/\s+/g, ' ').slice(0, 160);
  await taxonomiaRepo.garantirTopico(id, matId, limpo, n);
  return id;
}
