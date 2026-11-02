# Benchmark D5: Geração de Questões — nível Difícil — Juiz: Claude Sonnet 5.5
Data: 02/11/2026, 15:38:22

Avaliação de questões no nível **Difícil (Banca Cebraspe)** sobre a Nova Lei de Improbidade Administrativa (Lei 14.230/2021).
O **Claude Sonnet 5.5** atuou como juiz cego (sem saber o nome do modelo gerador), pontuando de 0 a 100 com base em correção jurídica, blindagem contra recursos, sofisticação de pegadinhas e padrão de redação Cebraspe.

| # | Modelo | Nota Juiz | Correção (30) | Sem Ambíg. (25) | Dificuldade (25) | Estilo (20) | Tempo Geração | Custo |
|---|---|---|---|---|---|---|---|---|
| 1 | `anthropic:claude-haiku-5-5` | **78** | 29 | 21 | 14 | 14 | 18.5s | US$ 0.0023 |
| 2 | `anthropic:claude-sonnet-5-5` | **76** | 28 | 20 | 13 | 15 | 20.9s | US$ 0.0356 |

## Pareceres do Juiz (Claude Sonnet 5.5)

### `anthropic:claude-haiku-5-5` (Nota: 78/100 — Tempo: 18.5s)
**Resumo do Juiz:** Os três itens têm gabarito juridicamente correto e fiel ao material, com redação formal no padrão certo/errado do Cebraspe e baixo risco de recurso. A dificuldade fica abaixo do nível Difícil, pois os itens 1 e 2 se apoiam em dispositivos literais e muito conhecidos, e só o item 3 exige conhecimento mais fino. Servem para concurso de bom nível, mas precisariam de cenários mais elaborados, como combinar dolo com divergência interpretativa, ou sucessão com prescrição, para atingir alto nível.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: E]:** "Um servidor de autarquia municipal, ao conduzir licitação, deixou de observar norma de controle interno por desatenção grave, sem qualquer intenção de obter vantagem ou de causar resultado ilícito. Posteriormente, o órgão de controle apurou prejuízo ao erário decorrente dessa conduta. Nessa situação, o fato configura ato de improbidade administrativa que causa prejuízo ao erário, pois a lei atual ainda alcança a culpa grave quando resulta em dano ao patrimônio público."
  - *Pegadinha:* Equiparar culpa grave ou negligência inescusável a dolo para fins de tipificação de improbidade que causa prejuízo ao erário.
  - *Parecer do Juiz:* Gabarito E correto, pois o art. 1º, §§ 1º e 2º exige dolo e afasta a culpa grave, e a pegadinha de equiparar desatenção grave a dolo é pertinente; porém é a mudança mais conhecida da Lei 14.230/2021, então a dificuldade real é média, não alta.
- **Item 2 [Gabarito: C]:** "Um gestor público, diante de dúvida sobre a aplicação de determinada norma de repasse de recursos, adotou interpretação amparada em precedentes judiciais que ainda não estavam pacificados. Posteriormente, os órgãos de controle e o Poder Judiciário passaram a entender de forma diversa, não prevalecendo a interpretação adotada pelo gestor. Nessa situação, a conduta do gestor não configura improbidade administrativa, pois a mera divergência interpretativa da lei, fundada em jurisprudência, afasta a tipificação mesmo quando sua tese não venha a prevalecer."
  - *Pegadinha:* Condicionar a exclusão da improbidade à pacificação da jurisprudência ou à prevalência posterior da interpretação adotada pelo agente.
  - *Parecer do Juiz:* Gabarito C correto e bem blindado, pois reproduz fielmente o §8º do art. 1º; contudo o enunciado quase parafraseia o texto legal, o que reduz o grau de raciocínio exigido e o torna mais fácil que o nível Difícil pretendido.
- **Item 3 [Gabarito: E]:** "Falecido o agente que causou dano ao erário, sua herdeira recebeu bens do espólio em montante inferior ao valor do prejuízo. Em ação de improbidade, ela foi condenada à reparação do dano e também ao pagamento de multa civil aplicada ao falecido. Nessa situação, a herdeira responde pela multa civil até o limite do valor da herança, pois a obrigação sucessória alcança todas as sanções patrimoniais impostas ao sucedido."
  - *Pegadinha:* Estender ao sucessor a sanção de multa civil até o limite da herança, quando a obrigação sucessória se restringe à reparação do dano.
  - *Parecer do Juiz:* Gabarito E correto, pois o art. 8º limita a obrigação do herdeiro à reparação do dano e exclui a multa civil, e a pegadinha de estender ao sucessor a multa até o limite da herança é a mais sofisticada do conjunto; o comentário, porém, diz 'ainda que o valor da herança seja suficiente', o que destoa do enunciado, em que a herança é inferior ao prejuízo.

### `anthropic:claude-sonnet-5-5` (Nota: 76/100 — Tempo: 20.9s)
**Resumo do Juiz:** As três questões têm gabaritos juridicamente corretos e fiéis ao material de base, com redação formal e sem grandes riscos de recurso. Contudo, a dificuldade real é de nível médio-baixo, pois as assertivas são paráfrases quase literais da lei, sem casuística fina ou erros sutis, e o gabarito é desbalanceado (C, E, C), com tópico do edital não preenchido. Servem como base para concurso de nível intermediário, mas exigiriam refinamento para carreiras de Juiz, Promotor e Auditor Fiscal.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: C]:** "Um prefeito, ao conduzir procedimento administrativo, adotou determinada interpretação de dispositivo legal amparada em precedentes judiciais, embora a matéria ainda não estivesse pacificada nos tribunais. Tempos depois, o tribunal de contas e o Poder Judiciário passaram a adotar entendimento oposto ao do prefeito. Nessa situação hipotética, o fato de a tese defendida pelo gestor não ter prevalecido nas decisões posteriores dos órgãos de controle e do Judiciário, por si só, não é suficiente para configurar ato de improbidade administrativa, uma vez que a divergência interpretativa baseada em jurisprudência, mesmo não pacificada, não caracteriza a conduta ímproba."
  - *Pegadinha:* Induzir que a mera divergência interpretativa de lei não pacificada, depois rejeitada pelos órgãos de controle, configura improbidade.
  - *Parecer do Juiz:* O gabarito Certo está correto conforme o art. 1º, § 8º, e a coerência com o dolo dos §§ 1º e 2º está bem fundamentada; porém a assertiva reproduz quase literalmente o texto legal e embute a própria justificativa ('uma vez que...'), o que a torna fácil e pouco compatível com o nível Difícil.
- **Item 2 [Gabarito: E]:** "Um servidor público faleceu no curso de ação de improbidade administrativa, na qual lhe eram imputados dano ao erário e enriquecimento ilícito. Seus herdeiros receberam o patrimônio deixado por ele. Nessa situação hipotética, caso fique comprovada a prática dos atos, os sucessores responderão pela reparação do dano e também pela multa civil que seria aplicada ao falecido, ambas limitadas ao valor da herança ou do patrimônio transferido."
  - *Pegadinha:* Sustentar que o sucessor responde pela multa civil até o limite da herança.
  - *Parecer do Juiz:* O gabarito Errado está correto, pois o art. 8º limita a responsabilidade do sucessor à reparação do dano, excluindo a multa civil; a pegadinha é clássica e razoável, mas bem conhecida, e o enunciado, apesar de mencionar 'enriquecimento ilícito' e 'dano ao erário', não adiciona elementos que aumentem a complexidade.
- **Item 3 [Gabarito: C]:** "Uma infração de natureza permanente, tipificada como ato de improbidade, cessou em determinada data. Sete anos depois, o Ministério Público ajuizou a respectiva ação. Nessa situação hipotética, a pretensão sancionatória não estava prescrita no momento do ajuizamento, pois o prazo de oito anos é contado do dia em que cessou a permanência. Além disso, o ajuizamento interrompeu o prazo prescricional, que passou a correr novamente pela metade, ou seja, por quatro anos."
  - *Pegadinha:* Confundir o termo inicial nas infrações permanentes e o prazo que recomeça após a interrupção (metade, e não o prazo integral).
  - *Parecer do Juiz:* O gabarito Certo confere com o art. 23, caput e §§ 4º e 5º (termo inicial na cessação da permanência, interrupção pelo ajuizamento e recomeço pela metade); a assertiva é correta e sem ambiguidade relevante, mas a pegadinha é fraca porque a afirmação é verdadeira e uma simples aplicação de texto, e o texto 'passou a correr novamente' poderia ter sido testado com um erro mais sutil, como o prazo integral ou outro marco interruptivo.

