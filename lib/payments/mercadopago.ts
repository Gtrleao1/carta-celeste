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

type MpError = { status?: number; error?: string; message?: string };

/** Consulta o pagamento na API do Mercado Pago. `null` se ele não existir. */
export async function getMpPayment(id: string): Promise<MpPayment | null> {
  try {
    const p = await new Payment(client()).get({ id });
    return {
      id: String(p.id ?? id),
      status: p.status ?? "unknown",
      statusDetail: p.status_detail ?? null,
      externalReference: p.external_reference ?? null,
      amountCents: Math.round((p.transaction_amount ?? 0) * 100),
    };
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
        notification_url: `${input.siteUrl}/api/webhooks/mercadopago`,
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
