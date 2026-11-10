// Helper puro de normalização de estratégia de treino (sem banco, sem HTTP).
import { BANCA } from './bancas.js';

export const MODOS_FOCO = new Set(['livre', 'caderno', 'materias']);
export const FONTES_CONTEUDO = new Set(['misto', 'meu_conteudo', 'banco_provas']);

export function normalizarEstrategia(raw = {}, bancaPreferida = '') {
  const modoFoco = MODOS_FOCO.has(raw?.modoFoco) ? raw.modoFoco : 'materias';
  const fonteConteudo = FONTES_CONTEUDO.has(raw?.fonteConteudo) ? raw.fonteConteudo : 'misto';
  const cadernoId = typeof raw?.cadernoId === 'string' && /^[0-9a-f-]{36}$/i.test(raw.cadernoId) ? raw.cadernoId : null;
  const materias = Array.isArray(raw?.materias)
    ? [...new Set(raw.materias.map((m) => String(m || '').trim()).filter((m) => m.length >= 2 && m.length <= 100))].slice(0, 30)
    : [];
  const materialIds = Array.isArray(raw?.materialIds)
    ? [...new Set(raw.materialIds.filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 30)
    : [];
  const bancaFoco = typeof raw?.bancaFoco === 'string' && (raw.bancaFoco === '' || BANCA[raw.bancaFoco])
    ? raw.bancaFoco
    : (bancaPreferida && BANCA[bancaPreferida] ? bancaPreferida : '');
  const qtdTreino = Math.min(30, Math.max(5, Number(raw?.qtdTreino) || 10));
  return { modoFoco, cadernoId, materias, bancaFoco, fonteConteudo, materialIds, qtdTreino };
}

export const zodEstrategia = (z) => z.object({
  modoFoco: z.enum(['livre', 'caderno', 'materias']).optional().default('materias'),
  cadernoId: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => v || null),
  materias: z.array(z.string().trim().min(2).max(100)).max(30).optional().default([]),
  bancaFoco: z.string().trim().optional().default('').refine((v) => !v || BANCA[v], 'Banca inválida.'),
  fonteConteudo: z.enum(['misto', 'meu_conteudo', 'banco_provas']).optional().default('misto'),
  materialIds: z.array(z.string().uuid()).max(30).optional().default([]),
  qtdTreino: z.coerce.number().int().min(5).max(30).optional().default(10),
});
