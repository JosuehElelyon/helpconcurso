// Ligação entre prova (base compartilhada) e edital (do aluno). Fica fora de services/provas.js e services/edital.js
// para não criar importação circular entre os dois.
import { HttpError } from '../lib/http.js';
import * as provasRepo from '../repositories/provas.js';
import * as editaisRepo from '../repositories/editais.js';
import { createEditalForUser } from './edital.js';

export const minhasProvas = (user) => provasRepo.minhasComEdital(user.id);

/**
 * Depois de enviar prova + edital juntos: o edital aponta para a prova. Se a prova era duplicata (talvez de outro
 * aluno), ela só ganha o vínculo se for de quem enviou e ainda não tiver edital.
 */
export async function ligarEditalEnviadoComAProva({ user, editalId, resultadoEnvio }) {
  if (resultadoEnvio.prova) {
    await editaisRepo.definirProva(editalId, resultadoEnvio.prova.id);
  } else if (resultadoEnvio.provaId) {
    await provasRepo.vincularEditalSeDoAutorESemEdital(resultadoEnvio.provaId, editalId, user.id);
    await editaisRepo.definirProva(editalId, resultadoEnvio.provaId);
  }
}

/** Vincula a prova a um edital novo (arquivo), a um edital existente do aluno, ou desvincula (sem nenhum). */
export async function vincularEditalAProva({ user, provaId, arquivoEdital, editalId, ip }) {
  const p = await provasRepo.doAutorOuAdmin(provaId, user.id, user.role === 'ADMIN');
  if (!p) throw new HttpError(404, 'Prova não encontrada.');
  if (arquivoEdital) {
    await createEditalForUser({ user, file: arquivoEdital, banca: p.banca, orgao: p.orgao, cargo: p.cargo, ano: p.ano, provaId: p.id, ip });
  } else if (editalId) {
    if (!/^[0-9a-f-]{36}$/i.test(editalId)) throw new HttpError(400, 'Edital inválido.');
    const ed = await editaisRepo.buscar(editalId, user.id);
    if (!ed) throw new HttpError(404, 'Edital não encontrado.');
    await provasRepo.vincularEdital(p.id, ed.id);
    await editaisRepo.ligarProvaSeVazio(ed.id, p.id, p.banca);
  } else {
    await provasRepo.desvincularEdital(p.id);
  }
  return minhasProvas(user);
}
