// Regras das telas de administração: base de provas, pedidos de plano, divergências de gabarito e segurança.
// (Aprovar/recusar/reprocessar provas, lote e gabarito definitivo ficam em services/provas.js.)
import { HttpError } from '../lib/http.js';
import { BANCA } from '../lib/bancas.js';
import { PLANOS } from '../lib/planos.js';
import { deleteFile, getFile } from '../lib/storage.js';
import { sendPlanoAtivadoEmail } from '../lib/mailer.js';
import * as provasRepo from '../repositories/provas.js';
import * as planosRepo from '../repositories/planos.js';
import * as segurancaRepo from '../repositories/seguranca.js';

export async function listarProvas({ banca, status }) {
  const [rows, counts] = await Promise.all([
    provasRepo.listarParaAdmin({ banca: BANCA[banca] ? banca : null, status: typeof status === 'string' && /^[A-Z_]+$/.test(status) ? status : null }),
    provasRepo.contagemPorStatus(),
  ]);
  return { rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) };
}

export async function detalheProva(id) {
  const p = await provasRepo.detalheParaAdmin(id);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  return p;
}

export const questoesDaProva = (id) => provasRepo.questoesDaProva(id);

/** Arquivo original da prova (a rota entrega sempre como download). */
export async function arquivoDaProva(id) {
  const p = await provasRepo.arquivoDaProva(id);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  return { nome: p.file_name, conteudo: (await getFile(p.file_key)).buffer };
}

/** Exclui a prova e o arquivo; o gabarito só se nenhuma outra prova usar o mesmo arquivo. */
export async function excluirProva(id) {
  const p = await provasRepo.excluir(id);
  if (!p) return;
  await deleteFile(p.file_key);
  if (p.gabarito_key && !(await provasRepo.gabaritoEmUso(p.gabarito_key))) await deleteFile(p.gabarito_key);
}

export const listarDivergencias = () => provasRepo.divergencias();

/** O admin escolhe o gabarito de uma questão divergente; a letra precisa servir ao formato da questão. */
export async function definirGabaritoDivergente(questaoId, gabarito) {
  const q = await provasRepo.buscarQuestao(questaoId);
  if (!q) throw new HttpError(404, 'Questão não encontrada.');
  const alts = Array.isArray(q.alternativas) ? q.alternativas : [];
  const ok = alts.length ? 'ABCDE'.indexOf(gabarito) < alts.length : /^[CE]$/.test(gabarito);
  if (!ok) throw new HttpError(422, alts.length ? 'Letra fora das alternativas desta questão.' : 'Questão Certo/Errado: use C ou E.');
  await provasRepo.confirmarGabaritoDaQuestao(q.id, gabarito);
}

export async function listarPedidos() {
  return (await planosRepo.listarPedidos()).map((p) => ({ ...p, planoNome: PLANOS[p.plano]?.nome || p.plano }));
}

/** Aprova (ativa o plano e avisa por e-mail) ou recusa um pedido pendente. */
export async function decidirPedido(id, acao, admin) {
  const p = await planosRepo.pedidoPendente(id);
  if (!p) throw new HttpError(404, 'Pedido não encontrado ou já decidido.');
  if (acao === 'recusar') {
    await planosRepo.decidirPedido(p.id, 'recusado', admin.id);
    return { ok: true };
  }
  const u = await planosRepo.ativarPlano(p.user_id, p.plano, p.periodicidade);
  await planosRepo.decidirPedido(p.id, 'aprovado', admin.id);
  sendPlanoAtivadoEmail(u, { plano: PLANOS[p.plano]?.nome || p.plano, ate: u.plano_ate });
  return { ok: true, planoAte: u.plano_ate };
}

export async function painelSeguranca() {
  const [events, blockedUsers] = await Promise.all([segurancaRepo.eventosRecentes(), segurancaRepo.usuariosBloqueados()]);
  return { events, blockedUsers };
}
