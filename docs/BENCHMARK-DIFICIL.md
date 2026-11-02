# Benchmark D5: Geração de Questões Difíceis — Juiz: Claude Sonnet 5.5
Data: 02/11/2026, 14:52:02

Avaliação de questões no nível **Difícil (Banca Cebraspe)** sobre a Nova Lei de Improbidade Administrativa (Lei 14.230/2021).
O **Claude Sonnet 5.5** atuou como juiz cego (sem saber o nome do modelo gerador), pontuando de 0 a 100 com base em correção jurídica, blindagem contra recursos, sofisticação de pegadinhas e padrão de redação Cebraspe.

| # | Modelo | Nota Juiz | Correção (30) | Sem Ambíg. (25) | Dificuldade (25) | Estilo (20) | Tempo Geração | Custo |
|---|---|---|---|---|---|---|---|---|
| 1 | `gemini:gemini-3.5-flash` | **81** | 30 | 22 | 13 | 16 | 22.5s | US$ 0.0000 |
| 2 | `anthropic:claude-sonnet-5-5` | **80** | 29 | 21 | 14 | 16 | 11.3s | US$ 0.0235 |
| 3 | `gemini:gemini-3.5-flash-lite` | **66** | 25 | 16 | 12 | 13 | 3.8s | US$ 0.0000 |
| 4 | `groq:openai/gpt-oss-120b` | **62** | 22 | 17 | 10 | 13 | 4.8s | US$ 0.0000 |
| 5 | `anthropic:claude-haiku-5-5` | **58** | 27 | 14 | 8 | 9 | 14.9s | US$ 0.0019 |

## Pareceres do Juiz (Claude Sonnet 5.5)

### `gemini:gemini-3.5-flash` (Nota: 81/100 — Tempo: 22.5s)
**Resumo do Juiz:** As três questões estão juridicamente corretas, têm gabaritos seguros e redação formal no padrão Cebraspe, com baixo risco de anulação. Faltam sofisticação e raciocínio: todas são paráfrases ou inversões diretas do texto legal, sem casos concretos, combinação de institutos ou nuances de jurisprudência (por exemplo, o dolo específico ou a prescrição intercorrente). Servem como itens de nível médio, mas não alcançam o nível Difícil exigido em carreiras de Juiz, Promotor e Auditor.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: C]:** "Com relação às disposições legais pertinentes à improbidade administrativa, julgue o item a seguir.

A aplicação de dispositivo legal por agente público fundamentada em divergência interpretativa respaldada em jurisprudência não pacificada não caracteriza ato de improbidade administrativa, ainda que a tese jurídica por ele adotada venha a ser rejeitada em decisão posterior de órgão de controle."
  - *Pegadinha:* Induzir a erro sugerindo que o fato de a jurisprudência não ser pacificada ou de ser contrária a posicionamento posterior do órgão de controle afastaria a proteção legal e geraria improbidade.
  - *Parecer do Juiz:* O gabarito CERTO está correto conforme o art. 1º, § 8º, mas a assertiva é paráfrase quase literal do dispositivo e omite o adjetivo "mera", o que dá margem a recurso marginal; a pegadinha (jurisprudência não pacificada e posterior rejeição pelo órgão de controle) é fraca para nível Difícil.
- **Item 2 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente.

Caso um servidor público cometa ato de improbidade administrativa que resulte em enriquecimento ilícito e venha a falecer durante a fase de apuração, a sanção pecuniária de multa civil será transmitida aos seus herdeiros, os quais responderão por ela até o limite do valor do patrimônio transferido."
  - *Pegadinha:* Sustentar que o sucessor responde pela multa civil até o limite da herança.
  - *Parecer do Juiz:* O gabarito ERRADO está correto, pois o art. 8º limita a responsabilidade do herdeiro à reparação do dano ou à restituição do enriquecimento, excluindo a multa civil. A pegadinha de misturar o limite da herança, que é verdadeiro, com a transmissibilidade da multa, que é falsa, é a mais bem construída da prova, embora ainda seja uma inversão direta do texto legal.
- **Item 3 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente.

Na ação de improbidade administrativa, para a decretação da medida cautelar de indisponibilidade de bens do réu, o perigo da demora (periculum in mora) é presumido em razão da gravidade do interesse público tutelado, dispensando-se a demonstração de risco ao resultado útil do processo no caso concreto."
  - *Pegadinha:* Afirmar que o perigo da demora na indisponibilidade de bens é presumido (in re ipsa), induzindo o candidato com base em entendimentos jurisprudenciais antigos anteriores à reforma da lei.
  - *Parecer do Juiz:* O gabarito ERRADO está correto e inequívoco diante da vedação expressa de presunção de periculum in mora no art. 16, sem risco de recurso; a assertiva é, porém, uma negação literal do dispositivo, de dificuldade baixa para candidato que conhece a reforma da Lei 14.230/2021.

### `anthropic:claude-sonnet-5-5` (Nota: 80/100 — Tempo: 11.3s)
**Resumo do Juiz:** As três questões estão juridicamente corretas, com gabaritos coerentes com a Lei 8.429/1992 após a Lei 14.230/2021 e redação sóbria no estilo certo/errado. Contudo, as pegadinhas são previsíveis (inversões frontais do texto legal) e há pouco raciocínio fino, como dolo específico ou casos limítrofes, além de o campo de tópico do edital estar vazio e a citação do trecho-base do item 2 estar ligeiramente alterada. Servem bem para concursos de nível intermediário e como base para um nível mais alto, se forem reelaboradas com maior sutileza.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. Situação hipotética: Um gestor público adotou determinada interpretação de lei federal, amparada em precedentes judiciais ainda não pacificados. Posteriormente, tribunal do Poder Judiciário firmou entendimento diverso, que passou a prevalecer. Nessa situação, ainda que não tenha havido comprovação de ato doloso com fim ilícito, a conduta do gestor configura ato de improbidade administrativa, pois a posterior prevalência de interpretação contrária demonstra a ilegalidade do ato."
  - *Pegadinha:* Induzir que mera divergência interpretativa de lei não pacificada, posteriormente superada, configura improbidade.
  - *Parecer do Juiz:* Gabarito E correto, pois os arts. 1º, §§ 2º, 3º e 8º, afastam a improbidade sem dolo e na mera divergência interpretativa; porém a assertiva é flagrantemente errada ao afirmar a configuração 'ainda que não tenha havido comprovação de ato doloso', o que a torna pouco sofisticada para nível Difícil.
- **Item 2 [Gabarito: C]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. Em caso de falecimento do agente que tenha causado dano ao erário ou se enriquecido ilicitamente, o herdeiro ou sucessor estará sujeito apenas à obrigação de reparar o dano, limitada ao valor da herança ou do patrimônio transferido, não se estendendo a ele a sanção de multa civil nem a de suspensão de direitos políticos."
  - *Pegadinha:* Afirmar que o sucessor responde pela multa civil até o limite da herança.
  - *Parecer do Juiz:* Gabarito C correto e bem blindado contra recurso, com redação fiel ao art. 8º e à nota do material; contudo, a assertiva é praticamente transcrição literal da lei, e o verdadeiro nível de dificuldade está só em saber que multa civil e suspensão de direitos políticos não se transmitem.
- **Item 3 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. Segundo a disciplina atual, para a decretação da indisponibilidade de bens do réu na ação de improbidade, o periculum in mora é presumido (in re ipsa), dispensando-se a demonstração de perigo de dano irreparável ou de risco ao resultado útil do processo; já a prescrição da ação, que ocorre em 8 anos, é interrompida pelo ajuizamento da ação, recomeçando a correr pela metade do prazo."
  - *Pegadinha:* Afirmar que o perigo da demora na indisponibilidade de bens é presumido (in re ipsa), combinado com parte correta sobre prescrição.
  - *Parecer do Juiz:* Gabarito E correto, pois o art. 16 veda a presunção de periculum in mora, e a parte correta sobre prescrição (8 anos, interrupção pelo ajuizamento, recomeço pela metade) serve como isca; a técnica de misturar dois temas é boa, mas o erro é muito visível e a omissão da publicação da sentença como causa interruptiva não compromete o item.

### `gemini:gemini-3.5-flash-lite` (Nota: 66/100 — Tempo: 3.8s)
**Resumo do Juiz:** As três questões têm gabaritos juridicamente corretos e boa fidelidade à Lei nº 14.230/2021, com redação clara e formato Certo/Errado adequado. Contudo, a dificuldade real é de nível médio, pois dois itens são paráfrases quase literais do texto legal, e há pequenas fragilidades de blindagem contra recursos (item 1, por omitir a ressalva do dolo, e item 2, por acumular dois vícios). Servem como itens de apoio, mas ficam abaixo do padrão exigido em provas de Juiz, Promotor e Auditor Fiscal sem maior elaboração de casos concretos ou cruzamento de dispositivos.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: C]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. 

Não configura ato de improbidade administrativa a adoção de interpretação da lei baseada em jurisprudência não pacificada, ainda que a tese adotada venha a ser rejeitada futuramente pelos tribunais."
  - *Pegadinha:* Tentar induzir o candidato ao erro afirmando que a jurisprudência obrigatoriamente precisa estar pacificada ou ser aceita pelos tribunais para afastar o ato de improbidade.
  - *Parecer do Juiz:* Gabarito C correto, mas a assertiva omite o requisito de que se trate de 'mera divergência interpretativa' e reproduz quase literalmente o art. 1º, § 8º, o que a torna de baixa dificuldade e vulnerável a recurso, já que a ausência do requisito da inexistência de dolo ou má-fé poderia gerar impugnação, e a pegadinha é pouco sofisticada.
- **Item 2 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. 

Em caso de falecimento do agente que causou dano ao erário, seus herdeiros respondem solidariamente tanto pela reparação integral do dano quanto pelo pagamento da multa civil aplicada na sentença, limitada ao valor da herança transferida."
  - *Pegadinha:* Afirmar que o herdeiro responde pela multa civil, confundindo a obrigação de reparar o dano (patrimonial) com as sanções de caráter punitivo da lei de improbidade.
  - *Parecer do Juiz:* Gabarito E correto e item bem construído, pois a expressão 'solidariamente' e a inclusão da multa civil em meio à limitação à herança induzem o erro, mas o comentário afirma que a vedação decorre do texto do art. 8º, quando o dispositivo transcrito só menciona a reparação (a exclusão da multa é inferência/nota), e o termo 'solidariamente' introduz um segundo vício que dispensa a análise da multa.
- **Item 3 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. 

Para a decretação de indisponibilidade de bens em ação de improbidade administrativa, o perigo de dano irreparável ou de risco ao resultado útil do processo (periculum in mora) pode ser presumido a partir da gravidade dos indícios da prática do ato ilícito."
  - *Pegadinha:* Afirmar que o perigo da demora é presumido (in re ipsa) em virtude da gravidade do ato de improbidade imputado, contrariando a vedação expressa trazida pela nova legislação.
  - *Parecer do Juiz:* Gabarito E correto, com apoio literal no art. 16 (vedada a presunção de periculum in mora), mas a assertiva é uma negação direta do texto legal e a pegadinha é elementar, sem testar raciocínio mais fino (ex.: distinção entre indícios de autoria e perigo da demora).

### `groq:openai/gpt-oss-120b` (Nota: 62/100 — Tempo: 4.8s)
**Resumo do Juiz:** Os gabaritos estão tecnicamente corretos e alinhados à legislação-base, mas as questões são de dificuldade baixa, pois reproduzem o texto legal quase literalmente, sem pegadinhas sofisticadas. Há ainda erro de referência normativa no item 2 (cita o art. 8º em vez do art. 1º, § 8º) e imprecisão conceitual no comentário do item 1. Em nível de carreiras de alto escalão, exigiriam reformulação para aprofundar a dificuldade e corrigir as citações.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: E]:** "A mera vontade de alcançar o resultado ilícito, ainda que o agente não tenha consciência do ilícito, caracteriza dolo nos termos da Lei nº 8.429/1992, com as alterações da Lei nº 14.230/2021."
  - *Pegadinha:* Confunde dolo com mera vontade de alcançar o resultado ilícito, ignorando a necessidade de consciência do ilícito
  - *Parecer do Juiz:* Gabarito 'E' correto, pois o art. 1º, § 2º exige vontade livre e consciente, não bastando a voluntariedade; contudo, a assertiva ('mera vontade... ainda que sem consciência do ilícito') é uma paráfrase quase literal invertida do dispositivo, o que torna a pegadinha rudimentar, e o comentário confunde 'consciência do ilícito' com o texto legal, que fala em consciência quanto ao resultado ilícito.
- **Item 2 [Gabarito: C]:** "A mera divergência interpretativa da lei, ainda que baseada em jurisprudência não pacificada, não configura ato de improbidade administrativa."
  - *Pegadinha:* —
  - *Parecer do Juiz:* Gabarito 'C' correto quanto ao conteúdo (art. 1º, § 8º da Lei 8.429/1992), mas o comentário e o trecho_base citam erroneamente o 'art. 8º' (que trata de sucessores e herdeiros), um erro de referência grave que fragiliza a questão perante recursos; além disso, a assertiva é cópia literal do texto legal, sem nenhuma pegadinha ou raciocínio exigido.
- **Item 3 [Gabarito: C]:** "Na ação de improbidade administrativa, a indisponibilidade de bens do réu só pode ser decretada quando houver demonstração concreta de perigo de dano irreparável ou risco ao resultado útil do processo, sendo vedada a presunção de periculum in mora."
  - *Pegadinha:* —
  - *Parecer do Juiz:* Gabarito 'C' correto e fiel ao art. 16 (demonstração concreta de perigo de dano irreparável ou risco ao resultado útil, vedada presunção de periculum in mora); a redação é limpa e blindada contra recurso, porém a questão é mera transcrição do texto legal e não testa conhecimento fino, como a cumulação ou a distinção em relação à tutela de urgência genérica.

### `anthropic:claude-haiku-5-5` (Nota: 58/100 — Tempo: 14.9s)
**Resumo do Juiz:** Os gabaritos conferem com o material, mas dois dos três itens são cópia quase literal de dispositivos legais, com dificuldade real baixa e pegadinhas apenas declaradas, não construídas. Apenas o item 2 exige discernimento de fato, e mesmo ele se apoia em nota externa ao texto legal. O conjunto é insuficiente para concursos de alto nível (Juiz, Promotor), pois faltam assertivas com troca sutil de termos, e todos os itens são formulados de modo a levar ao gabarito esperado.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: C]:** "Situação hipotética: Carlos, gestor de uma autarquia, firmou contrato administrativo com base em parecer jurídico que adotou interpretação de lei ainda não pacificada, mas amparada em jurisprudência de tribunais. Posteriormente, a interpretação adotada não prevaleceu nas decisões dos órgãos de controle e do Poder Judiciário. Julgue o item: segundo a Lei 8.429/1992, com as alterações da Lei 14.230/2021, nessa situação, a mera divergência interpretativa da lei, baseada em jurisprudência, não configura improbidade administrativa, ainda que não venha a ser posteriormente prevalecente."
  - *Pegadinha:* Induzir o candidato a acreditar que a derrota da tese interpretativa nos tribunais transforma a conduta em improbidade, ou que a simples falta de pacificação da jurisprudência basta para a condenação.
  - *Parecer do Juiz:* Gabarito 'Certo' correto, mas o item é trivial: a assertiva final reproduz quase literalmente o art. 1º, § 8º, sem exigir raciocínio. O enunciado também mistura a situação hipotética com a lei transcrita, e o comentário erra ao dizer que o item 'exige atenção' à derrota da tese, quando a pegadinha é inexistente.
- **Item 2 [Gabarito: E]:** "Situação hipotética: Carlos, após causar dano ao erário mediante ato de improbidade, faleceu antes do fim da ação, deixando como herdeira sua filha Ana. Foi imposta a Carlos, na sentença condenatória, multa civil. Julgue o item: segundo a Lei 8.429/1992, com as alterações da Lei 14.230/2021, nessa situação, Ana responde pela multa civil imposta a Carlos, até o limite do valor da herança recebida."
  - *Pegadinha:* Sustentar que o sucessor responde pela multa civil até o limite da herança, quando a limitação diz respeito apenas à reparação do dano.
  - *Parecer do Juiz:* Gabarito 'Errado' correto e é o melhor item, ao distinguir reparação do dano de multa civil. Porém a base depende de uma 'nota' externa ao texto legal, o que fragiliza a blindagem contra recursos; além disso, o art. 8º da Lei 14.230/2021 só afasta a multa por sua natureza personalíssima, e a multa já imposta na sentença em vida de Carlos poderia gerar discussão.
- **Item 3 [Gabarito: C]:** "Julgue o item: segundo o art. 16 da Lei 8.429/1992, com as alterações da Lei 14.230/2021, para a decretação de indisponibilidade de bens do réu em ação de improbidade administrativa, é necessária a demonstração, no caso concreto, de perigo de dano irreparável ou de risco ao resultado útil do processo, sendo vedada a presunção de periculum in mora."
  - *Pegadinha:* Afirmar que o perigo da demora na indisponibilidade de bens é presumido (in re ipsa), o que o art. 16 expressamente veda.
  - *Parecer do Juiz:* Gabarito 'Certo' correto, mas o item é mera transcrição do art. 16, sem situação hipotética ou nuance, sendo de nível básico e não difícil, apesar do rótulo. A pegadinha descrita no campo não aparece na assertiva, que já afirma o correto.

