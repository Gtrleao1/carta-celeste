-- Carta Celeste — vocabulário: o produto é "mapa astral", nunca "relatório".
-- Ajusta os textos dos produtos iniciais que ainda usavam a palavra antiga.

update public.products
set long_description = replace(
  long_description,
  'O resultado é um relatório prático',
  'O resultado é um mapa astral prático'
)
where slug = 'mapa-profissional';

update public.products
set long_description = replace(
  long_description,
  'Você recebe o relatório na sua área do cliente',
  'Você recebe o seu mapa astral na sua área do cliente'
)
where slug = 'mapa-astral-completo';

-- Instrução de uma seção (vai para a IA, que repete o vocabulário no texto).
update public.products
set report_sections = replace(
  report_sections::text,
  'Feche o relatório costurando',
  'Feche o mapa astral costurando'
)::jsonb
where slug = 'mapa-astral-completo';
