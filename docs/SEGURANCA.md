# Segurança dos uploads e da IA

Todo arquivo enviado (material de estudo, prova ou gabarito) passa por **camadas independentes**. Se uma falhar, a próxima ainda protege.

## 1. Antes de abrir o arquivo
| Barreira | O que barra |
|---|---|
| Limites de tamanho, número de arquivos e de páginas | Arquivos gigantes, negação de serviço |
| Nome do arquivo | Extensão dupla (`resumo.exe.pdf`), extensões perigosas |
| Assinatura real ("magic bytes") × extensão | Executável renomeado para `.pdf`, conteúdo trocado |
| Antivírus ClamAV (opcional) | Malware conhecido |

## 2. Estrutura do arquivo (`src/security/file-inspect.js`)
**PDF:** JavaScript, ações automáticas (`/Launch`, `/AA`), anexos embutidos, XFA, envio de formulário, mídia ativa, PDF com senha, dados escondidos antes ou depois do PDF (arquivo poliglota).

**Texto que o leitor humano não vê** (o principal vetor de injeção em IA). O sistema analisa os comandos de desenho de cada página e detecta:
- texto **branco**, texto **invisível** (modo 3), texto **minúsculo** (< 2 pt);
- texto **fora da área da página**;
- texto **coberto** por uma caixa branca ou por imagem desenhada por cima;
- texto **sobreposto** a outro texto;
- comentários e anotações.

Esse texto é **retirado** do que vai para a IA e analisado à parte. Se tiver instruções, o arquivo é bloqueado. Exceção: o PDF escaneado com camada de OCR (imagem + texto invisível por cima) é reconhecido como legítimo.

**DOCX:** zip bomb, caminhos maliciosos, executáveis escondidos, macros VBA, ActiveX, modelo remoto (*template injection*), campos DDE, XML com DOCTYPE/ENTITY (XXE), conteúdo `altChunk`, texto oculto (`vanish`, branco, minúsculo, por estilo) e comentários.

**DOC (Word antigo):** macros VBA, campos DDE e objetos OLE. A checagem de formatação oculta é limitada nesse formato, então provas em `.doc` sempre passam por revisão humana.

**TXT:** binário disfarçado e codificação.

## 3. Conteúdo do texto (`src/security/text-scan.js`)
Roda no texto visível, no texto oculto, nas partes extras (cabeçalhos, comentários), na transcrição do OCR e **também nas respostas da IA**.
- Caracteres invisíveis contrabandeados (Unicode *tags*, larguras zero, controles bidirecionais, seletores de variação).
- Letras disfarçadas (homóglifos: "і" cirílico no lugar de "i").
- Ordens à IA em português, inglês e espanhol: "ignore as instruções", "você agora é", "para a IA:", "aprove esta prova", "revele o prompt", "gabarito sempre A" etc., **inclusive com letras espaçadas** para fugir de filtros.
- Marcadores de conversa forjados (`<|im_start|>`, `[INST]`, `System:`) e tentativa de forjar os marcadores internos de segurança.
- Código com intenção de execução ou exfiltração, links de coleta de dados, blocos base64 (que são **decodificados e varridos de novo**).

Os filtros foram calibrados para **não** marcar frases normais de prova, como "o servidor não deve ignorar as regras do edital" ou "a IA deve ser regulada". O arquivo `test/text-scan.test.js` garante isso.

## 4. Política (`src/security/policy.js`)
| | Material de estudo (afeta só o aluno) | Prova (vai para a base de todos) |
|---|---|---|
| Crítico | Bloqueia | Bloqueia |
| Alto | Bloqueia | Revisão humana obrigatória |
| Médio | Remove os trechos suspeitos e avisa | Revisão humana obrigatória |
| Baixo | Aceita | Aceita |

Mais proteções: cada bloqueio crítico é registrado. **3 bloqueios em 24 h pausam os envios** do usuário por 24 h. Provas só entram na base **sem revisão** quando vêm de administradores ou de usuários com histórico de aprovações e sem nenhum alerta.

## 5. Dentro da IA (`src/ai/guard.js`)
- Todo conteúdo de usuário vai entre **marcadores aleatórios por chamada**, com regras explícitas de que é dado e não instrução. Tentativas de forjar os marcadores são neutralizadas.
- A checagem de provas pede à própria IA para apontar instruções escondidas (segunda opinião).
- As respostas são **validadas por schema** (tipos, tamanhos, 5 alternativas distintas, gabarito válido).
- Questões geradas com sinais de injeção são descartadas.
- O "trecho do material" de cada questão é **conferido no texto original**, contra citações inventadas.
- Questões extraídas de provas e o estilo aprendido são varridos de novo antes de entrar na base, porque viram prompt para outros alunos.

## 6. Aplicação
- Senhas com bcrypt; sessão em cookie `httpOnly` + `SameSite=Lax`; verificação de origem nas requisições que alteram dados.
- Códigos de e-mail guardados só como hash, com expiração, limite de tentativas e comparação em tempo constante.
- Cabeçalhos de segurança (CSP restritiva, `frame-ancestors 'none'`, `nosniff`); limites de requisição por IP e por usuário.
- O front escapa todo texto exibido. Os arquivos de usuários são servidos **só como download**, com `Content-Security-Policy: sandbox`, e o bucket S3 é privado.
- Todas as consultas ao banco são parametrizadas (sem SQL injection).

## Testes
`npm test` roda 35 testes. Entre eles, gera de verdade 16 arquivos maliciosos (`test/fixtures.js`) e confirma o bloqueio de cada um.

## Limites conhecidos
Nenhum filtro é perfeito. Instruções escritas de forma muito sutil em linguagem natural podem passar pela heurística. Por isso existem camadas extras: a IA de checagem, a revisão humana das provas, a validação das respostas e o isolamento do prompt. Revise periodicamente os **Eventos de segurança** no painel.
