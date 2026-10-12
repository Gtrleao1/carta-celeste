-- Sol, Lua e Ascendente: o bloco do Ascendente termina com orientação clara
-- sobre como a dinâmica aparece na vida, é percebida pelos outros e pode ser
-- usada a favor da pessoa.
update public.products
set report_sections = replace(
  report_sections::text,
  'Esta seção pode usar o limite superior de palavras.',
  'Esta seção pode usar o limite superior de palavras. No bloco do Ascendente, depois de apresentar o signo, o regente e os planetas na casa 1 quando houver, desenvolva em três partes curtas: (1) como essa dinâmica se manifesta na vida da pessoa, com situações do dia a dia; (2) como os outros tendem a percebê-la nos primeiros contatos e onde essa imagem pode diferir do que ela sente por dentro; (3) orientação prática, em tom de convite, de como usar essa dinâmica para melhorar a relação consigo mesma, com os outros e com os seus projetos de vida, com um exemplo simples para cada uma dessas três frentes.'
)::jsonb
where slug = 'mapa-astral-completo'
  and report_sections::text like '%Esta seção pode usar o limite superior de palavras.%'
  and report_sections::text not like '%No bloco do Ascendente, depois de apresentar%';
