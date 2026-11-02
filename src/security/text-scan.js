// =====================================================================
// Varredura de TEXTO — roda em todo texto que veio de usuário (material, prova, gabarito, OCR, texto oculto)
// e também nas respostas da IA. Detecta:
//  • caracteres invisíveis/contrabandeados (unicode tags, larguras zero, controles bidirecionais)
//  • letras disfarçadas (homóglifos: "іgnore" com i cirílico)
//  • tentativas de dar ordens à IA (prompt injection) em PT, EN e ES, inclusive com letras espaçadas
//  • falsificação de marcadores de papel (<|system|>, [INST], "System:")
//  • código/HTML/scripts e blocos base64 (que são decodificados e varridos de novo)
// =====================================================================

export const SEV = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
export const maxSeverity = (findings) => findings.reduce((m, f) => (SEV[f.severity] > SEV[m] ? f.severity : m), 'info');

const finding = (code, severity, message, sample) => ({ code, severity, message, ...(sample ? { sample: String(sample).slice(0, 160) } : {}) });
const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- Unicode ----------
const RE_TAGS = /[\u{E0000}-\u{E007F}]/gu;              // "ASCII smuggling": texto invisível que modelos leem
const RE_ZERO = /[​-‍⁠-⁤﻿᠎­]/g;
const RE_BIDI = /[‪-‮⁦-⁩‎‏؜]/g;
const RE_CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const RE_VARSEL = /[︀-️\u{E0100}-\u{E01EF}]/gu;   // seletores de variação (também usados para esconder dados)

// ---------- Regras de injeção (aplicadas no texto "achatado": minúsculo, sem acento) ----------
const RULES = [
  { code: 'ignorar_instrucoes', severity: 'critical', msg: 'Pede para ignorar/desconsiderar instruções ou regras',
    re: /\b(ignore|ignora|ignorem|desconsidere|desconsiderem|desconsidera|esqueca|esquecam|esquece|disregard|forget|override|bypass|anule|descarte|olvida|olvide)\b[^.\n]{0,50}\b(instruc\w*|instruct\w*|prompts?|comandos?|diretrizes|directives?|guidelines|orientacoes (anteriores|acima|do sistema)|(regras|rules|tudo|everything|all|todo|todas?) (as |the |o )?(anteriores|acima|previas|previous|prior|above|do sistema|of the system|que (te|lhe|you)))\b/ },
  { code: 'novas_instrucoes', severity: 'high', msg: 'Declara "novas instruções" ou regras para quem lê',
    re: /\b(novas?|new|updated|atualizad\w*|nuevas?|verdadeiras?|real)\s+(instruc\w*|instructions?|regras?|rules?|diretriz\w*|ordens?|orders?|tarefas?|task)\b/ },
  { code: 'troca_de_papel', severity: 'high', msg: 'Tenta redefinir o papel/identidade da IA',
    re: /\b(voce agora e|agora voce e|a partir de agora,? (voce|tu)|you are now|from now on,? you|you will now|eres ahora|a partir de ahora|finja (ser|que)|pretend (to be|you are)|roleplay as|entre no modo|enter (developer|god|dan) mode)\b/ },
  { code: 'fala_com_ia', severity: 'high', msg: 'Dirige uma mensagem/ordem a uma IA',
    re: /\b(para|to|atencao|attention|nota|note|aviso|instrucao|instruction|mensagem|message|importante)\s+(a |o |the |ao |pra )?(ia|i\.a\.|inteligencia artificial|modelo( de linguagem)?|language model|llm|chatgpt|claude|gpt|gemini|assistente|assistant|ai|bot)\s*[:\-—,]/ },
  { code: 'fala_com_ia', severity: 'high', msg: 'Dirige uma ordem a uma IA',
    re: /\b(ia|modelo de linguagem|language model|llm|chatgpt|claude|gemini|assistente|assistant|ai|bot)\s*[:,]\s*(voce|you|ignore|aprove|approve|responda|answer|gere|generate|siga|follow|nao |do not|don't|classifique|classify)\b/ },
  { code: 'fala_com_ia', severity: 'high', msg: 'Interpela diretamente uma IA',
    re: /\b(voce|you|tu),?\s+(que (e|eres) (uma? )?|the |a )?(ia|modelo de linguagem|assistente virtual|language model|ai assistant|ai model|llm)\b[^.\n]{0,30}\b(deve|must|should|precisa|tem que|vai|will)\b/ },
  { code: 'descartar_conteudo', severity: 'high', msg: 'Pede para desconsiderar o documento/contexto',
    re: /\b(ignore|desconsidere|disregard|forget|esqueca|olvide)\b\s+(o |a |the |todo o |todo |all |el |this |este |esta )?(documento|document|contexto|context|conteudo|content|texto acima|text above|arquivo|file|material)\b/ },
  { code: 'prompt_de_sistema', severity: 'high', msg: 'Menciona prompt de sistema, modo desenvolvedor ou jailbreak',
    re: /\b(system prompt|prompt (do|de) sistema|instrucoes do sistema|mensagem do sistema|developer (mode|message)|modo (desenvolvedor|deus|irrestrito)|jailbreak|do anything now|dan mode|sem restricoes|without (any )?restrictions)\b/ },
  { code: 'revelar_segredos', severity: 'high', msg: 'Pede para revelar prompt, chaves ou segredos',
    re: /\b(revel\w*|reveal|mostr\w*|show|print|imprim\w*|vaz\w*|leak|exib\w*|repita|repeat)\b[^.\n]{0,40}\b(prompt|instruc\w*|instructions|chaves?|api[ _-]?key|tokens?|senhas?|passwords?|segredos?|secrets?|credenciais|credentials)\b/ },
  { code: 'manipular_aprovacao', severity: 'high', msg: 'Tenta manipular a aprovação/classificação do documento',
    re: /\b(aprove|approve|aprovar|aceite|accept|marque|mark|classifique|classify|considere|consider)\b[^.\n]{0,40}\b(esta prova|este documento|este arquivo|this (document|file|exam)|como (valid[ao]|segur[ao]|aprovad[ao]|confiavel)|as (valid|safe|approved|trusted))\b/ },
  { code: 'manipular_gabarito', severity: 'medium', msg: 'Tenta impor um padrão de gabarito',
    re: /\b(gabarito|answer key|correct answer|resposta correta)\b[^.\n]{0,40}\b(sempre|always|todas? as questoes|every question|siempre)\b/ },
  { code: 'controle_de_saida', severity: 'medium', msg: 'Tenta controlar o formato da resposta da IA',
    re: /\b(responda|answer|reply|retorne|return|output|devolva|escreva|write)\s+(apenas|somente|only|just|solo|unicamente)\s+(com|with|ok|sim|yes|"|')/ },
];
const RE_ROLE_TOKENS = /<\|\s*(im_start|im_end|system|user|assistant|endoftext|eot_id|start_header_id)\s*\|>|\[\/?INST\]|<<\/?SYS>>|<\/?\s*(system|assistant|instructions?|prompt|tool_call|function_call)\s*>/i;
const RE_ROLE_LINES = /^\s*(#{1,4}\s*)?(system|assistant|human|user|sistema|assistente|developer)\s*:\s*\S/im;
const RE_BOUNDARY = /<<\s*(inicio|fim)-[a-f0-9]{4,}/i;
// Código "forte" (com intenção de execução/exfiltração) vs. mera menção (normal em provas de Informática)
const RE_CODE = /javascript\s*:|vbscript\s*:|\bon(error|load|click|mouseover|focus)\s*=\s*["']?[\w(]|document\.cookie|\beval\s*\(|new\s+function\s*\(|fetch\s*\(\s*["'`]https?:|<\?php|\bpowershell\b\s+-(enc|e|c)\b|curl\s+-[a-z]*\s+https?:/i;
const RE_CODE_WEAK = /<script\b|<iframe\b|<object\b|<embed\b|xmlhttprequest|cmd\.exe|\/bin\/(ba)?sh\b/i;
const RE_TEMPLATE = /\{\{[^}]{1,80}\}\}|\$\{[^}]{1,80}\}|\{%[^%]{1,80}%\}/;
const RE_B64 = /[A-Za-z0-9+/]{100,}={0,2}/g;
const RE_URL = /\bhttps?:\/\/[^\s<>"')]+/gi;
const RE_EXFIL = /(webhook|ngrok|requestbin|pipedream|burpcollaborator|interact\.sh|oast\.|beeceptor|hookbin|\?(q|data|d|p|prompt|token|key)=)/i;

/** Normaliza e limpa o texto; devolve contagens do que foi removido. */
export function normalizeText(raw) {
  let t = String(raw ?? '');
  const stats = { tags: (t.match(RE_TAGS) || []).length, zeroWidth: (t.match(RE_ZERO) || []).length, bidi: (t.match(RE_BIDI) || []).length, control: (t.match(RE_CTRL) || []).length, varsel: (t.match(RE_VARSEL) || []).length };
  const smuggled = stats.tags ? [...t.matchAll(RE_TAGS)].map((m) => String.fromCharCode(m[0].codePointAt(0) - 0xE0000)).join('') : '';
  t = t.replace(RE_TAGS, '').replace(RE_ZERO, '').replace(RE_BIDI, '').replace(RE_VARSEL, '').replace(RE_CTRL, ' ');
  t = t.normalize('NFKC').replace(/\r\n?/g, '\n');
  return { text: t, stats, smuggled };
}

function homoglyphWords(t) {
  const out = [];
  for (const w of t.match(/[\p{L}]{3,}/gu) || []) {
    if (/\p{Script=Latin}/u.test(w) && /[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Armenian}\p{Script=Cherokee}]/u.test(w)) { out.push(w); if (out.length > 20) break; }
  }
  return out;
}

const flatten = (t) => deaccent(t.toLowerCase()).replace(/[‐‑‒–—―]/g, '-').replace(/[^\S\n]+/g, ' ');
// "i g n o r e   t h e" → "ignore the" (letras espaçadas para fugir de filtros)
const unspace = (t) => t.replace(/\b(?:\p{L}[ ._\-*]){4,}\p{L}\b/gu, (m) => m.replace(/[ ._\-*]/g, ''));

function ruleHits(flat) {
  const hits = [];
  for (const r of RULES) { const m = flat.match(r.re); if (m) hits.push(finding(r.code, r.severity, r.msg, m[0])); }
  return hits;
}

/**
 * Varre um texto.
 * @returns {{ text:string, findings:object[], severity:string, removedSpans:string[] }}
 *   text = texto normalizado e sem caracteres invisíveis (seguro para seguir adiante)
 */
export function scanText(raw, { where = 'texto', depth = 0 } = {}) {
  const findings = [];
  const { text, stats, smuggled } = normalizeText(raw);
  if (stats.tags) findings.push(finding('unicode_tags', 'critical', `Texto invisível contrabandeado com caracteres "tag" Unicode (${stats.tags})`, smuggled));
  if (stats.varsel > 8) findings.push(finding('seletores_variacao', 'high', `Muitos seletores de variação Unicode (${stats.varsel}), técnica usada para esconder dados`));
  if (stats.bidi) findings.push(finding('bidi', stats.bidi > 3 ? 'medium' : 'low', `Caracteres de controle de direção do texto (${stats.bidi})`));
  if (stats.zeroWidth > 30) findings.push(finding('largura_zero', 'medium', `Muitos caracteres invisíveis de largura zero (${stats.zeroWidth})`));
  else if (stats.zeroWidth) findings.push(finding('largura_zero', 'low', `Caracteres invisíveis de largura zero removidos (${stats.zeroWidth})`));
  if (stats.control > 50) findings.push(finding('controle', 'low', `Caracteres de controle removidos (${stats.control})`));

  const hg = homoglyphWords(text);
  if (hg.length >= 3) findings.push(finding('homoglifos', 'medium', `Palavras misturando alfabetos (letras disfarçadas): ${hg.slice(0, 3).join(', ')}`, hg.join(' ')));
  else if (hg.length) findings.push(finding('homoglifos', 'low', 'Palavra com letras de outro alfabeto', hg[0]));

  const flat = flatten(text);
  findings.push(...ruleHits(flat));
  const squeezed = flatten(unspace(deaccent(text.toLowerCase())));
  if (squeezed !== flat) for (const f of ruleHits(squeezed)) if (!findings.some((x) => x.code === f.code)) findings.push({ ...f, code: f.code + '_ofuscado', severity: f.severity === 'medium' ? 'high' : 'critical', message: f.message + ' (com letras espaçadas para disfarçar)' });

  const role = text.match(RE_ROLE_TOKENS); if (role) findings.push(finding('marcador_de_papel', 'critical', 'Marcadores de papel/conversa de IA forjados', role[0]));
  const roleLine = text.match(RE_ROLE_LINES); if (roleLine) findings.push(finding('linha_de_papel', 'high', 'Linha imitando mensagem de sistema/assistente', roleLine[0]));
  const bnd = text.match(RE_BOUNDARY); if (bnd) findings.push(finding('marcador_forjado', 'critical', 'Tentativa de forjar os marcadores internos de segurança', bnd[0]));
  const code = text.match(RE_CODE); if (code) findings.push(finding('codigo', 'medium', 'Código com cara de execução ou exfiltração de dados', code[0]));
  else { const weak = text.match(RE_CODE_WEAK); if (weak) findings.push(finding('codigo_mencao', 'low', 'Menção a código/HTML (comum em provas de Informática)', weak[0])); }
  const tpl = text.match(RE_TEMPLATE); if (tpl) findings.push(finding('template', 'low', 'Expressão de template', tpl[0]));

  const urls = text.match(RE_URL) || [];
  const ex = urls.find((u) => RE_EXFIL.test(u));
  if (ex) findings.push(finding('url_suspeita', 'high', 'Link com padrão de coleta de dados (exfiltração)', ex));
  else if (urls.length > 15) findings.push(finding('muitos_links', 'low', `Muitos links (${urls.length})`));

  // Blocos base64: decodifica e varre o conteúdo escondido
  const blobs = text.match(RE_B64) || [];
  if (blobs.length) {
    let worst = 'medium';
    if (depth < 1) for (const b of blobs.slice(0, 5)) {
      let dec = ''; try { dec = Buffer.from(b.slice(0, b.length - (b.length % 4)), 'base64').toString('utf8'); } catch {}
      if (/[\p{L}]{4}/u.test(dec)) { const inner = scanText(dec, { where, depth: depth + 1 }); if (SEV[inner.severity] >= SEV.high) { worst = 'critical'; findings.push(finding('base64_injecao', 'critical', 'Instruções escondidas dentro de um bloco base64', dec)); break; } }
    }
    if (worst !== 'critical') findings.push(finding('base64', 'medium', `Bloco codificado em base64 (${blobs.length})`, blobs[0]));
  }

  // Escalonamento: vários sinais juntos são mais graves que um isolado
  const highs = findings.filter((f) => f.severity === 'high').length, meds = findings.filter((f) => f.severity === 'medium').length;
  if (highs >= 3) findings.push(finding('multiplos_sinais', 'critical', `Vários sinais fortes de tentativa de manipulação da IA (${highs})`));
  else if (highs + meds >= 4) findings.push(finding('multiplos_sinais', 'high', `Vários sinais de tentativa de manipulação (${highs + meds})`));

  return { text, findings: findings.map((f) => ({ ...f, where })), severity: maxSeverity(findings) };
}

/**
 * Remove do texto as frases/linhas que dispararam regras de nível médio ou maior.
 * Usado em materiais de estudo (que só afetam o próprio aluno) quando o risco é moderado.
 */
export function sanitizeText(text) {
  const removed = [];
  const lines = text.split('\n').map((line) => {
    if (!line.trim()) return line;
    const sentences = line.split(/(?<=[.!?;])\s+/);
    const kept = sentences.filter((s) => { const r = scanText(s, { depth: 1 }); const bad = SEV[r.severity] >= SEV.medium; if (bad) removed.push(s.slice(0, 200)); return !bad; });
    return kept.join(' ');
  });
  return { text: lines.join('\n'), removed };
}
