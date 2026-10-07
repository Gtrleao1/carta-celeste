import { beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {},
  Preference: class {
    create = create;
  },
}));

import { createMpPreference } from "./mercadopago";

const input = {
  orderId: "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e",
  productId: "p1",
  title: "Mapa Astral Completo",
  amountCents: 4900,
  payerEmail: "cliente@exemplo.com",
};

const lastBody = () => create.mock.calls.at(-1)![0].body;

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
