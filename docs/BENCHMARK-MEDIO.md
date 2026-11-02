# Benchmark D5: Geração de Questões — nível Médio — Juiz: Claude Sonnet 5.5
Data: 02/11/2026, 15:39:11

Avaliação de questões no nível **Médio (Banca Cebraspe)** sobre a Nova Lei de Improbidade Administrativa (Lei 14.230/2021).
O **Claude Sonnet 5.5** atuou como juiz cego (sem saber o nome do modelo gerador), pontuando de 0 a 100 com base em correção jurídica, blindagem contra recursos, sofisticação de pegadinhas e padrão de redação Cebraspe.

| # | Modelo | Nota Juiz | Correção (30) | Sem Ambíg. (25) | Dificuldade (25) | Estilo (20) | Tempo Geração | Custo |
|---|---|---|---|---|---|---|---|---|
| 1 | `anthropic:claude-haiku-5-5` | **77** | 29 | 21 | 12 | 15 | 19.8s | US$ 0.0025 |
| 2 | `anthropic:claude-sonnet-5-5` | **72** | 25 | 17 | 14 | 16 | 8.8s | US$ 0.0198 |

## Pareceres do Juiz (Claude Sonnet 5.5)

### `anthropic:claude-haiku-5-5` (Nota: 77/100 — Tempo: 19.8s)
**Resumo do Juiz:** Os gabaritos estão todos corretos e coerentes com a legislação-base, e os itens são juridicamente seguros e dificilmente anuláveis. Contudo, dois dos três itens (1 e 3) são paráfrases diretas do texto legal, com pegadinhas frágeis, e ficam abaixo do nível Médio solicitado. O conjunto serve para treino básico ou intermediário, mas não para concurso de alto nível sem itens mais elaborados, como casos com dolo específico, periculum in mora presumido ou combinação de dispositivos.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: C]:** "Carlos, gestor público, adotou determinada interpretação de norma administrativa com base em jurisprudência que ainda não estava pacificada nos tribunais. Os órgãos de controle posteriormente firmaram entendimento diverso. Considerando a Lei 8.429/1992 com as alterações da Lei 14.230/2021, julgue o item: a conduta de Carlos não configura ato de improbidade administrativa, ainda que a interpretação por ele adotada não venha a prevalecer nas decisões dos órgãos de controle ou dos tribunais do Poder Judiciário."
  - *Pegadinha:* Sustentar que a não prevalência posterior da interpretação, pelos órgãos de controle ou tribunais, transforma a conduta em improbidade.
  - *Parecer do Juiz:* Gabarito CERTO correto, pois o art. 1º, §8º, da Lei 8.429/1992 afasta a improbidade na mera divergência interpretativa baseada em jurisprudência, mesmo não pacificada e não prevalecente depois; a assertiva é quase paráfrase literal do dispositivo, com pegadinha rasa (a não prevalência posterior da tese) e pouca exigência de raciocínio, embora o enunciado silencie sobre dolo e má-fé, o que abriria margem mínima a recurso.
- **Item 2 [Gabarito: E]:** "Um servidor público causou dano ao erário e faleceu. Sua única herdeira, Maria, recebeu herança no valor de R$ 80.000,00. O dano apurado em ação de improbidade foi de R$ 300.000,00. Considerando o art. 8º da Lei 8.429/1992 com as alterações da Lei 14.230/2021, julgue o item: Maria está sujeita à sanção de multa civil, que poderá ser cobrada da herdeira até o limite de R$ 80.000,00."
  - *Pegadinha:* Confundir a responsabilidade do sucessor, restrita à reparação do dano, com a aplicação de multa civil até o limite da herança.
  - *Parecer do Juiz:* Gabarito ERRADO correto, pois o art. 8º limita a responsabilidade do herdeiro à reparação do dano até o valor da herança, sem alcançar a multa civil; é o melhor item do conjunto, com pegadinha legítima (a limitação patrimonial à herança dá aparência de correção à multa), e os valores do enunciado são úteis, embora a fundamentação dependa da nota explicativa e não do texto do artigo.
- **Item 3 [Gabarito: C]:** "Em ação de improbidade administrativa ajuizada para aplicação de sanções da Lei 8.429/1992, com as alterações da Lei 14.230/2021, o prazo prescricional de 8 anos foi interrompido pelo ajuizamento da ação. Julgue o item: após essa interrupção, o prazo prescricional volta a correr pela metade, ou seja, por 4 anos."
  - *Pegadinha:* Afirmar que, após a interrupção, o prazo recomeça pelo mesmo período integral de 8 anos.
  - *Parecer do Juiz:* Gabarito CERTO correto à luz do art. 23, §§4º e 5º (interrupção pelo ajuizamento e recomeço pela metade, 4 anos), mas o item é uma transcrição quase literal e trivial, sem pegadinha sofisticada; a redação omite que o prazo recomeça a correr do dia da interrupção e não explora as demais causas interruptivas, e a pergunta é de memorização pura, abaixo do nível Médio.

### `anthropic:claude-sonnet-5-5` (Nota: 72/100 — Tempo: 8.8s)
**Resumo do Juiz:** As três questões têm gabaritos juridicamente corretos e redação formal adequada ao estilo Cebraspe, mas reproduzem o texto legal quase literalmente nas próprias assertivas, o que reduz a sofisticação e fica abaixo do nível médio real. Há ainda falhas pontuais, como o rótulo temático incoerente no item 3 e o risco de recurso no item 1 por causa da contratação sem licitação. Servem como itens de fixação, mas precisam de reformulação para concursos de alto nível.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: C]:** "Um secretário municipal, amparado em precedentes de tribunais que ainda não eram pacíficos, adotou determinada interpretação de lei para contratar serviço sem licitação. Posteriormente, tribunal de contas e Poder Judiciário firmaram entendimento diverso, que passou a prevalecer. Nessa situação hipotética, ainda que a interpretação adotada pelo secretário não tenha prevalecido, a conduta, por si só, não configura improbidade administrativa, já que a mera divergência interpretativa da lei, baseada em jurisprudência, mesmo que não pacificada, não caracteriza o ilícito."
  - *Pegadinha:* Induzir que a mudança posterior de entendimento dos órgãos de controle transforma a divergência interpretativa em improbidade.
  - *Parecer do Juiz:* Gabarito C correto conforme o art. 1º, § 8º, mas o enunciado repete quase literalmente o texto legal na parte final ('mera divergência interpretativa... mesmo que não pacificada'), entregando a resposta e tornando a pegadinha frágil; além disso, o caso de contratação sem licitação poderia gerar recurso, pois a divergência interpretativa não afasta outras tipificações dolosas (como a fraude à licitação).
- **Item 2 [Gabarito: E]:** "Após o falecimento de ex-gestor condenado por ato de improbidade que causou dano ao erário, os herdeiros passaram a responder, até o limite do valor da herança, pela obrigação de reparar o dano e também pela multa civil imposta ao de cujus, já que ambas as obrigações têm natureza patrimonial."
  - *Pegadinha:* Sustentar que o sucessor responde pela multa civil até o limite da herança.
  - *Parecer do Juiz:* Gabarito E correto, pois o art. 8º limita a responsabilidade do herdeiro à reparação do dano e exclui a multa civil; a pegadinha é boa e adequada ao nível médio, mas o item fala em 'multa civil imposta ao de cujus', e a inexistência de menção expressa ao texto legal base (o excludente consta só em nota) deixa uma pequena fragilidade.
- **Item 3 [Gabarito: C]:** "Em ação de improbidade administrativa, o Ministério Público requereu a indisponibilidade de bens do réu alegando apenas a gravidade abstrata dos fatos imputados. Nessa situação, o pedido não pode ser deferido com base em mera presunção do perigo da demora, sendo necessária a demonstração, no caso concreto, de perigo de dano irreparável ou de risco ao resultado útil do processo."
  - *Pegadinha:* Afirmar que o perigo da demora na indisponibilidade de bens é presumido (in re ipsa).
  - *Parecer do Juiz:* Gabarito C correto conforme o art. 16, mas o tema 'Prescrição e indisponibilidade de bens' não corresponde ao conteúdo (só trata de indisponibilidade), e a justificativa do enunciado repete o dispositivo de forma literal, tornando o item trivial e sem raciocínio adicional.

