import { describe, expect, it } from "vitest";

import {
  processPaymentNotification,
  type MpPayment,
  type NotificationDeps,
  type OrderSnapshot,
  type OrderStatus,
} from "./notification";

const ORDER_ID = "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e";

/** Dependências em memória, com contadores para verificar o que foi chamado. */
function fakeDeps(opts: {
  payment: Partial<MpPayment> | null;
  order?: Partial<OrderSnapshot> | null;
}) {
  const order: OrderSnapshot | null =
    opts.order === null
      ? null
      : { id: ORDER_ID, status: "pending", amount_cents: 4900, ...opts.order };
  const calls = { markPaid: 0, markRefunded: 0, record: 0 };
  const state = { status: order?.status as OrderStatus | undefined };

  const deps: NotificationDeps = {
    getPayment: async (id) =>
      opts.payment === null
        ? null
        : {
            id,
            status: "approved",
            statusDetail: "accredited",
            externalReference: ORDER_ID,
            amountCents: 4900,
            ...opts.payment,
          },
    getOrder: async () => (order ? { ...order, status: state.status! } : null),
    recordPaymentStatus: async () => {
      calls.record++;
    },
    markPaid: async () => {
      calls.markPaid++;
      if (state.status !== "pending") return false;
      state.status = "paid";
      return true;
    },
    markRefunded: async () => {
      calls.markRefunded++;
      if (state.status === "refunded") return false;
      state.status = "refunded";
      return true;
    },
  };
  return { deps, calls, state };
}

describe("pagamento aprovado", () => {
  it("marca o pedido como pago e pede a geração do relatório", async () => {
    const { deps, calls, state } = fakeDeps({ payment: {} });
    const r = await processPaymentNotification("111", deps);
    expect(r).toMatchObject({
      action: "paid",
      orderId: ORDER_ID,
      triggerJob: true,
    });
    expect(state.status).toBe("paid");
    expect(calls.markPaid).toBe(1);
  });

  it("evento repetido não faz nada: sem nova transição e sem novo job", async () => {
    const { deps, calls } = fakeDeps({ payment: {} });
    const first = await processPaymentNotification("111", deps);
    const second = await processPaymentNotification("111", deps);
    const third = await processPaymentNotification("111", deps);
    expect(first.triggerJob).toBe(true);
    expect(second).toMatchObject({
      action: "already_processed",
      triggerJob: false,
    });
    expect(third).toMatchObject({
      action: "already_processed",
      triggerJob: false,
    });
    expect(calls.markPaid).toBe(1);
  });

  it.each([
    "paid",
    "generating",
    "ready",
    "failed",
    "refunded",
    "cancelled",
  ] as const)("pedido já em '%s' não é refeito", async (status) => {
    const { deps, calls } = fakeDeps({ payment: {}, order: { status } });
    const r = await processPaymentNotification("111", deps);
    expect(r).toMatchObject({ action: "already_processed", triggerJob: false });
    expect(calls.markPaid).toBe(0);
  });

  it("dois avisos simultâneos: só um dispara o job", async () => {
    const { deps } = fakeDeps({ payment: {} });
    const [a, b] = await Promise.all([
      processPaymentNotification("111", deps),
      processPaymentNotification("111", deps),
    ]);
    expect([a, b].filter((r) => r.triggerJob)).toHaveLength(1);
  });
});

describe("valor divergente", () => {
  it("não marca como pago se o valor pago for diferente do pedido", async () => {
    for (const amountCents of [4899, 100, 0, 6900]) {
      const { deps, calls, state } = fakeDeps({ payment: { amountCents } });
      const r = await processPaymentNotification("111", deps);
      expect(r).toMatchObject({ action: "amount_mismatch", triggerJob: false });
      expect(calls.markPaid).toBe(0);
      expect(state.status).toBe("pending");
    }
  });

  it("vale também para reembolso e recusa", async () => {
    for (const status of ["refunded", "rejected"]) {
      const { deps, calls } = fakeDeps({
        payment: { status, amountCents: 1 },
        order: { status: "paid" },
      });
      const r = await processPaymentNotification("111", deps);
      expect(r.action).toBe("amount_mismatch");
      expect(calls.markRefunded).toBe(0);
      expect(calls.record).toBe(0);
    }
  });
});

describe("pagamento recusado ou em análise", () => {
  it.each(["rejected", "cancelled"])(
    "'%s' mantém o pedido pendente",
    async (status) => {
      const { deps, calls, state } = fakeDeps({
        payment: { status, statusDetail: "cc_rejected_other_reason" },
      });
      const r = await processPaymentNotification("111", deps);
      expect(r).toMatchObject({ action: "kept_pending", triggerJob: false });
      expect(state.status).toBe("pending");
      expect(calls.markPaid).toBe(0);
      expect(calls.record).toBe(1);
    },
  );

  it.each(["in_process", "pending", "authorized", "in_mediation"])(
    "'%s' fica aguardando",
    async (status) => {
      const { deps, calls } = fakeDeps({ payment: { status } });
      const r = await processPaymentNotification("111", deps);
      expect(r).toMatchObject({ action: "waiting", triggerJob: false });
      expect(calls.markPaid).toBe(0);
    },
  );

  it("uma recusa tardia não mexe em pedido que já foi pago", async () => {
    const { deps, calls } = fakeDeps({
      payment: { status: "rejected" },
      order: { status: "paid" },
    });
    await processPaymentNotification("111", deps);
    expect(calls.record).toBe(0);
  });
});

describe("reembolso e chargeback", () => {
  it.each(["refunded", "charged_back"])(
    "'%s' leva o pedido a refunded",
    async (status) => {
      const { deps, state } = fakeDeps({
        payment: { status },
        order: { status: "ready" },
      });
      const r = await processPaymentNotification("111", deps);
      expect(r).toMatchObject({ action: "refunded", triggerJob: false });
      expect(state.status).toBe("refunded");
    },
  );

  it("reembolso repetido não refaz nada", async () => {
    const { deps, calls } = fakeDeps({
      payment: { status: "refunded" },
      order: { status: "refunded" },
    });
    const r = await processPaymentNotification("111", deps);
    expect(r.action).toBe("already_processed");
    expect(calls.markRefunded).toBe(0);
  });

  it("reembolso de pedido que nunca foi pago é ignorado", async () => {
    const { deps, calls } = fakeDeps({ payment: { status: "refunded" } });
    const r = await processPaymentNotification("111", deps);
    expect(r.action).toBe("already_processed");
    expect(calls.markRefunded).toBe(0);
  });
});

describe("notificações que não levam a lugar nenhum", () => {
  it("pagamento inexistente (ex.: notificação de teste)", async () => {
    const { deps } = fakeDeps({ payment: null });
    expect(await processPaymentNotification("123456", deps)).toMatchObject({
      action: "ignored",
      reason: "payment_not_found",
    });
  });

  it("sem external_reference ou com valor que não é um id de pedido", async () => {
    for (const externalReference of [null, "", "abc", "123", "' or 1=1 --"]) {
      const { deps, calls } = fakeDeps({ payment: { externalReference } });
      const r = await processPaymentNotification("111", deps);
      expect(r).toMatchObject({
        action: "ignored",
        reason: "invalid_external_reference",
      });
      expect(calls.markPaid).toBe(0);
    }
  });

  it("external_reference de pedido que não existe", async () => {
    const { deps, calls } = fakeDeps({ payment: {}, order: null });
    const r = await processPaymentNotification("111", deps);
    expect(r).toMatchObject({ action: "ignored", reason: "order_not_found" });
    expect(calls.markPaid).toBe(0);
  });
});
