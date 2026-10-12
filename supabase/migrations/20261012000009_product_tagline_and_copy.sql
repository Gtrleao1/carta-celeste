-- Carta Celeste — copy da landing page (v2)

-- A pergunta que cada mapa responde ("Quem eu sou?") aparece no cartão da
-- vitrine. Fica no produto, como o resto do texto, para que um produto novo
-- cadastrado no admin tenha a sua sem mexer em código.
alter table public.products
  add column if not exists tagline text not null default '';

-- Mantém o acesso por coluna da migração 8: o navegador só lê o que a vitrine usa.
grant select (tagline) on public.products to anon, authenticated;

-- Textos dos três produtos iniciais conforme a copy v2 (editáveis no admin).
update public.products set
  tagline = 'Quem eu sou?',
  short_description = 'O retrato completo do seu céu: Sol, Lua, Ascendente, planetas, casas e aspectos. Entenda sua personalidade, suas emoções e o jeito como você se mostra ao mundo.'
where slug = 'mapa-astral-completo';

update public.products set
  tagline = 'O que eu vim fazer?',
  short_description = 'Carreira, vocação e dinheiro. Descubra seus talentos naturais, o tipo de trabalho que te realiza e como você lida com prosperidade.'
where slug = 'mapa-profissional';

update public.products set
  tagline = 'Como eu amo?',
  short_description = 'Afeto, desejo e relacionamentos. Entenda o que te atrai, como você se entrega e o que você precisa para se sentir amado(a).'
where slug = 'mapa-do-amor-e-sexo';
