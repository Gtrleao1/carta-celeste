-- Histórico das ações do admin sobre pedidos e mapas (excluir, editar, reenviar,
-- reprocessar). Existe para prestar contas e para guardar o mínimo do registro
-- de um pedido excluído (valor, status e datas), sem nenhum dado pessoal do
-- cliente (nem e-mail, nem nome, nem nascimento).
--
-- Só o servidor (chave de serviço) lê e escreve: RLS ligada, sem política e sem
-- permissão para anon/authenticated.

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- Quem fez (usuário admin). Sem FK: o histórico sobrevive à exclusão da conta.
  admin_id uuid not null,
  action text not null check (
    action in (
      'excluir_pedido',
      'editar_secao',
      'reenviar_mapa',
      'reprocessar_pedido'
    )
  ),
  -- Id do pedido (sem FK: o pedido pode ter sido excluído).
  order_id uuid not null,
  -- Estado do pedido no momento da ação.
  order_status text,
  amount_cents integer,
  product_name text,
  order_created_at timestamptz,
  order_paid_at timestamptz,
  -- Detalhe curto e sem dado pessoal (ex.: chave da seção editada).
  detail text check (detail is null or char_length(detail) <= 200)
);

create index admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index admin_audit_log_order_idx
  on public.admin_audit_log (order_id);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated;
grant all on table public.admin_audit_log to service_role;
