// Questões reais ficam copiadas em simulados e cadernos. Quando a banca anula ou o gabarito definitivo muda depois,
// a cópia precisa refletir isso ao ser exibida (G6): anulada não conta acerto/erro nem entra na revisão espaçada.
import { many } from '../db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function aplicarSituacaoOficial(questoes) {
  const lista = Array.isArray(questoes) ? questoes : [];
  const ids = [...new Set(lista.map((q) => String(q?.id || '')).filter((id) => UUID.test(id)))];
  if (!ids.length) return lista;
  const rows = await many('SELECT id, anulada, gabarito, gabarito_definitivo FROM prova_questoes WHERE id = ANY($1::uuid[])', [ids]);
  const porId = new Map(rows.map((r) => [String(r.id), r]));
  return lista.map((q) => {
    const r = porId.get(String(q?.id || ''));
    if (!r) return q;
    if (r.anulada) return { ...q, anulada: true };
    if (r.gabarito_definitivo && r.gabarito && r.gabarito !== q.gabarito) return { ...q, gabarito: r.gabarito, gabaritoAtualizado: true };
    return q;
  });
}
