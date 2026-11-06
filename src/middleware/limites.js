// Limitadores de requisição — todos num lugar só, com contagem no PostgreSQL (tabela limites_requisicao), para que
// várias instâncias da API somem as mesmas contagens. Janela fixa: a 1ª requisição abre a janela de windowMs.
//
// RATE_LIMIT_PREFIXO separa ambientes que dividem o mesmo banco (os testes usam um prefixo por arquivo).
import rateLimit from 'express-rate-limit';
import { query, one } from '../db.js';

const PREFIXO = process.env.RATE_LIMIT_PREFIXO || 'hc';

/** Store do express-rate-limit sobre o Postgres: incremento atômico (upsert) por chave. */
export class PostgresStore {
  constructor(nome) { this.nome = nome; this.localKeys = false; this.prefix = `${PREFIXO}:${nome}:`; }
  init(opts) { this.windowMs = opts.windowMs; }
  chave(k) { return this.prefix + k; }

  async increment(key) {
    const r = await one(
      `INSERT INTO limites_requisicao(chave, hits, reinicia_em) VALUES ($1, 1, now() + ($2 || ' milliseconds')::interval)
       ON CONFLICT (chave) DO UPDATE SET
         hits = CASE WHEN limites_requisicao.reinicia_em <= now() THEN 1 ELSE limites_requisicao.hits + 1 END,
         reinicia_em = CASE WHEN limites_requisicao.reinicia_em <= now() THEN EXCLUDED.reinicia_em ELSE limites_requisicao.reinicia_em END
       RETURNING hits, reinicia_em`,
      [this.chave(key), String(this.windowMs)]
    );
    if (Math.random() < 0.01) limparExpirados().catch(() => {}); // faxina ocasional, fora do caminho da requisição
    return { totalHits: r.hits, resetTime: new Date(r.reinicia_em) };
  }
  async decrement(key) { await query('UPDATE limites_requisicao SET hits = greatest(0, hits - 1) WHERE chave=$1', [this.chave(key)]); }
  async resetKey(key) { await query('DELETE FROM limites_requisicao WHERE chave=$1', [this.chave(key)]); }
  async get(key) {
    const r = await one('SELECT hits, reinicia_em FROM limites_requisicao WHERE chave=$1 AND reinicia_em > now()', [this.chave(key)]);
    return r ? { totalHits: r.hits, resetTime: new Date(r.reinicia_em) } : undefined;
  }
}

export const limparExpirados = () => query("DELETE FROM limites_requisicao WHERE reinicia_em < now() - interval '1 hour'");

/**
 * @param {string} nome  identifica o limitador na chave (não reutilize entre limitadores diferentes)
 * @param {{ windowMs: number, limit: number, mensagem: string, porAluno?: boolean }} o
 *   porAluno: conta por aluno logado (req.user.id); senão, por IP
 */
export function limitador(nome, { windowMs, limit, mensagem, porAluno = true }) {
  return rateLimit({
    windowMs, limit,
    store: new PostgresStore(nome),
    ...(porAluno ? { keyGenerator: (req) => req.user.id } : {}),
    standardHeaders: true, legacyHeaders: false,
    passOnStoreError: true, // banco fora: não derruba a requisição por causa do contador (o resto também falharia)
    message: { error: mensagem },
  });
}

const MIN = 60 * 1000, HORA = 60 * MIN;

// Contas (por IP, antes do login)
export const authLimit = limitador('auth', { windowMs: 15 * MIN, limit: 40, porAluno: false, mensagem: 'Muitas tentativas. Aguarde alguns minutos.' });
export const emailLimit = limitador('email', { windowMs: HORA, limit: 8, porAluno: false, mensagem: 'Muitos e-mails solicitados. Tente novamente mais tarde.' });

// Por aluno
export const geracaoLimit = limitador('geracao', { windowMs: 10 * MIN, limit: 12, mensagem: 'Muitas gerações seguidas. Aguarde alguns minutos.' });
export const feedbackLimit = limitador('feedback', { windowMs: MIN, limit: 40, mensagem: 'Muitas avaliações seguidas. Aguarde um instante.' });
// "Por que errei?" chama a IA: limite curto por minuto (o limite diário do plano fica no serviço)
export const explainLimit = limitador('explicacao', { windowMs: MIN, limit: 10, mensagem: 'Muitas explicações seguidas. Aguarde um instante.' });
export const materialLimit = limitador('material', { windowMs: HORA, limit: 30, mensagem: 'Muitos envios em pouco tempo. Aguarde alguns minutos.' });
export const provaLimit = limitador('prova', { windowMs: HORA, limit: 30, mensagem: 'Muitos envios em pouco tempo. Aguarde alguns minutos.' });
export const cadernoLimit = limitador('caderno', { windowMs: HORA, limit: 60, mensagem: 'Muitas operações em pouco tempo. Aguarde alguns minutos.' });
export const editalLimit = limitador('edital', { windowMs: HORA, limit: 15, mensagem: 'Muitos editais enviados em pouco tempo. Aguarde alguns minutos.' });
export const senhaLimit = limitador('senha', { windowMs: 15 * MIN, limit: 10, mensagem: 'Muitas tentativas de troca de senha. Aguarde alguns minutos.' });
export const avatarLimit = limitador('avatar', { windowMs: 15 * MIN, limit: 30, mensagem: 'Muitos envios de avatar. Aguarde alguns minutos.' });
export const exportarLimit = limitador('exportar', { windowMs: HORA, limit: 5, mensagem: 'Você já baixou seus dados várias vezes. Tente de novo em uma hora.' });
