// Cotas por usuário (controlam o custo de IA). Os limites vêm do PLANO do aluno (src/lib/planos.js);
// créditos extras vêm de provas aprovadas e de estrelas. Simulado de questões reais (origem 'prova_real') não gasta IA e não conta.
import * as cotasRepo from '../repositories/cotas.js';
import * as usuariosRepo from '../repositories/usuarios.js';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';
import { planoDoUsuario, NIVEIS_DIFICEIS } from '../lib/planos.js';


export async function generationQuota(user) {
  const plano = planoDoUsuario(user);
  const [r, bonus] = await Promise.all([cotasRepo.simuladosDeIAHoje(user.id, NIVEIS_DIFICEIS), usuariosRepo.creditosExtras(user.id)]);
  const limit = plano.limites.simuladosDia;
  return {
    plano: plano.id, planoNome: plano.nome,
    usedToday: r.n, dailyLimit: limit, bonus,
    remaining: limit === null ? null : Math.max(0, limit - r.n) + bonus,
    dificeisHoje: r.dif, dificeisLimite: plano.limites.dificeisDia,
  };
}

const upgradeMsg = (plano) => (plano.id === 'aprovacao' || plano.id === 'admin' ? '' : ' Veja os planos em "Meu plano" para ampliar.');

/** Garante que o usuário pode gerar; se a cota diária acabou, consome 1 crédito extra. Nível Difícil/Misto tem limite próprio. */
export async function consumeGeneration(user, nivel = '') {
  const q = await generationQuota(user);
  const plano = planoDoUsuario(user);
  if (NIVEIS_DIFICEIS.includes(nivel) && q.dificeisLimite !== null && q.dificeisHoje >= q.dificeisLimite) {
    throw new HttpError(403, `Seu plano ${plano.nome} inclui ${q.dificeisLimite} simulado(s) Difícil/Misto por dia, e você já usou hoje. Escolha outro nível ou volte amanhã.${upgradeMsg(plano)}`, { quota: q, code: 'plano' });
  }
  if (q.dailyLimit === null || q.usedToday < q.dailyLimit) return { usedBonus: false };
  if (!(await usuariosRepo.consumirCredito(user.id))) throw new HttpError(429, `Você atingiu o limite de ${q.dailyLimit} simulados por hoje do plano ${plano.nome}. Envie provas para a base e ganhe gerações extras, ou volte amanhã.${upgradeMsg(plano)}`, { quota: q, code: 'plano' });
  return { usedBonus: true };
}
export async function refundGeneration(user, used) { if (used?.usedBonus) await usuariosRepo.devolverCredito(user.id); }

/** Limite de itens do plano (editais, cadernos). */
export async function assertLimitePlano(user, recurso) {
  const plano = planoDoUsuario(user);
  const limite = plano.limites[recurso];
  if (limite === null || limite === undefined) return;
  if ((await cotasRepo.contarDoAluno(recurso, user.id)) >= limite) {
    const nome = recurso === 'editais' ? 'editais' : 'cadernos';
    throw new HttpError(403, `Seu plano ${plano.nome} permite até ${limite} ${nome}. Exclua um que não usa mais ou amplie o plano.${upgradeMsg(plano)}`, { code: 'plano' });
  }
}

export async function assertCanUpload(user, kind) {
  const bloqueadoAte = await usuariosRepo.enviosBloqueadosAte(user.id);
  if (bloqueadoAte && new Date(bloqueadoAte) > new Date()) throw new HttpError(429, 'Seus envios foram pausados por 24 horas porque vários arquivos recentes foram bloqueados pela segurança. Se acha que é um engano, fale com o suporte.');
  if (kind === 'material' && user.role !== 'ADMIN') {
    if ((await cotasRepo.materiaisNas24h(user.id)) >= config.quota.materialsPerDay) throw new HttpError(429, `Limite de ${config.quota.materialsPerDay} materiais por dia atingido.`);
  }
}
