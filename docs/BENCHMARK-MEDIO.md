# Benchmark D5: Geração de Questões — nível Médio — Juiz: Claude Sonnet 5.5
Data: 02/11/2026, 15:06:26

Avaliação de questões no nível **Médio (Banca Cebraspe)** sobre a Nova Lei de Improbidade Administrativa (Lei 14.230/2021).
O **Claude Sonnet 5.5** atuou como juiz cego (sem saber o nome do modelo gerador), pontuando de 0 a 100 com base em correção jurídica, blindagem contra recursos, sofisticação de pegadinhas e padrão de redação Cebraspe.

| # | Modelo | Nota Juiz | Correção (30) | Sem Ambíg. (25) | Dificuldade (25) | Estilo (20) | Tempo Geração | Custo |
|---|---|---|---|---|---|---|---|---|
| 1 | `anthropic:claude-haiku-5-5` | **68** | 28 | 17 | 11 | 12 | 13.2s | US$ 0.0017 |
| 2 | `anthropic:claude-sonnet-5-5` | **67** | 27 | 19 | 8 | 13 | 9.1s | US$ 0.0197 |

## Pareceres do Juiz (Claude Sonnet 5.5)

### `anthropic:claude-haiku-5-5` (Nota: 68/100 — Tempo: 13.2s)
**Resumo do Juiz:** Os três gabaritos estão juridicamente corretos e alinhados ao material, sem erro de inversão. Dois itens (1 e 2) testam o mesmo cenário e a mesma ideia (dolo e § 8º) de forma muito literal e previsível, com sofisticação aquém do nível Médio exigido em concurso de alto nível. Só o item 3 tem pegadinha real; a prova também cobre pouco do material (art. 16 e art. 23 ficaram de fora) e traz redação com marcador 'Julgue o item' dentro do enunciado e tópico de edital vazio.

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: E]:** "Carlos, servidor municipal, assinou contrato sem licitação com base em interpretação de precedente jurisprudencial ainda não pacificado, convencido de que agia conforme o entendimento de um tribunal. Julgue o item: a conduta de Carlos configura ato de improbidade administrativa, pois a voluntariedade do agente basta para caracterizar o dolo exigido pela Lei 8.429/1992."
  - *Pegadinha:* Confundir voluntariedade com dolo: a banca afirma que a vontade de praticar o ato é suficiente, quando a lei exige a vontade livre e consciente de alcançar o resultado ilícito.
  - *Parecer do Juiz:* O gabarito E está correto, pois o art. 1º, § 2º afasta a voluntariedade como suficiente para o dolo; a pegadinha, porém, é só a negação literal do dispositivo e muito rasa, e o caso concreto com o § 8º gera dupla fundamentação desnecessária.
- **Item 2 [Gabarito: C]:** "Carlos, servidor municipal, assinou contrato sem licitação com base em interpretação de precedente jurisprudencial ainda não pacificado, convencido de que agia conforme o entendimento de um tribunal. Julgue o item: a conduta de Carlos não configura ato de improbidade administrativa, pois a mera divergência interpretativa da lei, baseada em jurisprudência, ainda que não pacificada, não caracteriza improbidade, mesmo que essa interpretação não venha a prevalecer nas decisões dos órgãos de controle ou dos tribunais."
  - *Pegadinha:* Induzir que a divergência interpretativa não pacificada configura improbidade, ou exigir que a interpretação seja prevalecente para que seja afastada a improbidade.
  - *Parecer do Juiz:* O gabarito C é fiel ao art. 1º, § 8º, mas o item é cópia quase literal do texto legal, sem raciocínio. Ele também conclui a ausência de improbidade sem tratar do dolo ou de indícios de fraude no contrato sem licitação, o que abre espaço para recurso, e repete o cenário do item 1, que fica praticamente respondido por ele.
- **Item 3 [Gabarito: E]:** "Julgue o item: o sucessor daquele que causou dano ao erário responde pela multa civil aplicada ao causador, até o limite do valor da herança ou do patrimônio transferido."
  - *Pegadinha:* Estender ao sucessor a multa civil ou a suspensão de direitos políticos, sanções personalíssimas que não se transmitem, sob o argumento de que a responsabilidade alcança o patrimônio até o limite da herança.
  - *Parecer do Juiz:* O gabarito E está correto e é o item mais bem construído: a armadilha de estender a multa civil ao sucessor, mesmo com o limite da herança, exige conhecimento fino do art. 8º e é adequada ao nível Médio, embora o comentário dependa de uma nota do material e não do texto legal.

### `anthropic:claude-sonnet-5-5` (Nota: 67/100 — Tempo: 9.1s)
**Resumo do Juiz:** As três questões são juridicamente corretas e fiéis ao material-base, com gabaritos seguros contra recursos. Porém, são reproduções quase literais da lei, com inversões simples, e não exigem raciocínio fino, o que as deixa abaixo do esperado até para o nível Médio. Servem como itens de aquecimento, mas não para concurso de alto nível sem maior sofisticação (casos concretos, combinação de dispositivos, exceções como as do art. 8º e da prescrição).

**Itens Gerados & Julgamento:**
- **Item 1 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. Segundo a Lei n.º 8.429/1992, com as alterações da Lei n.º 14.230/2021, a mera voluntariedade do agente na prática da conduta tipificada nos arts. 9.º, 10 e 11 é suficiente para caracterizar o dolo exigido para a configuração de ato de improbidade administrativa, dispensando-se a demonstração da vontade livre e consciente de alcançar o resultado ilícito."
  - *Pegadinha:* Equiparar a simples voluntariedade da conduta ao dolo exigido pela lei, ignorando a exigência de finalidade ilícita.
  - *Parecer do Juiz:* Gabarito E correto (art. 1º, §2º), mas a assertiva copia o texto legal com negação direta e é trivial para o nível Médio; o comentário usa a expressão 'dolo específico', que não consta do dispositivo, e a pegadinha descrita é pouco sofisticada.
- **Item 2 [Gabarito: C]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. Situação hipotética: um gestor público adotou determinada interpretação de dispositivo legal, amparada em jurisprudência existente, embora não pacificada, e essa interpretação não veio a prevalecer posteriormente nas decisões dos tribunais e dos órgãos de controle. Nessa situação, de acordo com a Lei n.º 8.429/1992, o gestor não praticou ato de improbidade administrativa pelo simples fato de ter adotado essa interpretação, pois a mera divergência interpretativa da lei, baseada em jurisprudência, não configura improbidade."
  - *Pegadinha:* Induzir que a interpretação posteriormente rejeitada pelos tribunais configura improbidade (a assertiva, aqui, corretamente afasta essa ideia).
  - *Parecer do Juiz:* Gabarito C correto (art. 1º, §8º), mas a assertiva é praticamente transcrição literal do dispositivo, sem armadilha real; a justificativa da pegadinha admite que a assertiva está correta e não induz o candidato a erro, e a expressão 'simples fato' poderia gerar recurso se houvesse outros elementos (dolo, má-fé).
- **Item 3 [Gabarito: E]:** "Julgue o item a seguir a respeito dos atos de improbidade administrativa e da disciplina legal vigente. Na ação de improbidade administrativa, para a decretação da indisponibilidade de bens do réu, o perigo da demora é presumido (in re ipsa), bastando a demonstração da probabilidade do direito alegado pelo autor."
  - *Pegadinha:* Sustentar que o perigo da demora na indisponibilidade de bens é presumido (in re ipsa), tese superada pela Lei n.º 14.230/2021.
  - *Parecer do Juiz:* Gabarito E correto (art. 16 veda a presunção de periculum in mora), mas a assertiva é uma afirmação frontalmente contrária ao texto legal, de fácil identificação por quem conhece a reforma de 2021; faltou refinamento, como o cotejo com a jurisprudência anterior do STJ ou a exigência de contraditório.

