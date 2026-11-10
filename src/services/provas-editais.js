// Ligação entre prova (base compartilhada) e edital (do aluno). Fica fora de services/provas.js e services/edital.js
// para não criar importação circular entre os dois.
import { HttpError } from '../lib/http.js';
import * as provasRepo from '../repositories/provas.js';
import * as editaisRepo from '../repositories/editais.js';
import { createEditalForUser } from './edital.js';

export const minhasProvas = (user) => provasRepo.minhasComEdital(user.id);

/**
 * Depois de enviar prova + edital juntos: o edital aponta para a prova e a prova fica ligada ao edital DESTE aluno.
 * Vale também para duplicata (prova que já estava na base, talvez enviada por outro aluno): o vínculo é por aluno.
 */
export async function ligarEditalEnviadoComAProva({ user, editalId, resultadoEnvio }) {
  const provaId = resultadoEnvio.prova?.id || resultadoEnvio.provaId;
  if (!provaId) return;
  await provasRepo.vincularEdital(provaId, editalId, user.id);
  await editaisRepo.definirProva(editalId, provaId);
}

/**
 * Vincula a prova a um edital novo (arquivo), a um edital existente do aluno, ou desvincula (sem nenhum).
 * O vínculo é do aluno: vale para provas que ele enviou e também para provas prontas da base.
 */
export async function vincularEditalAProva({ user, provaId, arquivoEdital, editalId, ip }) {
  const p = user.role === 'ADMIN' ? await provasRepo.buscar(provaId) : await provasRepo.buscarAcessivel(provaId, user.id);
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (arquivoEdital) {
    await createEditalForUser({ user, file: arquivoEdital, banca: p.banca, orgao: p.orgao, cargo: p.cargo, ano: p.ano, provaId: p.id, ip });
  } else if (editalId) {
    if (!/^[0-9a-f-]{36}$/i.test(editalId)) throw new HttpError(400, 'Edital inválido.');
    const ed = await editaisRepo.buscar(editalId, user.id);
    if (!ed) throw new HttpError(404, 'Edital não encontrado.');
    await provasRepo.vincularEdital(p.id, ed.id, user.id);
    await editaisRepo.ligarProvaSeVazio(ed.id, p.id, p.banca);
  } else {
    await provasRepo.desvincularEdital(p.id, user.id);
  }
  return minhasProvas(user);
}
