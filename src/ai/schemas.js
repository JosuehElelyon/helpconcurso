// Contratos das respostas da IA: tudo é convertido, cortado no tamanho máximo e validado.
import { z } from 'zod';
const str = (max, def = '') => z.preprocess((v) => (v == null ? def : String(v).slice(0, max)), z.string());
const num01 = z.preprocess((v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }, z.number());
const bool = z.preprocess((v) => v === true || v === 'true' || v === 1 || v === 'sim', z.boolean());
const strArr = (n, max) => z.preprocess((v) => (Array.isArray(v) ? v : v == null ? [] : [v]).map((x) => String(x ?? '').slice(0, max)).filter(Boolean).slice(0, n), z.array(z.string()));
const intOrNull = z.preprocess((v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; }, z.number().nullable());

export const detectSchema = z.object({ materia: str(80), confianca: num01, temas: strArr(6, 80), resumo: str(300), outras: strArr(2, 80).optional().default([]) });

export const generateSchema = z.object({
  questoes: z.array(z.object({
    tema: str(120), nivel: str(20), enunciado: str(6000), alternativas: strArr(5, 1500), gabarito: str(3),
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

export const provaExtractSchema = z.object({
  questoes: z.array(z.object({ numero: intOrNull, materia: str(120), enunciado: str(5000), alternativas: strArr(5, 1200), gabarito: str(3) })).max(40),
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
