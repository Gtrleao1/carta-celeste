-- Sol, Lua e Ascendente: todo aspecto apresentado termina com orientação, para
-- que a pessoa se esclareça, tome consciência e se sinta mais preparada.
update public.products
set report_sections = replace(
  report_sections::text,
  'com a mesma atenção dada às tensões.',
  'com a mesma atenção dada às tensões. Todo aspecto termina com orientação: nas tensões, atitudes que harmonizam as forças; nos trígonos e sextis, como usar e cultivar a facilidade e qual armadilha evitar (acomodar-se). A Lua merece o mesmo cuidado do Sol: explique cada um dos aspectos dela com clareza. O objetivo é que a pessoa se esclareça, tome consciência e se sinta mais preparada para lidar com cada tendência. Esta seção pode usar o limite superior de palavras.'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%com a mesma atenção dada às tensões.%'
  and report_sections::text not like '%A Lua merece o mesmo cuidado do Sol%';
