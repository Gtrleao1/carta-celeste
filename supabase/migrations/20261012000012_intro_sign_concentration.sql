-- Introdução do Mapa Astral Completo: como escrever o bloco de uma concentração
-- de planetas em um signo (3 ou mais), sempre dentro do tema do signo.
update public.products
set report_sections = replace(
  report_sections::text,
  'um sobre elemento, só de elemento.',
  'um sobre elemento, só de elemento. Se as CONCENTRAÇÕES trouxerem 3 ou mais planetas no mesmo signo, esse signo ganha um bloco próprio: abra apresentando o signo e a concentração (nomeie TODOS os planetas listados, com o número batendo), desenvolva mostrando como o signo se manifesta na função de cada um desses planetas (um parágrafo curto por planeta: o que ele representa, como o signo colore essa função e um exemplo do dia a dia) e conclua resumindo como esse signo influencia a vida da pessoa. Dentro desse bloco, não cite casas, aspectos, Ascendente, Nodo Norte nem outros signos.'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%um sobre elemento, só de elemento.%'
  and report_sections::text not like '%esse signo ganha um bloco próprio%';
