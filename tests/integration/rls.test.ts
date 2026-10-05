import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  anonClient,
  createTestUser,
  hasSupabaseEnv,
  serviceClient,
} from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

describe.skipIf(!hasSupabaseEnv)("RLS: isolamento entre usuários", () => {
  const admin = hasSupabaseEnv ? serviceClient() : (null as never);
  let a: TestUser;
  let b: TestUser;
  let productId: string;
  let inactiveProductId: string;
  let birthProfileA: string;
  let birthProfileB: string;
  let orderA: string;
  let orderB: string;
  const orderIds: string[] = [];

  beforeAll(async () => {
    [a, b] = await Promise.all([createTestUser("a"), createTestUser("b")]);

    const { data: product } = await admin
      .from("products")
      .select("id")
      .eq("slug", "mapa-astral-completo")
      .single();
    productId = product!.id;

    const { data: inactive, error: inactiveError } = await admin
      .from("products")
      .insert({
        slug: `teste-inativo-${randomUUID()}`,
        name: "Produto inativo de teste",
        price_cents: 100,
        active: false,
      })
      .select("id")
      .single();
    if (inactiveError) throw inactiveError;
    inactiveProductId = inactive!.id;

    // O usuário A cria o próprio perfil de nascimento (testa a política de insert).
    const { data: bpA, error: bpAError } = await a.client
      .from("birth_profiles")
      .insert({
        user_id: a.id,
        name: "Perfil A",
        birth_date: "1995-07-14",
        birth_time: "15:30",
        city_name: "Campinas, SP",
        latitude: -22.9,
        longitude: -47.06,
        timezone: "America/Sao_Paulo",
      })
      .select("id")
      .single();
    if (bpAError) throw bpAError;
    birthProfileA = bpA!.id;

    const { data: bpB, error: bpBError } = await admin
      .from("birth_profiles")
      .insert({
        user_id: b.id,
        name: "Perfil B",
        birth_date: "1990-07-13",
        time_unknown: true,
        city_name: "São Paulo, SP",
        latitude: -23.55,
        longitude: -46.63,
        timezone: "America/Sao_Paulo",
      })
      .select("id")
      .single();
    if (bpBError) throw bpBError;
    birthProfileB = bpB!.id;

    for (const [user, bp] of [
      [a, birthProfileA],
      [b, birthProfileB],
    ] as const) {
      const { data: order, error } = await admin
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: productId,
          birth_profile_id: bp,
          amount_cents: 4900,
        })
        .select("id")
        .single();
      if (error) throw error;
      orderIds.push(order!.id);
      await admin
        .from("reports")
        .insert({ order_id: order!.id, user_id: user.id });
    }
    [orderA, orderB] = orderIds;
  }, 60_000);

  afterAll(async () => {
    if (!hasSupabaseEnv) return;
    // Pedidos sobrevivem à exclusão do usuário (anonimizados): apagar à parte.
    if (orderIds.length) await admin.from("orders").delete().in("id", orderIds);
    if (inactiveProductId)
      await admin.from("products").delete().eq("id", inactiveProductId);
    await admin
      .from("user_roles")
      .delete()
      .eq("user_id", a?.id ?? "");
    for (const u of [a, b]) if (u) await admin.auth.admin.deleteUser(u.id);
  }, 60_000);

  describe("perfis (profiles)", () => {
    it("o perfil é criado automaticamente no cadastro", async () => {
      const { data } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", a.id)
        .single();
      expect(data?.full_name).toBe("Usuário a");
    });

    it("cada usuário lê só o próprio perfil", async () => {
      const { data } = await a.client.from("profiles").select("id");
      expect(data?.map((p) => p.id)).toEqual([a.id]);
    });

    it("não lê nem altera o perfil de outro usuário", async () => {
      const read = await a.client.from("profiles").select("*").eq("id", b.id);
      expect(read.data).toEqual([]);

      const update = await a.client
        .from("profiles")
        .update({ full_name: "Invadido" })
        .eq("id", b.id)
        .select();
      expect(update.data).toEqual([]);
      const { data } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", b.id)
        .single();
      expect(data?.full_name).toBe("Usuário b");
    });

    it("edita o próprio nome", async () => {
      const { data, error } = await a.client
        .from("profiles")
        .update({ full_name: "Nome Novo" })
        .eq("id", a.id)
        .select("full_name")
        .single();
      expect(error).toBeNull();
      expect(data?.full_name).toBe("Nome Novo");
    });

    it("não consegue apagar o aceite dos termos já gravado", async () => {
      const accepted = "2026-01-01T12:00:00+00:00";
      await admin
        .from("profiles")
        .update({ accepted_terms_at: accepted })
        .eq("id", a.id);
      await a.client
        .from("profiles")
        .update({ accepted_terms_at: null })
        .eq("id", a.id);
      const { data } = await admin
        .from("profiles")
        .select("accepted_terms_at")
        .eq("id", a.id)
        .single();
      expect(new Date(data!.accepted_terms_at!).toISOString()).toBe(
        new Date(accepted).toISOString(),
      );
    });
  });

  describe("perfis de nascimento (birth_profiles)", () => {
    it("lê só os próprios", async () => {
      const { data } = await a.client.from("birth_profiles").select("id");
      expect(data?.map((p) => p.id)).toEqual([birthProfileA]);
    });

    it("não lê o de outro usuário nem por id", async () => {
      const { data } = await a.client
        .from("birth_profiles")
        .select("id")
        .eq("id", birthProfileB);
      expect(data).toEqual([]);
    });

    it("não cria perfil em nome de outro usuário", async () => {
      const { error } = await a.client.from("birth_profiles").insert({
        user_id: b.id,
        name: "Falso",
        birth_date: "2000-01-01",
        time_unknown: true,
        city_name: "X",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
      });
      expect(error).not.toBeNull();
    });

    it("não apaga o de outro usuário", async () => {
      await a.client.from("birth_profiles").delete().eq("id", birthProfileB);
      const { data } = await admin
        .from("birth_profiles")
        .select("id")
        .eq("id", birthProfileB);
      expect(data).toHaveLength(1);
    });
  });

  describe("pedidos (orders)", () => {
    it("lê só os próprios", async () => {
      const { data } = await a.client.from("orders").select("id");
      expect(data?.map((o) => o.id)).toEqual([orderA]);
    });

    it("não cria, altera nem apaga pedidos pelo cliente", async () => {
      const insert = await a.client.from("orders").insert({
        user_id: a.id,
        product_id: productId,
        amount_cents: 1,
      });
      expect(insert.error).not.toBeNull();

      const update = await a.client
        .from("orders")
        .update({ status: "paid", amount_cents: 0 })
        .eq("id", orderA);
      expect(update.error).not.toBeNull();

      const del = await a.client.from("orders").delete().eq("id", orderA);
      expect(del.error).not.toBeNull();

      const { data } = await admin
        .from("orders")
        .select("status, amount_cents")
        .eq("id", orderA)
        .single();
      expect(data).toEqual({ status: "pending", amount_cents: 4900 });
    });

    it("visitante sem login não lê pedidos", async () => {
      const { data, error } = await anonClient().from("orders").select("id");
      expect(error !== null || data?.length === 0).toBe(true);
    });
  });

  describe("relatórios (reports)", () => {
    it("lê só os próprios", async () => {
      const { data } = await a.client.from("reports").select("order_id");
      expect(data?.map((r) => r.order_id)).toEqual([orderA]);
    });

    it("não escreve relatórios pelo cliente", async () => {
      const { error } = await a.client
        .from("reports")
        .update({ error: "hack" })
        .eq("order_id", orderA);
      expect(error).not.toBeNull();
    });

    it("não lê o relatório de outro usuário", async () => {
      const { data } = await a.client
        .from("reports")
        .select("id")
        .eq("order_id", orderB);
      expect(data).toEqual([]);
    });
  });

  describe("papéis (user_roles)", () => {
    it("o cliente não acessa a tabela", async () => {
      const { data, error } = await a.client.from("user_roles").select("*");
      expect(error !== null || data?.length === 0).toBe(true);
    });

    it("o usuário não consegue se promover a admin", async () => {
      const { error } = await a.client
        .from("user_roles")
        .insert({ user_id: a.id, role: "admin" });
      expect(error).not.toBeNull();
      const { data } = await a.client.rpc("is_admin");
      expect(data).toBe(false);
    });
  });

  describe("produtos e configurações", () => {
    it("visitante vê só produtos ativos", async () => {
      const { data } = await anonClient()
        .from("products")
        .select("slug, active");
      expect(data!.length).toBeGreaterThanOrEqual(3);
      expect(data!.every((p) => p.active)).toBe(true);
    });

    it("usuário comum não edita nem cria produtos", async () => {
      const update = await a.client
        .from("products")
        .update({ price_cents: 1 })
        .eq("id", productId)
        .select();
      expect(update.data).toEqual([]);

      const insert = await a.client
        .from("products")
        .insert({ slug: `x-${randomUUID()}`, name: "X", price_cents: 1 });
      expect(insert.error).not.toBeNull();

      const { data } = await admin
        .from("products")
        .select("price_cents")
        .eq("id", productId)
        .single();
      expect(data?.price_cents).toBe(4900);
    });

    it("a configuração padrão é pública e só admin altera", async () => {
      const { data } = await anonClient()
        .from("settings")
        .select("value")
        .eq("key", "default_house_system")
        .single();
      expect(data?.value).toBe("placidus");

      const update = await a.client
        .from("settings")
        .update({ value: "equal" })
        .eq("key", "default_house_system")
        .select();
      expect(update.data).toEqual([]);
    });

    it("admin vê produtos inativos e edita produtos", async () => {
      await admin.from("user_roles").insert({ user_id: a.id, role: "admin" });
      try {
        const { data: isAdmin } = await a.client.rpc("is_admin");
        expect(isAdmin).toBe(true);

        const { data: seen } = await a.client
          .from("products")
          .select("id")
          .eq("id", inactiveProductId);
        expect(seen).toHaveLength(1);

        const { data: updated, error } = await a.client
          .from("products")
          .update({ name: "Renomeado pelo admin" })
          .eq("id", inactiveProductId)
          .select("name")
          .single();
        expect(error).toBeNull();
        expect(updated?.name).toBe("Renomeado pelo admin");
      } finally {
        await admin.from("user_roles").delete().eq("user_id", a.id);
      }
    });
  });
});

describe.skipIf(!hasSupabaseEnv)("LGPD: exclusão de conta", () => {
  it("apaga perfis e relatórios e anonimiza os pedidos", async () => {
    const admin = serviceClient();
    const user = await createTestUser("lgpd");
    const { data: product } = await admin
      .from("products")
      .select("id")
      .eq("slug", "mapa-astral-completo")
      .single();
    const { data: bp } = await admin
      .from("birth_profiles")
      .insert({
        user_id: user.id,
        name: "Perfil LGPD",
        birth_date: "1995-07-14",
        time_unknown: true,
        city_name: "Campinas, SP",
        latitude: -22.9,
        longitude: -47.06,
        timezone: "America/Sao_Paulo",
      })
      .select("id")
      .single();
    const { data: order } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product!.id,
        birth_profile_id: bp!.id,
        amount_cents: 4900,
        status: "paid",
      })
      .select("id")
      .single();
    await admin
      .from("reports")
      .insert({ order_id: order!.id, user_id: user.id });

    try {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      expect(error).toBeNull();

      const profiles = await admin
        .from("profiles")
        .select("id")
        .eq("id", user.id);
      const births = await admin
        .from("birth_profiles")
        .select("id")
        .eq("id", bp!.id);
      const reports = await admin
        .from("reports")
        .select("id")
        .eq("order_id", order!.id);
      const kept = await admin
        .from("orders")
        .select("user_id, birth_profile_id, amount_cents, status")
        .eq("id", order!.id)
        .single();

      expect(profiles.data).toEqual([]);
      expect(births.data).toEqual([]);
      expect(reports.data).toEqual([]);
      expect(kept.data).toEqual({
        user_id: null,
        birth_profile_id: null,
        amount_cents: 4900,
        status: "paid",
      });
    } finally {
      await admin.from("orders").delete().eq("id", order!.id);
      await admin.auth.admin.deleteUser(user.id);
    }
  }, 60_000);
});
