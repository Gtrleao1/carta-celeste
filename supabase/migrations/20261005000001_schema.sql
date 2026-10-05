-- Carta Celeste — esquema inicial (Etapa 3)
-- Oito tabelas, RLS ativado em todas. Escritas sensíveis (pedidos, relatórios)
-- só pelo servidor, com a service role key (que ignora a RLS).

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

-- unaccent não é IMMUTABLE; este invólucro permite usá-lo em coluna gerada.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- user_roles (só servidor) e is_admin()
-- ---------------------------------------------------------------------------

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;
-- Sem políticas: nenhum acesso pelo cliente. O servidor usa a service role key.

-- Verifica se quem chama é admin. SECURITY DEFINER para ler user_roles mesmo
-- sem política; só revela o papel do próprio usuário autenticado.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  long_description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  age_restricted boolean not null default false,
  required_people integer not null default 1 check (required_people >= 1),
  ai_instructions text not null default '',
  report_sections jsonb not null default '[]'::jsonb,
  focus_points jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;

create policy "products: leitura pública dos ativos"
  on public.products for select
  using (active or public.is_admin());
create policy "products: admin insere"
  on public.products for insert
  with check (public.is_admin());
create policy "products: admin atualiza"
  on public.products for update
  using (public.is_admin()) with check (public.is_admin());
create policy "products: admin apaga"
  on public.products for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  birth_date_of_buyer date,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: dono lê"
  on public.profiles for select
  using ((select auth.uid()) = id);
create policy "profiles: dono edita"
  on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- O dono não pode alterar o aceite de termos depois de gravado.
create or replace function public.protect_accepted_terms()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated'
     and old.accepted_terms_at is not null
     and new.accepted_terms_at is distinct from old.accepted_terms_at then
    new.accepted_terms_at = old.accepted_terms_at;
  end if;
  return new;
end;
$$;
create trigger profiles_protect_accepted_terms
  before update on public.profiles
  for each row execute function public.protect_accepted_terms();

-- Cria o perfil quando um usuário se cadastra. Nome e aceite vêm dos
-- metadados enviados pelo servidor no cadastro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, accepted_terms_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'accepted_terms_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- birth_profiles
-- ---------------------------------------------------------------------------

create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  birth_date date not null,
  birth_time time,
  time_unknown boolean not null default false,
  city_name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null,
  created_at timestamptz not null default now(),
  check (time_unknown = (birth_time is null))
);
create index birth_profiles_user_id_idx on public.birth_profiles (user_id);
alter table public.birth_profiles enable row level security;

create policy "birth_profiles: dono lê"
  on public.birth_profiles for select
  using ((select auth.uid()) = user_id);
create policy "birth_profiles: dono cria"
  on public.birth_profiles for insert
  with check ((select auth.uid()) = user_id);
create policy "birth_profiles: dono apaga"
  on public.birth_profiles for delete
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- orders (escrita só pelo servidor)
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Anulável: ao excluir a conta, o pedido fica anonimizado (fins fiscais).
  user_id uuid references auth.users (id) on delete set null,
  product_id uuid not null references public.products (id) on delete restrict,
  birth_profile_id uuid references public.birth_profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'generating', 'ready', 'failed', 'refunded', 'cancelled')),
  amount_cents integer not null check (amount_cents >= 0),
  mp_preference_id text,
  mp_payment_id text,
  age_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create unique index orders_mp_payment_id_key on public.orders (mp_payment_id)
  where mp_payment_id is not null;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();
alter table public.orders enable row level security;

create policy "orders: dono lê"
  on public.orders for select
  using ((select auth.uid()) = user_id);
-- Sem políticas de escrita: só o servidor (service role) altera pedidos.

-- ---------------------------------------------------------------------------
-- reports (escrita só pelo servidor)
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  chart_data jsonb,
  house_system text check (house_system in ('placidus', 'equal', 'whole')),
  sections jsonb not null default '[]'::jsonb,
  error text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_user_id_idx on public.reports (user_id);
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();
alter table public.reports enable row level security;

create policy "reports: dono lê"
  on public.reports for select
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- cities (leitura pública; carga feita por scripts/seed-cities.ts)
-- ---------------------------------------------------------------------------

create table public.cities (
  id bigint generated always as identity primary key,
  source text not null check (source in ('ibge', 'geonames')),
  source_id text not null,
  name text not null,
  -- "SP" para cidades brasileiras; nome do país para as demais.
  state_or_country text not null,
  country_code text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  population integer,
  -- Nome sem acento e em minúsculas, para a busca.
  search_name text generated always as (lower(public.immutable_unaccent(name))) stored,
  unique (source, source_id)
);
create index cities_search_name_idx on public.cities (search_name text_pattern_ops);
alter table public.cities enable row level security;

create policy "cities: leitura pública"
  on public.cities for select
  using (true);

-- Autocompletar: a partir de 2 letras, sem acento e sem diferenciar maiúsculas.
-- Cidades mais populosas primeiro.
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
  select c.id, c.name, c.state_or_country, c.country_code,
         c.latitude, c.longitude, c.timezone, c.population
  from public.cities c
  where length(trim(q)) >= 2
    and c.search_name like
      replace(replace(replace(lower(public.immutable_unaccent(trim(q))), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by c.population desc nulls last, c.name
  limit least(greatest(max_results, 1), 20);
$$;
grant execute on function public.search_cities(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------

create table public.settings (
  key text primary key,
  value jsonb not null
);
alter table public.settings enable row level security;

create policy "settings: leitura pública"
  on public.settings for select
  using (true);
create policy "settings: admin insere"
  on public.settings for insert
  with check (public.is_admin());
create policy "settings: admin atualiza"
  on public.settings for update
  using (public.is_admin()) with check (public.is_admin());
create policy "settings: admin apaga"
  on public.settings for delete
  using (public.is_admin());
