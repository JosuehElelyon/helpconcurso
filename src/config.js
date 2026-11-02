// Configuração central — todas as variáveis vêm do ambiente (.env). Veja .env.example.
const env = (k, d = undefined) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);
const bool = (k, d = false) => { const v = env(k); return v === undefined ? d : /^(1|true|yes|sim)$/i.test(v); };
const num = (k, d) => { const v = Number(env(k, d)); return Number.isFinite(v) ? v : d; };
const list = (k, d = '') => env(k, d).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// ---------- IA: qual provedor/modelo faz cada tarefa ----------
// Formato: "provedor:modelo" (no fallback pode listar vários separados por vírgula: "groq:llama-3.3-70b-versatile,gemini:gemini-2.5-flash").
// Provedores disponíveis: anthropic, fcc, nvidia, openrouter, gemini, groq, cerebras, sambanova, mistral, huggingface, ollama, openai, together, deepseek, compat, mock
export const FREE_AGENT_CATALOG = [
  { provider: 'fcc',         fast: env('FCC_FAST_MODEL', 'claude-haiku-4-5'),        strong: env('FCC_STRONG_MODEL', 'claude-sonnet-4-5'),                label: 'Free Claude Code Proxy (FCC)' },
  { provider: 'nvidia',      fast: 'meta/llama-3.3-70b-instruct',                    strong: 'nvidia/llama-3.3-nemotron-super-49b-v1',                    label: 'NVIDIA NIM (Gratuito)' },
  { provider: 'gemini',      fast: env('GEMINI_FAST_MODEL', 'gemini-3.5-flash-lite'), strong: env('GEMINI_STRONG_MODEL', 'gemini-3.5-flash'), label: 'Google Gemini AI Studio (Gratuito)' },
  { provider: 'groq',        fast: env('GROQ_FAST_MODEL', 'openai/gpt-oss-20b'),     strong: env('GROQ_STRONG_MODEL', 'openai/gpt-oss-120b'),             label: 'Groq LPU (Gratuito)' },
  { provider: 'cerebras',    fast: 'llama-3.3-70b',                                  strong: 'llama-3.3-70b',                                             label: 'Cerebras Wafer-Scale (Gratuito)' },
  { provider: 'sambanova',   fast: 'Meta-Llama-3.3-70B-Instruct',                    strong: 'DeepSeek-V3-0324',                                          label: 'SambaNova Cloud (Gratuito)' },
  { provider: 'openrouter',  fast: 'openrouter/free',                                strong: 'openrouter/free',                                           label: 'OpenRouter Free (Gratuito)' },
  { provider: 'mistral',     fast: 'mistral-small-latest',                           strong: 'mistral-small-latest',                                      label: 'Mistral (Gratuito)' },
  { provider: 'huggingface', fast: 'Qwen/Qwen2.5-72B-Instruct',                      strong: 'Qwen/Qwen2.5-72B-Instruct',                                 label: 'Hugging Face (Gratuito)' },
  { provider: 'ollama',      fast: env('OLLAMA_MODEL', 'qwen2.5:14b'),               strong: env('OLLAMA_MODEL', 'qwen2.5:14b'),                          label: 'Ollama Local (Gratuito)' },
];

// dados: 'aluno' = conteúdo privado do aluno → só provedores de AI_PROVEDORES_PRIVADOS (padrão: anthropic, que não treina
//        com dados da API); 'publico' = provas e editais (documentos públicos) → pode usar a cascata grátis.
// pagoPrimeiro: o modelo pago vem antes dos grátis (tarefa em que a qualidade compensa o custo).
// Estratégia de custo (docs/PLANO-ACAO.md): o modelo barato escreve (Haiku gera), o forte confere (Sonnet revisa) —
// a saída longa sai barata e o juiz é mais forte que o autor.
export const AI_TASKS = {
  detect:         { label: 'Identificar matéria do material',           dados: 'aluno',   tier: 'fast',   preferred: ['groq', 'gemini', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  generate:       { label: 'Gerar questões',                            dados: 'aluno',   tier: 'strong', preferred: ['gemini', 'groq', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  // Nível Difícil/Misto: no benchmark com juiz, Haiku 58 × Sonnet 80 no Difícil (empate no Médio: 68 × 67) — docs/BENCHMARK-*.md
  generate_dificil: { label: 'Gerar questões (nível Difícil/Misto)',  dados: 'aluno',   tier: 'strong', preferred: ['gemini', 'groq', 'openrouter'], primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5' },
  ocr:            { label: 'Ler PDF escaneado (OCR)',                   dados: 'aluno',   tier: 'fast',   preferred: [],                               primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  prova_check:    { label: 'Checagem automática de prova enviada',      dados: 'publico', tier: 'fast',   preferred: ['groq', 'gemini', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  prova_analysis: { label: 'Analisar estilo da banca',                  dados: 'publico', tier: 'strong', preferred: ['gemini', 'groq', 'openrouter'], primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5', pagoPrimeiro: true },
  prova_extract:  { label: 'Extrair questões reais da prova',           dados: 'publico', tier: 'strong', preferred: ['gemini', 'groq', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  review:         { label: 'Revisor: resolver questões sem o gabarito', dados: 'aluno',   tier: 'strong', preferred: ['groq', 'gemini', 'openrouter'], primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5' },
  report_check:   { label: 'Verificar erro reportado por aluno',        dados: 'aluno',   tier: 'strong', preferred: ['groq', 'gemini', 'openrouter'], primary: 'anthropic:claude-sonnet-5-5', fallback: 'anthropic:claude-haiku-5-5' },
  edital_parse:   { label: 'Extrair conteúdo programático do edital',   dados: 'publico', tier: 'fast',   preferred: ['gemini', 'groq', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  edital_match:   { label: 'Cruzar material de estudo com o edital',    dados: 'aluno',   tier: 'fast',   preferred: ['gemini', 'groq', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: 'anthropic:claude-sonnet-5-5' },
  // json_repair herda a classificação da tarefa que gerou o JSON (runJSON passa "dados")
  json_repair:    { label: 'Corrigir JSON malformado',                  dados: 'aluno',   tier: 'fast',   preferred: ['groq', 'gemini', 'openrouter'], primary: 'anthropic:claude-haiku-5-5',  fallback: null },
};
const taskEnv = (t) => t.toUpperCase();
for (const [t, v] of Object.entries(AI_TASKS)) {
  const customPrimary = env(`AI_MODEL_${taskEnv(t)}`);
  v.explicitPrimary = customPrimary !== undefined;
  if (customPrimary !== undefined) v.primary = customPrimary;
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
    freeCatalog: FREE_AGENT_CATALOG,
    // Quando true, prioriza provedores gratuitos configurados (FCC, NVIDIA NIM, Gemini, Groq, Cerebras, SambaNova, OpenRouter...)
    // em cascata multi-agente antes de acionar modelos pagos (Anthropic/OpenAI).
    // Desligado por padrão: ligar é uma decisão explícita (os dados vão para provedores de cota grátis).
    freeCascade: bool('AI_FREE_CASCADE', false),
    // Quando true, também usa a cascata gratuita nas tarefas pesadas (geração/análise) antes de cair para o modelo pago.
    freeGenerate: bool('AI_FREE_GENERATE', false),
    // Provedores cuja conta é de cota grátis (custo 0 no painel e no limite diário). Ex.: AI_PROVEDORES_GRATIS=groq,gemini
    freeProviders: list('AI_PROVEDORES_GRATIS'),
    // Provedores autorizados a receber conteúdo do aluno (tarefas dados='aluno'). Ex.: adicionar gemini se ativar o faturamento no Google.
    privateProviders: list('AI_PROVEDORES_PRIVADOS', 'anthropic'),
    // "direct" = treino imediato; "batch" = modo lote (mais barato, resposta em minutos/horas). Cai para direct se o provedor não suportar.
    trainingMode: env('AI_TRAINING_MODE', 'direct'),
    maxRetries: num('AI_MAX_RETRIES', 3),
    timeoutMs: num('AI_TIMEOUT_MS', 240000),
    // Teto de gasto real com IA por dia (US$, dia de Brasília). 0 = sem limite. Ao atingir, novas chamadas são recusadas.
    limiteUsdDia: num('AI_LIMITE_USD_DIA', 0),
    keys: {
      anthropic: env('ANTHROPIC_API_KEY'),
      // FCC depende de um programa aberto no Windows: só em desenvolvimento, e só se ligado
      fcc: bool('FCC_ENABLED', false) && env('NODE_ENV', 'development') !== 'production' ? env('FCC_API_KEY', 'freecc') : undefined,
      nvidia: env('NVIDIA_API_KEY') || env('NVIDIA_NIM_API_KEY'),
      openrouter: env('OPENROUTER_API_KEY'),
      gemini: env('GEMINI_API_KEY'),
      groq: env('GROQ_API_KEY'),
      cerebras: env('CEREBRAS_API_KEY'),
      sambanova: env('SAMBANOVA_API_KEY'),
      mistral: env('MISTRAL_API_KEY'),
      huggingface: env('HUGGINGFACE_API_KEY'),
      ollama: env('OLLAMA_API_KEY', bool('OLLAMA_ENABLED', false) ? 'ollama' : undefined),
      openai: env('OPENAI_API_KEY'),
      together: env('TOGETHER_API_KEY'),
      deepseek: env('DEEPSEEK_API_KEY'),
      compat: env('COMPAT_API_KEY'),
    },
    baseUrls: {
      fcc: env('FCC_BASE_URL', 'http://localhost:8082'),
      nvidia: env('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
      openrouter: env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      gemini: env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai'),
      groq: env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
      cerebras: env('CEREBRAS_BASE_URL', 'https://api.cerebras.ai/v1'),
      sambanova: env('SAMBANOVA_BASE_URL', 'https://api.sambanova.ai/v1'),
      mistral: env('MISTRAL_BASE_URL', 'https://api.mistral.ai/v1'),
      huggingface: env('HUGGINGFACE_BASE_URL', 'https://router.huggingface.co/v1'),
      ollama: env('OLLAMA_BASE_URL', 'http://localhost:11434/v1'),
      openai: env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
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
    const splitSpecs = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);
    const used = new Set(Object.values(AI_TASKS).flatMap((t) => [...splitSpecs(t.primary), ...splitSpecs(t.fallback)]).map((s) => s.split(':')[0]));
    const anyFreeConfigured = FREE_AGENT_CATALOG.some((a) => !!config.ai.keys[a.provider]);
    for (const p of used) {
      if (p === 'mock') continue;
      if (!(p in config.ai.keys)) missing.push(`provedor de IA desconhecido: "${p}"`);
      else if (!config.ai.keys[p]) {
        const explicitlyPrimary = Object.values(AI_TASKS).some((t) => t.explicitPrimary && t.primary.startsWith(p + ':'));
        const defaultPrimary = Object.values(AI_TASKS).some((t) => !t.explicitPrimary && t.primary.startsWith(p + ':'));
        if (explicitlyPrimary || (defaultPrimary && !(config.ai.freeCascade && anyFreeConfigured))) {
          missing.push(`${p.toUpperCase()}_API_KEY (ou configure um provedor gratuito / AI_MOCK=true)`);
        }
      }
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
