-- Registra quem confirmou o pagamento: o webhook do Mercado Pago ou a
-- reconciliação (consulta feita pelo servidor quando o webhook não chegou).
-- Serve para acompanhar a saúde do webhook em produção.
alter table public.orders
  add column paid_via text check (paid_via in ('webhook', 'reconciliacao'));
