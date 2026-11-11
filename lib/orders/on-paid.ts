import "server-only";

import { after } from "next/server";

import { triggerReportGeneration } from "@/lib/jobs/trigger";
import { sendServerPurchase } from "@/lib/tracking/send";

/**
 * Tudo o que acontece quando um pedido vira `paid`, não importa quem o
 * confirmou (webhook, reconciliação ou o próprio pagamento no site). Roda
 * depois da resposta (`after`), para não atrasar quem chamou.
 */
export function afterOrderPaid(orderId: string) {
  after(() => triggerReportGeneration(orderId));
  // Avisa Meta e Google (só se a pessoa aceitou cookies); nunca lança erro.
  after(() => sendServerPurchase(orderId));
}
