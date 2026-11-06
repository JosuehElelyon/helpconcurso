// Termos de Uso e Política de Privacidade (LGPD — Lei 13.709/2018), servidos em GET /api/v1/termos.
//
// A lista de operadores (fornecedores que tratam dados) é MONTADA DA CONFIGURAÇÃO REAL: só aparece quem está configurado,
// com as tarefas e o tipo de dado que de fato recebe (AI_TASKS[*].dados + AI_PROVEDORES_PRIVADOS). Assim o texto não
// diverge do sistema. A versão inclui um resumo dos operadores: mudou o fornecedor → muda a versão → o aluno aceita de novo.
//
// ⚠️ Texto a ser revisado por advogado antes de abrir para o público. Só afirme o que os termos de cada fornecedor garantem.
import crypto from 'node:crypto';
import { config, AI_TASKS } from '../config.js';

const BASE_VERSAO = '2026-11-05';
const env = (k, d) => (process.env[k] ? process.env[k] : d);

// Fornecedores de IA conhecidos: nome jurídico/comercial e onde o tratamento ocorre
const EMPRESAS = {
  anthropic: { nome: 'Anthropic, PBC', pais: 'Estados Unidos' },
  gemini: { nome: 'Google LLC (API Gemini)', pais: 'Estados Unidos' },
  groq: { nome: 'Groq, Inc.', pais: 'Estados Unidos' },
  openrouter: { nome: 'OpenRouter, Inc. (encaminha a modelos de terceiros)', pais: 'Estados Unidos' },
  nvidia: { nome: 'NVIDIA Corporation (NIM)', pais: 'Estados Unidos' },
  cerebras: { nome: 'Cerebras Systems Inc.', pais: 'Estados Unidos' },
  sambanova: { nome: 'SambaNova Systems, Inc.', pais: 'Estados Unidos' },
  mistral: { nome: 'Mistral AI', pais: 'França' },
  huggingface: { nome: 'Hugging Face, Inc.', pais: 'Estados Unidos' },
};
const LOCAIS = new Set(['fcc', 'ollama', 'mock']); // rodam na própria máquina (desenvolvimento): não são operadores

const provedorDe = (spec) => String(spec || '').split(',')[0].trim().split(':')[0];
const modeloDe = (spec) => String(spec || '').split(',').map((s) => s.trim().split(':').slice(1).join(':')).filter(Boolean);

/** Operadores de IA efetivamente configurados, com as tarefas e o tipo de dado que cada um recebe. */
export function operadoresDeIA() {
  const porProvedor = new Map();
  const add = (p, tarefa, modelo) => {
    if (!p || LOCAIS.has(p) || !config.ai.keys[p]) return;
    const o = porProvedor.get(p) || { provedor: p, tarefasAluno: new Set(), tarefasPublicas: new Set(), modelos: new Set() };
    (tarefa.dados === 'aluno' ? o.tarefasAluno : o.tarefasPublicas).add(tarefa.label);
    if (modelo) o.modelos.add(modelo);
    porProvedor.set(p, o);
  };
  for (const t of Object.values(AI_TASKS)) {
    for (const spec of [t.primary, t.fallback]) for (const m of modeloDe(spec)) add(provedorDe(spec), t, m);
    // Cascata de cota grátis: só para dado público, salvo provedor autorizado em AI_PROVEDORES_PRIVADOS
    if (config.ai.freeCascade) {
      for (const p of t.preferred || []) {
        if (t.dados === 'aluno' && !config.ai.privateProviders.includes(p)) continue;
        const cat = config.ai.freeCatalog.find((a) => a.provider === p);
        add(p, t, cat?.[t.tier]);
      }
    }
  }
  return [...porProvedor.values()].map((o) => {
    const emp = EMPRESAS[o.provedor] || { nome: o.provedor, pais: 'exterior' };
    const recebeMaterial = o.tarefasAluno.size > 0;
    const cotaGratis = config.ai.freeProviders.includes(o.provedor);
    let privacidade;
    if (o.provedor === 'anthropic') {
      privacidade = 'Pelos termos comerciais da API da Anthropic, o conteúdo enviado não é usado para treinar os modelos. O fornecedor pode guardá-lo por prazo limitado (segurança e prevenção de abuso), conforme a política dele.';
    } else if (cotaGratis && !recebeMaterial) {
      privacidade = 'Usado na cota gratuita do fornecedor, cujos termos podem permitir o uso do conteúdo para melhorar os produtos dele. Por isso recebe apenas documentos públicos (provas e editais), nunca o seu material de estudo.';
    } else {
      privacidade = 'Tratamento conforme a política de privacidade do fornecedor.' + (recebeMaterial ? '' : ' Recebe apenas documentos públicos (provas e editais), nunca o seu material de estudo.');
    }
    return {
      fornecedor: emp.nome,
      pais: emp.pais,
      modelos: [...o.modelos],
      recebe: recebeMaterial ? 'Seu material de estudo e respostas (e também documentos públicos)' : 'Apenas documentos públicos (provas e editais)',
      tarefas: [...o.tarefasAluno, ...o.tarefasPublicas],
      privacidade,
    };
  });
}

/** Demais operadores (e-mail, armazenamento, hospedagem, túnel) conforme a configuração. */
export function operadoresDeInfraestrutura() {
  const out = [];
  const smtp = String(config.smtp.host || '');
  if (smtp && !/mailpit|localhost|127\.0\.0\.1/.test(smtp)) {
    out.push({ fornecedor: /brevo|sendinblue/i.test(smtp) ? 'Brevo (Sendinblue SAS)' : `Provedor de e-mail (${smtp})`, pais: /brevo|sendinblue/i.test(smtp) ? 'França' : 'a confirmar',
      finalidade: 'Envio de e-mails da conta (código de confirmação, recuperação de senha, avisos)', dados: 'Nome e e-mail' });
  }
  const s3 = String(config.s3.endpoint || '');
  if (!config.s3.disabled && s3 && !/minio|localhost|127\.0\.0\.1|seaweed/.test(s3)) {
    const r2 = /cloudflarestorage/.test(s3), aws = /amazonaws/.test(s3);
    out.push({ fornecedor: r2 ? 'Cloudflare, Inc. (R2)' : aws ? 'Amazon Web Services (S3)' : `Armazenamento de arquivos (${new URL(s3).host})`, pais: 'Estados Unidos',
      finalidade: 'Guarda dos arquivos enviados (materiais, editais, provas, foto de perfil)', dados: 'Arquivos enviados' });
  }
  const hospedagem = env('LGPD_HOSPEDAGEM', '');
  if (hospedagem) out.push({ fornecedor: hospedagem, pais: env('LGPD_HOSPEDAGEM_PAIS', 'a confirmar'), finalidade: 'Hospedagem da aplicação e do banco de dados', dados: 'Todos os dados da plataforma' });
  if (process.env.CLOUDFLARE_TUNNEL_TOKEN) out.push({ fornecedor: 'Cloudflare, Inc. (túnel HTTPS)', pais: 'Estados Unidos', finalidade: 'Acesso seguro pela internet', dados: 'Tráfego da navegação (criptografado)' });
  return out;
}

function versaoAtual(ia, infra) {
  const assinatura = JSON.stringify([ia.map((o) => [o.fornecedor, o.recebe]), infra.map((o) => o.fornecedor)]);
  return `${BASE_VERSAO}.${crypto.createHash('sha256').update(assinatura).digest('hex').slice(0, 8)}`;
}

/** Versão vigente (o front compara com users.termos_versao para pedir novo aceite). */
export const versaoDosTermos = () => versaoAtual(operadoresDeIA(), operadoresDeInfraestrutura());

export function obterTermosEPrivacidade() {
  const ia = operadoresDeIA();
  const infra = operadoresDeInfraestrutura();
  const contato = env('LGPD_CONTATO', (String(config.smtp.from).match(/<([^>]+)>/) || [])[1] || config.adminEmails[0] || '');
  const exterior = [...new Set([...ia, ...infra].map((o) => o.pais).filter((p) => p && p !== 'Brasil' && p !== 'a confirmar'))];

  return {
    versao: versaoAtual(ia, infra),
    atualizadoEm: BASE_VERSAO,
    controlador: { nome: env('LGPD_CONTROLADOR', 'HelpConcurso'), contato },
    encarregado: { nome: env('LGPD_ENCARREGADO', 'Responsável pelo HelpConcurso'), contato },
    operadoresIA: ia,
    operadoresInfra: infra,
    secoes: [
      { titulo: 'Quais dados tratamos', itens: [
        'Cadastro: nome, e-mail, senha (guardada só como hash bcrypt), telefone, concurso-alvo, data da prova e foto de perfil (opcionais).',
        'Estudo: materiais e editais que você envia, simulados, respostas, tempo de resolução, cadernos, favoritas e anotações.',
        'Uso: registros de acesso e de uso da IA (para segurança, limites do plano e controle de custo).',
      ] },
      { titulo: 'Para que usamos e com qual base legal', itens: [
        'Prestar o serviço que você contratou — gerar questões, corrigir, acompanhar seu desempenho (execução de contrato, art. 7º, V).',
        'Segurança da conta e da plataforma, prevenção de fraude e abuso (legítimo interesse, art. 7º, IX).',
        'Cumprir obrigações legais e atender pedidos de autoridades (art. 7º, II).',
      ] },
      { titulo: 'O que é compartilhado com outros alunos', itens: [
        'Provas de concursos que você envia entram na base COMPARTILHADA de provas (são documentos públicos) e ajudam todos os alunos. Se você excluir sua conta, a prova continua na base, sem o seu nome.',
        'Explicações do "Por que errei?" ficam guardadas por questão e podem ser mostradas a outro aluno que errar a mesma questão. Elas não contêm seus dados pessoais.',
        'Seus materiais de estudo, respostas, anotações e desempenho NÃO são mostrados a outros alunos.',
      ] },
      { titulo: 'Inteligência artificial', paragrafos: [
        'O seu material de estudo só é enviado aos fornecedores de IA autorizados para conteúdo do aluno (lista abaixo, "recebe: seu material"). Documentos públicos (provas e editais) podem ser processados por outros fornecedores, inclusive em cota gratuita.',
      ] },
      { titulo: 'Transferência internacional', paragrafos: [
        exterior.length
          ? `Parte do tratamento ocorre fora do Brasil (${exterior.join(', ')}), por fornecedores que prestam o serviço para nós (art. 33 da LGPD).`
          : 'Na configuração atual, não há fornecedor fora do Brasil cadastrado.',
      ] },
      { titulo: 'Por quanto tempo guardamos', itens: [
        'Enquanto sua conta existir. Ao excluir a conta, apagamos cadastro, materiais, editais, simulados, cadernos, atividade e arquivos.',
        'Registros de segurança e de uso da IA permanecem sem identificação da sua conta, para estatística e prevenção de abuso.',
      ] },
      { titulo: 'Seus direitos (art. 18 da LGPD) e como exercê-los', itens: [
        'Acessar e corrigir seus dados: tela "Minha conta".',
        'Portabilidade: botão "Baixar meus dados" em "Minha conta" (arquivo JSON).',
        'Eliminação: botão "Excluir minha conta" em "Minha conta" (pede a senha; não tem volta).',
        `Confirmação de tratamento, informações sobre compartilhamento, revisão de decisões automatizadas e outros pedidos: escreva para ${contato || 'o contato do HelpConcurso'}. Respondemos em até 15 dias.`,
      ] },
      { titulo: 'Segurança', itens: [
        'Conexão protegida por HTTPS no endereço público (TLS).',
        'Senha guardada apenas como hash (bcrypt); sessão em cookie httpOnly assinado, derrubada em todos os aparelhos quando você troca a senha.',
        'Arquivos enviados passam por varredura de segurança; a foto de perfil perde metadados (EXIF e localização).',
      ] },
      { titulo: 'Cookies', paragrafos: ['Usamos apenas o cookie essencial de sessão (hc_session), necessário para você continuar conectado. Não usamos cookies de publicidade.'] },
      { titulo: 'Mudanças nestes termos', paragrafos: ['Quando estes termos mudarem (por exemplo, um novo fornecedor), pediremos o seu aceite de novo ao entrar.'] },
    ],
  };
}
