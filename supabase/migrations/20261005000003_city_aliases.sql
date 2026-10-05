-- Busca de cidades também por nomes alternativos (ex.: "Lisboa" -> Lisbon).
-- O GeoNames guarda o nome principal em inglês; os alternativos incluem as
-- grafias em português. O Brasil (IBGE) não precisa de alternativos.

alter table public.cities
  add column alternate_names text,
  -- Cada nome alternativo precedido de "|", sem acento e em minúsculas.
  add column search_aliases text generated always as (
    lower(public.immutable_unaccent(coalesce(alternate_names, '')))
  ) stored;

create or replace function public.search_cities(q text, max_results integer default 8)
returns table (
  id bigint,
  name text,
  state_or_country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  timezone text,
  population integer
)
language sql
stable
set search_path = ''
as $$
  with p as (
    select replace(replace(replace(
      lower(public.immutable_unaccent(trim(q))), '\', '\\'), '%', '\%'), '_', '\_') as pat
  )
  select c.id, c.name, c.state_or_country, c.country_code,
         c.latitude, c.longitude, c.timezone, c.population
  from public.cities c, p
  where length(trim(q)) >= 2
    and (
      c.search_name like p.pat || '%'
      or c.search_aliases like '%|' || p.pat || '%'
    )
  order by
    (c.search_name like p.pat || '%') desc,
    c.population desc nulls last,
    c.name
  limit least(greatest(max_results, 1), 20);
$$;
grant execute on function public.search_cities(text, integer) to anon, authenticated;
