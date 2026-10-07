import {
  processPaymentNotification,
  type NotificationDeps,
  type NotificationResult,
} from "./notification";

export type ReconcileDeps = NotificationDeps & {
  /** Ids dos pagamentos do pedido no Mercado Pago, mais recentes primeiro. */
  findPaymentIds(orderId: string): Promise<string[]>;
};

const MAX_PAYMENTS = 5;

/**
 * Rede de segurança para webhook atrasado, perdido ou mal configurado: busca
 * os pagamentos do pedido no Mercado Pago e aplica a mesma regra do webhook
 * (`processPaymentNotification`): consulta confirmada na API, valor igual ao
 * do pedido e transição atômica e idempotente. Para no primeiro pagamento
 * que muda o pedido.
 */
export async function reconcileOrder(
  orderId: string,
  deps: ReconcileDeps,
): Promise<NotificationResult[]> {
  const ids = (await deps.findPaymentIds(orderId)).slice(0, MAX_PAYMENTS);
  const results: NotificationResult[] = [];
  for (const id of ids) {
    const result = await processPaymentNotification(id, deps);
    results.push(result);
    if (result.action === "paid" || result.action === "refunded") break;
  }
  return results;
}
