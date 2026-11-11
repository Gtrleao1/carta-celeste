import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, createPayment } = vi.hoisted(() => ({
  create: vi.fn(),
  createPayment: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    create = createPayment;
  },
  Preference: class {
    create = create;
  },
}));

import { createMpPayment, createMpPreference } from "./mercadopago";

const input = {
  orderId: "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e",
  productId: "p1",
  title: "Mapa Astral Completo",
  amountCents: 4900,
  payerEmail: "cliente@exemplo.com",
};

const lastBody = () => create.mock.calls.at(-1)![0].body;

describe("createMpPayment (Payment Brick)", () => {
  const form = {
    payment_method_id: "visa",
    token: "tok_123",
    issuer_id: "24",
    installments: 3,
    payer: {
      first_name: "Ana",
      identification: { type: "CPF", number: "12345678909" },
    },
  };
  const base = {
    orderId: input.orderId,
    amountCents: 4900,
    description: "Mapa Astral Completo",
    payerEmail: "conta@exemplo.com",
    form,
    siteUrl: "https://loja.test",
    idempotencyKey: `${input.orderId}:primeira`,
  };
  const lastCall = () => createPayment.mock.calls.at(-1)![0];

  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token-de-teste";
    createPayment.mockReset();
    createPayment.mockResolvedValue({
      id: 99,
      status: "pending",
      status_detail: "pending_waiting_transfer",
      external_reference: input.orderId,
      transaction_amount: 49,
      payment_method_id: "pix",
      payment_type_id: "bank_transfer",
      point_of_interaction: {
        transaction_data: { qr_code: "0002...", qr_code_base64: "iVBOR..." },
      },
    });
  });

  it("cobra o valor do pedido, com o pedido como external_reference e só Webhooks assinados", async () => {
    await createMpPayment(base);
    const { body } = lastCall();
    expect(body.transaction_amount).toBe(49);
    expect(body.external_reference).toBe(input.orderId);
    expect(body.notification_url).toBe(
      "https://loja.test/api/webhooks/mercadopago?source_news=webhooks",
    );
    expect(body.token).toBe("tok_123");
    expect(body.issuer_id).toBe(24);
    expect(body.installments).toBe(3);
  });

  it("o e-mail do pagador é o da conta e o CPF vai só ao Mercado Pago", async () => {
    await createMpPayment(base);
    const { body } = lastCall();
    expect(body.payer.email).toBe("conta@exemplo.com");
    expect(body.payer.identification).toEqual({
      type: "CPF",
      number: "12345678909",
    });
  });

  it("envia a chave de idempotência", async () => {
    await createMpPayment(base);
    expect(lastCall().requestOptions.idempotencyKey).toBe(base.idempotencyKey);
  });

  it("sem https (desenvolvimento local), omite notification_url", async () => {
    await createMpPayment({ ...base, siteUrl: "http://localhost:3000" });
    expect(lastCall().body.notification_url).toBeUndefined();
  });

  it("devolve o Pix (QR code e copia-e-cola) e o tipo do pagamento", async () => {
    const p = await createMpPayment(base);
    expect(p).toMatchObject({
      id: "99",
      status: "pending",
      amountCents: 4900,
      paymentTypeId: "bank_transfer",
      pix: { qrCode: "0002...", qrCodeBase64: "iVBOR..." },
    });
  });
});

describe("createMpPreference", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "token-de-teste";
    create.mockReset();
    create.mockResolvedValue({
      id: "pref-1",
      init_point: "https://mp.test/pay",
    });
  });

  it("pede só Webhooks assinados (source_news=webhooks) na notification_url", async () => {
    await createMpPreference({ ...input, siteUrl: "https://loja.test" });
    expect(lastBody().notification_url).toBe(
      "https://loja.test/api/webhooks/mercadopago?source_news=webhooks",
    );
    expect(lastBody().auto_return).toBe("approved");
  });

  it("usa o id do pedido como external_reference e o valor em reais", async () => {
    await createMpPreference({ ...input, siteUrl: "https://loja.test" });
    const body = lastBody();
    expect(body.external_reference).toBe(input.orderId);
    expect(body.items[0]).toMatchObject({
      quantity: 1,
      currency_id: "BRL",
      unit_price: 49,
    });
    expect(body.back_urls.success).toBe(
      `https://loja.test/pedido/${input.orderId}/retorno`,
    );
  });

  it("não restringe meios de pagamento: só limita o parcelamento a 12x", async () => {
    await createMpPreference({ ...input, siteUrl: "https://loja.test" });
    expect(lastBody().payment_methods).toEqual({ installments: 12 });
  });

  it("sem https (desenvolvimento local), omite notification_url e auto_return", async () => {
    await createMpPreference({ ...input, siteUrl: "http://localhost:3000" });
    const body = lastBody();
    expect(body.notification_url).toBeUndefined();
    expect(body.auto_return).toBeUndefined();
  });

  it("devolve o link de pagamento", async () => {
    expect(
      await createMpPreference({ ...input, siteUrl: "https://loja.test" }),
    ).toEqual({
      id: "pref-1",
      initPoint: "https://mp.test/pay",
    });
  });
});
