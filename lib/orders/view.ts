/**
 * Como a página de retorno do pagamento descreve o pedido. Decidido só com o
 * que está no banco (status do pedido e último status do Mercado Pago), nunca
 * com parâmetros da URL.
 */
export type OrderView =
  | "confirming" // ainda sem notícia do Mercado Pago
  | "in_review" // pagamento em análise (Pix/boleto aguardando, cartão em revisão)
  | "approved" // pago: o relatório está sendo preparado
  | "preparing_failed" // pago, mas a geração falhou: "estamos finalizando"
  | "declined" // recusado: dá para tentar de novo
  | "refunded"
  | "cancelled";

export function orderView(status: string, mpStatus: string | null): OrderView {
  switch (status) {
    case "paid":
    case "generating":
    case "ready":
      return "approved";
    case "failed":
      return "preparing_failed";
    case "refunded":
      return "refunded";
    case "cancelled":
      return "cancelled";
    default: // pending
      if (mpStatus === "rejected" || mpStatus === "cancelled")
        return "declined";
      if (mpStatus) return "in_review";
      return "confirming";
  }
}

/** Quando parar de consultar o banco: pago, recusado ou encerrado. */
export const isSettled = (view: OrderView) =>
  view === "approved" ||
  view === "preparing_failed" ||
  view === "declined" ||
  view === "refunded" ||
  view === "cancelled";
