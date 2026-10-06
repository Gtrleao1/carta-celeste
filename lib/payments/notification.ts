/**
 * Regras de negócio do webhook do Mercado Pago, sem depender de rede nem de
 * banco: tudo entra por `NotificationDeps`. Assim cada cenário (aprovado,
 * repetido, valor divergente, recusado…) é testável.
 *
 * O pedido só muda de estado depois que o servidor consulta o pagamento na API
 * do Mercado Pago; o aviso recebido, sozinho, nunca confirma nada.
 */

export type OrderStatus =
  | "pending"
  | "paid"
  | "generating"
  | "ready"
  | "failed"
  | "refunded"
  | "cancelled";

/** Pagamento já consultado na API do Mercado Pago. */
export type MpPayment = {
  id: string;
  /** approved, rejected, cancelled, in_process, pending, refunded, charged_back… */
  status: string;
  statusDetail: string | null;
  /** O id do nosso pedido (definido como external_reference na preferência). */
  externalReference: string | null;
  /** Valor da transação, em centavos (sem juros de parcelamento). */
  amountCents: number;
};

export type OrderSnapshot = {
  id: string;
  status: OrderStatus;
  amount_cents: number;
};

export type NotificationDeps = {
  getPayment(paymentId: string): Promise<MpPayment | null>;
  getOrder(orderId: string): Promise<OrderSnapshot | null>;
  /** Guarda o último status visto do pagamento (não muda o status do pedido). */
  recordPaymentStatus(orderId: string, payment: MpPayment): Promise<void>;
  /** pending -> paid de forma atômica. Devolve false se o pedido já não estava pending. */
  markPaid(orderId: string, payment: MpPayment): Promise<boolean>;
  /** Qualquer estado pago/entregue -> refunded. Devolve false se nada mudou. */
  markRefunded(orderId: string, payment: MpPayment): Promise<boolean>;
};

export type NotificationResult = {
  action:
    | "paid"
    | "already_processed"
    | "refunded"
    | "kept_pending"
    | "waiting"
    | "amount_mismatch"
    | "ignored";
  orderId?: string;
  reason?: string;
  /** Verdadeiro quando o relatório deve começar a ser gerado. */
  triggerJob: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ignored = (reason: string, orderId?: string): NotificationResult => ({
  action: "ignored",
  reason,
  orderId,
  triggerJob: false,
});

export async function processPaymentNotification(
  paymentId: string,
  deps: NotificationDeps,
): Promise<NotificationResult> {
  const payment = await deps.getPayment(paymentId);
  if (!payment) return ignored("payment_not_found");

  const orderId = payment.externalReference;
  if (!orderId || !UUID.test(orderId))
    return ignored("invalid_external_reference");

  const order = await deps.getOrder(orderId);
  if (!order) return ignored("order_not_found", orderId);

  // O valor pago precisa ser exatamente o do pedido, em qualquer status.
  if (payment.amountCents !== order.amount_cents) {
    return { action: "amount_mismatch", orderId, triggerJob: false };
  }

  switch (payment.status) {
    case "approved": {
      // Idempotência: pedido que já passou de pending não é tocado de novo.
      if (order.status !== "pending") {
        return { action: "already_processed", orderId, triggerJob: false };
      }
      const changed = await deps.markPaid(orderId, payment);
      return changed
        ? { action: "paid", orderId, triggerJob: true }
        : { action: "already_processed", orderId, triggerJob: false };
    }

    case "refunded":
    case "charged_back": {
      if (order.status === "pending" || order.status === "refunded") {
        return { action: "already_processed", orderId, triggerJob: false };
      }
      const changed = await deps.markRefunded(orderId, payment);
      return changed
        ? { action: "refunded", orderId, triggerJob: false }
        : { action: "already_processed", orderId, triggerJob: false };
    }

    case "rejected":
    case "cancelled": {
      // Mantém pending para uma nova tentativa; só registra o motivo.
      if (order.status === "pending")
        await deps.recordPaymentStatus(orderId, payment);
      return { action: "kept_pending", orderId, triggerJob: false };
    }

    default: {
      // pending, in_process, authorized, in_mediation…: aguardando.
      if (order.status === "pending")
        await deps.recordPaymentStatus(orderId, payment);
      return { action: "waiting", orderId, triggerJob: false };
    }
  }
}
