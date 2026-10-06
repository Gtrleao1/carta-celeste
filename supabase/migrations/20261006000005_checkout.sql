-- Etapa 5: compra e pagamento.

-- Último status de pagamento visto pelo Mercado Pago (approved, rejected,
-- in_process…). O pedido continua `pending` quando o pagamento é recusado,
-- então este campo é o que permite mostrar "recusado" na página de retorno.
alter table public.orders
  add column mp_status text,
  add column mp_status_detail text;

-- ---------------------------------------------------------------------------
-- Limite de requisições (checkout e busca de cidades)
-- Guardado no banco para valer entre instâncias serverless.
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- Sem políticas: só o servidor (service role) acessa.
revoke all on public.rate_limits from anon, authenticated;

-- Conta uma requisição na janela atual e diz se ainda está dentro do limite.
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Limpeza eventual de janelas antigas.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 hour';
  end if;

  return v_count <= p_max;
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer)
  to service_role;
