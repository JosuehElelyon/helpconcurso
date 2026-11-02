export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
// Envolve handlers async para que erros cheguem ao middleware de erro
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function parseBody(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message || 'Dados inválidos.');
  return r.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Use com router.param('id', checkId): ids malformados viram 404 em vez de erro do banco
export const checkId = (_req, _res, next, id) => (UUID.test(id) ? next() : next(new HttpError(404, 'Não encontrado.')));
