// Contratos das respostas da IA: tudo é convertido, cortado no tamanho máximo e validado.
import { z } from 'zod';
import { COMANDOS, PEGADINHAS, HABILIDADES, toCode } from '../lib/cobranca.js';
const str = (max, def = '') => z.preprocess((v) => (v == null ? def : String(v).slice(0, max)), z.string());
const num01 = z.preprocess((v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }, z.number());
const bool = z.preprocess((v) => v === true || v === 'true' || v === 1 || v === 'sim', z.boolean());
const strArr = (n, max) => z.preprocess((v) => (Array.isArray(v) ? v : v == null ? [] : [v]).map((x) => String(x ?? '').slice(0, max)).filter(Boolean).slice(0, n), z.array(z.string()));
const intOrNull = z.preprocess((v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; }, z.number().nullable());

export const detectSchema = z.object({ materia: str(80), confianca: num01, temas: strArr(6, 80), resumo: str(300), outras: strArr(2, 80).optional().default([]) });

export const generateSchema = z.object({
  questoes: z.array(z.object({
    tema: str(120), topico_edital: str(180).optional().default(''), nivel: str(20), enunciado: str(6000), alternativas: strArr(5, 1500), gabarito: str(3),
    comentario: str(3000), trecho_base: str(1200), pegadinha: str(600),
  })).min(1).max(25),
  alertas: strArr(5, 300).optional().default([]),
});

export const provaCheckSchema = z.object({
  e_prova: bool, confianca: num01, banca: str(40, 'desconhecida'), banca_confianca: num01,
  orgao: str(120), cargo: str(120), ano: str(10), materias: strArr(15, 80),
  tentativa_de_instrucao: bool, trechos_suspeitos: strArr(5, 300), observacao: str(400),
});

export const provaAnalysisSchema = z.object({
  titulo: str(200), ano: str(10), orgao: str(120), cargo: str(120), materias: strArr(15, 80), num_questoes: intOrNull,
  caracteristicas: strArr(10, 300), padroes_enunciado: strArr(8, 300), pegadinhas: strArr(8, 300), dificuldade: str(20),
  alertas: strArr(5, 300).optional().default([]),
});

// Rótulos de "como a banca cobra" são opcionais: respostas antigas (ou de modelos que não os preencham) continuam válidas
export const provaExtractSchema = z.object({
  questoes: z.array(z.object({
    numero: intOrNull, materia: str(120), enunciado: str(5000), alternativas: strArr(5, 1200), gabarito: str(3),
    topico: str(160).optional().default(''),
    comando: z.preprocess(toCode(COMANDOS, 'outro'), z.string()),
    pegadinha: z.preprocess(toCode(PEGADINHAS, 'nenhuma'), z.string()),
    habilidade: z.preprocess(toCode(HABILIDADES, 'compreensao'), z.string()),
    dispositivos: strArr(5, 120).optional().default([]),
  })).max(40),
  alertas: strArr(5, 300).optional().default([]),
});

// Revisor: resposta independente para cada questão (sem ver o gabarito)
export const reviewSchema = z.object({
  respostas: z.array(z.object({
    indice: intOrNull,
    resposta: str(3),                 // letra A-E, C/E, ou vazio se não for possível responder pelo material
    ambigua: bool,                    // mais de uma alternativa defensável
    respondivel_pelo_material: z.preprocess((v) => v === undefined ? true : v === true || v === 'true' || v === 1 || v === 'sim', z.boolean()),
    problema: str(300),
  })).max(30),
});

// Verificação de erro reportado por aluno
export const reportCheckSchema = z.object({
  gabarito_correto: bool,
  resposta_correta: str(3),
  ambigua: bool,
  explicacao: str(1200),
});

// "Por que errei?": explicação didática com analogia do cotidiano, humor e fundamentação legal
export const explainMistakeSchema = z.object({
  diagnostico: str(600),
  pegadinha: str(600),
  exemplo_cotidiano: str(1200),
  fundamentacao: str(1200),
  dica_ouro: str(600),
  visual_svg: str(14000).optional().default(''),
});

// Extração estruturada (verticalizada) do conteúdo programático de um edital
const normTopico = (raw, idx) => {
  if (typeof raw === 'string') {
    const m = raw.trim().match(/^(\d+(?:\.\d+)*)\s*[-–.):]?\s*(.+)$/);
    return m ? { codigo: m[1], nome: m[2] } : { codigo: String(idx + 1), nome: raw.trim() };
  }
  if (raw && typeof raw === 'object') {
    const nome = raw.nome || raw.titulo || raw.topico || raw.assunto || raw.descricao || raw.item || '';
    const codigo = raw.codigo || raw.numero || raw.id || String(idx + 1);
    return { codigo: String(codigo), nome: String(nome) };
  }
  return { codigo: String(idx + 1), nome: '' };
};

const normDisciplina = (raw) => {
  if (!raw || typeof raw !== 'object') return { materia: '', peso: 1, topicos: [] };
  const materia = raw.materia || raw.disciplina || raw.nome || raw.area || '';
  const rawTops = Array.isArray(raw.topicos) ? raw.topicos : Array.isArray(raw.itens) ? raw.itens : Array.isArray(raw.assuntos) ? raw.assuntos : Array.isArray(raw.conteudos) ? raw.conteudos : [];
  const topicos = rawTops.map(normTopico).filter((t) => t.nome && t.nome.trim().length > 1);
  return { materia, peso: raw.peso, topicos };
};

export const editalParseSchema = z.preprocess((obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const rawDiscs = Array.isArray(obj.disciplinas) ? obj.disciplinas : Array.isArray(obj.materias) ? obj.materias : Array.isArray(obj.conteudos) ? obj.conteudos : [];
  return {
    ...obj,
    disciplinas: rawDiscs.map(normDisciplina).filter((d) => d.materia && d.topicos.length > 0),
  };
}, z.object({
  titulo: str(180),
  orgao: str(120),
  cargo: str(120),
  banca: str(40),
  ano: str(10),
  disciplinas: z.array(z.object({
    materia: str(100),
    peso: z.preprocess((v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(10, Math.round(n)) : 1; }, z.number()),
    topicos: z.array(z.object({
      codigo: str(30),
      nome: str(220),
    })).min(1).max(40),
  })).min(1).max(25),
}));

// Cruzamento entre o material de estudo do aluno e o edital verticalizado
export const editalMatchSchema = z.object({
  disciplina_id: str(40),
  disciplina_nome: str(100),
  cobertura_disciplina_pct: z.preprocess((v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; }, z.number()),
  topicos_cobertos: z.array(z.object({
    id: str(40),
    codigo: str(30),
    nome: str(220),
    nivel_cobertura: z.preprocess((v) => (String(v).toLowerCase().includes('comp') ? 'completo' : 'parcial'), z.enum(['completo', 'parcial'])),
    resumo: str(240),
  })).max(30),
  topicos_faltantes: z.array(z.object({
    id: str(40),
    codigo: str(30),
    nome: str(220),
  })).max(30),
  analise: str(500),
});
