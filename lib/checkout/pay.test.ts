import { describe, expect, it, vi } from "vitest";

import type { MpPaymentDetail } from "@/lib/payments/mercadopago";

import { payOrder, type PayDeps, type PayOrder } from "./pay";
import type { PaymentForm } from "./schemas";

const ORDER_ID = "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e";

const order: PayOrder = {
  id: ORDER_ID,
  status: "pending",
  amount_cents: 4900,
  product_id: "p1",
  mp_last_payment_id: null,
};

const card: PaymentForm = {
  payment_method_id: "visa",
  token: "tok",
  installments: 1,
};
const pix: PaymentForm = { payment_method_id: "pix" };

const payment = (over: Partial<MpPaymentDetail> = {}): MpPaymentDetail => ({
  id: "pay-1",
  status: "approved",
  statusDetail: "accredited",
  externalReference: ORDER_ID,
  amountCents: 4900,
  paymentMethodId: "visa",
  paymentTypeId: "credit_card",
  pix: null,
  ticketUrl: null,
  ...over,
});

function makeDeps(over: Partial<PayDeps> = {}): PayDeps {
  return {
    getOrder: vi.fn(async () => order),
    getOrderStatus: vi.fn(async () => "pending"),
    getProduct: vi.fn(async () => ({ name: "Mapa Astral", active: true })),
    reconcile: vi.fn(async () => {}),
    getPayment: vi.fn(async () => null),
    createPayment: vi.fn(async () => payment()),
    cancelPayment: vi.fn(async () => {}),
    saveAttempt: vi.fn(async () => {}),
    confirm: vi.fn(async () => ({
      action: "paid" as const,
      orderId: ORDER_ID,
      triggerJob: true,
    })),
    ...over,
  };
}

describe("payOrder", () => {
  it("cria o pagamento com o valor e a descrição do pedido, nunca os do navegador", async () => {
    const deps = makeDeps();
    const r = await payOrder(ORDER_ID, card, deps);
    expect(r).toMatchObject({ ok: true, status: "approved", triggerJob: true });
    expect(deps.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: ORDER_ID,
        amountCents: 4900,
        description: "Mapa Astral",
        idempotencyKey: `${ORDER_ID}:primeira`,
      }),
    );
  });

  it("pedido de outra pessoa (ou inexistente) dá 404 e nada é cobrado", async () => {
    const deps = makeDeps({ getOrder: vi.fn(async () => null) });
    expect(await payOrder(ORDER_ID, card, deps)).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(deps.createPayment).not.toHaveBeenCalled();
  });

  it("pedido que não está pendente dá 409", async () => {
    const deps = makeDeps({
      getOrder: vi.fn(async () => ({ ...order, status: "ready" })),
    });
    expect(await payOrder(ORDER_ID, card, deps)).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(deps.createPayment).not.toHaveBeenCalled();
  });

  it("produto desativado não é cobrado", async () => {
    const deps = makeDeps({
      getProduct: vi.fn(async () => ({ name: "x", active: false })),
    });
    expect(await payOrder(ORDER_ID, card, deps)).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(deps.createPayment).not.toHaveBeenCalled();
  });

  it("confere o Mercado Pago antes de cobrar; se já foi pago, não cobra de novo", async () => {
    const deps = makeDeps({ getOrderStatus: vi.fn(async () => "paid") });
    const r = await payOrder(ORDER_ID, card, deps);
    expect(deps.reconcile).toHaveBeenCalledWith(ORDER_ID);
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(deps.createPayment).not.toHaveBeenCalled();
  });

  it("se não deu para conferir o pedido, não cobra (502)", async () => {
    const deps = makeDeps({
      reconcile: vi.fn(async () => {
        throw new Error("mp fora do ar");
      }),
    });
    expect(await payOrder(ORDER_ID, card, deps)).toMatchObject({
      ok: false,
      status: 502,
    });
    expect(deps.createPayment).not.toHaveBeenCalled();
  });

  it("Pix em aberto do mesmo meio é reaproveitado, sem criar outro", async () => {
    const open = payment({
      id: "pay-pix",
      status: "pending",
      paymentMethodId: "pix",
      paymentTypeId: "bank_transfer",
    });
    const deps = makeDeps({
      getOrder: vi.fn(async () => ({
        ...order,
        mp_last_payment_id: "pay-pix",
      })),
      getPayment: vi.fn(async () => open),
    });
    const r = await payOrder(ORDER_ID, pix, deps);
    expect(r).toMatchObject({
      ok: true,
      paymentId: "pay-pix",
      reused: true,
      triggerJob: false,
    });
    expect(deps.createPayment).not.toHaveBeenCalled();
    expect(deps.cancelPayment).not.toHaveBeenCalled();
  });

  it("trocar de Pix para cartão cancela o Pix em aberto antes de cobrar", async () => {
    const open = payment({
      id: "pay-pix",
      status: "pending",
      paymentMethodId: "pix",
    });
    const deps = makeDeps({
      getOrder: vi.fn(async () => ({
        ...order,
        mp_last_payment_id: "pay-pix",
      })),
      getPayment: vi.fn(async () => open),
    });
    await payOrder(ORDER_ID, card, deps);
    expect(deps.cancelPayment).toHaveBeenCalledWith("pay-pix");
    expect(deps.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `${ORDER_ID}:pay-pix` }),
    );
  });

  it("se o Pix em aberto não pôde ser cancelado, recusa em vez de arriscar cobrança dupla", async () => {
    const open = payment({
      id: "pay-pix",
      status: "pending",
      paymentMethodId: "pix",
    });
    const deps = makeDeps({
      getOrder: vi.fn(async () => ({
        ...order,
        mp_last_payment_id: "pay-pix",
      })),
      getPayment: vi.fn(async () => open),
      cancelPayment: vi.fn(async () => {
        throw new Error("não cancelou");
      }),
    });
    expect(await payOrder(ORDER_ID, card, deps)).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(deps.createPayment).not.toHaveBeenCalled();
  });

  it("depois de uma recusa, a nova tentativa usa outra chave de idempotência", async () => {
    const rejected = payment({ id: "pay-1", status: "rejected" });
    const deps = makeDeps({
      getOrder: vi.fn(async () => ({ ...order, mp_last_payment_id: "pay-1" })),
      getPayment: vi.fn(async () => rejected),
    });
    await payOrder(ORDER_ID, card, deps);
    expect(deps.cancelPayment).not.toHaveBeenCalled();
    expect(deps.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `${ORDER_ID}:pay-1` }),
    );
  });

  it("registra a tentativa antes de confirmar e devolve a recusa sem marcar como pago", async () => {
    const calls: string[] = [];
    const deps = makeDeps({
      createPayment: vi.fn(async () =>
        payment({ status: "rejected", statusDetail: "cc_rejected_other" }),
      ),
      saveAttempt: vi.fn(async () => {
        calls.push("save");
      }),
      confirm: vi.fn(async () => {
        calls.push("confirm");
        return { action: "kept_pending" as const, triggerJob: false };
      }),
    });
    const r = await payOrder(ORDER_ID, card, deps);
    expect(calls).toEqual(["save", "confirm"]);
    expect(r).toMatchObject({
      ok: true,
      status: "rejected",
      statusDetail: "cc_rejected_other",
      triggerJob: false,
    });
  });

  it("erro do Mercado Pago ao criar o pagamento vira 502 sem detalhes", async () => {
    const deps = makeDeps({
      createPayment: vi.fn(async () => {
        throw new Error("detalhe interno");
      }),
    });
    const r = await payOrder(ORDER_ID, card, deps);
    expect(r).toMatchObject({ ok: false, status: 502 });
    expect(JSON.stringify(r)).not.toContain("detalhe interno");
  });
});
