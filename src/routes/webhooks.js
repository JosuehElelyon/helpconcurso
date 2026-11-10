// Rotas de Webhooks de integração (Mercado Pago e outros gateways)
import { Router } from 'express';
import { ah } from '../lib/http.js';
import { processarWebhookMercadoPago } from '../services/pagamentos.js';

const r = Router();

// Webhook do Mercado Pago (Pix instantâneo e pagamentos)
// O Mercado Pago envia notificações via POST ou GET com query params (topic/id ou data.id)
r.post('/mercadopago', ah(async (req, res) => {
  const result = await processarWebhookMercadoPago({
    body: req.body || {},
    query: req.query || {},
    headers: req.headers || {},
  });
  res.status(200).json({ ok: true, ...result });
}));

r.get('/mercadopago', ah(async (req, res) => {
  const result = await processarWebhookMercadoPago({
    body: {},
    query: req.query || {},
    headers: req.headers || {},
  });
  res.status(200).json({ ok: true, ...result });
}));

export default r;
