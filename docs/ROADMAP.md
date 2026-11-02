# Plano de desenvolvimento

Princípio que guia o produto: **o conhecimento é do HelpConcurso, não do fornecedor de IA.**
Provas da base, estilo aprendido de cada banca, questões avaliadas e erros confirmados ficam no nosso banco.
A IA é uma peça trocável (veja `docs/IA.md`); o valor acumulado é nosso.

## ✅ MVP (v1.1) — pronto para testar com usuários
- Contas com confirmação por e-mail, recuperação de senha, cadastro só para convidados
- Upload de material (PDF, inclusive escaneado, DOCX, DOC, TXT) com identificação da matéria
- Geração no estilo da banca + **revisor automático** (2ª IA resolve sem ver o gabarito; descarta divergentes/ambíguas e refaz)
- Base compartilhada de provas enviada por todos, com checagem automática, duplicatas, revisão e aprovação por confiança
- Segurança em camadas no upload (docs/SEGURANCA.md)
- **Avaliação das questões** (👍/👎), **reportar erro** verificado pela IA
- **Estrelas e níveis** só por contribuição verificada; troca por gerações extras
- Painel do administrador: revisão, base, segurança, uso e custo da IA, qualidade percebida

## 🔜 V2 — próximos passos combinados
1. **Conectar a própria IA ("traga sua chave")** — o aluno cola uma chave de API (Anthropic, Google, OpenAI) e as gerações dele são cobradas na conta dele.
   - A arquitetura já está pronta (IA por tarefa em `src/ai/`). Falta: tela "Conectar minha IA", chave guardada **criptografada**, teste da chave, uso da chave só nas tarefas do próprio aluno.
   - Observação: assinaturas de chat (Claude Pro, Gemini Advanced) **não** podem ser usadas por outros sistemas; só chaves de API.
   - Mesmo usando a IA do aluno, as questões e avaliações ficam na **nossa** base.
2. **Aprender com as questões avaliadas** — as questões com boas avaliações e sem erro confirmado viram exemplos de referência por banca/matéria (depois da mesma varredura de segurança); as com erro confirmado viram exemplos do que evitar.
3. **Desconto na mensalidade com estrelas** — depende do sistema de pagamento (planos, assinatura). As estrelas já ficam acumuladas.
4. **Consulta externa de legislação/jurisprudência** no revisor, para alertar quando o material do aluno estiver desatualizado.
5. **Planos e pagamento** (assinatura, cotas por plano).

## 💡 Ideias para depois
- Busca semântica dos exemplos (pgvector) em vez de filtro por matéria
- Fila dedicada (BullMQ/Redis) quando o volume crescer
- App mobile (PWA ou React Native) usando a mesma API
- Ranking/conquistas entre colaboradores
