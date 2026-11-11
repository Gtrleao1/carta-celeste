import type { MpPaymentDetail } from "@/lib/payments/mercadopago";
import type { NotificationResult } from "@/lib/payments/notification";

import type { PaymentForm } from "./schemas";

/** Pedido como o pagamento o enxerga (lido com a sessão da pessoa, sob a RLS). */
export type PayOrder = {
  id: string;
  status: string;
  amount_cents: number;
  product_id: string;
  mp_last_payment_id: string | null;
};

/**
 * Tudo o que o pagamento faz fora de si mesmo entra por aqui, para que cada
 * cenário (cobrança duplicada, troca de meio, recusa…) seja testável sem rede.
 */
export type PayDeps = {
  /** `null` se o pedido não existe ou não é da pessoa. */
  getOrder(orderId: string): Promise<PayOrder | null>;
  getOrderStatus(orderId: string): Promise<string | null>;
  getProduct(
    productId: string,
  ): Promise<{ name: string; active: boolean } | null>;
  /** Confere no Mercado Pago se o pedido já tem pagamento aprovado e, se tiver, marca como pago. */
  reconcile(orderId: string): Promise<void>;
  getPayment(paymentId: string): Promise<MpPaymentDetail | null>;
  createPayment(input: {
    orderId: string;
    amountCents: number;
    description: string;
    form: PaymentForm;
    idempotencyKey: string;
  }): Promise<MpPaymentDetail>;
  cancelPayment(paymentId: string): Promise<void>;
  saveAttempt(
    orderId: string,
    attempt: { paymentId: string; paymentType: string | null },
  ): Promise<void>;
  /** Consulta o pagamento na API e aplica a regra do webhook (aprovado -> pago). */
  confirm(paymentId: string): Promise<NotificationResult>;
};

export type PayResult =
  | {
      ok: true;
      /** Status do pagamento no Mercado Pago. */
      status: string;
      statusDetail: string | null;
      paymentId: string;
      /** O pedido virou `paid` agora: o relatório deve começar a ser gerado. */
      triggerJob: boolean;
      /** Esta chamada reaproveitou um pagamento que já estava em andamento. */
      reused: boolean;
    }
  | { ok: false; status: number; error: string };

const fail = (status: number, error: string): PayResult => ({
  ok: false,
  status,
  error,
});

/** Estados em que o pagamento ainda pode ser concluído pela pessoa. */
const OPEN = new Set(["pending", "in_process", "authorized"]);

const PAYMENT_ERROR =
  "Não foi possível processar o pagamento agora. Tente de novo em instantes.";

/**
 * Cria o pagamento de um pedido pendente com os dados do Payment Brick.
 *
 * Proteções contra cobrança dupla:
 *  1. confere no Mercado Pago se o pedido já foi pago antes de abrir outro;
 *  2. se há um Pix/boleto em aberto do mesmo meio, devolve esse (não cria outro);
 *  3. se a pessoa trocou de meio, cancela o pendente antes; se não der, recusa;
 *  4. a chave de idempotência inclui o pagamento anterior: clique duplo no
 *     mesmo envio devolve o mesmo pagamento.
 *
 * O pedido só vira `paid` por `deps.confirm`, que consulta o pagamento na API e
 * confere o valor, a mesma regra do webhook.
 */
export async function payOrder(
  orderId: string,
  form: PaymentForm,
  deps: PayDeps,
): Promise<PayResult> {
  const order = await deps.getOrder(orderId);
  if (!order) return fail(404, "Pedido não encontrado.");
  if (order.status !== "pending") {
    return fail(409, "Este pedido já foi pago ou encerrado.");
  }

  const product = await deps.getProduct(order.product_id);
  if (!product?.active) {
    return fail(409, "Este mapa não está disponível no momento.");
  }

  try {
    await deps.reconcile(orderId);
  } catch (e) {
    // Sem poder conferir, é mais seguro não abrir outro pagamento.
    console.error(
      "[pagamento] falha ao conferir o pedido antes de cobrar:",
      e instanceof Error ? e.message : "erro desconhecido",
    );
    return fail(502, PAYMENT_ERROR);
  }
  const current = await deps.getOrderStatus(orderId);
  if (current !== "pending") {
    return fail(
      409,
      "Encontramos um pagamento aprovado para este pedido. Não é preciso pagar de novo.",
    );
  }

  try {
    const previous = order.mp_last_payment_id
      ? await deps.getPayment(order.mp_last_payment_id)
      : null;

    if (previous && OPEN.has(previous.status)) {
      if (previous.paymentMethodId === form.payment_method_id) {
        return {
          ok: true,
          status: previous.status,
          statusDetail: previous.statusDetail,
          paymentId: previous.id,
          triggerJob: false,
          reused: true,
        };
      }
      try {
        await deps.cancelPayment(previous.id);
      } catch (e) {
        console.error(
          "[pagamento] não foi possível cancelar o pagamento em aberto:",
          e instanceof Error ? e.message : "erro desconhecido",
        );
        return fail(
          409,
          "Você já tem um pagamento em andamento para este pedido. Conclua-o ou aguarde alguns minutos para escolher outra forma de pagamento.",
        );
      }
    }

    const payment = await deps.createPayment({
      orderId,
      amountCents: order.amount_cents,
      description: product.name,
      form,
      idempotencyKey: `${orderId}:${order.mp_last_payment_id ?? "primeira"}`,
    });
    await deps.saveAttempt(orderId, {
      paymentId: payment.id,
      paymentType: payment.paymentTypeId,
    });

    const outcome = await deps.confirm(payment.id);
    return {
      ok: true,
      status: payment.status,
      statusDetail: payment.statusDetail,
      paymentId: payment.id,
      triggerJob: outcome.triggerJob,
      reused: false,
    };
  } catch (e) {
    console.error(
      "[pagamento] erro ao criar o pagamento:",
      e instanceof Error ? e.message : "erro desconhecido",
    );
    return fail(502, PAYMENT_ERROR);
  }
}
