-- Mente e comunicação: cada bloco (signo, casa, regência, aspectos) fecha com
-- orientação, e o bloco da casa e da regência ajuda a pessoa a perceber as
-- relações de troca e conhecimento.
update public.products
set report_sections = replace(
  report_sections::text,
  'Considere signo, casa, retrogradação se houver e aspectos relevantes.',
  'Considere signo, casa, retrogradação se houver, regências e aspectos relevantes. Cada bloco (signo, casa, regência, aspectos) termina com orientação: o que a pessoa pode focar para expressar o melhor de Mercúrio ali e o que evitar; se o texto citar um desafio (como o orgulho intelectual em Leão), ele precisa de um caminho claro de como lidar com ele. No bloco da casa onde Mercúrio está e das casas que ele rege, dê clareza para que a pessoa preste mais atenção nas relações de troca e de conhecimento: como reconhecer quando uma troca flui e quando está travada, o que observar e o que evitar nessas conversas e aprendizados.'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%Considere signo, casa, retrogradação se houver e aspectos relevantes.%'
  and report_sections::text not like '%orgulho intelectual em Leão%';
