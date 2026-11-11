# Método de cálculo do mapa astral da Carta Celeste

Documento de referência do **motor de cálculo** (`lib/astro/`). Descreve, passo a passo, como o site transforma data, hora e cidade de nascimento em posições de planetas, ângulos, casas e aspectos. Serve a três públicos:

- **Quem desenvolve:** o que o código faz, em que ordem e por quê.
- **Quem revisa astrologia:** as convenções adotadas e onde elas podem ser mudadas.
- **Quem responde ao cliente ou ao jurídico:** o que é calculado, com que precisão e o que fica de fora.

Fonte da verdade do código: `lib/astro/core.ts` (matemática), `lib/astro/chart.ts` (montagem do mapa), `lib/astro/constants.ts` (signos, planetas, regentes, aspectos) e `lib/astro/chart.test.ts` (testes de referência). Em caso de divergência entre este texto e o código, vale o código, e este documento deve ser corrigido. O PRD, seção "Motor de cálculo astrológico", é a origem das regras.

---

## 1. Princípios

1. **A IA nunca calcula.** Todo cálculo roda no servidor, em código determinístico. A IA só recebe o resultado pronto e escreve o texto (ver seção 12).
2. **Zodíaco tropical.** Os signos começam no equinócio de março (0° de Áries). Não é o zodíaco sideral.
3. **Posições astronômicas reais**, calculadas por uma biblioteca de efemérides (`astronomy-engine`), e não tabelas aproximadas.
4. **O núcleo é validado e protegido.** A matemática de `core.ts` bate com referências do mercado com diferença máxima de **1′ de arco** (1/60 de grau). Não se altera sem que os testes de referência continuem passando.
5. **Mesma entrada, mesma saída.** Não há aleatoriedade nem dependência da hora em que o cálculo roda.

## 2. Visão geral do processo

```
  data + hora local + cidade
            |
   [1] hora local -> UTC (fuso IANA e horário de verão da época)
            |
   [2] posições dos 10 corpos + Nodo Norte (longitude eclíptica)
            |
   [3] retrogradação de cada planeta
            |
   [4] ângulos: Ascendente e Meio do Céu       (só com hora conhecida)
            |
   [5] cúspides das 12 casas e casa de cada corpo (só com hora conhecida)
            |
   [6] signo e grau de tudo
            |
   [7] aspectos entre os 10 planetas
            |
   [8] regentes, elementos e modalidades
            |
        chart_data  ->  tela do mapa (roda e tabelas)  e  resumo para a IA
```

## 3. Entradas e validações

| Campo                   | Formato                             | Observação                                                      |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `birthDate`             | `AAAA-MM-DD`                        | data civil no local de nascimento                               |
| `birthTime`             | `HH:mm` ou `null`                   | hora **local**; `null` = hora desconhecida                      |
| `timezone`              | nome IANA, ex.: `America/Sao_Paulo` | vem da cidade escolhida (ver seção 4)                           |
| `latitude`, `longitude` | graus decimais                      | leste e norte positivos; Brasil tem valores negativos           |
| `houseSystem`           | `placidus`, `equal` ou `whole`      | padrão vem de `settings.default_house_system` (hoje `placidus`) |

O cálculo **recusa** entradas inválidas (data ou hora mal formadas, mês ou dia fora de faixa, latitude fora de ±90°, longitude fora de ±180°, valores não numéricos). Não há "correção silenciosa".

**De onde vêm as coordenadas e o fuso.** A cidade é escolhida em uma base própria: os 5.570 municípios do IBGE (coordenadas da sede) e as cidades do mundo com mais de 15 mil habitantes (GeoNames). O fuso de cada cidade é obtido com a biblioteca `tz-lookup` a partir das coordenadas. Quando a pessoa não encontra a cidade, informa latitude, longitude e fuso manualmente.

## 4. Passo 1: da hora local para o UTC

O mapa é calculado para um **instante universal**, então a hora local precisa virar UTC. Isso depende do fuso e do **horário de verão que valia naquela data**, que mudou várias vezes no Brasil.

- A conversão usa o banco de fusos IANA embutido no ambiente (via `Intl.DateTimeFormat`), que guarda as regras históricas de cada região.
- O algoritmo (`zonedToUtc`) parte da hora de parede, estima o deslocamento do fuso naquele momento e refaz a estimativa uma vez, para acertar datas perto da troca de horário.
- Resultado: o instante UTC e o deslocamento aplicado em minutos (por exemplo, `-180` no inverno e `-120` no horário de verão de São Paulo). Ambos ficam gravados no `chart_data`, e o resumo ao cliente mostra "UTC−3" ao lado da hora.

**Casos de borda:**

- _Hora repetida_ (quando o relógio volta uma hora): a conversão escolhe uma das duas ocorrências de forma fixa, sempre a mesma.
- _Hora que não existiu_ (quando o relógio avança): o resultado também é sempre o mesmo para a mesma entrada, mas vale conferir o resumo com a pessoa, porque essa hora de relógio não ocorreu naquele dia.
- _Datas antigas:_ antes da padronização dos fusos, o horário legal pode diferir do horário solar local. O banco IANA tem limites de precisão em datas muito antigas.

Por isso a tela de compra mostra um **resumo legível** ("14 de julho de 1995, 15h30 (UTC−3), Campinas, SP") para a pessoa conferir antes de pagar.

## 5. Passo 2: posição dos planetas

**Corpos calculados:** Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão (10 corpos), mais o **Nodo Norte médio** (um ponto, não um planeta).

**Como:** para cada corpo, a biblioteca `astronomy-engine` calcula o vetor geocêntrico do corpo no instante (`GeoVector`, com correção de tempo de luz e de aberração) e o converte para coordenadas **eclípticas da data** (`Ecliptic`). Fica-se com a **longitude eclíptica**, de 0° a 360°. A biblioteca cuida internamente do tempo terrestre, da precessão e da nutação.

- É a posição **aparente** do corpo, vista da Terra, que é a usada em astrologia.
- Não é uma tabela aproximada: o código resolve o modelo astronômico para o instante exato.

**Nodo Norte médio.** Calculado por fórmula, a partir de `T`, os séculos julianos desde o ano 2000 em tempo terrestre:

```
Nodo = 125,04452 − 1934,136261·T + 0,0020708·T² + T³/450000   (graus, normalizado em 0–360)
```

É o nodo **médio** (movimento suave), e não o nodo verdadeiro, que oscila em torno dele. O nodo médio sempre anda para trás pelo zodíaco, e por isso **não é marcado como retrógrado**.

## 6. Passo 3: retrogradação

Um planeta é marcado como **retrógrado** quando, olhando **12 horas antes** e **12 horas depois** do instante do nascimento, a longitude diminui:

```
retrógrado  ⇔  longitude(instante + 12 h) − longitude(instante − 12 h) < 0
```

Regras:

- Vale para Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão.
- **Sol e Lua nunca** são retrógrados.
- O Nodo Norte não é marcado (ver seção 5).
- A diferença é medida por menor ângulo com sinal, para funcionar na virada de 360° para 0°.
- Perto do momento exato em que o planeta "para" (estação), a janela de 24 horas decide de que lado ele fica. É uma convenção, e há mapas de referência que divergem nesses poucos dias.

## 7. Passo 4: Ascendente e Meio do Céu

Só são calculados **com hora de nascimento conhecida**.

**Entradas intermediárias:**

- **ε (obliquidade da eclíptica)**: inclinação do eixo da Terra, pela fórmula média `23,439291° − 0,0130042·T − 1,64·10⁻⁷·T² + 5,04·10⁻⁷·T³`.
- **RAMC (ascensão reta do Meio do Céu)**: o tempo sideral aparente de Greenwich (`SiderealTime`, em horas) vezes 15, mais a longitude do local.

**Fórmulas** (com φ a latitude do local, e ângulos em radianos):

```
Meio do Céu  =  atan2( sen RAMC , cos RAMC · cos ε )
Ascendente   =  atan2( cos RAMC , −( sen RAMC · cos ε + tan φ · sen ε ) )
```

O Ascendente é o ponto da eclíptica que está nascendo no horizonte leste; o Meio do Céu é o ponto mais alto, no meridiano. O Descendente é o Ascendente + 180°, e o Fundo do Céu é o Meio do Céu + 180°.

**Sensibilidade.** O Ascendente anda em média **1° a cada 4 minutos** de relógio (o ritmo varia com o signo e a latitude). Por isso a hora exata importa tanto, e por isso o texto da loja trata a hora como o dado mais importante do mapa.

## 8. Passo 5: as 12 casas

O sistema de casas é escolhido em `/admin/configuracoes` e vale para os próximos mapas. O padrão é **Placidus**. As casas são sempre numeradas de 1 a 12, no sentido anti-horário a partir do Ascendente.

| Sistema                           | Como as cúspides são definidas                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Placidus** (padrão)             | A casa 1 começa no Ascendente e a 10 no Meio do Céu. As cúspides 11, 12, 2 e 3 são encontradas por **aproximações sucessivas**: dividem em terços o arco que o ponto percorre entre o horizonte e o meridiano. As cúspides 5, 6, 8 e 9 são as opostas de 11, 12, 2 e 3. A casa 4 é o Fundo do Céu, e a 7, o Descendente. |
| **Casas iguais**                  | Cada casa tem 30°, a partir do Ascendente (a cúspide 1 é o Ascendente).                                                                                                                                                                                                                                                  |
| **Casas inteiras** (_whole sign_) | Cada signo é uma casa. A casa 1 é o signo inteiro do Ascendente, começando em 0° dele.                                                                                                                                                                                                                                   |

**Latitudes extremas.** Em latitude de **66° ou mais** (em módulo), o Placidus não existe matematicamente. O cálculo **cai automaticamente para casas inteiras** e registra o motivo no `chart_data` (`house_fallback_reason`), que aparece no mapa. Isso não afeta cidades brasileiras.

**Em que casa cai cada corpo.** Para cada planeta, o código procura a casa cuja cúspide fica imediatamente antes da longitude dele (considerando a volta de 360°). Planeta exatamente sobre a cúspide pertence à casa que começa ali.

## 9. Passo 6: signo e grau

Para qualquer longitude `L` (0° a 360°):

```
índice do signo = ⌊ L / 30 ⌋          (0 = Áries … 11 = Peixes)
grau no signo   = L − 30 · índice      (0° a 30°)
```

Os graus são mostrados com minutos **truncados** (não arredondados), como nos mapas de referência. Exemplo: 23,6333° vira `23°38′`.

## 10. Passo 7: aspectos

Aspectos **maiores** entre os **10 planetas** (o Nodo Norte e os ângulos não entram). Para cada par, mede-se a distância angular na eclíptica e vê-se se ela fica perto de um ângulo exato, dentro do **orbe** (tolerância):

| Aspecto    | Ângulo | Orbe máximo | Natureza |
| ---------- | ------ | ----------- | -------- |
| Conjunção  | 0°     | 8°          | fusão    |
| Sextil     | 60°    | 5°          | fluidez  |
| Quadratura | 90°    | 7°          | tensão   |
| Trígono    | 120°   | 7°          | fluidez  |
| Oposição   | 180°   | 8°          | tensão   |

- **Orbe** é a diferença entre o ângulo real e o ângulo exato do aspecto. Um par só forma **um** aspecto (o primeiro que couber).
- A lista sai **ordenada do aspecto mais exato para o menos exato**.
- São usados só os ângulos pela longitude. Não há aspectos por declinação, nem "aplicativo ou separativo", nem orbes maiores para Sol e Lua. Os orbes acima são uma convenção do projeto (PRD) e podem ser ajustados em `constants.ts`, desde que os testes sejam revistos.

## 11. Passo 8: regentes, elementos e modalidades

**Regentes.** Cada signo tem um regente moderno e um tradicional. Para cada casa, o regente é o do signo da cúspide, e o mapa informa também em que signo e em que casa esse regente está.

| Signo       | Regente moderno | Regente tradicional |
| ----------- | --------------- | ------------------- |
| Áries       | Marte           | Marte               |
| Touro       | Vênus           | Vênus               |
| Gêmeos      | Mercúrio        | Mercúrio            |
| Câncer      | Lua             | Lua                 |
| Leão        | Sol             | Sol                 |
| Virgem      | Mercúrio        | Mercúrio            |
| Libra       | Vênus           | Vênus               |
| Escorpião   | Plutão          | **Marte**           |
| Sagitário   | Júpiter         | Júpiter             |
| Capricórnio | Saturno         | Saturno             |
| Aquário     | Urano           | **Saturno**         |
| Peixes      | Netuno          | **Júpiter**         |

**Elementos e modalidades.** Contam-se **os 10 planetas** (o Nodo e os ângulos ficam de fora):

- Elementos: fogo (Áries, Leão, Sagitário), terra (Touro, Virgem, Capricórnio), ar (Gêmeos, Libra, Aquário), água (Câncer, Escorpião, Peixes).
- Modalidades: cardinal (Áries, Câncer, Libra, Capricórnio), fixo (Touro, Leão, Escorpião, Aquário), mutável (Gêmeos, Virgem, Sagitário, Peixes).

## 12. Quando a hora de nascimento é desconhecida

A pessoa pode comprar sem informar a hora, e é avisada antes do pagamento. Então:

- O mapa é calculado para **12:00 local** (meio-dia).
- **Não há** Ascendente, Meio do Céu, casas, regentes de casas, nem a casa dos planetas (`time_unknown: true`).
- Os planetas, retrogradação, aspectos, elementos e modalidades continuam sendo calculados.
- O texto gerado trata só o que existe. As seções que dependem de casas e ângulos viram uma explicação curta, sem usar a IA.

**Limitação importante:** a **Lua** anda cerca de 13° por dia. Calculada para o meio-dia, ela pode estar até uns 6° distante da posição real, e em dias em que muda de signo o signo pode ficar errado. Hoje o mapa **não avisa** isso à pessoa. Melhoria sugerida: detectar quando a Lua muda de signo naquele dia e dizer, no texto, que o signo lunar é incerto.

## 13. Resultado: o `chart_data`

O cálculo devolve um objeto com tudo o que o site precisa (e que é guardado no relatório):

- **Entrada usada:** data, hora, fuso, deslocamento UTC em minutos, latitude, longitude, sistema de casas pedido e o efetivamente usado, e se a hora é desconhecida.
- **Instante UTC** calculado.
- **Ascendente e Meio do Céu** (longitude, signo, grau).
- **Cúspides das 12 casas**, cada uma com regente moderno e tradicional.
- **Planetas e Nodo Norte:** longitude, signo, grau, casa e se é retrógrado.
- **Aspectos:** os dois corpos, o tipo, a natureza e o orbe.
- **Regentes de cada casa:** signo e casa onde o regente está (moderno e tradicional).
- **Contagem de elementos e de modalidades.**
- **Motivo de eventual troca de sistema de casas** (latitudes extremas).

A **roda do mapa** (SVG) e as **tabelas** da página do mapa são desenhadas a partir desses mesmos dados.

## 14. O que a IA recebe (e o que nunca recebe)

A IA recebe um **resumo em texto** gerado do `chart_data` (`lib/reports/chart-summary.ts`) com: sistema de casas, ângulos, planetas com signo, grau, casa e retrogradação, cúspides com regentes, aspectos **do mais exato para o menos exato, com a exatidão em palavras** ("praticamente exato", "bem próximo do exato", "próximo do exato", "menos exato"), as **concentrações** (planetas no mesmo signo ou casa, já contadas) e os elementos e modalidades com os nomes em cada grupo.

- A IA **não calcula nem recalcula nada**, incluindo contagens. Elas chegam prontas, porque a IA já errou contas simples.
- O resumo **não traz** nome, e-mail, data, hora, cidade, coordenadas nem fuso. Há teste automático que garante isso, em cumprimento à Política de Privacidade.
- Se a hora é desconhecida, o resumo avisa que ângulos e casas não existem, e a IA é instruída a não citá-los.

## 15. Validação e testes

Os testes ficam em `lib/astro/chart.test.ts` (Vitest) e **precisam passar a cada mudança** (`npm test`). A tolerância é de **±1′ de arco**.

| Caso                 | Entrada                                                               | Resultado esperado                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Referência 1         | 14/07/1995 15:30, America/Sao_Paulo, lat −22,91, lng −47,06, Placidus | Ascendente 23°38′ Sagitário; MC 11°08′ Virgem; Sol 21°51′ Câncer; Lua 23°59′ Aquário; cúspide da casa 2 em 17°45′ Capricórnio; Sol na casa 8; deslocamento −180 min                                       |
| Referência Personare | 13/07/1990 17:35 UTC, lat −23,30, lng −46,60, Placidus                | Ascendente 10°07′ Sagitário; MC 26°15′ Leão; casas 2 em 5°10′ Capricórnio, 3 em 29°23′ Capricórnio, 5 em 28°15′ Peixes e 6 em 4°35′ Touro; Urano 7°02′ Capricórnio na casa 2; Marte 0°45′ Touro na casa 5 |
| Casas iguais         | mesmo caso Personare                                                  | casa 2 em 10°07′ Capricórnio; Urano na casa 1                                                                                                                                                             |
| Horário de verão     | 15/01/1995 e 14/07/1995 ao meio-dia, America/Sao_Paulo                | deslocamentos −120 e −180 min                                                                                                                                                                             |
| Latitude polar       | qualquer data, lat 70, Placidus                                       | cai para casas inteiras e registra o motivo                                                                                                                                                               |
| Validação geométrica | 16 combinações de 4 cidades e 4 horários                              | altitude do Ascendente = 0° ± 0,05° e azimute a leste (0° a 180°)                                                                                                                                         |
| Hora desconhecida    | sem hora                                                              | sem Ascendente, MC e casas; calculado para 12:00                                                                                                                                                          |
| Estrutura            | vários                                                                | 10 planetas + Nodo; aspectos ordenados e dentro dos orbes; regentes moderno e tradicional; contagem dos 10 planetas; Mercúrio retrógrado em período conhecido; entradas inválidas recusadas               |

Como conferir um mapa **novo** contra outra fonte (Astro.com, Personare, etc.): usar a mesma data, hora **local**, cidade e sistema de casas, e comparar signo e grau. Diferenças de até 1′ são esperadas. Diferenças maiores quase sempre vêm de **outra hora, outro fuso/horário de verão, outra cidade ou outro sistema de casas**, e não do motor.

## 16. Precisão e limitações conhecidas

Dito com franqueza, para evitar promessas que o cálculo não cumpre:

1. **Precisão dos astros:** a biblioteca `astronomy-engine` declara concordância de cerca de 1′ de arco com referências como o JPL Horizons (confira na documentação da versão em uso, hoje `^2.1.19`). Os testes validam o resultado final contra mapas de mercado dentro de 1′.
2. **A cidade é um ponto, não o endereço.** Usamos a coordenada da cidade (para o Brasil, a sede do município). Dentro de uma cidade grande, a diferença de longitude pode mover o Ascendente em alguns minutos de arco.
3. **A hora de nascimento é a maior fonte de erro**, e quem informa nem sempre tem certeza (certidões às vezes arredondam). O Ascendente e as casas mudam rápido com ela.
4. **Fusos antigos:** a hora legal em datas muito antigas ou em regiões que mudaram de fuso pode divergir do que o banco IANA registra.
5. **Lua sem hora:** ver a seção 12.
6. **Nodo Norte médio**, e não o verdadeiro. É uma escolha comum, mas há astrólogos que usam o verdadeiro; a diferença é de até cerca de 1,5°.
7. **Obliquidade média com tempo sideral aparente:** a mistura é pequena (da ordem de segundos de arco) e está dentro da validação.
8. **Retrogradação por janela de 24 h:** ver a seção 6.
9. **Fora do escopo hoje:** Quíron, Lilith, asteroides, Pontos Árabes, aspectos menores, aspectos por declinação, trânsitos, revolução solar e sinastria. Os aspectos usam só a longitude.
10. **Placidus** perde sentido acima de 66° de latitude (tratado na seção 8).

## 17. Como mudar o motor com segurança

- **Não alterar `core.ts`** sem que todos os testes de referência continuem passando em ±1′. Ele é o "núcleo validado".
- **Mudanças de convenção** (orbes, sistema de casas padrão, regentes) ficam em `constants.ts` e em `/admin/configuracoes`. Mapas já entregues **não são recalculados**: cada relatório guarda o próprio `chart_data`.
- **Novo corpo ou ponto:** acrescentar em `constants.ts`, tratar no `computeChart`, escrever teste de referência com valor conhecido de uma fonte confiável, e só então mostrar na roda, nas tabelas e no resumo da IA. Lembrar que o resumo da IA e o prompt precisam saber tratar o novo item.
- **Toda mudança** exige `npm test`, e comparação com pelo menos uma fonte externa para um caso novo.

## 18. Referências

- Biblioteca de efemérides: [`astronomy-engine`](https://github.com/cosinekitty/astronomy) (documentação das funções `GeoVector`, `Ecliptic`, `SiderealTime`).
- Fórmulas de obliquidade, nodo médio e tempo sideral: Jean Meeus, _Astronomical Algorithms_.
- Banco de fusos horários: IANA Time Zone Database, via `Intl.DateTimeFormat`; busca de fuso por coordenada: [`tz-lookup`](https://github.com/darkskyapp/tz-lookup-oss).
- Casas: Placidus, Iguais e Inteiras (_Whole Sign_); consultar literatura astrológica de casas para a descrição de cada sistema.
