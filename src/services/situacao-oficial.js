// Questões reais ficam copiadas em simulados e cadernos. Quando a banca anula ou o gabarito definitivo muda depois,
// a cópia precisa refletir isso ao ser exibida (G6): anulada não conta acerto/erro nem entra na revisão espaçada.
import * as provasRepo from '../repositories/provas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lê de uma vez a situação oficial de todas as questões de várias listas (ex.: todos os simulados do aluno)
 * e devolve uma função síncrona que aplica a situação a uma lista. Uma consulta só, em vez de uma por lista.
 */
export async function carregarSituacaoOficial(listas) {
  const ids = new Set();
  for (const lista of listas) for (const q of Array.isArray(lista) ? lista : []) { const id = String(q?.id || ''); if (UUID.test(id)) ids.add(id); }
  const rows = await provasRepo.situacaoOficial([...ids]);
  const porId = new Map(rows.map((r) => [String(r.id), r]));
  return (questoes) => {
    const lista = Array.isArray(questoes) ? questoes : [];
    if (!porId.size) return lista;
    return lista.map((q) => {
      const r = porId.get(String(q?.id || ''));
      if (!r) return q;
      if (r.anulada) return { ...q, anulada: true };
      if (r.gabarito_definitivo && r.gabarito && r.gabarito !== q.gabarito) return { ...q, gabarito: r.gabarito, gabaritoAtualizado: true };
      return q;
    });
  };
}

export async function aplicarSituacaoOficial(questoes) {
  return (await carregarSituacaoOficial([questoes]))(questoes);
}
