-- Sol, Lua e Ascendente (Mapa Astral Completo): todo aspecto principal do corpo
-- é apresentado por inteiro, harmônicos incluídos (ex.: trígono Sol-Plutão).
update public.products
set report_sections = replace(
  report_sections::text,
  'Considere signo, casa e aspectos de cada um e mostre como conversam entre si.',
  'Considere signo, casa e aspectos de cada um e mostre como conversam entre si. Para o Sol e para a Lua, apresente TODOS os aspectos listados que os envolvam (conjunção, oposição, quadratura, trígono e sextil), inclusive os harmônicos e os de orbe maior: cada aspecto ganha frases próprias dizendo o que o outro planeta representa, o que o aspecto traz e como isso aparece na vida da pessoa. Um trígono ou sextil deve ser mostrado como um talento ou facilidade, com a mesma atenção dada às tensões.'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%mostre como conversam entre si.%'
  and report_sections::text not like '%apresente TODOS os aspectos listados%';
