import { describe, expect, it, vi } from "vitest";

import type {
  MpPayment,
  NotificationDeps,
  OrderSnapshot,
} from "./notification";
import { reconcileOrder } from "./reconcile";

const ORDER_ID = "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e";

function setup(payments: Record<string, Partial<MpPayment>>, ids?: string[]) {
  const order: OrderSnapshot = {
    id: ORDER_ID,
    status: "pending",
    amount_cents: 4900,
  };
  const markPaid = vi.fn(async () => {
    if (order.status !== "pending") return false;
    order.status = "paid";
    return true;
  });
  const deps = {
    getPayment: async (id: string) =>
      payments[id]
        ? ({
            id,
            status: "approved",
            statusDetail: "accredited",
            externalReference: ORDER_ID,
            amountCents: 4900,
            ...payments[id],
          } as MpPayment)
        : null,
    getOrder: async () => ({ ...order }),
    recordPaymentStatus: vi.fn(async () => {}),
    markPaid,
    markRefunded: vi.fn(async () => false),
    findPaymentIds: vi.fn(async () => ids ?? Object.keys(payments)),
  } satisfies NotificationDeps & {
    findPaymentIds: (id: string) => Promise<string[]>;
  };
  return { deps, order, markPaid };
}

describe("reconcileOrder", () => {
  it("pagamento aprovado no Mercado Pago, mas sem webhook: marca como pago", async () => {
    const { deps, order } = setup({ "1": {} });
    const results = await reconcileOrder(ORDER_ID, deps);
    expect(results.map((r) => r.action)).toEqual(["paid"]);
    expect(results[0].triggerJob).toBe(true);
    expect(order.status).toBe("paid");
  });

  it("rodar de novo não duplica nada", async () => {
    const { deps, markPaid } = setup({ "1": {} });
    await reconcileOrder(ORDER_ID, deps);
    const again = await reconcileOrder(ORDER_ID, deps);
    expect(again.map((r) => r.action)).toEqual(["already_processed"]);
    expect(again.some((r) => r.triggerJob)).toBe(false);
    expect(markPaid).toHaveBeenCalledTimes(1); // o pedido já pago nem chega a ser tocado
  });

  it("tentativa recusada seguida de outra aprovada: paga com a aprovada", async () => {
    const { deps, order } = setup(
      { "2": {}, "1": { status: "rejected" } },
      ["2", "1"], // mais recente primeiro
    );
    const results = await reconcileOrder(ORDER_ID, deps);
    expect(results[0].action).toBe("paid");
    expect(order.status).toBe("paid");
  });

  it("só recusados: continua pendente", async () => {
    const { deps, order } = setup({ "1": { status: "rejected" } });
    const results = await reconcileOrder(ORDER_ID, deps);
    expect(results.map((r) => r.action)).toEqual(["kept_pending"]);
    expect(order.status).toBe("pending");
  });

  it("valor divergente: não paga", async () => {
    const { deps, order } = setup({ "1": { amountCents: 100 } });
    const results = await reconcileOrder(ORDER_ID, deps);
    expect(results[0].action).toBe("amount_mismatch");
    expect(order.status).toBe("pending");
  });

  it("sem nenhum pagamento no Mercado Pago: nada acontece", async () => {
    const { deps, order } = setup({}, []);
    expect(await reconcileOrder(ORDER_ID, deps)).toEqual([]);
    expect(order.status).toBe("pending");
  });

  it("olha no máximo 5 pagamentos", async () => {
    const many = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [String(i), { status: "rejected" }]),
    );
    const { deps } = setup(many);
    expect(await reconcileOrder(ORDER_ID, deps)).toHaveLength(5);
  });
});
