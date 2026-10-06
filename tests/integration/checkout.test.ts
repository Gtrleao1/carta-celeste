import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createCheckout } from "@/lib/checkout/create-checkout";

import { createTestUser, hasSupabaseEnv, serviceClient } from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const preference = {
  id: "pref-teste",
  initPoint: "https://mp.test/pagar/pref-teste",
};
const createPreference = vi.fn(async () => preference);

describe.skipIf(!hasSupabaseEnv)("checkout: regras contra o banco real", () => {
  const admin = hasSupabaseEnv ? serviceClient() : (null as never);
  let a: TestUser;
  let b: TestUser;
  let bpA: string;
  let bpB: string;
  let product: { id: string; slug: string };
  let restricted: { id: string; slug: string };
  let inactive: { id: string; slug: string };
  const productIds: string[] = [];

  const run = (
    user: TestUser,
    input: Parameters<typeof createCheckout>[0]["input"],
  ) =>
    createCheckout({
      userClient: user.client,
      admin,
      user: { id: user.id, email: user.email },
      input,
      siteUrl: "https://loja.test",
      createPreference,
    });

  async function newProduct(fields: Record<string, unknown>) {
    const slug = `teste-checkout-${randomUUID()}`;
    const { data, error } = await admin
      .from("products")
      .insert({
        slug,
        name: `Produto ${slug.slice(-6)}`,
        price_cents: 1234,
        ...fields,
      })
      .select("id, slug")
      .single();
    if (error) throw error;
    productIds.push(data!.id);
    return data!;
  }

  async function newBirthProfile(userId: string) {
    const { data, error } = await admin
      .from("birth_profiles")
      .insert({
        user_id: userId,
        name: "Perfil de teste",
        birth_date: "1995-07-14",
        birth_time: "15:30",
        city_name: "Campinas, SP",
        latitude: -22.9,
        longitude: -47.06,
        timezone: "America/Sao_Paulo",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data!.id as string;
  }

  beforeAll(async () => {
    [a, b] = await Promise.all([
      createTestUser("ck-a"),
      createTestUser("ck-b"),
    ]);
    [bpA, bpB] = await Promise.all([
      newBirthProfile(a.id),
      newBirthProfile(b.id),
    ]);
    product = await newProduct({ active: true });
    restricted = await newProduct({ active: true, age_restricted: true });
    inactive = await newProduct({ active: false });
  }, 60_000);

  afterAll(async () => {
    if (!hasSupabaseEnv) return;
    // Pedidos sobrevivem à exclusão do usuário (anonimizados): apagar à parte.
    if (productIds.length) {
      await admin.from("orders").delete().in("product_id", productIds);
      await admin.from("products").delete().in("id", productIds);
    }
    for (const u of [a, b]) if (u) await admin.auth.admin.deleteUser(u.id);
  }, 60_000);

  it("cria o pedido com o preço do banco e devolve o link do Mercado Pago", async () => {
    createPreference.mockClear();
    const r = await run(a, { productSlug: product.slug, birthProfileId: bpA });
    expect(r).toMatchObject({ ok: true, url: preference.initPoint });
    if (!r.ok) return;

    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", r.orderId)
      .single();
    expect(order).toMatchObject({
      user_id: a.id,
      product_id: product.id,
      birth_profile_id: bpA,
      amount_cents: 1234,
      status: "pending",
      mp_preference_id: preference.id,
      age_confirmed_at: null,
    });
    expect(createPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: r.orderId,
        amountCents: 1234,
        payerEmail: a.email,
        siteUrl: "https://loja.test",
      }),
    );
  });

  it("lê o preço do banco a cada pedido (mudou no admin, muda no pedido)", async () => {
    await admin
      .from("products")
      .update({ price_cents: 5500 })
      .eq("id", product.id);
    const r = await run(a, { productSlug: product.slug, birthProfileId: bpA });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { data } = await admin
      .from("orders")
      .select("amount_cents")
      .eq("id", r.orderId)
      .single();
    expect(data?.amount_cents).toBe(5500);
    await admin
      .from("products")
      .update({ price_cents: 1234 })
      .eq("id", product.id);
  });

  it("não usa perfil de nascimento de outro usuário", async () => {
    const before = await admin.from("orders").select("id").eq("user_id", a.id);
    const r = await run(a, { productSlug: product.slug, birthProfileId: bpB });
    expect(r).toMatchObject({ ok: false, status: 404 });
    const after = await admin.from("orders").select("id").eq("user_id", a.id);
    expect(after.data?.length).toBe(before.data?.length);
  });

  it("recusa produto inexistente e produto inativo", async () => {
    expect(
      await run(a, { productSlug: "nao-existe", birthProfileId: bpA }),
    ).toMatchObject({ ok: false, status: 404 });
    expect(
      await run(a, { productSlug: inactive.slug, birthProfileId: bpA }),
    ).toMatchObject({ ok: false, status: 404 });
  });

  describe("produto restrito a maiores de 18 anos", () => {
    const adult = "1990-05-20";
    const minor = new Date(Date.now() - 16 * 365 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    it("sem declaração, recusa e não cria pedido", async () => {
      const before = await admin
        .from("orders")
        .select("id")
        .eq("user_id", a.id);
      const r = await run(a, {
        productSlug: restricted.slug,
        birthProfileId: bpA,
      });
      expect(r).toMatchObject({ ok: false, status: 400 });
      const withoutDate = await run(a, {
        productSlug: restricted.slug,
        birthProfileId: bpA,
        ageDeclared: true,
      });
      expect(withoutDate).toMatchObject({ ok: false, status: 400 });
      const withoutCheck = await run(a, {
        productSlug: restricted.slug,
        birthProfileId: bpA,
        buyerBirthDate: adult,
      });
      expect(withoutCheck).toMatchObject({ ok: false, status: 400 });
      const after = await admin.from("orders").select("id").eq("user_id", a.id);
      expect(after.data?.length).toBe(before.data?.length);
    });

    it("recusa quem tem menos de 18 anos, mesmo marcando a caixa", async () => {
      const r = await run(a, {
        productSlug: restricted.slug,
        birthProfileId: bpA,
        ageDeclared: true,
        buyerBirthDate: minor,
      });
      expect(r).toMatchObject({ ok: false, status: 403 });
    });

    it("recusa data de nascimento inválida ou no futuro", async () => {
      for (const buyerBirthDate of ["2999-01-01", "abc", "1990-02-31"]) {
        const r = await run(a, {
          productSlug: restricted.slug,
          birthProfileId: bpA,
          ageDeclared: true,
          buyerBirthDate,
        });
        expect(r.ok).toBe(false);
      }
    });

    it("maior de idade: cria o pedido, grava age_confirmed_at e a data no perfil", async () => {
      const r = await run(a, {
        productSlug: restricted.slug,
        birthProfileId: bpA,
        ageDeclared: true,
        buyerBirthDate: adult,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const { data: order } = await admin
        .from("orders")
        .select("age_confirmed_at")
        .eq("id", r.orderId)
        .single();
      expect(order?.age_confirmed_at).not.toBeNull();
      const { data: profile } = await admin
        .from("profiles")
        .select("birth_date_of_buyer")
        .eq("id", a.id)
        .single();
      expect(profile?.birth_date_of_buyer).toBe(adult);
    });
  });

  it("se o Mercado Pago falhar, devolve erro e cancela o pedido", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = vi.fn(async () => {
      throw new Error("MP fora do ar");
    });
    const r = await createCheckout({
      userClient: a.client,
      admin,
      user: { id: a.id, email: a.email },
      input: { productSlug: product.slug, birthProfileId: bpA },
      siteUrl: "https://loja.test",
      createPreference: failing,
    });
    expect(r).toMatchObject({ ok: false, status: 502 });
    const { data } = await admin
      .from("orders")
      .select("status")
      .eq("user_id", a.id)
      .eq("status", "cancelled");
    expect(data!.length).toBeGreaterThanOrEqual(1);
    err.mockRestore();
  });

  describe("nova tentativa de pagamento", () => {
    it("reaproveita o pedido pendente e cria outra preferência", async () => {
      const first = await run(a, {
        productSlug: product.slug,
        birthProfileId: bpA,
      });
      if (!first.ok) throw new Error("setup");
      createPreference.mockClear();
      const retry = await run(a, { orderId: first.orderId });
      expect(retry).toMatchObject({ ok: true, orderId: first.orderId });
      expect(createPreference).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: first.orderId, amountCents: 1234 }),
      );
    });

    it("não refaz pedido já pago nem pedido de outra pessoa", async () => {
      const first = await run(a, {
        productSlug: product.slug,
        birthProfileId: bpA,
      });
      if (!first.ok) throw new Error("setup");
      expect(await run(b, { orderId: first.orderId })).toMatchObject({
        ok: false,
        status: 404,
      });
      await admin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", first.orderId);
      expect(await run(a, { orderId: first.orderId })).toMatchObject({
        ok: false,
        status: 409,
      });
    });
  });
});
