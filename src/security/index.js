// =====================================================================
// Pipeline de segurança de upload — usado por materiais e provas.
//   antivírus → inspeção do arquivo → (OCR) → varredura do texto visível, do texto oculto
//   e das partes extras (cabeçalhos, comentários) → política → registro de evento
// =====================================================================
import { query, one } from '../db.js';
import { config } from '../config.js';
import { inspectFile, InspectError } from './file-inspect.js';
import { scanText, sanitizeText, SEV, maxSeverity } from './text-scan.js';
import { scanWithClamAV } from './antivirus.js';
import { decide, publicReason } from './policy.js';
import { ocrPdf } from '../services/ocr.js';

export class UploadBlockedError extends Error {
  constructor(message, report) { super(message); this.name = 'UploadBlockedError'; this.report = report; }
}

export async function logSecurityEvent({ userId, kind, severity, fileName, sha256, details, ip }) {
  try {
    await query('INSERT INTO security_events(user_id,kind,severity,file_name,sha256,details,ip) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId || null, kind, severity, fileName?.slice(0, 200) || null, sha256 || null, JSON.stringify(details || {}), ip || null]);
    // Muitos uploads bloqueados em 24h → bloqueia novos uploads do usuário por 24h
    if (userId && severity === 'critical') {
      const r = await one("SELECT count(*)::int AS n FROM security_events WHERE user_id=$1 AND severity='critical' AND created_at > now() - interval '24 hours'", [userId]);
      if (r.n >= config.security.blockedUploadsBeforeLock) await query("UPDATE users SET uploads_blocked_until = now() + interval '24 hours' WHERE id=$1 AND role <> 'ADMIN'", [userId]);
    }
  } catch (e) { console.warn('[seguranca] falha ao registrar evento:', e.message); }
}

/** Varre os textos extraídos e devolve achados combinados (sem decidir). */
export function scanExtracted({ text, hiddenTexts = [], extraText = '' }) {
  const visible = scanText(text, { where: 'texto' });
  const findings = [...visible.findings];
  const hiddenJoined = hiddenTexts.join('\n').trim();
  if (hiddenJoined) {
    const h = scanText(hiddenJoined, { where: 'texto_oculto' });
    if (SEV[h.severity] >= SEV.medium) findings.push({ code: 'instrucao_escondida', severity: 'critical', where: 'texto_oculto', message: 'Instruções para IA escondidas em texto invisível/oculto', sample: hiddenJoined.slice(0, 160) });
    findings.push(...h.findings.filter((f) => SEV[f.severity] >= SEV.low));
  }
  if (extraText.trim()) {
    const x = scanText(extraText, { where: 'partes_extras' });
    findings.push(...x.findings.filter((f) => SEV[f.severity] >= SEV.medium));
  }
  return { text: visible.text, findings };
}

/**
 * Recebe um upload e aplica todas as barreiras.
 * @param {'material'|'prova'|'gabarito'} kind
 * @param {{ ocr?: 'full'|'sample'|'none', userId?, ip?, signal? }} opts
 * @returns {{ text, sha256, ext, pages, needsOcr, ocrDone, findings, decision, removed, inspection }}
 * @throws UploadBlockedError (mensagem pública) | InspectError
 */
export async function secureUpload(buffer, fileName, kind, { ocr = 'none', userId, ip, signal } = {}) {
  const policyKind = kind === 'material' ? 'material' : 'prova';
  const block = async (findings, message) => {
    const sev = maxSeverity(findings) === 'info' ? 'high' : maxSeverity(findings);
    await logSecurityEvent({ userId, kind: `${kind}_bloqueado`, severity: sev, fileName, details: { findings }, ip });
    throw new UploadBlockedError(message, { findings, severity: sev });
  };

  // 1) Antivírus
  const av = await scanWithClamAV(buffer);
  if (av.status === 'infected') await block([{ code: 'virus', severity: 'critical', message: `Antivírus: ${av.signature}`, where: 'arquivo' }], 'O antivírus detectou uma ameaça neste arquivo.');
  if (av.status === 'error') throw new UploadBlockedError('O antivírus está indisponível agora. Tente novamente em alguns minutos.', { findings: [] });

  // 2) Inspeção estrutural
  let ins;
  try { ins = await inspectFile(buffer, fileName); }
  catch (e) {
    if (e instanceof InspectError) {
      if (e.findings?.some((f) => SEV[f.severity] >= SEV.high)) await block(e.findings, e.message);
      throw new UploadBlockedError(e.message, { findings: e.findings || [] });
    }
    throw e;
  }
  if (av.status === 'clean') ins.findings.push({ code: 'antivirus_ok', severity: 'info', message: 'Antivírus: nenhuma ameaça', where: 'arquivo' });

  // 3) OCR (PDF escaneado)
  let text = ins.text, ocrDone = false, ocrInfo = null;
  if (ins.needsOcr && ocr !== 'none') {
    const maxPages = ocr === 'sample' ? 3 : kind === 'material' ? config.security.maxOcrPagesMaterial : config.security.maxOcrPagesProva;
    ocrInfo = await ocrPdf(buffer, { maxPages, userId, signal });
    text = ocrInfo.text; ocrDone = true;
    ins.findings.push({ code: 'ocr', severity: 'info', message: `Páginas escaneadas lidas por IA (${ocrInfo.pagesDone}/${ocrInfo.totalPages})`, where: 'arquivo' });
    if (ocrInfo.truncated && ocr !== 'sample') ins.findings.push({ code: 'ocr_parcial', severity: 'low', message: `Só as primeiras ${ocrInfo.pagesDone} páginas escaneadas foram lidas`, where: 'arquivo' });
  }

  // 4) Varredura do texto
  const scanned = scanExtracted({ text, hiddenTexts: ins.hiddenTexts, extraText: ins.extraText });
  const seen = new Set();
  const findings = [...ins.findings, ...scanned.findings].filter((f) => { const k = `${f.code}|${f.where}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const decision = decide(policyKind, findings);

  if (decision.verdict === 'block') await block(findings, publicReason(policyKind, decision));
  let finalText = scanned.text, removed = [];
  if (decision.verdict === 'sanitize') {
    const s = sanitizeText(finalText); finalText = s.text; removed = s.removed;
    await logSecurityEvent({ userId, kind: `${kind}_sanitizado`, severity: decision.severity, fileName, sha256: ins.sha256, details: { reasons: decision.reasons, removed: removed.slice(0, 10) }, ip });
  }
  if (decision.verdict === 'review') await logSecurityEvent({ userId, kind: `${kind}_suspeito`, severity: decision.severity, fileName, sha256: ins.sha256, details: { reasons: decision.reasons }, ip });

  return { text: finalText, sha256: ins.sha256, ext: ins.ext, pages: ins.pages, needsOcr: ins.needsOcr, ocrDone, ocrPages: ins.ocrPages, findings, decision, removed, antivirus: av.status };
}

export { InspectError, scanText, SEV };
