-- Escala e limpeza.
-- 1) Índice para a lista de pedidos do admin (filtro por status, mais novos primeiro)
--    e para o alerta de pedidos pagos que não ficaram prontos.
-- 2) Função que lista contas criadas e nunca confirmadas (e sem pedidos), usada pela
--    limpeza diária (/api/cron/limpeza). A limpeza só roda quando
--    UNCONFIRMED_ACCOUNT_TTL_DAYS está definido: o prazo é decisão do negócio.

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

create or replace function public.expired_unconfirmed_users(
  p_ttl_days integer,
  p_limit integer default 100
)
returns table (id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at < now() - make_interval(days => greatest(p_ttl_days, 1))
    -- nunca apaga quem já fez algum pedido
    and not exists (select 1 from public.orders o where o.user_id = u.id)
  order by u.created_at
  limit least(greatest(p_limit, 1), 500)
$$;

-- Só a chave de serviço (servidor) pode chamar: a função lê a tabela de usuários.
revoke all on function public.expired_unconfirmed_users(integer, integer)
  from public, anon, authenticated;
grant execute on function public.expired_unconfirmed_users(integer, integer)
  to service_role;
