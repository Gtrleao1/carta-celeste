-- Carta Celeste — Etapa 7: painel admin e instruções de IA só no servidor

-- ---------------------------------------------------------------------------
-- 1) Instruções de IA fora do alcance da API pública
--
-- `ai_instructions` e as instruções de cada seção (dentro de `report_sections`)
-- eram legíveis por quem consultasse a API com a chave anônima. Agora o acesso
-- aos produtos é por coluna: o navegador só enxerga o que a vitrine mostra.
-- O painel admin lê e grava tudo pelo servidor (service role).
-- ---------------------------------------------------------------------------

-- Só chave e título de cada seção: é o que a vitrine mostra em "o que inclui".
alter table public.products
  add column if not exists section_titles jsonb not null default '[]'::jsonb;

create or replace function public.products_sync_section_titles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.section_titles := case
    when jsonb_typeof(new.report_sections) = 'array' then coalesce(
      (
        select jsonb_agg(jsonb_build_object('key', s ->> 'key', 'title', s ->> 'title'))
        from jsonb_array_elements(new.report_sections) as s
      ),
      '[]'::jsonb
    )
    else '[]'::jsonb
  end;
  return new;
end;
$$;

drop trigger if exists products_sync_section_titles on public.products;
create trigger products_sync_section_titles
  before insert or update of report_sections on public.products
  for each row execute function public.products_sync_section_titles();

-- Preenche as linhas que já existem.
update public.products set report_sections = report_sections;

revoke select on public.products from anon, authenticated;
grant select (
  id, slug, name, short_description, long_description, price_cents, active,
  age_restricted, required_people, focus_points, sort_order, created_at,
  sample_excerpt, section_titles
) on public.products to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Reprocessar um pedido (admin)
--
-- Devolve ao estado "pendente" as seções que não terminaram (zera tentativas e
-- erro), limpa o erro do relatório e põe o pedido em `generating`. Seções
-- prontas ficam como estão. Não passa por `paid`, para não repetir o e-mail de
-- "pagamento confirmado". Retorna false se o pedido não pode ser reprocessado.
-- ---------------------------------------------------------------------------

create or replace function public.report_reprocess(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moved integer;
begin
  update public.orders
     set status = 'generating'
   where id = p_order_id
     and status in ('paid', 'generating', 'failed');
  get diagnostics v_moved = row_count;
  if v_moved = 0 then
    return false;
  end if;

  update public.reports
     set sections = coalesce(
           (
             select jsonb_agg(
               case
                 when s ->> 'status' = 'done' then s
                 else (s || '{"status":"pending","attempts":0}'::jsonb) - 'error'
               end
               order by ord
             )
             from jsonb_array_elements(sections) with ordinality as t(s, ord)
           ),
           '[]'::jsonb
         ),
         error = null
   where order_id = p_order_id;

  return true;
end;
$$;

revoke all on function public.report_reprocess(uuid) from public, anon, authenticated;
grant execute on function public.report_reprocess(uuid) to service_role;
