import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { ACTION_LABEL } from "@/lib/admin/audit-labels";
import { formatBRL } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/**
 * Histórico das ações do admin (excluir, editar, reenviar, reprocessar). Para
 * pedidos excluídos é o que resta do registro: valor, status e datas, sem dado
 * pessoal do cliente.
 */
export default async function AuditPage() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("admin_audit_log")
    .select(
      "id, created_at, action, order_id, order_status, amount_cents, product_name, order_paid_at, detail",
    )
    .order("id", { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Histórico de ações
      </h1>
      <p className="text-muted-foreground text-sm">
        As últimas 100 ações do admin sobre pedidos e mapas. Não contém dados
        pessoais dos clientes.
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma ação registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Histórico de ações do admin</caption>
            <thead className="text-muted-foreground border-b">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Quando
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Ação
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Pedido
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Valor
                </th>
                <th scope="col" className="py-2 font-medium">
                  Pago em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-3">
                    {dateTime.format(new Date(r.created_at))}
                  </td>
                  <td className="py-2 pr-3">
                    {ACTION_LABEL[r.action] ?? r.action}
                    {r.detail && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {r.detail}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {r.action === "excluir_pedido" ? (
                      r.order_id.slice(0, 8)
                    ) : (
                      <Link
                        href={`/admin/pedidos/${r.order_id}`}
                        className="underline underline-offset-4"
                      >
                        {r.order_id.slice(0, 8)}
                      </Link>
                    )}
                  </td>
                  <td className="py-2 pr-3">{r.order_status ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {r.amount_cents === null ? "—" : formatBRL(r.amount_cents)}
                  </td>
                  <td className="py-2">
                    {r.order_paid_at
                      ? dateTime.format(new Date(r.order_paid_at))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
