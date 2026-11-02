// Erros da camada de IA. "retryable" = vale tentar de novo; "fallback" = vale tentar outro modelo/provedor.
export class AiError extends Error {
  constructor(message, { status, retryable = false, fallback = true, code = 'ai_error', cause } = {}) {
    super(message); this.name = 'AiError'; this.status = status; this.retryable = retryable; this.fallback = fallback; this.code = code; this.cause = cause;
  }
}
export class AiCapabilityError extends AiError {
  constructor(msg) { super(msg, { code: 'capability', retryable: false, fallback: true }); this.name = 'AiCapabilityError'; }
}
export class AiAbortError extends AiError {
  constructor() { super('Operação cancelada.', { code: 'aborted', retryable: false, fallback: false }); this.name = 'AiAbortError'; }
}
export class AiOutputError extends AiError {
  constructor(msg) { super(msg, { code: 'bad_output', retryable: true, fallback: true }); this.name = 'AiOutputError'; }
}

// Classifica erros HTTP/rede de qualquer provedor
export function fromHttp(status, message, cause) {
  if (status === 401 || status === 403) return new AiError(`Chave de API inválida ou sem permissão (${status}).`, { status, retryable: false, fallback: true, code: 'auth', cause });
  if (status === 404) return new AiError(`Modelo não encontrado (${status}).`, { status, retryable: false, fallback: true, code: 'model', cause });
  if (status === 400 || status === 413 || status === 422) return new AiError(`Requisição recusada pelo provedor: ${message}`, { status, retryable: false, fallback: true, code: 'bad_request', cause });
  if (status === 429) return new AiError('Limite de uso do provedor atingido.', { status, retryable: true, code: 'rate_limit', cause });
  if (status >= 500 || status === 408 || status === 409) return new AiError(`Provedor indisponível (${status}).`, { status, retryable: true, code: 'unavailable', cause });
  return new AiError(message || 'Erro desconhecido do provedor.', { status, retryable: !status, code: status ? 'http' : 'network', cause });
}

export function userMessage(e) {
  if (!e) return 'Falha ao consultar a IA.';
  if (e.code === 'auth') return 'A chave da IA está inválida. Avise o administrador.';
  if (e.code === 'rate_limit') return 'A IA está com muitos pedidos agora. Tente novamente em instantes.';
  if (e.code === 'unavailable' || e.code === 'network' || e.code === 'timeout') return 'A IA está indisponível no momento. Tente novamente em instantes.';
  if (e.code === 'aborted') return 'Operação cancelada.';
  if (e.code === 'bad_output') return 'A IA respondeu em um formato inesperado. Tente novamente.';
  if (e.code === 'budget') return 'O limite diário de uso da IA foi atingido. As gerações voltam amanhã.';
  if (e.code === 'not_configured') return 'A IA não está configurada no servidor.';
  return 'Não foi possível concluir com a IA. Tente novamente.';
}
