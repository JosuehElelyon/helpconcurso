// Configuração central — todas as variáveis vêm do ambiente (.env). Veja .env.example.
const env = (k, d = undefined) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);
const bool = (k, d = false) => { const v = env(k); return v === undefined ? d : /^(1|true|yes|sim)$/i.test(v); };
const num = (k, d) => { const v = Number(env(k, d)); return Number.isFinite(v) ? v : d; };
const list = (k, d = '') => env(k, d).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// ---------- IA: qual provedor/modelo faz cada tarefa ----------
// Formato: "provedor:modelo". Troque aqui (ou no .env) para mudar de fornecedor sem mexer no código.
// Provedores disponíveis: anthropic, openai, gemini, groq, together, deepseek, compat, mock
export const AI_TASKS = {
  detect:         { label: 'Identificar matéria do material',     primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  generate:       { label: 'Gerar questões',                      primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5' },
  ocr:            { label: 'Ler PDF escaneado (OCR)',             primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  prova_check:    { label: 'Checagem automática de prova enviada', primary: 'anthropic:claude-haiku-5-5', fallback: 'anthropic:claude-sonnet-5-5' },
  prova_analysis: { label: 'Analisar estilo da banca',            primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5' },
  prova_extract:  { label: 'Extrair questões reais da prova',     primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  review:         { label: 'Revisor: resolver questões sem o gabarito', primary: 'anthropic:claude-haiku-5-5', fallback: 'anthropic:claude-sonnet-5-5' },
  report_check:   { label: 'Verificar erro reportado por aluno',  primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5' },
  edital_parse:   { label: 'Extrair conteúdo programático do edital', primary: 'anthropic:claude-haiku-5-5', fallback: 'anthropic:claude-sonnet-5-5' },
  edital_match:   { label: 'Cruzar material de estudo com o edital',  primary: 'anthropic:claude-haiku-5-5', fallback: 'anthropic:claude-sonnet-5-5' },
  json_repair:    { label: 'Corrigir JSON malformado',            primary: 'anthropic:claude-haiku-5-5',  fallback: null },
};
const taskEnv = (t) => t.toUpperCase();
for (const [t, v] of Object.entries(AI_TASKS)) {
  v.primary = env(`AI_MODEL_${taskEnv(t)}`, v.primary);
  const fb = env(`AI_FALLBACK_${taskEnv(t)}`);
  if (fb !== undefined) v.fallback = fb === 'none' ? null : fb;
}

export const config = {
  env: env('NODE_ENV', 'development'),
  port: num('PORT', 3000),
  appUrl: env('APP_URL', 'http://localhost:3000').replace(/\/$/, ''),
  jwtSecret: env('JWT_SECRET'),
  databaseUrl: env('DATABASE_URL'),
  databaseSsl: bool('DATABASE_SSL', false),
  adminEmails: list('ADMIN_EMAILS'),

  // Cadastro: "open" (qualquer pessoa) ou "allowlist" (só e-mails em ALLOWED_EMAILS + admins)
  registrationMode: env('REGISTRATION_MODE', 'allowlist'),
  allowedEmails: list('ALLOWED_EMAILS'),

  smtp: {
    host: env('SMTP_HOST'),
    port: num('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    from: env('SMTP_FROM', 'HelpConcurso <nao-responda@helpconcurso.com.br>'),
  },
  s3: {
    bucket: env('S3_BUCKET', 'helpconcurso'),
    region: env('S3_REGION', 'us-east-1'),
    endpoint: env('S3_ENDPOINT'),
    accessKeyId: env('S3_ACCESS_KEY_ID'),
    secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
    forcePathStyle: bool('S3_FORCE_PATH_STYLE', !!env('S3_ENDPOINT')),
    createBucket: bool('S3_CREATE_BUCKET', false),
    disabled: bool('S3_DISABLED', false),
  },
  ai: {
    mock: bool('AI_MOCK', false),
    tasks: AI_TASKS,
    // "direct" = treino imediato; "batch" = modo lote (mais barato, resposta em minutos/horas). Cai para direct se o provedor não suportar.
    trainingMode: env('AI_TRAINING_MODE', 'direct'),
    maxRetries: num('AI_MAX_RETRIES', 3),
    timeoutMs: num('AI_TIMEOUT_MS', 240000),
    // Teto de gasto real com IA por dia (US$, dia de Brasília). 0 = sem limite. Ao atingir, novas chamadas são recusadas.
    limiteUsdDia: num('AI_LIMITE_USD_DIA', 0),
    keys: {
      anthropic: env('ANTHROPIC_API_KEY'),
      openai: env('OPENAI_API_KEY'), gemini: env('GEMINI_API_KEY'), groq: env('GROQ_API_KEY'),
      together: env('TOGETHER_API_KEY'), deepseek: env('DEEPSEEK_API_KEY'), compat: env('COMPAT_API_KEY'),
    },
    baseUrls: {
      openai: env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
      gemini: env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai'),
      groq: env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
      together: env('TOGETHER_BASE_URL', 'https://api.together.xyz/v1'),
      deepseek: env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
      compat: env('COMPAT_BASE_URL'),
    },
  },
  security: {
    uploadMaxMb: num('UPLOAD_MAX_MB', 25),
    maxPdfPages: num('MAX_PDF_PAGES', 300),
    maxOcrPagesMaterial: num('MAX_OCR_PAGES_MATERIAL', 30),
    maxOcrPagesProva: num('MAX_OCR_PAGES_PROVA', 60),
    maxTextChars: num('MAX_TEXT_CHARS', 600000),
    parseTimeoutMs: num('PARSE_TIMEOUT_MS', 60000),
    clamavHost: env('CLAMAV_HOST'),
    clamavPort: num('CLAMAV_PORT', 3310),
    clamavRequired: bool('CLAMAV_REQUIRED', false),
    blockedUploadsBeforeLock: num('BLOCKED_UPLOADS_BEFORE_LOCK', 3),
    // Provas de quem já teve N aprovações (e nenhuma recusa) entram sem revisão manual
    trustAutoApproveMin: num('TRUST_AUTO_APPROVE_MIN', 5),
  },
  quota: {
    generationsPerDay: num('QUOTA_GERACOES_DIA', 30),
    materialsPerDay: num('QUOTA_MATERIAIS_DIA', 40),
    provasPerDay: num('QUOTA_PROVAS_DIA', 20),
    bonusPerApprovedProva: num('BONUS_POR_PROVA_APROVADA', 5),
  },
  // Revisor automático: resolve cada questão sem ver o gabarito e descarta as divergentes/ambíguas
  review: {
    enabled: bool('REVISOR_ATIVO', true),
    regenerate: bool('REVISOR_REFAZER', true), // gera de novo as questões descartadas (1 rodada)
  },
  // Estrelas (gamificação). Só são dadas DEPOIS que a contribuição é verificada.
  stars: {
    provaAprovada: num('ESTRELAS_PROVA_APROVADA', 50),
    erroConfirmado: num('ESTRELAS_ERRO_CONFIRMADO', 10),
    avaliacao: num('ESTRELAS_AVALIACAO', 1),
    avaliacoesPorDia: num('ESTRELAS_AVALIACOES_DIA', 20), // teto diário de estrelas por avaliar questões
    porGeracao: num('ESTRELAS_POR_GERACAO', 10),          // custo para trocar estrelas por 1 geração extra
  },
};

export function assertConfig() {
  const missing = [];
  if (!config.jwtSecret || config.jwtSecret.length < 32) missing.push('JWT_SECRET (mín. 32 caracteres)');
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!['open', 'allowlist'].includes(config.registrationMode)) missing.push('REGISTRATION_MODE (open | allowlist)');
  if (!['direct', 'batch'].includes(config.ai.trainingMode)) missing.push('AI_TRAINING_MODE (direct | batch)');
  if (!config.ai.mock) {
    const used = new Set(Object.values(AI_TASKS).flatMap((t) => [t.primary, t.fallback]).filter(Boolean).map((s) => s.split(':')[0]));
    for (const p of used) {
      if (p === 'mock') continue;
      if (!(p in config.ai.keys)) missing.push(`provedor de IA desconhecido: "${p}"`);
      else if (!config.ai.keys[p] && AI_TASKS && Object.values(AI_TASKS).some((t) => t.primary.startsWith(p + ':'))) missing.push(`${p.toUpperCase()}_API_KEY (ou AI_MOCK=true)`);
    }
    if (config.ai.keys.compat === undefined && [...used].includes('compat') && !config.ai.baseUrls.compat) missing.push('COMPAT_BASE_URL');
  }
  if (missing.length) {
    console.error('\n[config] Configuração inválida:\n  - ' + [...new Set(missing)].join('\n  - ') + '\nCopie .env.example para .env e preencha.\n');
    process.exit(1);
  }
  if (!config.smtp.host) console.warn('[config] SMTP_HOST vazio: os e-mails serão apenas impressos no console.');
  if (config.registrationMode === 'allowlist') console.log(`[config] cadastro restrito: ${[...config.adminEmails, ...config.allowedEmails].length} e-mail(s) liberado(s)`);
}
