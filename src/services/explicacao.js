// =====================================================================
// Serviço "Por que errei?" sob Demanda (F4)
// Explicação didática com analogia do cotidiano, humor, fundamentação e SVG
// com cache global em banco de dados para custo zero em acessos futuros
// =====================================================================
import crypto from 'node:crypto';
import { one, query } from '../db.js';
import { runJSON } from '../ai/index.js';
import { explainMistakeSchema } from '../ai/schemas.js';
import { promptExplainMistake } from '../lib/prompts.js';
import { HttpError } from '../lib/http.js';
import { planoDoUsuario } from '../lib/planos.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
/** Respostas possíveis para a questão: C/E no CEBRASPE; A.. até o número de alternativas na múltipla escolha. */
export function respostasValidas(questao, formato) {
  if (formato === 'ce') return ['C', 'E'];
  const n = Array.isArray(questao?.alternativas) && questao.alternativas.length ? Math.min(5, questao.alternativas.length) : 5;
  return LETRAS.slice(0, n);
}

/** Explicações NOVAS (geradas pela IA) pedidas pelo aluno hoje, no dia de Brasília. Cache não conta. */
export async function explicacoesNovasHoje(userId) {
  const r = await one(
    `SELECT count(*)::int AS n FROM questao_explicacoes
      WHERE criado_por=$1 AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date`,
    [userId]
  );
  return r?.n || 0;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Gera um hash estável e determinístico da questão para cache global */
export function calcularQuestaoHash(enunciado, alternativas = []) {
  const normAlts = (Array.isArray(alternativas) ? alternativas : []).map(norm).join('|');
  const raw = `${norm(enunciado)}|${normAlts}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Remove scripts, event handlers e elementos perigosos do SVG por segurança */
export function sanitizeSvg(svg) {
  if (!svg || typeof svg !== 'string') return '';
  const trimmed = svg.trim();
  const start = trimmed.indexOf('<svg');
  const end = trimmed.lastIndexOf('</svg>');
  if (start === -1 || end === -1) return '';
  let clean = trimmed.slice(start, end + 6);
  // Remove tags script e atributos com on* ou javascript:
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/\son\w+="[^"]*"/gi, '');
  clean = clean.replace(/\son\w+='[^']*'/gi, '');
  clean = clean.replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
  // Elementos que carregam conteúdo/script, atributos de evento, links (só "#" é aceito), url() e DTD
  const PERIGO = /<\s*\/?\s*(script|foreignObject|iframe|object|embed|image|use|animate\w*|set|style|link|meta|a)\b|\son[a-z]+\s*=|href\s*=\s*["']?\s*(?!#["'\s>])|url\s*\(|<!ENTITY|<!DOCTYPE|javascript\s*:/i;
  if (PERIGO.test(clean)) return '';
  return clean;
}

/**
 * Obtém ou gera uma explicação do erro sob demanda.
 * Se já existir para a mesma questão e a mesma alternativa marcada,
 * retorna do cache global com custo US$ 0 de tokens.
 */
export async function obterOuGerarExplicacao({
  user,
  questao,
  respostaAluno,
  banca = 'Banca de Concurso',
  materia = 'Geral',
  formato = 'me',
  signal = null,
}) {
  const resp = String(respostaAluno || '').trim().toUpperCase();
  const gab = String(questao.gabarito || '').trim().toUpperCase();

  if (!resp) {
    throw new HttpError(400, 'Informe a alternativa que você marcou.');
  }
  if (questao.anulada) throw new HttpError(400, 'Esta questão foi anulada pela banca e não conta como erro.');
  if (!respostasValidas(questao, formato).includes(resp)) throw new HttpError(400, 'Resposta inválida para esta questão.');
  if (resp === gab) {
    throw new HttpError(400, 'Você acertou esta questão! O recurso "Por que errei?" é dedicado a diagnosticar e corrigir respostas incorretas.');
  }

  const questaoId = questao.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(questao.id))
    ? questao.id
    : null;
  const questaoHash = calcularQuestaoHash(questao.enunciado, questao.alternativas);

  // 1. Consulta o cache global no banco de dados
  const cachedRow = await one(
    `SELECT id, questao_id, questao_hash, resposta_aluno, gabarito_oficial, formato,
            diagnostico, pegadinha, exemplo_cotidiano, fundamentacao, dica_ouro, visual_svg,
            model, created_at
     FROM questao_explicacoes
     WHERE (questao_id = $1 OR questao_hash = $2) AND resposta_aluno = $3 AND gabarito_oficial = $4
     ORDER BY created_at DESC LIMIT 1`,
    [questaoId, questaoHash, resp, gab]
  );

  if (cachedRow) {
    return {
      cached: true,
      explicacao: {
        id: cachedRow.id,
        diagnostico: cachedRow.diagnostico,
        pegadinha: cachedRow.pegadinha,
        exemploCotidiano: cachedRow.exemplo_cotidiano,
        fundamentacao: cachedRow.fundamentacao,
        dicaOuro: cachedRow.dica_ouro,
        visualSvg: cachedRow.visual_svg,
        model: cachedRow.model,
        createdAt: cachedRow.created_at,
      },
    };
  }

  // 2. Não está no cache: confere o limite diário do plano antes de gastar com a IA
  const limite = planoDoUsuario(user).limites.explicacoesDia;
  if (limite != null && (await explicacoesNovasHoje(user.id)) >= limite) {
    throw new HttpError(429, `Você usou as ${limite} explicações novas de hoje do seu plano. Explicações já prontas continuam liberadas; amanhã o limite renova.`);
  }

  // Gera com a IA (Haiku com raciocínio ou Sonnet)
  const promptData = promptExplainMistake({
    q: questao,
    formato,
    respostaAluno: resp,
    banca,
    materia,
  });

  const { data, meta } = await runJSON(
    'explain_mistake',
    {
      ...promptData,
      userId: user.id,
      signal,
      maxTokens: 4000,
    },
    explainMistakeSchema
  );

  const cleanSvg = sanitizeSvg(data.visual_svg);

  // 3. Grava no cache global
  const newRow = await one(
    `INSERT INTO questao_explicacoes (
       questao_id, questao_hash, resposta_aluno, gabarito_oficial, formato,
       diagnostico, pegadinha, exemplo_cotidiano, fundamentacao, dica_ouro, visual_svg,
       model, tokens_in, tokens_out, criado_por
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id, diagnostico, pegadinha, exemplo_cotidiano, fundamentacao, dica_ouro, visual_svg, model, created_at`,
    [
      questaoId,
      questaoHash,
      resp,
      gab,
      formato,
      data.diagnostico,
      data.pegadinha,
      data.exemplo_cotidiano,
      data.fundamentacao,
      data.dica_ouro,
      cleanSvg,
      meta ? `${meta.provider}:${meta.model}` : 'ia',
      meta?.tokensIn || 0,
      meta?.tokensOut || 0,
      user.id,
    ]
  );

  return {
    cached: false,
    explicacao: {
      id: newRow.id,
      diagnostico: newRow.diagnostico,
      pegadinha: newRow.pegadinha,
      exemploCotidiano: newRow.exemplo_cotidiano,
      fundamentacao: newRow.fundamentacao,
      dicaOuro: newRow.dica_ouro,
      visualSvg: newRow.visual_svg,
      model: newRow.model,
      createdAt: newRow.created_at,
    },
  };
}

