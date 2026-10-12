-- Ação e desejo (Marte): orientação clara para a pessoa perceber quais projetos
-- combinam com o que ela realmente deseja e quando mudar de rota ou persistir.
-- (Sem aspas duplas no texto: ele é gravado dentro de um JSON.)
update public.products
set report_sections = replace(
  report_sections::text,
  'Interprete Marte: energia, iniciativa, ambição e forma de lidar com conflitos. Considere signo, casa e aspectos.',
  'Interprete Marte: energia, iniciativa, ambição e forma de lidar com conflitos. Considere signo, casa e aspectos. Cada bloco termina com orientação concreta, sem frases vagas ou figuradas. Mostre que a pessoa rende mais quando age a partir do que realmente deseja e ajude-a a PERCEBER quais projetos combinam com ela e quais não: (a) sinais de que um projeto está alinhado ao desejo (a energia sobe, ela começa sem precisar ser cobrada, o tempo passa sem peso, persiste diante de obstáculos); (b) sinais de que não está (adiamento constante, cansaço antes de começar, fazer só por obrigação ou para agradar); (c) um exercício simples: listar os projetos atuais e responder, para cada um, “eu escolheria isso de novo?”, “o que sinto ao começar?” e “o que me faria continuar?”; (d) o que evitar, como se comprometer por culpa ou por impulso do momento. No bloco sobre ambição e persistência, feche com orientação de COMO PERCEBER QUANDO É HORA DE MUDAR A ROTA E QUANDO É HORA DE PERSISTIR: sinais de que vale persistir (o objetivo ainda faz sentido, há progresso mesmo que lento, o obstáculo é de método e não de propósito) e sinais de que é hora de mudar (a razão original deixou de existir, o custo supera o ganho há muito tempo, só se continua por orgulho ou hábito); sugira marcar uma data para rever o plano e perguntar: se eu estivesse começando hoje, escolheria isso?'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%Interprete Marte: energia, iniciativa, ambição e forma de lidar com conflitos. Considere signo, casa e aspectos.%'
  and report_sections::text not like '%PERCEBER quais projetos combinam%';
