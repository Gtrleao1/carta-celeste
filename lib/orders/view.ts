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

/** Estados em que nada mais vai mudar sozinho: pago, falha na geração, reembolso ou cancelamento. */
export const isFinal = (view: OrderView) =>
  view === "approved" ||
  view === "preparing_failed" ||
  view === "refunded" ||
  view === "cancelled";

/**
 * Se a página deve continuar consultando. "Recusado" NÃO é final: a pessoa pode
 * ter feito uma nova tentativa no Mercado Pago (por "Tentar de novo" ou
 * "Escolher outro meio") que foi aprovada, e o banco ainda guarda a recusa antiga.
 */
export const shouldKeepPolling = (view: OrderView) => !isFinal(view);

/** Mostra o indicador "atualizando": só enquanto a confirmação está de fato em andamento. */
export const isWaiting = (view: OrderView) =>
  view === "confirming" || view === "in_review";
