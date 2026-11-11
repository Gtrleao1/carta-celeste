import "server-only";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

import type { MpPayment } from "./notification";

function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não está configurada.");
  }
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
}

export const WEBHOOK_PATH = "/api/webhooks/mercadopago";

type MpError = { status?: number; error?: string; message?: string };

/** Pagamento com os dados que a tela precisa para mostrar Pix e boleto. */
export type MpPaymentDetail = MpPayment & {
  paymentMethodId: string | null;
  /** credit_card, debit_card, bank_transfer (Pix), ticket (boleto)… */
  paymentTypeId: string | null;
  pix: { qrCode: string; qrCodeBase64: string | null } | null;
  /** Link do boleto. */
  ticketUrl: string | null;
};

type RawPayment = Awaited<ReturnType<Payment["get"]>>;

function toMpPayment(p: RawPayment, fallbackId: string): MpPaymentDetail {
  const pix = p.point_of_interaction?.transaction_data;
  return {
    id: String(p.id ?? fallbackId),
    status: p.status ?? "unknown",
    statusDetail: p.status_detail ?? null,
    externalReference: p.external_reference ?? null,
    amountCents: Math.round((p.transaction_amount ?? 0) * 100),
    paymentMethodId: p.payment_method_id ?? null,
    paymentTypeId: p.payment_type_id ?? null,
    pix: pix?.qr_code
      ? { qrCode: pix.qr_code, qrCodeBase64: pix.qr_code_base64 ?? null }
      : null,
    ticketUrl: p.transaction_details?.external_resource_url ?? null,
  };
}

/** Consulta o pagamento na API do Mercado Pago. `null` se ele não existir. */
export async function getMpPayment(
  id: string,
): Promise<MpPaymentDetail | null> {
  try {
    const p = await new Payment(client()).get({ id });
    return toMpPayment(p, id);
  } catch (e) {
    const err = e as MpError;
    if (err.status === 404 || err.error === "not_found") return null;
    throw e;
  }
}

/**
 * Ids dos pagamentos que o Mercado Pago tem para um pedido (mais recentes
 * primeiro), buscando pelo `external_reference`. Usado para reconciliar quando
 * o webhook não chegou.
 */
export async function findMpPaymentIds(orderId: string): Promise<string[]> {
  const res = await new Payment(client()).search({
    options: {
      external_reference: orderId,
      sort: "date_created",
      criteria: "desc",
    },
  });
  return (res.results ?? []).flatMap((p) => (p.id ? [String(p.id)] : []));
}

export type PaymentInput = {
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  /** Dados que o Payment Brick devolveu (já validados por `paymentFormSchema`). */
  form: {
    payment_method_id: string;
    token?: string;
    issuer_id?: string | number;
    installments?: number;
    payer?: {
      first_name?: string;
      last_name?: string;
      identification?: { type?: string; number?: string };
      address?: Record<string, string | undefined>;
    };
  };
  siteUrl: string;
  /** Mesma chave = mesmo pagamento: protege contra clique duplo e reenvio. */
  idempotencyKey: string;
};

/**
 * Cria o pagamento do Payment Brick. O valor vem do pedido (nunca do
 * navegador) e o e-mail do pagador é o da conta.
 */
export async function createMpPayment(
  input: PaymentInput,
): Promise<MpPaymentDetail> {
  const { form } = input;
  const isPublic = input.siteUrl.startsWith("https://");
  const p = await new Payment(client()).create({
    body: {
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: form.payment_method_id,
      ...(form.token && { token: form.token }),
      ...(form.issuer_id !== undefined && {
        issuer_id: Number(form.issuer_id),
      }),
      ...(form.installments && { installments: form.installments }),
      payer: {
        email: input.payerEmail,
        ...(form.payer?.first_name && { first_name: form.payer.first_name }),
        ...(form.payer?.last_name && { last_name: form.payer.last_name }),
        ...(form.payer?.identification?.number && {
          identification: {
            type: form.payer.identification.type,
            number: form.payer.identification.number,
          },
        }),
        ...(form.payer?.address && { address: form.payer.address }),
      },
      external_reference: input.orderId,
      statement_descriptor: "CARTA CELESTE",
      // Mesmo cuidado da preferência: só Webhooks assinados, e só com https.
      ...(isPublic && {
        notification_url: `${input.siteUrl}${WEBHOOK_PATH}?source_news=webhooks`,
      }),
    },
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
  return toMpPayment(p as RawPayment, String(p.id ?? ""));
}

/** Cancela um pagamento ainda pendente (Pix ou boleto que a pessoa trocou). */
export async function cancelMpPayment(id: string): Promise<void> {
  await new Payment(client()).cancel({ id });
}

export type PreferenceInput = {
  orderId: string;
  productId: string;
  title: string;
  amountCents: number;
  payerEmail: string;
  siteUrl: string;
};

/** Cria a preferência do Checkout Pro e devolve o link de pagamento. */
export async function createMpPreference(input: PreferenceInput) {
  const returnUrl = `${input.siteUrl}/pedido/${input.orderId}/retorno`;
  // O Mercado Pago só aceita notification_url e auto_return com endereço público (https).
  const isPublic = input.siteUrl.startsWith("https://");

  const preference = await new Preference(client()).create({
    body: {
      items: [
        {
          id: input.productId,
          title: input.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: input.amountCents / 100,
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.orderId,
      back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
      ...(isPublic && {
        auto_return: "approved",
        // `source_news=webhooks` faz o Mercado Pago enviar só Webhooks (assinados,
        // `?type=payment&data.id=…`). Sem ele, manda IPN (`?topic=payment&id=…`),
        // que não tem assinatura verificável e o nosso webhook recusa.
        notification_url: `${input.siteUrl}${WEBHOOK_PATH}?source_news=webhooks`,
      }),
      payment_methods: { installments: 12 },
      statement_descriptor: "CARTA CELESTE",
    },
  });

  if (!preference.id || !preference.init_point) {
    throw new Error("O Mercado Pago não devolveu o link de pagamento.");
  }
  return { id: preference.id, initPoint: preference.init_point };
}
