// Onde o front encontra a API. Padrão: mesmo domínio (/api/v1) — a API servindo o front, ou Nginx/CDN repassando /api.
// No Nginx do docker-compose este arquivo é gerado a partir de API_URL (deploy/nginx). Front em outro domínio:
// apiUrl absoluto, ex.: 'https://api.helpconcurso.com.br/api/v1' (e libere a origem do front em CORS_ORIGINS na API).
window.HC_CONFIG = { apiUrl: '/api/v1' };
