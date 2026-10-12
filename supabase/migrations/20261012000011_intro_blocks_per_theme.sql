-- Introdução do Mapa Astral Completo: cada traço vira um bloco de um só tema,
-- explicado só com os dados daquele traço (sem misturar Ascendente, outros
-- signos etc. num bloco sobre modalidades, por exemplo).
update public.products
set report_sections = replace(
  report_sections::text,
  'como um panorama do que vem a seguir.',
  'como um panorama do que vem a seguir. Dê a cada traço o seu próprio bloco (###) e explique-o apenas com os dados daquele traço, sem misturar com os outros: um bloco sobre modalidades fala só de modalidades; um sobre elemento, só de elemento.'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%como um panorama do que vem a seguir.%';
