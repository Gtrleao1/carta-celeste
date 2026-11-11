import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createNotificationDeps } from "@/lib/payments/deps";
import {
  cancelMpPayment,
  createMpPayment,
  findMpPaymentIds,
  getMpPayment,
} from "@/lib/payments/mercadopago";
import { processPaymentNotification } from "@/lib/payments/notification";
import { reconcileOrder } from "@/lib/payments/reconcile";

import type { PayDeps, PayOrder } from "./pay";

/**
 * Dependências reais de `payOrder`. O pedido é lido com a sessão da pessoa
 * (RLS: só vê o que é seu); tudo o que escreve usa a service role.
 */
export function createPayDeps(opts: {
  userClient: SupabaseClient;
  admin: SupabaseClient;
  payerEmail: string;
  siteUrl: string;
  /** Chamado quando a reconciliação confirma um pagamento que o webhook não trouxe. */
  onReconciledPaid: (orderId: string) => void;
}): PayDeps {
  const { userClient, admin } = opts;

  return {
    async getOrder(orderId) {
      const { data } = await userClient
        .from("orders")
        .select("id, status, amount_cents, product_id, mp_last_payment_id")
        .eq("id", orderId)
        .maybeSingle();
      return (data as PayOrder | null) ?? null;
    },

    async getOrderStatus(orderId) {
      const { data } = await admin
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .maybeSingle();
      return data?.status ?? null;
    },

    async getProduct(productId) {
      const { data } = await admin
        .from("products")
        .select("name, active")
        .eq("id", productId)
        .maybeSingle();
      return data ?? null;
    },

    async reconcile(orderId) {
      const results = await reconcileOrder(orderId, {
        ...createNotificationDeps(admin, getMpPayment, "reconciliacao"),
        findPaymentIds: findMpPaymentIds,
      });
      if (results.some((r) => r.triggerJob)) opts.onReconciledPaid(orderId);
    },

    getPayment: getMpPayment,

    createPayment: (input) =>
      createMpPayment({
        ...input,
        payerEmail: opts.payerEmail,
        siteUrl: opts.siteUrl,
      }),

    cancelPayment: cancelMpPayment,

    async saveAttempt(orderId, attempt) {
      const { error } = await admin
        .from("orders")
        .update({
          mp_last_payment_id: attempt.paymentId,
          payment_method: attempt.paymentType,
          // Nova tentativa: o status da anterior (ex.: recusada) já não vale.
          mp_status: null,
          mp_status_detail: null,
        })
        .eq("id", orderId)
        .eq("status", "pending");
      if (error)
        throw new Error(`Erro ao registrar a tentativa: ${error.message}`);
    },

    confirm: (paymentId) =>
      processPaymentNotification(
        paymentId,
        createNotificationDeps(admin, getMpPayment, "checkout"),
      ),
  };
}
