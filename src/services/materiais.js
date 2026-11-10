// Materiais de estudo do aluno: envio (arquivo ou texto colado) com varredura de segurança, identificação da matéria
// e cruzamento com o edital. A rota só valida e responde.
import { HttpError } from '../lib/http.js';
import { putFile, makeKey, deleteFile } from '../lib/storage.js';
import { secureUpload, scanText, logSecurityEvent } from '../security/index.js';
import { sanitizeText } from '../security/text-scan.js';
import { decide } from '../security/policy.js';
import { runJSON } from '../ai/index.js';
import { detectSchema } from '../ai/schemas.js';
import { promptDetect } from '../lib/prompts.js';
import { MATERIAS, keywordGuess } from '../lib/bancas.js';
import { assertCanUpload } from './quota.js';
import { matchMaterialWithEdital } from './edital.js';
import * as materiais from '../repositories/materiais.js';
import * as editais from '../repositories/editais.js';

const words = (t) => (String(t).match(/\S+/g) || []).length;
const UUID = /^[0-9a-f-]{36}$/i;

async function detect(text, userId) {
  try {
    const { data: d } = await runJSON('detect', { ...promptDetect(text), maxTokens: 600, userId }, detectSchema);
    const found = MATERIAS.find((m) => m.toLowerCase() === d.materia.toLowerCase());
    return { materia: found || d.materia, confianca: d.confianca, temas: d.temas, resumo: d.resumo, outras: d.outras, origem: 'ia' };
  } catch (e) {
    console.warn('[detect] usando palavras-chave:', e.message);
    return keywordGuess(text); // fallback sem IA
  }
}

/** Lê o texto do arquivo (com OCR se escaneado) ou do texto colado, passando pela varredura. */
async function lerTexto(user, { arquivo, textoColado, ip, signal }) {
  const warnings = [];
  if (arquivo) {
    const s = await secureUpload(arquivo.buffer, arquivo.name, 'material', { ocr: 'full', userId: user.id, ip, signal });
    if (s.removed.length) warnings.push(`Removemos ${s.removed.length} trecho(s) que pareciam instruções para a IA.`);
    if (s.findings.some((x) => x.code.includes('oculto'))) warnings.push('O arquivo tinha texto oculto (invisível, branco ou coberto). Usamos só o texto visível.');
    if (s.findings.some((x) => x.code === 'ocr_parcial')) warnings.push('O PDF escaneado é longo: lemos só as primeiras páginas.');
    if (s.ocrDone) warnings.push('PDF escaneado: o texto foi lido das imagens das páginas.');
    return { text: s.text, pages: s.pages, sha: s.sha256, ocr: s.ocrDone, warnings, security: { findings: s.findings, decision: s.decision } };
  }
  const scan = scanText(String(textoColado || '').slice(0, 300000), { where: 'texto_colado' });
  const d = decide('material', scan.findings);
  if (d.verdict === 'block') {
    await logSecurityEvent({ userId: user.id, kind: 'material_bloqueado', severity: d.severity, fileName: 'texto colado', details: { findings: scan.findings }, ip });
    throw new HttpError(422, 'Não aceitamos este texto: ele contém instruções que tentam manipular o sistema.');
  }
  let text = scan.text;
  if (d.verdict === 'sanitize') { const s2 = sanitizeText(text); text = s2.text; if (s2.removed.length) warnings.push(`Removemos ${s2.removed.length} trecho(s) que pareciam instruções para a IA.`); }
  return { text, pages: null, sha: null, ocr: false, warnings, security: { findings: scan.findings, decision: d } };
}

/** Envia um material: cota, varredura, matéria (IA ou palavras-chave) e, se houver edital do aluno, o cruzamento. */
export async function enviarMaterial(user, { arquivo = null, textoColado = '', editalId = '', ip = null, signal } = {}) {
  await assertCanUpload(user, 'material');
  const { text, pages, sha, ocr, warnings, security } = await lerTexto(user, { arquivo, textoColado, ip, signal });
  if (words(text) < 60) throw new HttpError(422, ocr ? 'Não conseguimos ler texto suficiente nas páginas escaneadas.' : 'O material tem pouco texto para gerar questões (mínimo de 60 palavras).');
  const fileKey = arquivo ? await putFile(makeKey(`materiais/${user.id}`, arquivo.name), arquivo.buffer, arquivo.mime) : null;
  try {
    const idEdital = String(editalId || '').trim();
    const edital = UUID.test(idEdital) ? await editais.buscar(idEdital, user.id) : null;
    const [d, editalMatch] = await Promise.all([
      detect(text, user.id),
      edital ? matchMaterialWithEdital(text, edital, user.id, signal).catch((e) => { console.warn('[edital_match] falhou:', e.message); return null; }) : Promise.resolve(null),
    ]);
    const materia = editalMatch?.disciplina_nome && MATERIAS.includes(editalMatch.disciplina_nome) ? editalMatch.disciplina_nome : (d?.materia || null);
    const material = await materiais.inserir({
      userId: user.id, fileName: arquivo?.name || null, fileKey, mime: arquivo?.mime || null, size: arquivo?.buffer.length || null, pages, text,
      wordCount: words(text), materia, detect: d, editalId: edital ? edital.id : null, editalMatch, sha256: sha, security, ocr,
    });
    return { material, warnings };
  } catch (e) { await deleteFile(fileKey); throw e; }
}

/** Cruza (ou recruza) um material já enviado com um edital do aluno; editalId vazio desliga. */
export async function cruzarComEdital(user, materialId, editalId) {
  const m = await materiais.buscar(materialId, user.id);
  if (!m) throw new HttpError(404, 'Material não encontrado.');
  const id = String(editalId || '').trim();
  if (!id) return materiais.definirEdital(m.id, user.id, null, null);
  if (!UUID.test(id)) throw new HttpError(400, 'Edital inválido.');
  const edital = await editais.buscar(id, user.id);
  if (!edital) throw new HttpError(404, 'Edital não encontrado.');
  const cruzamento = await matchMaterialWithEdital(m.text, edital, user.id);
  return materiais.definirEdital(m.id, user.id, edital.id, cruzamento);
}

export const listarMateriais = (user) => materiais.listarCompletos(user.id, 100);

export async function excluirMaterial(user, id) {
  const m = await materiais.excluir(id, user.id);
  if (m) await deleteFile(m.file_key);
}
