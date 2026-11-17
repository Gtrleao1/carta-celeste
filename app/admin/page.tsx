import Link from "next/link";

import { OrdersTable } from "@/components/admin/orders-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { nowMs } from "@/lib/admin/time";
import {
  ADMIN_STATUS_LABEL,
  ORDER_STATUSES,
  STUCK_AFTER_MS,
  isOrderStatus,
} from "@/lib/orders/labels";
import { estimateCostUsd } from "@/lib/reports/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZES = [25, 50, 100] as const;

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin">) {
  await requireAdmin();
  const params = await searchParams;
  const stuckFilter = params.status === "stuck";
  const status = isOrderStatus(params.status) ? params.status : null;
  const page = Math.max(
    1,
    Number.parseInt(String(params.page ?? "1"), 10) || 1,
  );
  // Pedidos por página (`?por=`): 25, 50 ou 100, que é também o teto de um lote.
  const requested = Number.parseInt(String(params.por ?? ""), 10);
  const PAGE_SIZE = PAGE_SIZES.find((n) => n === requested) ?? PAGE_SIZES[0];

  const admin = createAdminClient();
  const stuckBefore = new Date(nowMs() - STUCK_AFTER_MS).toISOString();

  let listQuery = admin
    .from("orders")
    .select(
      "id, status, amount_cents, created_at, paid_at, product:products(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) listQuery = listQuery.eq("status", status);
  if (stuckFilter) {
    listQuery = listQuery
      .in("status", ["paid", "generating"])
      .lt("paid_at", stuckBefore);
  }

  const [list, failed, stuck, counts, costs] = await Promise.all([
    listQuery,
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "generating"])
      .lt("paid_at", stuckBefore),
    Promise.all(
      ORDER_STATUSES.map((s) =>
        admin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", s),
      ),
    ),
    admin
      .from("reports")
      .select("input_tokens, output_tokens, orders!inner(status)")
      .eq("orders.status", "ready")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const orders = (list.data ?? []) as unknown as {
    id: string;
    status: string;
    amount_cents: number;
    created_at: string;
    paid_at: string | null;
    product: { name: string } | null;
  }[];
  const total = list.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reports = costs.data ?? [];
  const avgCost = reports.length
    ? reports.reduce(
        (sum, r) => sum + estimateCostUsd(r.input_tokens, r.output_tokens),
        0,
      ) / reports.length
    : null;

  const href = (next: {
    status?: string | null;
    page?: number;
    por?: number;
  }) => {
    const q = new URLSearchParams();
    const s =
      next.status === undefined
        ? stuckFilter
          ? "stuck"
          : status
        : next.status;
    if (s) q.set("status", s);
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const size = next.por ?? PAGE_SIZE;
    if (size !== PAGE_SIZES[0]) q.set("por", String(size));
    const qs = q.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>

      {((failed.count ?? 0) > 0 || (stuck.count ?? 0) > 0) && (
        <Alert variant="destructive">
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {(failed.count ?? 0) > 0 && (
                <li>
                  {failed.count} pedido(s) com falha na geração.{" "}
                  <Link
                    href="/admin?status=failed"
                    className="underline underline-offset-4"
                  >
                    Ver
                  </Link>
                </li>
              )}
              {(stuck.count ?? 0) > 0 && (
                <li>
                  {stuck.count} pedido(s) pago(s) há mais de 10 minutos sem mapa
                  astral pronto.{" "}
                  <Link
                    href="/admin?status=stuck"
                    className="underline underline-offset-4"
                  >
                    Ver
                  </Link>
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <p className="text-muted-foreground text-sm">
        {avgCost === null
          ? "Custo médio de IA por mapa astral: ainda sem mapas astrais prontos."
          : `Custo médio de IA por mapa astral: ≈ US$ ${avgCost.toFixed(2)} (últimos ${reports.length} prontos, estimativa).`}
      </p>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        <Link
          href={href({ status: null })}
          aria-current={status === null && !stuckFilter ? "page" : undefined}
          className={buttonVariants({
            variant: status === null && !stuckFilter ? "default" : "outline",
            size: "lg",
          })}
        >
          Todos
        </Link>
        {ORDER_STATUSES.map((s, i) => (
          <Link
            key={s}
            href={href({ status: s })}
            aria-current={status === s ? "page" : undefined}
            className={buttonVariants({
              variant: status === s ? "default" : "outline",
              size: "lg",
            })}
          >
            {ADMIN_STATUS_LABEL[s]} ({counts[i].count ?? 0})
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pedido neste filtro.</p>
      ) : (
        <OrdersTable
          orders={orders.map((o) => ({
            id: o.id,
            status: o.status,
            amount_cents: o.amount_cents,
            created_at: o.created_at,
            product_name: o.product?.name ?? null,
          }))}
        />
      )}

      <nav
        aria-label="Pedidos por página"
        className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm"
      >
        <span>Por página:</span>
        {PAGE_SIZES.map((n) => (
          <Link
            key={n}
            href={href({ por: n, page: 1 })}
            aria-current={n === PAGE_SIZE ? "page" : undefined}
            className={
              n === PAGE_SIZE
                ? "text-foreground font-semibold underline underline-offset-4"
                : "hover:text-foreground underline underline-offset-4"
            }
          >
            {n}
          </Link>
        ))}
      </nav>
      {lastPage > 1 && (
        <nav aria-label="Páginas" className="flex items-center gap-3">
          {page > 1 && (
            <Link
              href={href({ page: page - 1 })}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Anterior
            </Link>
          )}
          <span className="text-muted-foreground text-sm">
            Página {page} de {lastPage}
          </span>
          {page < lastPage && (
            <Link
              href={href({ page: page + 1 })}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Próxima
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
