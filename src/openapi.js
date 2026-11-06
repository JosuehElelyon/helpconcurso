// Contrato da API REST v1 (OpenAPI 3.1), servido em GET /api/v1/openapi.json.
// Fonte única: cada rota montada em src/routes/index.js precisa estar aqui (test/contrato.test.js confere nos dois
// sentidos). Ao criar/remover rota, atualize a tabela ROTAS.
//
// Autenticação: cookie de sessão "hc_session" (httpOnly, SameSite=Lax) emitido por /auth/login, /auth/verify e
// /auth/reset. Erros sempre no formato { "error": "mensagem" } (+ campos extras em alguns casos).

const ALUNO = 'aluno', ADMIN = 'admin', PUBLICO = 'publico';
const JSON_ = 'json', ARQUIVO = 'multipart', FLUXO = 'ndjson';

const str = (extra = {}) => ({ type: 'string', ...extra });
const uuid = str({ format: 'uuid' });
const obj = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const LETRA = str({ enum: ['A', 'B', 'C', 'D', 'E'] });

// Corpos de requisição documentados em detalhe (as demais rotas JSON aceitam o objeto descrito no resumo)
const CORPOS = {
  login: obj({ email: str({ format: 'email' }), password: str() }, ['email', 'password']),
  register: obj({ name: str({ minLength: 2, maxLength: 80 }), email: str({ format: 'email' }), password: str({ minLength: 8, maxLength: 200 }), aceitouTermos: { type: 'boolean', const: true, description: 'Aceite dos termos vigentes (GET /termos)' } }, ['name', 'email', 'password', 'aceitouTermos']),
  excluirConta: obj({ senha: str(), confirmacao: str({ const: 'EXCLUIR' }) }, ['senha', 'confirmacao']),
  verify: obj({ email: str({ format: 'email' }), code: str({ pattern: '^\\d{6}$' }) }, ['email', 'code']),
  reset: obj({ email: str({ format: 'email' }), code: str({ pattern: '^\\d{6}$' }), password: str({ minLength: 8 }) }, ['email', 'code', 'password']),
  email: obj({ email: str({ format: 'email' }) }, ['email']),
  gerar: obj({
    materialId: uuid, materia: str({ minLength: 2, maxLength: 80 }), assunto: str({ maxLength: 120 }),
    banca: str({ description: 'Chave da banca (GET /bancas)' }), qtd: { type: 'integer', minimum: 1, maximum: 20 },
    nivel: str({ enum: ['Fácil', 'Médio', 'Difícil', 'Misto'] }), cadernoId: { ...uuid, nullable: true },
  }, ['materialId', 'materia', 'banca', 'qtd', 'nivel']),
  revanche: obj({
    setId: uuid, indices: { type: 'array', items: { type: 'integer', minimum: 0 }, maxItems: 50 },
    cadernoId: uuid, keys: { type: 'array', items: str({ description: 'set:<id>:<i> ou extra:<id>' }), maxItems: 5 },
    editalId: uuid, banca: str(), materia: str({ maxLength: 100 }), assunto: str({ maxLength: 150 }), qtd: { type: 'integer', minimum: 1, maximum: 10 },
  }),
  respostas: obj({
    respostas: { type: 'object', additionalProperties: LETRA, description: 'índice da questão → letra' },
    finalizado: { type: 'boolean' }, tempoGastoSegundos: { type: 'integer', minimum: 0 },
    duvidas: { type: 'array', items: { type: 'integer', minimum: 0 } },
  }),
  porQueErrei: obj({ resposta: str({ description: 'Letra marcada (C/E ou A–E); a resposta gravada prevalece' }) }),
  porQueErreiCaderno: obj({ key: str({ maxLength: 120 }), resposta: str({ maxLength: 10 }) }, ['key']),
};

// [método, caminho, módulo, resumo, autenticação, formato do corpo, corpo detalhado]
const ROTAS = [
  ['get', '/health', 'Sistema', 'Saúde da API e do banco', PUBLICO],
  ['get', '/openapi.json', 'Sistema', 'Este contrato', PUBLICO],
  ['get', '/termos', 'Sistema', 'Termos de uso e política de privacidade (LGPD)', PUBLICO],

  ['get', '/auth/me', 'Contas', 'Usuário da sessão (ou null)', PUBLICO],
  ['post', '/auth/register', 'Contas', 'Cadastro (convidados); envia código por e-mail', PUBLICO, JSON_, 'register'],
  ['post', '/auth/verify', 'Contas', 'Confirma o e-mail com o código e abre a sessão', PUBLICO, JSON_, 'verify'],
  ['post', '/auth/resend', 'Contas', 'Reenvia o código de confirmação', PUBLICO, JSON_, 'email'],
  ['post', '/auth/login', 'Contas', 'Entrar', PUBLICO, JSON_, 'login'],
  ['post', '/auth/forgot', 'Contas', 'Pede código para redefinir a senha', PUBLICO, JSON_, 'email'],
  ['post', '/auth/reset', 'Contas', 'Redefine a senha com o código', PUBLICO, JSON_, 'reset'],
  ['post', '/auth/logout', 'Contas', 'Sair', PUBLICO],

  ['get', '/users/{id}/avatar', 'Contas', 'Foto de perfil (imagem)', PUBLICO],

  ['post', '/materials', 'Materiais', 'Envia material de estudo (PDF, DOCX, DOC, TXT ou texto) e identifica a matéria', ALUNO, ARQUIVO],
  ['post', '/materials/{id}/edital', 'Materiais', 'Cruza o material com um edital ({ editalId })', ALUNO, JSON_],
  ['get', '/materials', 'Materiais', 'Lista os materiais do aluno', ALUNO],
  ['delete', '/materials/{id}', 'Materiais', 'Exclui material', ALUNO],

  ['get', '/sets/cota', 'Simulados', 'Cota de gerações do dia', ALUNO],
  ['post', '/sets', 'Simulados', 'Gera simulado no estilo da banca (resposta em fluxo NDJSON: progress, stage, done | error)', ALUNO, JSON_, 'gerar', FLUXO],
  ['post', '/sets/revanche', 'Simulados', 'Bateria de Revanche a partir das questões erradas (fluxo NDJSON)', ALUNO, JSON_, 'revanche', FLUXO],
  ['get', '/sets', 'Simulados', 'Lista os simulados (até 300)', ALUNO],
  ['get', '/sets/{id}', 'Simulados', 'Detalhe do simulado', ALUNO],
  ['patch', '/sets/{id}', 'Simulados', 'Salva respostas, tempo e dúvidas; finaliza e pontua', ALUNO, JSON_, 'respostas'],
  ['get', '/sets/{id}/feedback', 'Simulados', 'Avaliações e reportes do aluno neste simulado', ALUNO],
  ['post', '/sets/{id}/questoes/{i}/avaliar', 'Simulados', 'Avalia a questão ({ rating: 1 | -1 | 0 })', ALUNO, JSON_],
  ['post', '/sets/{id}/questoes/{i}/reportar', 'Simulados', 'Reporta erro na questão ({ motivo }); verificado por IA', ALUNO, JSON_],
  ['post', '/sets/{id}/questoes/{i}/por-que-errei', 'Simulados', '"Por que errei?" — explicação do erro (cache global; limite diário por plano)', ALUNO, JSON_, 'porQueErrei'],
  ['delete', '/sets/{id}', 'Simulados', 'Exclui simulado', ALUNO],

  ['post', '/provas', 'Provas', 'Envia prova antiga (arquivo ou link oficial) para a base compartilhada', ALUNO, ARQUIVO],
  ['post', '/provas/{id}/edital', 'Provas', 'Vincula edital à prova', ALUNO, ARQUIVO],
  ['get', '/provas/minhas', 'Provas', 'Provas enviadas pelo aluno', ALUNO],

  ['get', '/bancas', 'Bancas', 'Bancas suportadas e níveis', ALUNO],

  ['get', '/admin/provas', 'Admin', 'Base de provas (filtros por situação)', ADMIN],
  ['get', '/admin/provas/{id}', 'Admin', 'Detalhe da prova', ADMIN],
  ['post', '/admin/provas/{id}/aprovar', 'Admin', 'Aprova a prova', ADMIN, JSON_],
  ['post', '/admin/provas/{id}/recusar', 'Admin', 'Recusa a prova', ADMIN, JSON_],
  ['post', '/admin/provas/{id}/reprocessar', 'Admin', 'Reprocessa a prova', ADMIN],
  ['post', '/admin/provas/rotular', 'Admin', 'Enfileira rotulagem de provas antigas', ADMIN, JSON_],
  ['get', '/admin/pedidos', 'Admin', 'Pedidos de plano', ADMIN],
  ['post', '/admin/pedidos/{pid}/{acao}', 'Admin', 'Aprova ou recusa pedido de plano', ADMIN],
  ['get', '/admin/divergencias', 'Admin', 'Questões com gabarito divergente entre extrações', ADMIN],
  ['post', '/admin/questoes/{qid}/gabarito', 'Admin', 'Define o gabarito de uma questão divergente', ADMIN, JSON_],
  ['post', '/admin/provas/lote', 'Admin', 'Importa provas em lote por links oficiais (até 50)', ADMIN, JSON_],
  ['post', '/admin/provas/{id}/gabarito-definitivo', 'Admin', 'Aplica gabarito definitivo (link, arquivo ou texto; prévia antes de confirmar)', ADMIN, ARQUIVO],
  ['get', '/admin/provas/{id}/questoes', 'Admin', 'Questões extraídas da prova', ADMIN],
  ['get', '/admin/provas/{id}/arquivo', 'Admin', 'Baixa o arquivo original', ADMIN],
  ['delete', '/admin/provas/{id}', 'Admin', 'Exclui prova', ADMIN],
  ['get', '/admin/seguranca', 'Admin', 'Eventos de segurança', ADMIN],
  ['get', '/admin/ia', 'Admin', 'Uso e custo de IA', ADMIN],

  ['get', '/me/estrelas', 'Minha conta', 'Estrelas e nível', ALUNO],
  ['post', '/me/estrelas/trocar', 'Minha conta', 'Troca estrelas por gerações ({ geracoes })', ALUNO, JSON_],
  ['get', '/me/hoje', 'Minha conta', 'Tela "Hoje": meta, sequência, revisões e tópicos fracos', ALUNO],
  ['get', '/me/desempenho', 'Minha conta', 'Radar de desempenho (?editalId=)', ALUNO],
  ['get', '/me/conta', 'Minha conta', 'Perfil, plano e uso', ALUNO],
  ['patch', '/me/conta', 'Minha conta', 'Atualiza o perfil', ALUNO, JSON_],
  ['post', '/me/conta/senha', 'Minha conta', 'Troca a senha ({ senhaAtual, novaSenha })', ALUNO, JSON_],
  ['get', '/me/avatar/presets', 'Minha conta', 'Galeria de avatares', ALUNO],
  ['patch', '/me/avatar/preset', 'Minha conta', 'Escolhe avatar da galeria', ALUNO, JSON_],
  ['post', '/me/avatar', 'Minha conta', 'Envia foto (metadados removidos)', ALUNO, ARQUIVO],
  ['delete', '/me/avatar', 'Minha conta', 'Remove a foto', ALUNO],
  ['get', '/me/planos', 'Minha conta', 'Catálogo de planos', ALUNO],
  ['post', '/me/conta/upgrade', 'Minha conta', 'Pede upgrade de plano', ALUNO, JSON_],
  ['delete', '/me/conta/upgrade', 'Minha conta', 'Cancela o pedido de upgrade', ALUNO],
  ['post', '/me/termos/aceite', 'Minha conta', 'Registra o aceite da versão vigente dos termos (LGPD)', ALUNO],
  ['get', '/me/exportar', 'Minha conta', 'Portabilidade: baixa todos os dados pessoais em JSON (LGPD art. 18, V)', ALUNO],
  ['delete', '/me/conta', 'Minha conta', 'Eliminação: exclui a conta e os dados (pede a senha e "EXCLUIR")', ALUNO, JSON_, 'excluirConta'],

  ['get', '/editais', 'Editais', 'Lista os editais do aluno', ALUNO],
  ['get', '/editais/{id}', 'Editais', 'Edital verticalizado com painel de avanço', ALUNO],
  ['post', '/editais', 'Editais', 'Envia edital (arquivo, texto ou link oficial)', ALUNO, ARQUIVO],
  ['post', '/editais/{id}/ativar', 'Editais', 'Define o edital ativo', ALUNO],
  ['get', '/editais/{id}/topicos/{topicoId}/questoes-reais', 'Editais', 'Questões reais da banca para o tópico', ALUNO],
  ['post', '/editais/{id}/topicos/{topicoId}/praticar-reais', 'Editais', 'Cria simulado com questões reais do tópico', ALUNO, JSON_],
  ['post', '/editais/{id}/simulado-prova-real', 'Editais', 'Simulado no formato da prova real (ponderado pelo edital)', ALUNO, JSON_],
  ['delete', '/editais/{id}', 'Editais', 'Exclui edital', ALUNO],

  ['get', '/cadernos', 'Cadernos', 'Lista os cadernos', ALUNO],
  ['post', '/cadernos', 'Cadernos', 'Cria caderno', ALUNO, JSON_],
  ['get', '/cadernos/{id}', 'Cadernos', 'Detalhe do caderno (questões, revisão espaçada)', ALUNO],
  ['post', '/cadernos/{id}/alimentar-material', 'Cadernos', 'Adiciona material ao caderno', ALUNO, JSON_],
  ['post', '/cadernos/{id}/alimentar-prova', 'Cadernos', 'Adiciona prova antiga ao caderno', ALUNO, ARQUIVO],
  ['post', '/cadernos/{id}/vincular-simulado', 'Cadernos', 'Vincula simulado ao caderno ({ setId })', ALUNO, JSON_],
  ['patch', '/cadernos/{id}/interagir', 'Cadernos', 'Responde, favorita, anota ou refaz questões', ALUNO, JSON_],
  ['post', '/cadernos/{id}/questoes/por-que-errei', 'Cadernos', '"Por que errei?" de uma questão do caderno', ALUNO, JSON_, 'porQueErreiCaderno'],
  ['delete', '/cadernos/{id}', 'Cadernos', 'Exclui caderno', ALUNO],
];

export const rotasDoContrato = () => ROTAS.map(([m, p]) => `${m.toUpperCase()} ${p}`);

const ERRO = { description: 'Erro', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } };

function operacao([metodo, caminho, tag, resumo, autenticacao, formato, corpo, resposta]) {
  const params = [...caminho.matchAll(/\{(\w+)\}/g)].map(([, nome]) => ({ name: nome, in: 'path', required: true, schema: str() }));
  const op = {
    tags: [tag], summary: resumo, operationId: `${metodo}${caminho.replace(/[{}]/g, '').replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))}`,
    ...(params.length ? { parameters: params } : {}),
    responses: {
      200: resposta === FLUXO
        ? { description: 'Fluxo NDJSON: uma linha JSON por evento ({"type":"progress"|"stage"|"ping"|"done"|"error"})', content: { 'application/x-ndjson': { schema: str() } } }
        : { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } },
      400: ERRO, 404: ERRO, 429: ERRO,
    },
  };
  if (autenticacao === PUBLICO) op.security = [];
  else { op.responses[401] = ERRO; op.responses[403] = ERRO; }
  if (autenticacao === ADMIN) op['x-papel'] = 'ADMIN';
  if (formato === JSON_) op.requestBody = { required: !!corpo, content: { 'application/json': { schema: corpo ? CORPOS[corpo] : { type: 'object' } } } };
  if (formato === ARQUIVO) op.requestBody = { required: true, content: { 'multipart/form-data': { schema: { type: 'object', description: 'Arquivo(s) e campos do formulário' } } } };
  return op;
}

export function especificacaoOpenApi() {
  const paths = {};
  for (const r of ROTAS) (paths[r[1]] ||= {})[r[0]] = operacao(r);
  return {
    openapi: '3.1.0',
    info: {
      title: 'HelpConcurso API', version: '1.0.0',
      description: 'API REST do HelpConcurso: geração de questões no estilo das bancas, provas, editais, cadernos e desempenho.\n\nRespostas e erros em JSON ({ "error": "..." }). Sessão por cookie httpOnly "hc_session". Requisições que alteram dados vindas de navegador precisam ter Origin do próprio site.',
    },
    servers: [{ url: '/api/v1' }],
    security: [{ sessao: [] }],
    components: {
      securitySchemes: { sessao: { type: 'apiKey', in: 'cookie', name: 'hc_session' } },
      schemas: { Erro: obj({ error: str() }, ['error']) },
    },
    paths,
  };
}
