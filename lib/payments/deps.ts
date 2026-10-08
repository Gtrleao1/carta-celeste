import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getMpPayment } from "./mercadopago";
import type { NotificationDeps, OrderSnapshot } from "./notification";

/**
 * Dependências reais do webhook: pagamento consultado na API do Mercado Pago,
 * pedido lido e alterado no Supabase com a service role. As transições são
 * condicionais (`where status = ...`) para valerem mesmo com avisos simultâneos.
 */
export function createNotificationDeps(
  admin: SupabaseClient,
  getPayment: NotificationDeps["getPayment"] = getMpPayment,
  /** Quem está confirmando o pagamento; fica gravado em orders.paid_via. */
  source: "webhook" | "reconciliacao" = "webhook",
): NotificationDeps {
  return {
    getPayment,

    async getOrder(orderId) {
      const { data, error } = await admin
        .from("orders")
        .select("id, status, amount_cents")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw new Error(`Erro ao ler o pedido: ${error.message}`);
      return (data as OrderSnapshot | null) ?? null;
    },

    async recordPaymentStatus(orderId, payment) {
      const { error } = await admin
        .from("orders")
        .update({
          mp_status: payment.status,
          mp_status_detail: payment.statusDetail,
        })
        .eq("id", orderId)
        .eq("status", "pending");
      if (error)
        throw new Error(`Erro ao registrar o pagamento: ${error.message}`);
    },

    async markPaid(orderId, payment) {
      const { data, error } = await admin
        .from("orders")
        .update({
          status: "paid",
          mp_payment_id: payment.id,
          paid_via: source,
          mp_status: payment.status,
          mp_status_detail: payment.statusDetail,
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending")
        .select("id");
      if (error) throw new Error(`Erro ao marcar como pago: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },

    async markRefunded(orderId, payment) {
      const { data, error } = await admin
        .from("orders")
        .update({
          status: "refunded",
          mp_status: payment.status,
          mp_status_detail: payment.statusDetail,
        })
        .eq("id", orderId)
        .in("status", ["paid", "generating", "ready", "failed"])
        .select("id");
      if (error)
        throw new Error(`Erro ao marcar como reembolsado: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },
  };
}
