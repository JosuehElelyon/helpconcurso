import nodemailer from 'nodemailer';
import { config } from '../config.js';

function makeTransport() {
  if (!config.smtp.host) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}
let transport = makeTransport();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ title, intro, code, buttonLabel, link, outro }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F4EF;font-family:Arial,Helvetica,sans-serif;color:#14202E">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #E4E1D8;border-radius:14px">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #EFECE4;font-weight:800;font-size:18px">
      <span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:#0F6E5C;color:#fff;text-align:center;line-height:28px;margin-right:8px">✓</span>HelpConcurso</td></tr>
    <tr><td style="padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
      <p style="margin:0 0 20px;line-height:1.55;color:#3D4A59">${intro}</p>
      <div style="font-size:32px;letter-spacing:10px;font-weight:800;background:#F5F4EF;border-radius:10px;padding:16px;text-align:center;margin:0 0 20px">${esc(code)}</div>
      <p style="margin:0 0 22px;text-align:center"><a href="${esc(link)}" style="background:#0F6E5C;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">${esc(buttonLabel)}</a></p>
      <p style="margin:0;font-size:13px;color:#6B7684;line-height:1.5">${outro}</p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

async function send({ to, subject, html, text }) {
  if (!transport) {
    console.log(`\n[e-mail simulado] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    return { sent: true, simulated: true };
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await makeTransport().sendMail({ from: config.smtp.from, to, subject, html, text });
      console.log(`[SMTP] [OK] e-mail enviado para ${to} ("${subject}")`);
      return { sent: true };
    } catch (e) {
      console.warn(`[ERRO-SMTP] tentativa=${attempt}/2 para=${to} codigo=${e.code || 'SMTP'} msg="${e.message}"`);
      if (attempt === 2) {
        console.log(`\n[FALLBACK-EMAIL] Não foi possível entregar via SMTP para ${to}. Conteúdo:\nAssunto: ${subject}\n${text}\n`);
        return { sent: false, error: e.message };
      }
    }
  }
}

export function sendVerificationEmail(user, code, ttlMin) {
  const link = `${config.appUrl}/?acao=verificar&email=${encodeURIComponent(user.email)}&codigo=${code}`;
  return send({
    to: user.email,
    subject: `${code} é o seu código de confirmação · HelpConcurso`,
    text: `Olá, ${user.name}!\n\nSeu código para confirmar a conta no HelpConcurso é: ${code}\nOu acesse: ${link}\n\nO código vale por ${Math.round(ttlMin / 60)} horas.`,
    html: layout({ title: 'Confirme seu e-mail', intro: `Olá, ${esc(user.name)}! Use o código abaixo para ativar sua conta no HelpConcurso.`, code, buttonLabel: 'Confirmar minha conta', link,
      outro: `O código vale por ${Math.round(ttlMin / 60)} horas. Se você não criou esta conta, ignore este e-mail.` }),
  });
}

export function sendResetEmail(user, code, ttlMin) {
  const link = `${config.appUrl}/?acao=redefinir&email=${encodeURIComponent(user.email)}&codigo=${code}`;
  return send({
    to: user.email,
    subject: `${code} é o seu código para redefinir a senha · HelpConcurso`,
    text: `Olá, ${user.name}!\n\nSeu código para redefinir a senha é: ${code}\nOu acesse: ${link}\n\nO código vale por ${ttlMin} minutos. Se não foi você, ignore este e-mail.`,
    html: layout({ title: 'Redefinição de senha', intro: `Olá, ${esc(user.name)}! Recebemos um pedido para redefinir a senha da sua conta.`, code, buttonLabel: 'Criar nova senha', link,
      outro: `O código vale por ${ttlMin} minutos. Se você não pediu a redefinição, ignore este e-mail: sua senha continua a mesma.` }),
  });
}

export async function verifyMailer() {
  if (!transport) return;
  try { await transport.verify(); console.log('[smtp] conexão OK'); } catch (e) { console.warn('[smtp] falha ao conectar:', e.message); }
}

export function sendProvaStatusEmail(user, { titulo, banca, status, note, bonus }) {
  const map = {
    APPROVED: ['Sua prova foi aprovada', `A prova "${titulo}" (${banca}) foi aprovada e está sendo incorporada à base. Você ganhou estrelas e ${bonus} gerações extras de questões. Obrigado por contribuir!`],
    READY: ['Sua prova já está ajudando outros alunos', `A prova "${titulo}" (${banca}) foi incorporada à base e já é usada para gerar questões no estilo da banca.`],
    REJECTED: ['Sua prova não foi aceita', `A prova "${titulo}" (${banca}) não foi aceita na base.${note ? ` Motivo: ${note}` : ''}`],
    DUPLICATE: ['Essa prova já estava na base', `A prova "${titulo}" (${banca}) já fazia parte da nossa base. Obrigado mesmo assim!`],
  };
  const [subject, body] = map[status] || [];
  if (!subject) return;
  const link = `${config.appUrl}/#contribuir`;
  return send({
    to: user.email, subject: `${subject} · HelpConcurso`,
    text: `Olá, ${user.name}!\n\n${body}\n\nAcompanhe suas contribuições: ${link}`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F4EF;font-family:Arial,Helvetica,sans-serif;color:#14202E"><table role="presentation" width="100%" style="padding:32px 12px"><tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #E4E1D8;border-radius:14px"><tr><td style="padding:24px 28px;font-weight:800;font-size:18px;border-bottom:1px solid #EFECE4">HelpConcurso</td></tr>
      <tr><td style="padding:28px"><h1 style="font-size:20px;margin:0 0 12px">${esc(subject)}</h1><p style="margin:0 0 22px;line-height:1.55;color:#3D4A59">Olá, ${esc(user.name)}! ${esc(body)}</p>
      <a href="${esc(link)}" style="background:#0F6E5C;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">Ver minhas contribuições</a></td></tr></table></td></tr></table></body></html>`,
  });
}
