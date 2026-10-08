import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/email/send";
import { paymentConfirmedEmail, reportReadyEmail } from "@/lib/email/templates";

import type { Notifier, OrderRow } from "./generate";

/** E-mails do pedido: "pagamento confirmado" e "seu mapa está pronto". */
export function createNotifier(
  admin: SupabaseClient,
  siteUrl: string,
): Notifier {
  async function recipient(order: OrderRow) {
    if (!order.user_id) return null;
    const { data } = await admin.auth.admin.getUserById(order.user_id);
    const email = data.user?.email;
    if (!email) return null;
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] ?? "";
    const { data: product } = await admin
      .from("products")
      .select("name")
      .eq("id", order.product_id)
      .maybeSingle();
    return { email, firstName, productName: product?.name ?? "seu mapa" };
  }

  return {
    async paymentConfirmed(order) {
      const r = await recipient(order);
      if (!r) return;
      await sendEmail(
        r.email,
        paymentConfirmedEmail({
          firstName: r.firstName,
          productName: r.productName,
          orderUrl: `${siteUrl}/pedido/${order.id}/retorno`,
        }),
      );
    },

    async reportReady(order) {
      const r = await recipient(order);
      if (!r) return;
      await sendEmail(
        r.email,
        reportReadyEmail({
          firstName: r.firstName,
          productName: r.productName,
          // A página do relatório é da Etapa 7 (/meus-mapas/[id]).
          reportUrl: `${siteUrl}/meus-mapas/${order.id}`,
        }),
      );
    },
  };
}
