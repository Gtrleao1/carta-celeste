import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createNotificationDeps } from "@/lib/payments/deps";
import {
  processPaymentNotification,
  type MpPayment,
} from "@/lib/payments/notification";

import {
  anonClient,
  createTestUser,
  hasSupabaseEnv,
  serviceClient,
} from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

describe.skipIf(!hasSupabaseEnv)(
  "webhook: transições do pedido no banco real",
  () => {
    const admin = hasSupabaseEnv ? serviceClient() : (null as never);
    let user: TestUser;
    let productId: string;
    const orderIds: string[] = [];

    async function newOrder(amount = 4900) {
      const { data, error } = await admin
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: productId,
          amount_cents: amount,
        })
        .select("id")
        .single();
      if (error) throw error;
      orderIds.push(data!.id);
      return data!.id as string;
    }

    /** Simula a resposta da API do Mercado Pago para um pagamento. */
    const deps = (
      payment: Partial<MpPayment> & { externalReference: string },
    ) =>
      createNotificationDeps(admin, async (id) => ({
        id,
        status: "approved",
        statusDetail: "accredited",
        amountCents: 4900,
        ...payment,
      }));

    const orderOf = async (id: string) =>
      (await admin.from("orders").select("*").eq("id", id).single()).data!;

    beforeAll(async () => {
      user = await createTestUser("wh");
      const { data } = await admin
        .from("products")
        .select("id")
        .eq("slug", "mapa-astral-completo")
        .single();
      productId = data!.id;
    }, 60_000);

    afterAll(async () => {
      if (!hasSupabaseEnv) return;
      if (orderIds.length)
        await admin.from("orders").delete().in("id", orderIds);
      if (user) await admin.auth.admin.deleteUser(user.id);
    }, 60_000);

    it("aprovado: pedido vira 'paid', com id do pagamento e data", async () => {
      const id = await newOrder();
      const r = await processPaymentNotification(
        "900001",
        deps({ id: "900001", externalReference: id }),
      );
      expect(r).toMatchObject({ action: "paid", triggerJob: true });
      const order = await orderOf(id);
      expect(order).toMatchObject({
        status: "paid",
        mp_payment_id: "900001",
        mp_status: "approved",
      });
      expect(order.paid_at).not.toBeNull();
    });

    it("aviso repetido não duplica nada: sem novo job e sem alterar o pedido", async () => {
      const id = await newOrder();
      const d = deps({ id: "900002", externalReference: id });
      const first = await processPaymentNotification("900002", d);
      const paidAt = (await orderOf(id)).paid_at;
      const again = await processPaymentNotification("900002", d);
      const third = await processPaymentNotification("900002", d);
      expect(first.triggerJob).toBe(true);
      expect(again).toMatchObject({
        action: "already_processed",
        triggerJob: false,
      });
      expect(third).toMatchObject({
        action: "already_processed",
        triggerJob: false,
      });
      expect((await orderOf(id)).paid_at).toBe(paidAt);
    });

    it("avisos simultâneos: exatamente um marca como pago e dispara o job", async () => {
      const id = await newOrder();
      const d = deps({ id: "900003", externalReference: id });
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          processPaymentNotification("900003", d),
        ),
      );
      expect(results.filter((r) => r.action === "paid")).toHaveLength(1);
      expect(results.filter((r) => r.triggerJob)).toHaveLength(1);
      expect((await orderOf(id)).status).toBe("paid");
    });

    it("valor divergente: pedido continua pendente", async () => {
      const id = await newOrder(4900);
      const r = await processPaymentNotification(
        "900004",
        deps({ id: "900004", externalReference: id, amountCents: 100 }),
      );
      expect(r).toMatchObject({ action: "amount_mismatch", triggerJob: false });
      expect(await orderOf(id)).toMatchObject({
        status: "pending",
        mp_payment_id: null,
      });
    });

    it("recusado: pedido segue pendente, guardando o motivo", async () => {
      const id = await newOrder();
      const r = await processPaymentNotification(
        "900005",
        deps({
          id: "900005",
          externalReference: id,
          status: "rejected",
          statusDetail: "cc_rejected_insufficient_amount",
        }),
      );
      expect(r.action).toBe("kept_pending");
      expect(await orderOf(id)).toMatchObject({
        status: "pending",
        mp_status: "rejected",
        mp_status_detail: "cc_rejected_insufficient_amount",
        mp_payment_id: null,
      });
    });

    it("nova tentativa aprovada depois de uma recusa: vira 'paid'", async () => {
      const id = await newOrder();
      await processPaymentNotification(
        "900006",
        deps({ id: "900006", externalReference: id, status: "rejected" }),
      );
      const r = await processPaymentNotification(
        "900007",
        deps({ id: "900007", externalReference: id }),
      );
      expect(r.action).toBe("paid");
      expect(await orderOf(id)).toMatchObject({
        status: "paid",
        mp_payment_id: "900007",
        mp_status: "approved",
      });
    });

    it("reembolso depois de pago: pedido vira 'refunded'", async () => {
      const id = await newOrder();
      await processPaymentNotification(
        "900008",
        deps({ id: "900008", externalReference: id }),
      );
      const r = await processPaymentNotification(
        "900008",
        deps({ id: "900008", externalReference: id, status: "refunded" }),
      );
      expect(r.action).toBe("refunded");
      expect((await orderOf(id)).status).toBe("refunded");
    });

    it("pedido que não existe: ignorado", async () => {
      const r = await processPaymentNotification(
        "900009",
        deps({ id: "900009", externalReference: randomUUID() }),
      );
      expect(r).toMatchObject({ action: "ignored", reason: "order_not_found" });
    });

    it("o mesmo pagamento não pode valer para dois pedidos", async () => {
      const a = await newOrder();
      const b = await newOrder();
      await processPaymentNotification(
        "900010",
        deps({ id: "900010", externalReference: a }),
      );
      await expect(
        processPaymentNotification(
          "900010",
          deps({ id: "900010", externalReference: b }),
        ),
      ).rejects.toThrow();
      expect((await orderOf(b)).status).toBe("pending");
    });
  },
);

describe.skipIf(!hasSupabaseEnv)("limite de requisições", () => {
  const admin = hasSupabaseEnv ? serviceClient() : (null as never);

  it("libera até o máximo e bloqueia o excedente, por chave", async () => {
    const key = `teste:${randomUUID()}`;
    const hit = async (k: string) =>
      (
        await admin.rpc("check_rate_limit", {
          p_key: k,
          p_max: 3,
          p_window_seconds: 600,
        })
      ).data;
    expect([await hit(key), await hit(key), await hit(key)]).toEqual([
      true,
      true,
      true,
    ]);
    expect(await hit(key)).toBe(false);
    expect(await hit(key)).toBe(false);
    expect(await hit(`teste:${randomUUID()}`)).toBe(true);
    await admin.from("rate_limits").delete().eq("key", key);
  });

  it("o cliente do navegador não consegue chamar o limitador nem ler a tabela", async () => {
    const anon = anonClient();
    const call = await anon.rpc("check_rate_limit", {
      p_key: "x",
      p_max: 1,
      p_window_seconds: 60,
    });
    expect(call.error).not.toBeNull();
    const read = await anon.from("rate_limits").select("*");
    expect(read.error !== null || read.data?.length === 0).toBe(true);
  });
});
