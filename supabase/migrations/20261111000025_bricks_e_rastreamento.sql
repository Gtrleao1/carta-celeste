-- Pagamento dentro do site (Checkout Bricks) e rastreamento de conversões.
--
-- 1) orders: meio de pagamento, último pagamento criado pelo Bricks (para não
--    cobrar duas vezes) e marca de que a conversão já foi enviada às plataformas.
-- 2) paid_via ganha o valor 'checkout': pagamento confirmado na hora em que foi
--    criado (cartão aprovado). 'webhook' e 'reconciliacao' seguem como antes.
-- 3) order_tracking: dados de atribuição (fbp, fbc, gclid, IP, navegador) e o
--    consentimento da pessoa. Dados pessoais: ninguém lê pelo navegador e a
--    linha é apagada quando a conta é excluída (o pedido fica anonimizado).
-- 4) tracking_events: registro de cada envio às plataformas (sem dados pessoais).

alter table public.orders
  add column payment_method text,
  add column mp_last_payment_id text,
  add column purchase_tracked_at timestamptz;

alter table public.orders drop constraint if exists orders_paid_via_check;
alter table public.orders
  add constraint orders_paid_via_check
  check (paid_via in ('webhook', 'reconciliacao', 'checkout'));

-- ---------------------------------------------------------------------------
-- Atribuição e consentimento por pedido
-- ---------------------------------------------------------------------------

create table public.order_tracking (
  order_id uuid primary key references public.orders (id) on delete cascade,
  consent_marketing boolean not null default false,
  fbp text,
  fbc text,
  gclid text,
  ga_client_id text,
  client_ip text,
  user_agent text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_tracking enable row level security;
revoke all on public.order_tracking from anon, authenticated;
grant select, insert, update, delete on public.order_tracking to service_role;

-- Pedido anonimizado (conta excluída): os dados de atribuição saem junto.
create or replace function public.order_tracking_clear_on_anonymize()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.order_tracking where order_id = new.id;
  return new;
end;
$$;

revoke all on function public.order_tracking_clear_on_anonymize() from public, anon, authenticated;

create trigger orders_anonymize_tracking
  after update of user_id on public.orders
  for each row
  when (old.user_id is not null and new.user_id is null)
  execute function public.order_tracking_clear_on_anonymize();

-- ---------------------------------------------------------------------------
-- Registro dos envios às plataformas
-- ---------------------------------------------------------------------------

create table public.tracking_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  platform text not null check (platform in ('meta', 'ga4')),
  event_name text not null,
  event_id text not null,
  status text not null check (status in ('sent', 'skipped', 'error')),
  detail text,
  created_at timestamptz not null default now()
);

create index tracking_events_order_idx on public.tracking_events (order_id);

alter table public.tracking_events enable row level security;
revoke all on public.tracking_events from anon, authenticated;
grant select, insert on public.tracking_events to service_role;
