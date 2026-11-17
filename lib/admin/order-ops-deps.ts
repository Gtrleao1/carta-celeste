import "server-only";

import { after } from "next/server";

import type {
  AuditEntry,
  BulkDeps,
  OrderLite,
  ResendResult,
} from "@/lib/admin/order-ops";
import { sendEmail } from "@/lib/email/send";
import { reportReadyEmail } from "@/lib/email/templates";
import { triggerReportGeneration } from "@/lib/jobs/trigger";
import { withinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

/** Grava no histórico do admin (sem nenhum dado pessoal do cliente). */
export async function writeAudit(adminId: string, entry: AuditEntry) {
  const { error } = await createAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_id: adminId,
      action: entry.action,
      order_id: entry.order.id,
      order_status: entry.order.status,
      amount_cents: entry.order.amount_cents,
      product_name: entry.order.product_name,
      order_created_at: entry.order.created_at,
      order_paid_at: entry.order.paid_at,
      detail: entry.detail?.slice(0, 200) ?? null,
    });
  // O histórico nunca derruba a ação: falha só vai para o log do servidor.
  if (error) console.error("[admin] erro ao gravar histórico:", error.message);
}

/** Reenvia o aviso "seu mapa está pronto" ao comprador do pedido. */
async function resendReadyEmail(order: OrderLite): Promise<ResendResult> {
  const admin = createAdminClient();

  // No máximo 3 reenvios por pedido por hora (evita e-mail em excesso ao cliente).
  if (!(await withinRateLimit(admin, `reenvio-mapa:${order.id}`, 3, 3600))) {
    return "limite";
  }

  const { data: row } = await admin
    .from("orders")
    .select("user_id")
    .eq("id", order.id)
    .maybeSingle();
  if (!row?.user_id) return "sem_conta";

  const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
  const email = userData.user?.email;
  if (!email) return "sem_conta";

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", row.user_id)
    .maybeSingle();
  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] ?? "";

  const siteUrl = await getSiteUrl();
  const result = await sendEmail(
    email,
    reportReadyEmail({
      firstName,
      productName: order.product_name ?? "seu mapa",
      reportUrl: `${siteUrl}/meus-mapas/${order.id}`,
    }),
  );
  if (result.sent) return "enviado";
  return result.reason === "sem_chave" ? "sem_chave" : "erro";
}

/** Dependências reais das ações de pedido do admin (service role). */
export function createOrderOpsDeps(adminId: string): BulkDeps {
  const admin = createAdminClient();
  return {
    async loadOrders(ids) {
      const { data } = await admin
        .from("orders")
        .select(
          "id, status, amount_cents, created_at, paid_at, product:products(name)",
        )
        .in("id", ids);
      return (
        (data ?? []) as unknown as (Omit<OrderLite, "product_name"> & {
          product: { name: string } | null;
        })[]
      ).map(({ product, ...o }) => ({
        ...o,
        product_name: product?.name ?? null,
      }));
    },
    resend: resendReadyEmail,
    async remove(order) {
      // Mapa, rastreamento e eventos de conversão saem junto (ON DELETE CASCADE).
      const { error } = await admin.from("orders").delete().eq("id", order.id);
      if (error)
        console.error("[admin] erro ao excluir pedido:", error.message);
      return !error;
    },
    async reprocess(order) {
      const { data: moved, error } = await admin.rpc("report_reprocess", {
        p_order_id: order.id,
      });
      if (error || moved !== true) return false;
      after(() => triggerReportGeneration(order.id));
      return true;
    },
    audit: (entry) => writeAudit(adminId, entry),
  };
}
