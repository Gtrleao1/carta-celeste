import { afterOrderPaid } from "@/lib/orders/on-paid";
import { createNotificationDeps } from "@/lib/payments/deps";
import { processPaymentNotification } from "@/lib/payments/notification";
import { handleMercadoPagoWebhook } from "@/lib/payments/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  return handleMercadoPagoWebhook(request, {
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    process: async (paymentId) => {
      const result = await processPaymentNotification(
        paymentId,
        createNotificationDeps(createAdminClient()),
      );
      if (result.triggerJob && result.orderId) {
        // Depois de responder 200: gerar o mapa e avisar as plataformas.
        afterOrderPaid(result.orderId);
      }
      return result;
    },
  });
}
