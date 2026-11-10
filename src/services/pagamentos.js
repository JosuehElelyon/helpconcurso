// Serviço de Pagamentos, Cartões Recorrentes e Assinaturas (Mercado Pago: Pix instantâneo, Webhooks e Cofre de Cartão)
import { HttpError } from '../lib/http.js';
import { PLANOS } from '../lib/planos.js';
import { config } from '../config.js';
import * as planosRepo from '../repositories/planos.js';
import * as cartoesRepo from '../repositories/cartoes.js';
import {
  criarPagamentoPix,
  consultarPagamento,
  validarAssinaturaWebhook,
  salvarCartaoClienteMercadoPago,
  removerCartaoClienteMercadoPago,
} from '../lib/mercadopago.js';
import { sendUpgradePedidoEmail, sendPlanoAtivadoEmail } from '../lib/mailer.js';

export function formatarPedido(p) {
  if (!p) return null;
  return {
    id: p.id,
    plano: p.plano,
    planoNome: PLANOS[p.plano]?.nome || p.plano,
    periodicidade: p.periodicidade,
    valor: Number(p.valor),
    status: p.status,
    gateway: p.gateway || 'manual',
    pixCopiaCola: p.pix_copia_cola || null,
    pixQrCodeBase64: p.pix_qr_code_base64 || null,
    checkoutUrl: p.checkout_url || null,
    expiraEm: p.expira_em || null,
    pagoEm: p.pago_em || null,
    createdAt: p.created_at,
  };
}

/** Cria um novo pedido de upgrade com Pix instantâneo se o Mercado Pago estiver configurado */
export async function criarPedidoUpgrade(user, plano, periodicidade) {
  if (user.role === 'ADMIN') {
    throw new HttpError(400, 'Administradores já têm acesso completo.');
  }

  const p = PLANOS[plano];
  if (!p || plano === 'gratis') {
    throw new HttpError(400, 'Plano inválido para upgrade.');
  }
  if (!['mensal', 'anual'].includes(periodicidade)) {
    throw new HttpError(400, 'Periodicidade inválida (use mensal ou anual).');
  }

  const valor = periodicidade === 'anual' ? p.precoAnual : p.precoMensal;
  let pedido = await planosRepo.pedirUpgrade(user.id, plano, periodicidade, valor);

  // Se o Mercado Pago estiver configurado com chave, gera a cobrança Pix
  if (config.mercadopago.accessToken) {
    try {
      const pix = await criarPagamentoPix({
        pedidoId: pedido.id,
        valor,
        descricao: `HelpConcurso — Assinatura Plano ${p.nome} (${periodicidade})`,
        pagador: {
          email: user.email,
          nome: user.name,
        },
        expiraEmMinutos: 60,
      });

      if (pix.ativo && pix.gatewayId) {
        pedido = await planosRepo.atualizarDadosGateway(pedido.id, {
          gateway: 'mercadopago',
          gatewayId: pix.gatewayId,
          pixCopiaCola: pix.pixCopiaCola,
          pixQrCodeBase64: pix.pixQrCodeBase64,
          checkoutUrl: pix.checkoutUrl,
          expiraEm: pix.expiraEm,
          gatewayRaw: pix.gatewayRaw,
        });
      }
    } catch (err) {
      console.warn('[pagamentos] Falha ao gerar Pix no Mercado Pago, mantendo pedido manual:', err.message);
    }
  } else {
    // Fluxo manual: avisa administradores por e-mail
    for (const to of config.adminEmails || []) {
      sendUpgradePedidoEmail(to, { aluno: user, plano: p.nome, periodicidade, valor });
    }
  }

  return formatarPedido(pedido);
}

/** Consulta o pedido pendente do aluno com os dados do Pix */
export async function obterPedidoPendente(userId) {
  const p = await planosRepo.pendenteDoAluno(userId);
  return formatarPedido(p);
}

/** Cancela o pedido de upgrade pendente */
export async function cancelarPedidoUpgrade(userId) {
  await planosRepo.cancelarPendenteDoAluno(userId);
  return { ok: true };
}

/**
 * Processa notificações assíncronas (Webhooks) do Mercado Pago.
 * Verifica o status diretamente na API oficial e ativa o plano imediatamente com idempotência.
 */
export async function processarWebhookMercadoPago({ body = {}, query = {}, headers = {} }) {
  const paymentId = body.data?.id || query['data.id'] || query.id || body.id;
  const topic = query.topic || body.type || body.action;

  if (!paymentId) {
    return { processado: false, motivo: 'sem_id' };
  }

  // Se houver segredo de webhook configurado, valida a assinatura
  const xSignature = headers['x-signature'];
  const xRequestId = headers['x-request-id'];
  if (config.mercadopago.webhookSecret && !validarAssinaturaWebhook({ xSignature, xRequestId, dataId: paymentId })) {
    throw new HttpError(401, 'Assinatura inválida no webhook.');
  }

  // Consulta o pagamento na API oficial do Mercado Pago para validação definitiva
  const pagamento = await consultarPagamento(paymentId);
  if (!pagamento) {
    return { processado: false, motivo: 'pagamento_nao_encontrado_no_mp' };
  }

  // Só prossegue se o pagamento foi aprovado
  if (pagamento.status !== 'approved') {
    return { processado: true, status: pagamento.status };
  }

  const pedidoId = pagamento.external_reference;
  let pedido = null;

  if (pedidoId && /^[0-9a-f-]{36}$/i.test(pedidoId)) {
    pedido = await planosRepo.buscarPedido(pedidoId);
  }
  if (!pedido) {
    pedido = await planosRepo.buscarPorGatewayId(String(paymentId));
  }

  if (!pedido) {
    console.warn(`[pagamentos] Webhook MP: Pedido não localizado para o pagamento ${paymentId}`);
    return { processado: false, motivo: 'pedido_nao_localizado' };
  }

  if (pedido.status !== 'pendente') {
    return { processado: true, status: pedido.status, jaDecidido: true };
  }

  // Ativação atômica com idempotência
  const res = await planosRepo.aprovarEAtivarPlano(
    pedido.id,
    pedido.user_id,
    pedido.plano,
    pedido.periodicidade,
    { gatewayId: String(paymentId), gatewayRaw: pagamento }
  );

  if (res && res.usuario) {
    console.log(`[pagamentos] Plano ${res.pedido.plano} ativado com sucesso para ${res.usuario.email} via Mercado Pago (Pix)`);
    sendPlanoAtivadoEmail(res.usuario, {
      plano: PLANOS[res.pedido.plano]?.nome || res.pedido.plano,
      ate: res.usuario.plano_ate,
    });
  }

  return { processado: true, status: 'aprovado', pedidoId: pedido.id };
}

// ---------- Cartões de Crédito para Cobrança Recorrente ----------
export function formatarCartao(r) {
  if (!r) return null;
  return {
    id: r.id,
    gateway: r.gateway,
    brand: r.brand,
    last4: r.last4,
    expMonth: Number(r.exp_month),
    expYear: Number(r.exp_year),
    holderName: r.holder_name,
    docLast4: r.doc_last4 || null,
    isDefault: Boolean(r.is_default),
    recorrenteAtivo: Boolean(r.recorrente_ativo),
    conectadoGateway: Boolean(r.gateway_card_id),
    createdAt: r.created_at,
  };
}

export const cobrancaConfigPublica = () => ({
  mercadoPagoPublicKey: config.mercadopago.publicKey || null,
  gatewayAtivo: Boolean(config.mercadopago.accessToken),
});

export async function listarCartoesUsuario(userId) {
  const rows = await cartoesRepo.listarPorUsuario(userId);
  return rows.map(formatarCartao);
}

export async function adicionarCartaoRecorrente(user, payload) {
  const agora = new Date();
  const anoAtual = agora.getUTCFullYear();
  const mesAtual = agora.getUTCMonth() + 1;
  if (payload.expYear < anoAtual || (payload.expYear === anoAtual && payload.expMonth < mesAtual)) {
    throw new HttpError(400, 'Este cartão está com a validade vencida.');
  }

  let gateway = config.mercadopago.accessToken ? 'mercadopago' : 'sandbox';
  let gatewayCustomerId = null;
  let gatewayCardId = null;
  let brand = payload.brand.toLowerCase();
  let last4 = payload.last4;
  let expMonth = payload.expMonth;
  let expYear = payload.expYear;
  let holderName = payload.holderName;

  if (config.mercadopago.accessToken && payload.cardToken) {
    try {
      const mp = await salvarCartaoClienteMercadoPago({
        email: user.email,
        nome: payload.holderName,
        token: payload.cardToken,
      });
      if (mp) {
        gateway = 'mercadopago';
        gatewayCustomerId = mp.customerId;
        gatewayCardId = mp.cardId;
        brand = (mp.brand || brand).toLowerCase();
        last4 = mp.last4 || last4;
        expMonth = mp.expMonth || expMonth;
        expYear = mp.expYear || expYear;
        holderName = mp.holderName || holderName;
      }
    } catch (err) {
      throw new HttpError(400, err.message || 'Falha ao validar cartão no gateway de pagamento.');
    }
  }

  const row = await cartoesRepo.adicionarComoPadrao(user.id, {
    gateway,
    gatewayCustomerId,
    gatewayCardId,
    brand,
    last4,
    expMonth,
    expYear,
    holderName,
    docLast4: payload.docLast4 || null,
    recorrenteAtivo: payload.recorrenteAtivo !== false,
  });

  return formatarCartao(row);
}

export async function atualizarCartaoRecorrente(userId, cardId, { recorrenteAtivo, isDefault }) {
  const row = await cartoesRepo.atualizar(cardId, userId, { recorrenteAtivo, isDefault });
  if (!row) throw new HttpError(404, 'Cartão não encontrado.');
  return formatarCartao(row);
}

export async function removerCartaoRecorrente(userId, cardId) {
  const removido = await cartoesRepo.remover(cardId, userId);
  if (!removido) throw new HttpError(404, 'Cartão não encontrado.');
  if (removido.gateway_customer_id && removido.gateway_card_id) {
    await removerCartaoClienteMercadoPago({
      customerId: removido.gateway_customer_id,
      cardId: removido.gateway_card_id,
    });
  }
  return { ok: true };
}
