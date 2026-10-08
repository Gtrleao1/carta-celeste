-- Etapa 6: geração do relatório por seções (retomável e segura em paralelo).

-- Trava de execução: enquanto `lock_until` estiver no futuro, só um job gera as
-- seções do relatório. Expira sozinha se a função for interrompida.
alter table public.reports add column lock_until timestamptz;

-- Grava UMA seção do relatório de forma atômica. Várias seções são escritas em
-- paralelo; um UPDATE único evita que uma sobrescreva a outra. Também soma os
-- tokens gastos (custo por pedido). Parâmetro nulo mantém o valor atual.
create or replace function public.report_apply_section(
  p_report_id uuid,
  p_key text,
  p_content text,
  p_status text,
  p_attempts integer,
  p_error text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reports r
  set
    sections = (
      select coalesce(
        jsonb_agg(
          case
            when e ->> 'key' = p_key then
              e || jsonb_strip_nulls(jsonb_build_object(
                'content', p_content,
                'status', p_status,
                'attempts', p_attempts,
                'error', p_error
              ))
            else e
          end
          order by ord
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(r.sections) with ordinality as t(e, ord)
    ),
    input_tokens = r.input_tokens + coalesce(p_input_tokens, 0),
    output_tokens = r.output_tokens + coalesce(p_output_tokens, 0)
  where r.id = p_report_id;
end;
$$;
revoke all on function public.report_apply_section(uuid, text, text, text, integer, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.report_apply_section(uuid, text, text, text, integer, text, integer, integer)
  to service_role;

-- Seções que dependem da hora de nascimento (casas e ângulos). Sem hora, elas
-- são trocadas por uma explicação curta, sem chamar a IA.
update public.products
set report_sections = (
  select jsonb_agg(
    case when s ->> 'key' = any (array['casas']) then s || '{"needs_houses": true}'::jsonb else s end
    order by ord
  )
  from jsonb_array_elements(report_sections) with ordinality as t(s, ord)
)
where slug = 'mapa-astral-completo';

update public.products
set report_sections = (
  select jsonb_agg(
    case when s ->> 'key' = any (array['meio-do-ceu', 'dinheiro', 'rotina-trabalho']) then s || '{"needs_houses": true}'::jsonb else s end
    order by ord
  )
  from jsonb_array_elements(report_sections) with ordinality as t(s, ord)
)
where slug = 'mapa-profissional';

update public.products
set report_sections = (
  select jsonb_agg(
    case when s ->> 'key' = any (array['casa-5', 'casa-7', 'casa-8']) then s || '{"needs_houses": true}'::jsonb else s end
    order by ord
  )
  from jsonb_array_elements(report_sections) with ordinality as t(s, ord)
)
where slug = 'mapa-do-amor-e-sexo';
