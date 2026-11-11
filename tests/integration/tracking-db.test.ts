import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createCheckout } from "@/lib/checkout/create-checkout";

import { createTestUser, hasSupabaseEnv, serviceClient } from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

describe.skipIf(!hasSupabaseEnv)(
  "Bricks e rastreamento: regras contra o banco real",
  () => {
    const admin = hasSupabaseEnv ? serviceClient() : (null as never);
    let user: TestUser;
    let productId: string;
    let productSlug: string;
    let birthProfileId: string;
    let orderId: string;

    beforeAll(async () => {
      user = await createTestUser("trk");
      productSlug = `teste-trk-${randomUUID()}`;
      const { data: product, error } = await admin
        .from("products")
        .insert({
          slug: productSlug,
          name: "Produto rastreio",
          price_cents: 4900,
          active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      productId = product!.id;

      const { data: bp } = await admin
        .from("birth_profiles")
        .insert({
          user_id: user.id,
          name: "Perfil",
          birth_date: "1995-07-14",
          birth_time: "15:30",
          city_name: "Campinas, SP",
          latitude: -22.9,
          longitude: -47.06,
          timezone: "America/Sao_Paulo",
        })
        .select("id")
        .single();
      birthProfileId = bp!.id;
    }, 60_000);

    afterAll(async () => {
      if (!hasSupabaseEnv) return;
      await admin.from("orders").delete().eq("product_id", productId);
      await admin.from("products").delete().eq("id", productId);
      if (user) await admin.auth.admin.deleteUser(user.id);
    }, 60_000);

    it("modo bricks: cria o pedido, devolve a tela de pagamento e não chama a preferência", async () => {
      const createPreference = vi.fn();
      const r = await createCheckout({
        userClient: user.client,
        admin,
        user: { id: user.id, email: user.email },
        input: { productSlug, birthProfileId },
        siteUrl: "https://loja.test",
        createPreference,
        mode: "bricks",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      orderId = r.orderId;
      expect(r.url).toBe(`/pedido/${r.orderId}/pagar`);
      expect(createPreference).not.toHaveBeenCalled();

      const { data: order } = await admin
        .from("orders")
        .select("status, amount_cents")
        .eq("id", orderId)
        .single();
      expect(order).toMatchObject({ status: "pending", amount_cents: 4900 });
    });

    it("order_tracking e tracking_events não são legíveis nem gravaveis pelo navegador", async () => {
      await admin.from("order_tracking").upsert({
        order_id: orderId,
        consent_marketing: true,
        fbp: "fb.1.1700000000000.1",
        client_ip: "177.1.2.3",
      });
      await admin.from("tracking_events").insert({
        order_id: orderId,
        platform: "meta",
        event_name: "Purchase",
        event_id: `${orderId}:Purchase`,
        status: "sent",
      });

      for (const table of ["order_tracking", "tracking_events"] as const) {
        const read = await user.client.from(table).select("*");
        // Sem privilégio, o PostgREST devolve erro; com RLS e sem política, lista vazia.
        expect(read.error !== null || (read.data ?? []).length === 0).toBe(
          true,
        );
      }
      // A tentativa de alterar não pode ter efeito.
      await user.client
        .from("order_tracking")
        .update({ consent_marketing: false })
        .eq("order_id", orderId);

      const { data: still } = await admin
        .from("order_tracking")
        .select("consent_marketing, fbp")
        .eq("order_id", orderId)
        .single();
      expect(still).toMatchObject({
        consent_marketing: true,
        fbp: "fb.1.1700000000000.1",
      });
    });

    it("a marca de envio único é atômica: só uma chamada ganha", async () => {
      const claim = () =>
        admin
          .from("orders")
          .update({ purchase_tracked_at: new Date().toISOString() })
          .eq("id", orderId)
          .is("purchase_tracked_at", null)
          .select("id");
      const [a, b] = await Promise.all([claim(), claim()]);
      const wins = [a, b].filter((r) => (r.data?.length ?? 0) > 0).length;
      expect(wins).toBe(1);
    });

    it("paid_via aceita 'checkout' e continua recusando valores desconhecidos", async () => {
      const ok = await admin
        .from("orders")
        .update({ paid_via: "checkout" })
        .eq("id", orderId);
      expect(ok.error).toBeNull();
      const bad = await admin
        .from("orders")
        .update({ paid_via: "outro" })
        .eq("id", orderId);
      expect(bad.error).not.toBeNull();
    });

    it("excluir a conta apaga a atribuição (IP, cookies) e mantém o pedido anonimizado", async () => {
      await admin.auth.admin.deleteUser(user.id);

      const { data: tracking } = await admin
        .from("order_tracking")
        .select("order_id")
        .eq("order_id", orderId);
      expect(tracking).toEqual([]);

      const { data: order } = await admin
        .from("orders")
        .select("user_id, amount_cents")
        .eq("id", orderId)
        .single();
      expect(order).toMatchObject({ user_id: null, amount_cents: 4900 });
    });
  },
);
