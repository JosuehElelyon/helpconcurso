// Integração com o Mercado Pago (API REST oficial v1)
// Suporte nativo a Pix instantâneo e consulta de pagamentos com liberação automática
import crypto from 'node:crypto';
import { config } from '../config.js';

const MP_API_URL = 'https://api.mercadopago.com';

/** Cria um pagamento via Pix para o pedido de plano */
export async function criarPagamentoPix({ pedidoId, valor, descricao, pagador = {}, expiraEmMinutos = 60 }) {
  const token = config.mercadopago.accessToken;
  if (!token) {
    return {
      ativo: false,
      gateway: 'manual',
      gatewayId: null,
      status: 'pending',
      pixCopiaCola: null,
      pixQrCodeBase64: null,
      checkoutUrl: null,
      expiraEm: null,
      gatewayRaw: null,
    };
  }

  const nome = String(pagador.nome || 'Aluno HelpConcurso').trim();
  const partesNome = nome.split(/\s+/);
  const firstName = partesNome[0] || 'Aluno';
  const lastName = partesNome.slice(1).join(' ') || 'HelpConcurso';
  const expiraEm = new Date(Date.now() + expiraEmMinutos * 60 * 1000).toISOString();

  const payload = {
    transaction_amount: Number(Number(valor).toFixed(2)),
    description: String(descricao || 'HelpConcurso — Assinatura de Plano').slice(0, 120),
    payment_method_id: 'pix',
    payer: {
      email: pagador.email,
      first_name: firstName,
      last_name: lastName,
    },
    external_reference: String(pedidoId),
    notification_url: `${config.appUrl}/api/v1/webhooks/mercadopago`,
    date_of_expiration: expiraEm,
  };

  const res = await fetch(`${MP_API_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': String(pedidoId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.error || 'Falha ao comunicar com o Mercado Pago';
    console.error('[mercadopago] Erro ao criar pagamento Pix:', msg, data);
    throw new Error(`Erro no Mercado Pago: ${msg}`);
  }

  const txData = data.point_of_interaction?.transaction_data || {};
  return {
    ativo: true,
    gateway: 'mercadopago',
    gatewayId: String(data.id),
    status: data.status,
    pixCopiaCola: txData.qr_code || null,
    pixQrCodeBase64: txData.qr_code_base64 || null,
    checkoutUrl: txData.ticket_url || null,
    expiraEm: data.date_of_expiration || expiraEm,
    gatewayRaw: {
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      payment_method_id: data.payment_method_id,
    },
  };
}

/** Consulta os dados de um pagamento no Mercado Pago pelo ID da transação */
export async function consultarPagamento(paymentId) {
  const token = config.mercadopago.accessToken;
  if (!token || !paymentId) return null;

  const res = await fetch(`${MP_API_URL}/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.warn(`[mercadopago] Pagamento ${paymentId} não encontrado ou erro na API (${res.status})`);
    return null;
  }

  return res.json();
}

/** Valida a assinatura do webhook do Mercado Pago (se configurado o segredo) */
export function validarAssinaturaWebhook({ xSignature, xRequestId, dataId }) {
  const secret = config.mercadopago.webhookSecret;
  if (!secret || !xSignature) return true; // Se o secret não foi fornecido, a autenticação é garantida pela consulta direta ao MP

  try {
    const parts = Object.fromEntries(xSignature.split(',').map((part) => {
      const [k, v] = part.split('=');
      return [k.trim(), v ? v.trim() : ''];
    }));

    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;

    // Manifest: "id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];"
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return hmac === v1;
  } catch (e) {
    console.warn('[mercadopago] Falha ao verificar x-signature:', e.message);
    return false;
  }
}
