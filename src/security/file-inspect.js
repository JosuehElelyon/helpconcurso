// =====================================================================
// Inspeção de ARQUIVOS enviados — primeira barreira, antes de qualquer IA.
//  1. Nome e extensão (extensões perigosas, extensão dupla)
//  2. Assinatura real do arquivo ("magic bytes") × extensão declarada; executáveis disfarçados; poliglotas
//  3. PDF: JavaScript, ações automáticas, anexos embutidos, XFA, senha, nº de páginas,
//          TEXTO OCULTO (branco, invisível, minúsculo, fora da página, COBERTO por caixa/imagem, sobreposto)
//          e páginas escaneadas (precisam de OCR)
//  4. DOCX: zip bomb, caminhos maliciosos, macros, ActiveX, objetos embutidos, modelos remotos,
//           DDE, XML com DOCTYPE/ENTITY (XXE), texto oculto (vanish, branco, minúsculo, por estilo)
//  5. DOC (Word 97-2003): macros VBA, objetos, DDE
//  6. TXT: binário disfarçado, codificação
// Devolve o texto extraído SEM o texto oculto, e a lista de achados para a política decidir.
// =====================================================================
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { config } from '../config.js';
import { SEV } from './text-scan.js';

const require = createRequire(import.meta.url);
const pdfjs = silence(() => require('pdfjs-dist/legacy/build/pdf.js'));
const WordExtractor = require('word-extractor');

function silence(fn) { const w = console.warn, l = console.log; console.warn = () => {}; console.log = () => {}; try { return fn(); } finally { console.warn = w; console.log = l; } }

export const ACCEPTED = ['pdf', 'docx', 'doc', 'txt', 'md'];
export class InspectError extends Error {
  constructor(message, findings = [], code = 'arquivo_invalido') { super(message); this.name = 'InspectError'; this.findings = findings; this.code = code; }
}
const F = (code, severity, message, sample, page) => ({ code, severity, message, ...(sample ? { sample: String(sample).slice(0, 160) } : {}), ...(page ? { page } : {}), where: 'arquivo' });
const words = (t) => (String(t).match(/\S+/g) || []).length;
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new InspectError(msg, [], 'tempo_esgotado')), ms))]);

const DANGEROUS_EXT = /\.(exe|bat|cmd|com|scr|pif|js|jse|vbs|vbe|wsf|wsh|ps1|psm1|psd1|hta|jar|msi|msp|dll|cpl|sh|bash|lnk|reg|apk|app|dmg|iso|img|vhd|html?|xhtml|svg|swf|docm|dotm|xlsm|pptm|zip|rar|7z)(\.|$)/i;

// ---------- Assinaturas ----------
function sniff(buf) {
  const head = buf.subarray(0, 8);
  if (head[0] === 0x4d && head[1] === 0x5a) return 'exe';                       // MZ
  if (head[0] === 0x7f && head.subarray(1, 4).toString() === 'ELF') return 'elf';
  if (head.subarray(0, 2).toString() === '#!') return 'script';
  if (head.subarray(0, 4).equals(Buffer.from([0xca, 0xfe, 0xba, 0xbe])) || head.subarray(0, 4).equals(Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))) return 'macho';
  if (head.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return 'zip';
  if (head.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'ole';
  if (buf.subarray(0, 1024).indexOf('%PDF-') >= 0) return 'pdf';
  if (head.subarray(0, 5).toString() === '{\\rtf') return 'rtf';
  return 'unknown';
}

// ---------- Matriz 2D (para posicionar texto e caixas na página) ----------
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const scaleY = (m) => Math.hypot(m[2], m[3]);
const bboxOf = (m, x0, y0, x1, y1) => { const pts = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x0, y1), apply(m, x1, y1)]; const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const overlap = (a, b) => { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > 0 && h > 0 ? (w * h) / Math.max(1, (a[2] - a[0]) * (a[3] - a[1])) : 0; };
const isWhite = (c) => c && c[0] >= 245 && c[1] >= 245 && c[2] >= 245;

/** Analisa os operadores de desenho de uma página e acha texto que o leitor humano não vê. */
async function analyzePdfPage(page) {
  const OPS = pdfjs.OPS;
  const ol = await page.getOperatorList();
  const [vx0, vy0, vx1, vy1] = page.view;
  const pageBox = [Math.min(vx0, vx1), Math.min(vy0, vy1), Math.max(vx0, vx1), Math.max(vy0, vy1)];
  const pageArea = (pageBox[2] - pageBox[0]) * (pageBox[3] - pageBox[1]);

  let st = { ctm: [1, 0, 0, 1, 0, 0], fill: [0, 0, 0], mode: 0, fontSize: 10, leading: 0 };
  const stack = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0];
  let pendingPath = null, images = 0;
  const runs = []; // { text, bbox, hidden: reason|null }
  const hidden = []; let totalChars = 0, invisibleChars = 0;
  const imageBoxes = [];

  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i], a = ol.argsArray[i];
    switch (fn) {
      case OPS.save: stack.push({ ...st, ctm: [...st.ctm], fill: st.fill && [...st.fill] }); break;
      case OPS.restore: if (stack.length) st = stack.pop(); break;
      case OPS.transform: st.ctm = mul(st.ctm, a); break;
      case OPS.setFillRGBColor: st.fill = [a[0], a[1], a[2]]; break;
      case OPS.setFillGray: { const g = Math.round((a[0] ?? 0) * 255); st.fill = [g, g, g]; break; }
      case OPS.setTextRenderingMode: st.mode = a[0]; break;
      case OPS.setFont: st.fontSize = Math.abs(a[1] || 0); break;
      case OPS.setLeading: st.leading = a[0]; break;
      case OPS.beginText: tm = [1, 0, 0, 1, 0, 0]; tlm = [1, 0, 0, 1, 0, 0]; break;
      case OPS.setTextMatrix: tm = [...a]; tlm = [...a]; break;
      case OPS.moveText: tlm = mul(tlm, [1, 0, 0, 1, a[0], a[1]]); tm = [...tlm]; break;
      case OPS.setLeadingMoveText: st.leading = -a[1]; tlm = mul(tlm, [1, 0, 0, 1, a[0], a[1]]); tm = [...tlm]; break;
      case OPS.nextLine: tlm = mul(tlm, [1, 0, 0, 1, 0, -st.leading]); tm = [...tlm]; break;
      case OPS.showText: case OPS.showSpacedText: case OPS.nextLineShowText: case OPS.nextLineSetSpacingShowText: {
        if (fn === OPS.nextLineShowText || fn === OPS.nextLineSetSpacingShowText) { tlm = mul(tlm, [1, 0, 0, 1, 0, -st.leading]); tm = [...tlm]; }
        const glyphs = a[a.length - 1];
        const text = Array.isArray(glyphs) ? glyphs.map((g) => (g && typeof g === 'object' ? (g.unicode ?? '') : (typeof g === 'number' && g < -200 ? ' ' : ''))).join('') : '';
        if (!text.trim()) break;
        const m = mul(st.ctm, tm);
        const size = st.fontSize * scaleY(m);                       // tamanho real na página
        const adv = st.fontSize * 0.5 * text.length;                 // largura aproximada (espaço do texto)
        const bbox = bboxOf(m, 0, -0.25 * st.fontSize, Math.max(adv, 0.1), st.fontSize);
        const chars = text.replace(/\s/g, '').length;
        totalChars += chars;
        let reason = null;
        if (st.mode === 3 || st.mode === 7) { reason = 'invisivel'; invisibleChars += chars; }
        else if (isWhite(st.fill)) reason = 'branco';
        else if (size > 0 && size < 2) reason = 'minusculo';
        else if (bbox[2] < pageBox[0] - 2 || bbox[0] > pageBox[2] + 2 || bbox[3] < pageBox[1] - 2 || bbox[1] > pageBox[3] + 2) reason = 'fora_da_pagina';
        // Texto sobreposto: escrito por cima de outro texto visível diferente
        if (!reason) {
          const under = runs.find((r) => !r.hidden && overlap(bbox, r.bbox) > 0.6 && r.text.trim() !== text.trim() && Math.abs(r.size - size) < 0.5 * size);
          if (under && under.text.length > 6 && text.length > 6) reason = 'sobreposto';
        }
        runs.push({ text, bbox, size, hidden: reason, index: i });
        // Avança a posição aproximadamente (para o próximo trecho na mesma linha)
        tm = mul(tm, [1, 0, 0, 1, adv, 0]);
        break;
      }
      case OPS.constructPath: {
        // args: [ops, coords, minMax] — minMax = [minX, maxX, minY, maxY] no espaço do usuário
        const mm = a[2];
        if (mm && mm.length === 4 && Number.isFinite(mm[0])) pendingPath = bboxOf(st.ctm, mm[0], mm[2], mm[1], mm[3]);
        break;
      }
      case OPS.fill: case OPS.eoFill: case OPS.fillStroke: case OPS.eoFillStroke: case OPS.closeFillStroke: case OPS.closeEOFillStroke:
        if (pendingPath && isWhite(st.fill)) coverRuns(pendingPath, 'coberto_por_caixa');
        pendingPath = null; break;
      case OPS.endPath: pendingPath = null; break;
      case OPS.paintImageXObject: case OPS.paintInlineImageXObject: case OPS.paintImageMaskXObject: case OPS.paintImageXObjectRepeat: {
        images++;
        const box = bboxOf(st.ctm, 0, 0, 1, 1);
        imageBoxes.push(box);
        coverRuns(box, 'coberto_por_imagem');
        break;
      }
      default: break;
    }
  }
  function coverRuns(box, reason) {
    const area = (box[2] - box[0]) * (box[3] - box[1]);
    if (area <= 4) return;
    for (const r of runs) if (!r.hidden && overlap(r.bbox, box) > 0.7) r.hidden = reason;
    void pageArea;
  }
  // Camada de OCR de PDF escaneado: imagem + texto invisível por cima é legítimo
  const ocrLayer = images > 0 && totalChars > 0 && invisibleChars / totalChars >= 0.7;
  for (const r of runs) {
    if (!r.hidden) continue;
    if (ocrLayer && r.hidden === 'invisivel') { r.hidden = null; continue; }
    hidden.push({ reason: r.hidden, text: r.text });
  }
  return { hidden, images, ocrLayer, totalChars };
}

async function inspectPdf(buf, findings) {
  // 1) Varredura bruta de objetos perigosos (pega também o que o leitor ignora)
  const raw = buf.toString('latin1');
  const RAW = [
    [/\/JavaScript\b|\/JS\s*[(<\/\[]/, 'pdf_javascript', 'critical', 'PDF contém JavaScript'],
    [/\/Launch\b/, 'pdf_launch', 'critical', 'PDF tenta abrir/executar programas (/Launch)'],
    [/\/EmbeddedFiles?\b/, 'pdf_anexo', 'critical', 'PDF contém arquivos embutidos'],
    [/\/RichMedia\b|\/Flash\b/, 'pdf_richmedia', 'critical', 'PDF contém mídia ativa (Flash/RichMedia)'],
    [/\/XFA\b/, 'pdf_xfa', 'critical', 'PDF contém formulário XFA (pode executar scripts)'],
    [/\/SubmitForm\b|\/ImportData\b/, 'pdf_envio', 'critical', 'PDF tenta enviar/importar dados'],
    [/\/GoToE\b/, 'pdf_goto_embutido', 'critical', 'PDF navega para documento embutido'],
    [/\/GoToR\b/, 'pdf_goto_remoto', 'medium', 'PDF abre documento externo'],
    [/\/AA\s*<</, 'pdf_acao_automatica', 'medium', 'PDF tem ações automáticas (/AA)'],
    [/\/OpenAction\b/, 'pdf_openaction', 'low', 'PDF tem ação ao abrir (geralmente só ajuste de zoom)'],
  ];
  for (const [re, code, sev, msg] of RAW) if (re.test(raw)) findings.push(F(code, sev, msg));
  const start = raw.indexOf('%PDF-');
  if (start > 0) findings.push(F('pdf_prefixo', 'medium', `Há ${start} bytes antes do cabeçalho do PDF (arquivo poliglota?)`));
  const eof = raw.lastIndexOf('%%EOF');
  if (eof > 0 && buf.length - eof > 4096) findings.push(F('pdf_dados_apos_fim', 'medium', `Há ${buf.length - eof} bytes depois do fim do PDF (conteúdo anexado/poliglota)`));

  // 2) Leitura estruturada
  let doc;
  try {
    doc = await withTimeout(pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, enableXfa: false, verbosity: 0, stopAtErrors: false }).promise, config.security.parseTimeoutMs, 'O PDF demorou demais para ser lido.');
  } catch (e) {
    if (e instanceof InspectError) throw e;
    if (e?.name === 'PasswordException') throw new InspectError('O PDF está protegido por senha. Remova a senha e envie novamente.', [], 'pdf_senha');
    throw new InspectError('Não foi possível ler o PDF: o arquivo parece corrompido.', [], 'pdf_corrompido');
  }
  try {
    if (doc.numPages > config.security.maxPdfPages) throw new InspectError(`O PDF tem ${doc.numPages} páginas; o máximo é ${config.security.maxPdfPages}.`, [], 'pdf_paginas');
    const js = await doc.getJSActions().catch(() => null);
    if (js && Object.keys(js).length && !findings.some((f) => f.code === 'pdf_javascript')) findings.push(F('pdf_javascript', 'critical', 'PDF contém ações JavaScript'));
    const att = await doc.getAttachments().catch(() => null);
    if (att && Object.keys(att).length && !findings.some((f) => f.code === 'pdf_anexo')) findings.push(F('pdf_anexo', 'critical', `PDF contém ${Object.keys(att).length} arquivo(s) anexado(s)`));

    const pagesText = [], ocrPages = [], hiddenAll = [];
    let ocrLayerPages = 0;
    const deadline = Date.now() + config.security.parseTimeoutMs * 2;
    for (let p = 1; p <= doc.numPages; p++) {
      if (Date.now() > deadline) throw new InspectError('O PDF demorou demais para ser analisado.', [], 'tempo_esgotado');
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      let text = tc.items.map((it) => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ');
      const an = await analyzePdfPage(page).catch(() => ({ hidden: [], images: 0, ocrLayer: false }));
      if (an.ocrLayer) ocrLayerPages++;
      const annots = await page.getAnnotations().catch(() => []);
      for (const an2 of annots) {
        if (['FileAttachment', 'Screen', 'RichMedia', 'Movie', 'Sound', '3D'].includes(an2.subtype)) findings.push(F('pdf_anotacao_ativa', 'critical', `Anotação ativa no PDF (${an2.subtype})`, null, p));
        if (an2.actions && Object.keys(an2.actions).length) findings.push(F('pdf_anotacao_js', 'critical', 'Campo/anotação com JavaScript', null, p));
        if (an2.subtype === 'Text' || an2.subtype === 'FreeText') { const c = an2.contentsObj?.str || an2.contents || ''; if (c.trim()) hiddenAll.push({ reason: 'comentario', text: c, page: p }); }
      }
      // Remove do texto da página o que estava oculto (o aluno não vê, a IA também não verá)
      for (const h of an.hidden) {
        hiddenAll.push({ ...h, page: p });
        const frag = h.text.trim();
        if (frag.length >= 3) text = text.split(frag).join(' ');
      }
      const visibleWords = words(text);
      if (visibleWords < 12 && an.images > 0) ocrPages.push(p);
      pagesText.push(text.trim());
      page.cleanup();
    }
    const reasonsMsg = { invisivel: 'texto invisível', branco: 'texto branco', minusculo: 'texto minúsculo', fora_da_pagina: 'texto fora da área da página', coberto_por_caixa: 'texto coberto por uma caixa branca', coberto_por_imagem: 'texto coberto por imagem', sobreposto: 'texto escrito por cima de outro texto', comentario: 'comentário/nota escondida' };
    const byReason = {};
    for (const h of hiddenAll) (byReason[h.reason] ||= []).push(h);
    for (const [reason, list] of Object.entries(byReason)) {
      const chars = list.reduce((s, h) => s + h.text.replace(/\s/g, '').length, 0);
      if (chars < 4) continue;
      findings.push(F(`pdf_oculto_${reason}`, reason === 'comentario' ? 'low' : 'medium', `PDF com ${reasonsMsg[reason]} (${chars} caracteres, págs. ${[...new Set(list.map((h) => h.page))].slice(0, 6).join(', ')})`, list.map((h) => h.text).join(' | ')));
    }
    const text = pagesText.map((t, i) => `--- Página ${i + 1} ---\n${t}`).join('\n\n');
    const totalWords = words(pagesText.join(' '));
    const needsOcr = ocrPages.length > 0 && (ocrPages.length >= Math.ceil(doc.numPages / 2) || totalWords < 80);
    if (ocrLayerPages) findings.push(F('pdf_camada_ocr', 'info', `PDF escaneado com camada de texto (OCR) em ${ocrLayerPages} página(s)`));
    return { text: needsOcr ? '' : text, pages: doc.numPages, needsOcr, ocrPages, hiddenTexts: hiddenAll.map((h) => h.text) };
  } finally { doc.destroy().catch(() => {}); }
}

// ---------- DOCX ----------
const xmlText = (xml) => (xml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:delText(?:\s[^>]*)?>([^<]*)<\/w:delText>/g) || [])
  .map((t) => t.replace(/<[^>]+>/g, '')).join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const isOn = (tag) => !/w:val="(false|0|off|none)"/i.test(tag);
function hiddenProps(rPr) {
  if (!rPr) return null;
  const v = rPr.match(/<w:(vanish|specVanish|webHidden)\b[^>]*\/?>/); if (v && isOn(v[0])) return 'oculto';
  const c = rPr.match(/<w:color\b[^>]*w:val="([0-9A-Fa-f]{6}|white)"/); if (c && /^(ffffff|fefefe|fdfdfd|fcfcfc|white)$/i.test(c[1]) && !/<w:shd\b[^>]*w:fill="(?!auto|ffffff|FFFFFF)[0-9A-Fa-f]{6}"/.test(rPr) && !/<w:highlight\b/.test(rPr)) return 'branco';
  const s = rPr.match(/<w:sz\b[^>]*w:val="(\d+)"/); if (s && Number(s[1]) < 4) return 'minusculo'; // meia-ponto: <4 = <2pt
  return null;
}

async function inspectDocx(buf, findings) {
  let zip;
  try { zip = await withTimeout(JSZip.loadAsync(buf, { checkCRC32: true }), config.security.parseTimeoutMs, 'O arquivo demorou demais para ser lido.'); }
  catch (e) { if (e instanceof InspectError) throw e; throw new InspectError('Não foi possível abrir o DOCX: o arquivo parece corrompido.', [], 'docx_corrompido'); }
  const entries = Object.values(zip.files);
  if (entries.length > 3000) throw new InspectError('O DOCX tem uma estrutura anormal (arquivos internos demais).', [F('zip_entradas', 'critical', `${entries.length} entradas`)], 'zip_bomba');
  let total = 0;
  for (const e of entries) {
    const n = e.name;
    if (n.includes('..') || n.startsWith('/') || /^[a-z]:/i.test(n) || n.includes('\\')) findings.push(F('zip_caminho', 'critical', 'Caminho malicioso dentro do arquivo (path traversal)', n));
    if (DANGEROUS_EXT.test(n.split('/').pop()) && !/\.(xml|rels)$/i.test(n)) findings.push(F('zip_executavel', 'critical', 'Arquivo executável/perigoso escondido dentro do DOCX', n));
    const unc = e._data?.uncompressedSize ?? 0, comp = e._data?.compressedSize ?? 0;
    total += unc;
    if (unc > 30 * 1024 * 1024 && comp > 0 && unc / comp > 100) findings.push(F('zip_bomba', 'critical', 'Compressão anormal (zip bomb)', n));
  }
  if (total > 300 * 1024 * 1024) throw new InspectError('O DOCX descompactado é grande demais (possível zip bomb).', [F('zip_bomba', 'critical', `${Math.round(total / 1048576)} MB descompactado`)], 'zip_bomba');
  if (!zip.file('word/document.xml')) throw new InspectError('Este arquivo não é um documento do Word válido.', [], 'docx_invalido');

  const ct = (await zip.file('[Content_Types].xml')?.async('string')) || '';
  if (/macroEnabled|vbaProject/i.test(ct) || entries.some((e) => /vbaProject\.bin$|vbaData\.xml$/i.test(e.name))) findings.push(F('docx_macro', 'critical', 'Documento com macros (VBA)'));
  if (entries.some((e) => /activeX/i.test(e.name))) findings.push(F('docx_activex', 'critical', 'Documento com controles ActiveX'));
  const embeds = entries.filter((e) => /^word\/embeddings\//i.test(e.name));
  if (embeds.length) findings.push(F('docx_objetos', 'medium', `Documento com ${embeds.length} objeto(s) embutido(s) (ex.: equações, planilhas)`, embeds.map((e) => e.name).join(', ')));

  const xmlParts = entries.filter((e) => /\.(xml|rels)$/i.test(e.name) && !e.dir);
  let allText = '';
  for (const e of xmlParts) {
    const x = await e.async('string');
    if (/<!DOCTYPE|<!ENTITY/i.test(x)) findings.push(F('xml_doctype', 'critical', 'XML com DOCTYPE/ENTITY (ataque XXE / billion laughs)', e.name));
    if (/\.rels$/i.test(e.name)) {
      for (const rel of x.match(/<Relationship\b[^>]*>/g) || []) {
        if (!/TargetMode="External"/i.test(rel)) continue;
        const target = (rel.match(/Target="([^"]*)"/) || [])[1] || '';
        if (/attachedTemplate|oleObject|subDocument|\/frame"|\/package"|aFChunk/i.test(rel)) findings.push(F('docx_remoto', 'critical', 'Documento carrega conteúdo/modelo remoto (template injection)', target));
        else if (/hyperlink/i.test(rel) && /^(file|smb|\\\\)/i.test(target)) findings.push(F('docx_link_local', 'high', 'Link para arquivo de rede/local', target));
      }
    }
    if (/<w:(instrText|fldSimple)\b/.test(x)) {
      const instr = (x.match(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g) || []).map((s) => s.replace(/<[^>]+>/g, '')).join('') + ' ' + (x.match(/w:instr="([^"]*)"/g) || []).join(' ');
      if (/\bDDE(AUTO)?\b/i.test(instr)) findings.push(F('docx_dde', 'critical', 'Campo DDE (pode executar comandos)', instr));
      else if (/\b(INCLUDETEXT|INCLUDEPICTURE|IMPORT|LINK)\b[^"]*"?(https?:|\\\\|file:)/i.test(instr)) findings.push(F('docx_campo_remoto', 'high', 'Campo que busca conteúdo externo', instr));
    }
    if (/<w:altChunk\b/.test(x)) findings.push(F('docx_altchunk', 'high', 'Conteúdo embutido de outro formato (altChunk)'));
    if (/^word\/(document|footnotes|endnotes|comments|header\d*|footer\d*|glossary\/document)\.xml$/i.test(e.name)) allText += '\n' + xmlText(x);
  }

  // Texto oculto: por formatação direta e por estilo
  const styles = (await zip.file('word/styles.xml')?.async('string')) || '';
  const hiddenStyles = new Set();
  for (const st of styles.match(/<w:style\b[\s\S]*?<\/w:style>/g) || []) {
    const id = (st.match(/w:styleId="([^"]+)"/) || [])[1];
    const rPr = (st.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [])[0];
    if (id && hiddenProps(rPr)) hiddenStyles.add(id);
  }
  const hiddenRuns = [];
  for (const part of ['word/document.xml', 'word/footnotes.xml', 'word/endnotes.xml']) {
    const x = await zip.file(part)?.async('string');
    if (!x) continue;
    for (const para of x.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
      const pStyle = (para.match(/<w:pPr>[\s\S]*?<w:pStyle w:val="([^"]+)"/) || [])[1];
      const paraHidden = pStyle && hiddenStyles.has(pStyle) ? 'estilo_oculto' : null;
      for (const run of para.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || []) {
        const rPr = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [])[0];
        const rStyle = rPr && (rPr.match(/<w:rStyle w:val="([^"]+)"/) || [])[1];
        const reason = hiddenProps(rPr) || (rStyle && hiddenStyles.has(rStyle) ? 'estilo_oculto' : null) || paraHidden;
        if (reason) { const t = xmlText(run); if (t.trim()) hiddenRuns.push({ reason, text: t }); }
      }
    }
  }
  const comments = (await zip.file('word/comments.xml')?.async('string')) || '';
  if (comments) { const t = xmlText(comments); if (t.trim()) hiddenRuns.push({ reason: 'comentario', text: t }); }

  const msg = { oculto: 'texto marcado como oculto', branco: 'texto branco', minusculo: 'texto minúsculo', estilo_oculto: 'texto oculto via estilo', comentario: 'comentários do revisor' };
  const by = {};
  for (const h of hiddenRuns) (by[h.reason] ||= []).push(h.text);
  for (const [reason, list] of Object.entries(by)) {
    const chars = list.join('').replace(/\s/g, '').length;
    if (chars >= 4) findings.push(F(`docx_oculto_${reason}`, reason === 'comentario' ? 'low' : 'medium', `DOCX com ${msg[reason]} (${chars} caracteres)`, list.join(' | ')));
  }

  let text;
  try { text = (await withTimeout(mammoth.extractRawText({ buffer: buf }), config.security.parseTimeoutMs, 'O DOCX demorou demais para ser lido.')).value; }
  catch (e) { if (e instanceof InspectError) throw e; throw new InspectError('Não foi possível extrair o texto do DOCX.', [], 'docx_corrompido'); }
  for (const h of hiddenRuns) { const frag = h.text.trim(); if (frag.length >= 3) text = text.split(frag).join(' '); }
  return { text, pages: null, needsOcr: false, ocrPages: [], hiddenTexts: hiddenRuns.map((h) => h.text), extraText: allText };
}

// ---------- DOC (Word 97-2003) ----------
async function inspectDoc(buf, findings) {
  const u16 = buf.toString('utf16le'), l1 = buf.toString('latin1');
  if (/_VBA_PROJECT|\bVBA\b.{0,4}dir|Macros/.test(u16) || /_VBA_PROJECT|Attribute VB_Name/.test(l1)) findings.push(F('doc_macro', 'critical', 'Documento com macros (VBA)'));
  if (/ObjectPool/.test(u16)) findings.push(F('doc_objetos', 'medium', 'Documento com objetos embutidos (OLE)'));
  if (/DDEAUTO|\bDDE\s+"/i.test(l1) || /DDEAUTO/i.test(u16)) findings.push(F('doc_dde', 'critical', 'Campo DDE (pode executar comandos)'));
  findings.push(F('doc_legado', 'low', 'Formato antigo (.doc): a checagem de formatação oculta é limitada; prefira DOCX ou PDF'));
  let d;
  try { d = await withTimeout(new WordExtractor().extract(buf), config.security.parseTimeoutMs, 'O DOC demorou demais para ser lido.'); }
  catch (e) { if (e instanceof InspectError) throw e; throw new InspectError('Não foi possível ler o arquivo .doc. Salve-o como DOCX ou PDF e tente de novo.', [], 'doc_corrompido'); }
  const extra = [d.getHeaders?.(), d.getFooters?.(), d.getAnnotations?.(), d.getEndnotes?.()].filter(Boolean).join('\n');
  const text = [d.getBody(), d.getFootnotes?.(), d.getTextboxes?.({ includeHeadersAndFooters: false })].filter(Boolean).join('\n\n');
  return { text, pages: null, needsOcr: false, ocrPages: [], hiddenTexts: [], extraText: extra };
}

function inspectTxt(buf, findings) {
  if (buf.includes(0)) throw new InspectError('O arquivo de texto contém dados binários.', [F('txt_binario', 'critical', 'Bytes nulos em arquivo de texto')], 'txt_binario');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { text = new TextDecoder('windows-1252').decode(buf); findings.push(F('txt_codificacao', 'low', 'Arquivo não estava em UTF-8; convertido de Windows-1252')); }
  const ctrl = (text.match(/[\u0000-\u0008\u000E-\u001F]/g) || []).length;
  if (ctrl > text.length * 0.01) findings.push(F('txt_controle', 'medium', 'Muitos caracteres de controle em arquivo de texto'));
  return { text, pages: null, needsOcr: false, ocrPages: [], hiddenTexts: [] };
}

/**
 * Inspeciona o arquivo. Lança InspectError para arquivos impossíveis de aceitar.
 * @returns {{ ext, sha256, size, pages, text, needsOcr, ocrPages, findings, hiddenTexts, extraText }}
 */
export async function inspectFile(buffer, originalName) {
  const findings = [];
  const name = String(originalName || '').split(/[\\/]/).pop().slice(0, 200);
  if (!buffer?.length) throw new InspectError('O arquivo está vazio.', [], 'vazio');
  if (buffer.length > config.security.uploadMaxMb * 1024 * 1024) throw new InspectError(`O arquivo passa de ${config.security.uploadMaxMb} MB.`, [], 'grande_demais');
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!ACCEPTED.includes(ext)) throw new InspectError('Formato não suportado. Envie PDF, DOCX, DOC ou TXT.', [], 'formato');
  if (DANGEROUS_EXT.test(name.slice(0, name.length - ext.length - 1) + '.')) throw new InspectError('Nome de arquivo com extensão perigosa (extensão dupla).', [F('extensao_dupla', 'critical', 'Extensão dupla suspeita', name)], 'extensao_dupla');

  const kind = sniff(buffer);
  if (['exe', 'elf', 'macho', 'script'].includes(kind)) throw new InspectError('O arquivo é um programa executável disfarçado.', [F('executavel', 'critical', `Assinatura de executável (${kind})`, name)], 'executavel');
  const expected = { pdf: 'pdf', docx: 'zip', doc: 'ole', txt: 'unknown', md: 'unknown' }[ext];
  if ((ext === 'txt' || ext === 'md') ? !['unknown', 'rtf'].includes(kind) : kind !== expected) {
    throw new InspectError('O conteúdo do arquivo não corresponde à extensão informada.', [F('assinatura', 'critical', `Extensão .${ext}, mas o conteúdo é "${kind}"`, name)], 'assinatura');
  }

  let r;
  if (ext === 'pdf') r = await inspectPdf(buffer, findings);
  else if (ext === 'docx') r = await inspectDocx(buffer, findings);
  else if (ext === 'doc') r = await inspectDoc(buffer, findings);
  else r = inspectTxt(buffer, findings);

  let text = r.text || '';
  if (text.length > config.security.maxTextChars) { text = text.slice(0, config.security.maxTextChars); findings.push(F('texto_truncado', 'low', `Texto muito longo; usamos os primeiros ${config.security.maxTextChars.toLocaleString('pt-BR')} caracteres`)); }
  const critical = findings.filter((f) => SEV[f.severity] >= SEV.critical);
  return { ext, name, sha256: sha256(buffer), size: buffer.length, pages: r.pages, text, needsOcr: r.needsOcr, ocrPages: r.ocrPages, findings, hiddenTexts: r.hiddenTexts || [], extraText: r.extraText || '', hasCritical: critical.length > 0 };
}
