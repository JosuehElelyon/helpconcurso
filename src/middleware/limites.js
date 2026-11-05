// Limitadores de requisições compartilhados entre rotas.
import rateLimit from 'express-rate-limit';

const porAluno = (windowMs, limit, error) => rateLimit({
  windowMs, limit, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false, message: { error },
});

// "Por que errei?" chama a IA: limite curto por minuto (o limite diário do plano fica no serviço)
export const explainLimit = porAluno(60 * 1000, 10, 'Muitas explicações seguidas. Aguarde um instante.');
