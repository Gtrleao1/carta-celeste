-- Instruções das seções do Mapa Astral Completo: aspectos que só existem em
-- alguns mapas passam a ser condicionais ("se houver..."). Antes, a seção
-- "Amor e valores" mandava tratar a quadratura Vênus-Lua em todo mapa, e quando
-- ela não existia a IA escrevia o título e depois desmentia o próprio texto
-- ("os dados não trazem uma quadratura..."). O mesmo padrão existia em
-- Mente e comunicação (Mercúrio com a Lua e com Marte), em Crescimento e
-- desafios (Júpiter com a Lua) e na Síntese (as "duas" necessidades).

update public.products
set report_sections = (
  select jsonb_agg(
    case s->>'key'
      when 'amor-valores' then jsonb_set(s, '{instructions}', to_jsonb(replace(
        s->>'instructions',
        'Quadratura de Vênus com a Lua: explique em palavras simples',
        'Se (e somente se) Vênus formar quadratura com a Lua nos dados do mapa, apresente-a num bloco próprio e explique em palavras simples'
      ) || ' Se não houver quadratura entre Vênus e a Lua, não fale dela: nem título, nem uma frase sobre a ausência.'))
      when 'mente-comunicacao' then jsonb_set(s, '{instructions}', to_jsonb(replace(replace(
        s->>'instructions',
        'Trígono ou sextil de Mercúrio com a Lua: destaque',
        'Se Mercúrio formar trígono ou sextil com a Lua, destaque'),
        'Quadratura de Mercúrio com Marte: mostre',
        'Se Mercúrio formar quadratura com Marte, mostre'
      ) || ' Aspecto que não está nos dados não ganha bloco nem menção.'))
      when 'crescimento-desafios' then jsonb_set(s, '{instructions}', to_jsonb(replace(
        s->>'instructions',
        'no trígono ou outro aspecto com a Lua, explique',
        'se Júpiter formar aspecto com a Lua, explique'
      )))
      when 'sintese' then jsonb_set(s, '{instructions}', to_jsonb(replace(
        s->>'instructions',
        '(2) o contrapeso entre as necessidades principais da pessoa, mostrando que as duas são legítimas e que nenhuma é defeito;',
        '(2) se o mapa mostrar duas forças principais que puxam para lados diferentes, o contrapeso entre elas, mostrando que as duas são legítimas e que nenhuma é defeito (se não mostrar, destaque o que sustenta a pessoa);'
      )))
      else s
    end
    order by ord
  )
  from jsonb_array_elements(public.products.report_sections) with ordinality as t(s, ord)
)
where slug = 'mapa-astral-completo';
