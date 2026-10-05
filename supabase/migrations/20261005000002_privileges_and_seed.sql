-- Carta Celeste — privilégios e dados iniciais (Etapa 3)

-- Defesa em profundidade: além da RLS, o cliente nem tem permissão de escrita
-- nas tabelas que só o servidor altera.
revoke all on public.user_roles from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.reports from anon, authenticated;
revoke insert, update, delete on public.cities from anon, authenticated;
revoke all on public.orders, public.reports, public.user_roles from anon;

-- ---------------------------------------------------------------------------
-- Configurações padrão
-- ---------------------------------------------------------------------------

insert into public.settings (key, value)
values ('default_house_system', '"placidus"'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Produtos iniciais (preços provisórios, editáveis no admin)
-- ---------------------------------------------------------------------------

insert into public.products (
  slug, name, short_description, long_description, price_cents,
  age_restricted, ai_instructions, report_sections, focus_points, sort_order
) values
(
  'mapa-astral-completo',
  'Mapa Astral Completo',
  'A leitura geral do seu céu de nascimento: Sol, Lua, Ascendente, planetas, casas e aspectos.',
  'O Mapa Astral Completo é a fotografia do céu no instante exato em que você nasceu, calculada com precisão astronômica a partir da sua data, hora e cidade de nascimento. Em vez de falar só do seu signo solar, ele une Sol, Lua, Ascendente, todos os planetas, as 12 casas e os aspectos principais em uma leitura única, escrita para você. Você recebe o relatório na sua área do cliente poucos minutos após a aprovação do pagamento.',
  4900,
  false,
  $t$Escreva uma leitura geral e equilibrada do mapa astral, cobrindo personalidade, emoções, relações, ação e crescimento. Conecte os símbolos entre si (por exemplo, Sol com Lua e Ascendente) em vez de descrevê-los isoladamente. Use exemplos do cotidiano e evite generalidades que serviriam para qualquer pessoa.$t$,
  $json$[
    {"key":"introducao","title":"Introdução ao seu mapa","instructions":"Apresente o mapa como um todo. Explique em poucas frases o que é um mapa astral e destaque os três ou quatro traços mais marcantes (elemento e modalidade predominantes, planetas em evidência, aspectos mais exatos) como um panorama do que vem a seguir."},
    {"key":"sol-lua-ascendente","title":"Sol, Lua e Ascendente","instructions":"Interprete o trio central: Sol (identidade e propósito), Lua (mundo emocional e necessidades) e Ascendente (modo de chegar ao mundo). Considere signo, casa e aspectos de cada um e mostre como conversam entre si."},
    {"key":"mente-comunicacao","title":"Mente e comunicação","instructions":"Interprete Mercúrio: como a pessoa pensa, aprende e se comunica. Considere signo, casa, retrogradação se houver e aspectos relevantes."},
    {"key":"amor-valores","title":"Amor e valores","instructions":"Interprete Vênus: o que a pessoa valoriza, como ama e se relaciona, o que considera belo e prazeroso. Considere signo, casa e aspectos."},
    {"key":"acao-desejo","title":"Ação e desejo","instructions":"Interprete Marte: energia, iniciativa, ambição e forma de lidar com conflitos. Considere signo, casa e aspectos."},
    {"key":"crescimento-desafios","title":"Crescimento e desafios","instructions":"Interprete Júpiter (expansão, confiança, oportunidades) e Saturno (responsabilidade, limites, amadurecimento) em signo, casa e aspectos. Apresente os desafios como caminhos de crescimento, sem tom de condenação."},
    {"key":"geracoes","title":"Gerações","instructions":"Interprete Urano, Netuno e Plutão. Explique que são planetas lentos, compartilhados por toda uma geração, e foque em como se manifestam na vida pessoal pela casa e pelos aspectos que formam com planetas pessoais."},
    {"key":"casas","title":"As 12 casas","instructions":"Percorra as 12 casas, uma frase ou duas para cada: signo na cúspide, regente da casa e planetas presentes. Se não houver planetas, comente o regente. Mantenha o texto fluido, sem virar apenas uma lista."},
    {"key":"aspectos","title":"Aspectos marcantes","instructions":"Escolha de cinco a oito aspectos de menor orbe entre os fornecidos e interprete cada um, indicando se é de fluidez (sextil, trígono), tensão (quadratura, oposição) ou fusão (conjunção)."},
    {"key":"sintese","title":"Síntese","instructions":"Feche o relatório costurando os temas principais em uma mensagem final acolhedora: forças, pontos de atenção e uma sugestão de reflexão para o momento atual. Sem previsões."}
  ]$json$::jsonb,
  $json$["Sol","Lua","Ascendente","Planetas","Casas","Aspectos"]$json$::jsonb,
  10
),
(
  'mapa-profissional',
  'Mapa Profissional',
  'Carreira, vocação e dinheiro: o que o seu céu diz sobre trabalho, talentos e prosperidade.',
  'O Mapa Profissional olha para o seu céu de nascimento com uma pergunta específica: onde está a sua vocação? A leitura se concentra no Meio do Céu e na casa 10 (carreira e reconhecimento), na casa 2 (dinheiro e recursos), na casa 6 (rotina de trabalho), e em Sol, Marte, Júpiter e Saturno, além do regente da casa 10. O resultado é um relatório prático, pensado para ajudar nas suas decisões de carreira, calculado com precisão astronômica e escrito para você.',
  6900,
  false,
  $t$Escreva uma leitura focada em carreira, vocação e dinheiro, em tom prático e encorajador. Priorize Meio do Céu, casas 2, 6 e 10, Sol, Saturno, Júpiter, Marte e o regente da casa 10. Não faça promessas de ganhos, não dê conselhos financeiros, de investimento ou jurídicos: apresente tendências e qualidades como material para reflexão.$t$,
  $json$[
    {"key":"vocacao","title":"Sua vocação","instructions":"Panorama da vocação: combine Sol (identidade e propósito), Meio do Céu e o regente da casa 10 para descrever o tipo de trabalho e de reconhecimento que faz sentido para a pessoa."},
    {"key":"meio-do-ceu","title":"Meio do Céu e casa 10","instructions":"Interprete o signo do Meio do Céu, planetas na casa 10 e o regente da casa 10 (signo, casa e aspectos). Fale sobre imagem pública, ambições e o que significa sucesso para a pessoa."},
    {"key":"dinheiro","title":"Dinheiro e recursos (casa 2)","instructions":"Interprete a casa 2: signo na cúspide, planetas presentes e regente. Fale sobre a relação com dinheiro, valor próprio e formas de gerar recursos, sem dar conselhos financeiros."},
    {"key":"rotina-trabalho","title":"Rotina e trabalho (casa 6)","instructions":"Interprete a casa 6: signo na cúspide, planetas presentes e regente. Fale sobre o dia a dia de trabalho, hábitos, ambiente ideal e relação com colegas e organização."},
    {"key":"talentos-acao","title":"Talentos e estilo de ação","instructions":"Interprete Marte e o Sol no contexto profissional: iniciativa, liderança, ritmo de trabalho e talentos naturais, com signo, casa e aspectos."},
    {"key":"saturno","title":"Desafios e amadurecimento (Saturno)","instructions":"Interprete Saturno: responsabilidades, medos profissionais, disciplina e o que se constrói a longo prazo. Apresente os desafios como caminho de amadurecimento."},
    {"key":"jupiter","title":"Oportunidades (Júpiter)","instructions":"Interprete Júpiter: onde a pessoa tende a crescer, encontrar apoio e sorte, e que tipo de oportunidades combinam com ela. Considere signo, casa e aspectos."},
    {"key":"sintese-proximos-passos","title":"Síntese e próximos passos","instructions":"Costure os pontos centrais em uma síntese e proponha de três a cinco perguntas ou reflexões práticas para orientar os próximos passos da carreira. Sem previsões."}
  ]$json$::jsonb,
  $json$["Meio do Céu","Casa 2","Casa 6","Casa 10","Sol","Saturno","Júpiter","Marte","Regente da casa 10"]$json$::jsonb,
  20
),
(
  'mapa-do-amor-e-sexo',
  'Mapa do Amor e Sexo',
  'Afetividade, desejo e relacionamentos: como você ama, deseja e se entrega.',
  'O Mapa do Amor e Sexo olha para o seu céu de nascimento com foco na vida afetiva: Vênus (como você ama), Marte (como você deseja e conquista), a Lua (o que você precisa para se sentir seguro), as casas 5 (romance e prazer), 7 (parcerias) e 8 (intimidade), e o regente da casa 7. A leitura tem linguagem adulta e respeitosa, sem conteúdo explícito, e é destinada exclusivamente a maiores de 18 anos.',
  6900,
  true,
  $t$Escreva uma leitura focada em afetividade, desejo e relacionamentos, com linguagem adulta, respeitosa e acolhedora, sem conteúdo explícito ou vulgar. Priorize Vênus, Marte, Lua, casas 5, 7 e 8 e o regente da casa 7. Não presuma gênero nem orientação da pessoa ou do(a) parceiro(a): use linguagem inclusiva. Não faça previsões sobre relacionamentos nem prometa resultados.$t$,
  $json$[
    {"key":"venus","title":"Como você ama (Vênus)","instructions":"Interprete Vênus: linguagem de amor, o que atrai e encanta, como a pessoa demonstra e recebe afeto. Considere signo, casa, retrogradação se houver e aspectos."},
    {"key":"marte","title":"Desejo e conquista (Marte)","instructions":"Interprete Marte: desejo, atração, iniciativa na conquista e forma de lidar com impulsos e conflitos na relação. Linguagem adulta, sem conteúdo explícito."},
    {"key":"lua","title":"Necessidades emocionais (Lua)","instructions":"Interprete a Lua: o que a pessoa precisa para se sentir segura e acolhida num relacionamento, como reage emocionalmente e como cuida do outro."},
    {"key":"casa-5","title":"Romance e prazer (casa 5)","instructions":"Interprete a casa 5: signo na cúspide, planetas presentes e regente. Fale sobre flerte, romance, criatividade e a capacidade de se divertir e sentir prazer."},
    {"key":"casa-7","title":"Parcerias (casa 7 e seu regente)","instructions":"Interprete a casa 7 e seu regente: o tipo de parceria que a pessoa busca, o que projeta no outro e como constrói compromisso. Use o regente da casa 7 (signo, casa e aspectos)."},
    {"key":"casa-8","title":"Intimidade e entrega (casa 8)","instructions":"Interprete a casa 8: confiança, vulnerabilidade, intimidade emocional e física, e o que é preciso para a pessoa se entregar de verdade. Linguagem adulta, sem conteúdo explícito."},
    {"key":"padroes-aspectos","title":"Padrões e aspectos","instructions":"Escolha os aspectos mais relevantes entre Vênus, Marte, Lua e os demais planetas e interprete os padrões que eles revelam na vida afetiva, apontando forças e pontos de atenção."},
    {"key":"sintese","title":"Síntese","instructions":"Feche costurando os temas principais em uma mensagem acolhedora sobre a forma de amar da pessoa e uma sugestão de reflexão. Sem previsões."}
  ]$json$::jsonb,
  $json$["Vênus","Marte","Lua","Casa 5","Casa 7","Casa 8","Regente da casa 7"]$json$::jsonb,
  30
)
on conflict (slug) do nothing;
