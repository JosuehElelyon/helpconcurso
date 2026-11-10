// Utilitário compartilhado para validação de tamanho máximo de upload no front-end.
// Sincronizado com UPLOAD_MAX_MB (padrão 25 MB no servidor; Nginx client_max_body_size 30m).

export const UPLOAD_MAX_MB = 25;
export const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;

export function formatarMb(bytes) {
  return (Number(bytes || 0) / (1024 * 1024)).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + ' MB';
}

export function validarArquivoUpload(file, { rotulo = 'O arquivo', maxMb = UPLOAD_MAX_MB } = {}) {
  if (!file) return { ok: true, mensagem: '' };
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      mensagem: `${rotulo} "${file.name}" (${formatarMb(file.size)}) ultrapassa o limite máximo de ${maxMb} MB por arquivo.`,
    };
  }
  return { ok: true, mensagem: '' };
}

export function limparInputArquivo(input) {
  if (input) input.value = '';
}
