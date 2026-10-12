-- Mapa Astral Completo: "Sol, Lua e Ascendente" vira quatro seções (Sol, Lua,
-- Ascendente e o trio). Uma seção só não comporta o desenvolvimento e a
-- orientação desejados (estourava o limite de tamanho da resposta da IA), e
-- seções menores são escritas em paralelo.
update public.products p
set report_sections = (
  select jsonb_agg(x.e order by x.ord, x.sub)
  from (
    select t.ord, 0 as sub, t.s as e
    from jsonb_array_elements(p.report_sections) with ordinality as t(s, ord)
    where t.s ->> 'key' <> 'sol-lua-ascendente'
    union all
    select t.ord, n.sub, n.e
    from jsonb_array_elements(p.report_sections) with ordinality as t(s, ord),
    lateral (values
      (1, $j${"key":"sol","title":"O seu Sol","instructions":"Interprete o Sol: identidade, propósito e o que dá sentido à vida da pessoa, em signo, casa e aspectos. Apresente TODOS os aspectos do Sol listados (conjunção, oposição, quadratura, trígono e sextil), inclusive os harmônicos e os de orbe maior: cada aspecto ganha frases próprias dizendo o que o outro planeta representa, o que o aspecto traz e como isso aparece na vida da pessoa. Todo aspecto termina com orientação: nas tensões, atitudes que harmonizam as forças; nos trígonos e sextis, como usar e cultivar a facilidade e qual armadilha evitar (acomodar-se). O objetivo é que a pessoa se esclareça, tome consciência e se sinta mais preparada para lidar com cada tendência. Não interprete a Lua nem o Ascendente nesta seção."}$j$::jsonb),
      (2, $j${"key":"lua","title":"A sua Lua","instructions":"Interprete a Lua: mundo emocional, necessidades, o que dá segurança e a forma de cuidar e ser cuidado(a), em signo, casa e aspectos. Apresente TODOS os aspectos da Lua listados (conjunção, oposição, quadratura, trígono e sextil), inclusive os harmônicos e os de orbe maior: cada aspecto ganha frases próprias dizendo o que o outro planeta representa, o que o aspecto traz e como isso aparece na vida da pessoa. Todo aspecto termina com orientação: nas tensões, atitudes que harmonizam as forças; nos trígonos e sextis, como usar e cultivar a facilidade e qual armadilha evitar (acomodar-se). O objetivo é que a pessoa se esclareça, tome consciência e se sinta mais preparada para lidar com cada tendência. Não interprete o Sol nem o Ascendente nesta seção."}$j$::jsonb),
      (3, $j${"key":"ascendente","title":"O seu Ascendente","needs_houses":true,"instructions":"Interprete o Ascendente: o modo de chegar ao mundo e de ser percebido(a) à primeira vista. Apresente o signo, o regente (e onde ele está) e os planetas na casa 1, quando houver. Desenvolva em três partes curtas: (1) como essa dinâmica se manifesta na vida da pessoa, com situações do dia a dia; (2) como os outros tendem a percebê-la nos primeiros contatos e onde essa imagem pode diferir do que ela sente por dentro; (3) orientação prática, em tom de convite, de como usar essa dinâmica para melhorar a relação consigo mesma, com os outros e com os seus projetos de vida, com um exemplo simples para cada uma dessas três frentes. Não repita a interpretação do Sol e da Lua."}$j$::jsonb),
      (4, $j${"key":"trio","title":"Como o trio conversa","needs_houses":true,"instructions":"Mostre como o Sol, a Lua e o Ascendente conversam entre si, a partir dos signos e elementos deles. Não repita as interpretações individuais, já feitas nas seções anteriores. Desenvolva em quatro partes: (1) a dinâmica do trio: onde eles se complementam e onde se estranham; (2) como a pessoa pode perceber que eles estão DESALINHADOS: sinais concretos no dia a dia (comportamentos, emoções, reações do corpo, situações que se repetem); (3) como usar a consciência para reequilibrar essa dinâmica: de três a quatro práticas simples e específicas para este trio; (4) como perceber que eles estão ALINHADOS e como aproveitar esse momento: sinais de alinhamento e como usá-lo em decisões, relações e projetos. Tom de convite e de cuidado, sem diagnósticos."}$j$::jsonb)
    ) as n(sub, e)
    where t.s ->> 'key' = 'sol-lua-ascendente'
  ) as x
)
where p.slug = 'mapa-astral-completo'
  and exists (
    select 1 from jsonb_array_elements(p.report_sections) as s
    where s ->> 'key' = 'sol-lua-ascendente'
  );
