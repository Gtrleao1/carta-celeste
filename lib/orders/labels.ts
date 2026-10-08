export const ORDER_STATUSES = [
  "pending",
  "paid",
  "generating",
  "ready",
  "failed",
  "refunded",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Nomes para o admin. */
export const ADMIN_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  generating: "Gerando",
  ready: "Pronto",
  failed: "Falhou",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

/** Nomes para o cliente (sem jargão; "falhou" vira "finalizando"). */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando pagamento",
  paid: "Em preparo",
  generating: "Em preparo",
  ready: "Pronto",
  failed: "Estamos finalizando",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" &&
  (ORDER_STATUSES as readonly string[]).includes(value);

/** Pedidos pagos que ainda não ficaram prontos depois deste tempo viram alerta no admin. */
export const STUCK_AFTER_MS = 10 * 60 * 1000;
