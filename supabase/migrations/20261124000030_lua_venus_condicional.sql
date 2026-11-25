-- A seção "A sua Lua" ainda escrevia um bloco "Lua com Vênus" (falando em
-- tensão) em mapas sem nenhum aspecto entre os dois: a instrução era
-- condicional ("Quando a Lua formar quadratura com Vênus..."), mas fraca. Agora
-- o bloco só existe se o aspecto estiver nos dados.

update public.products
set report_sections = (
  select jsonb_agg(
    case s->>'key'
      when 'lua' then jsonb_set(s, '{instructions}', to_jsonb(replace(
        s->>'instructions',
        'Quando a Lua formar quadratura com Vênus, explique em palavras simples',
        'Somente se os dados trouxerem uma quadratura entre a Lua e Vênus, abra um bloco próprio para ela e explique em palavras simples'
      ) || ' Se a Lua NÃO tiver aspecto com Vênus nos dados, não escreva bloco, título nem frase sobre a Lua e Vênus, e não sugira tensão entre os dois: a relação entre eles pertence à seção de Vênus e só existe quando o aspecto existe.'))
      else s
    end
    order by ord
  )
  from jsonb_array_elements(public.products.report_sections) with ordinality as t(s, ord)
)
where slug = 'mapa-astral-completo';
