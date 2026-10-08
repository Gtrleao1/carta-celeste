import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SectionWriter } from "@/lib/ai/types";
import { runGeneration, type Notifier } from "@/lib/reports/generate";
import { createSupabaseStore } from "@/lib/reports/store";

import {
  anonClient,
  createTestUser,
  hasSupabaseEnv,
  serviceClient,
} from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const LONG = ("palavra ".repeat(300) + "fim").trim();

describe.skipIf(!hasSupabaseEnv)(
  "admin: papel, produtos e reprocessamento",
  () => {
    const admin = hasSupabaseEnv ? serviceClient() : (null as never);
    const store = hasSupabaseEnv ? createSupabaseStore(admin) : (null as never);
    let user: TestUser;
    let boss: TestUser;
    const productIds: string[] = [];
    const orderIds: string[] = [];

    const config = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        key: `s${i + 1}`,
        title: `Seção ${i + 1}`,
        instructions: `SEGREDO-${i + 1}`,
      }));

    async function newProduct(sections = config(4), active = true) {
      const { data, error } = await admin
        .from("products")
        .insert({
          slug: `teste-admin-${randomUUID()}`,
          name: "Produto de teste",
          price_cents: 100,
          active,
          ai_instructions: "SEGREDO-GERAL",
          report_sections: sections,
        })
        .select("id, slug")
        .single();
      if (error) throw error;
      productIds.push(data!.id);
      return data!;
    }

    async function newOrder(status: string, productId: string) {
      const { data: bp } = await admin
        .from("birth_profiles")
        .insert({
          user_id: user.id,
          name: "Perfil",
          birth_date: "1995-07-14",
          birth_time: "15:30",
          time_unknown: false,
          city_name: "Campinas, SP",
          latitude: -22.91,
          longitude: -47.06,
          timezone: "America/Sao_Paulo",
        })
        .select("id")
        .single();
      const { data, error } = await admin
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: productId,
          birth_profile_id: bp!.id,
          amount_cents: 100,
          status,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      orderIds.push(data!.id);
      return data!.id as string;
    }

    const notifier = () => {
      const calls = { payment: 0, ready: 0 };
      const notify: Notifier = {
        paymentConfirmed: async () => void calls.payment++,
        reportReady: async () => void calls.ready++,
      };
      return { notify, calls };
    };

    beforeAll(async () => {
      [user, boss] = await Promise.all([
        createTestUser("ad1"),
        createTestUser("ad2"),
      ]);
      await admin
        .from("user_roles")
        .insert({ user_id: boss.id, role: "admin" });
    }, 60_000);

    afterAll(async () => {
      if (!hasSupabaseEnv) return;
      if (orderIds.length)
        await admin.from("orders").delete().in("id", orderIds);
      if (productIds.length)
        await admin.from("products").delete().in("id", productIds);
      for (const u of [user, boss])
        if (u) await admin.auth.admin.deleteUser(u.id);
    }, 60_000);

    describe("papel de admin (is_admin)", () => {
      it("só quem está em user_roles é admin", async () => {
        expect((await boss.client.rpc("is_admin")).data).toBe(true);
        expect((await user.client.rpc("is_admin")).data).toBe(false);
        expect((await anonClient().rpc("is_admin")).data).toBe(false);
      });

      it("ninguém consegue se dar o papel de admin pelo cliente", async () => {
        const r = await user.client
          .from("user_roles")
          .insert({ user_id: user.id, role: "admin" });
        expect(r.error).not.toBeNull();
        expect((await user.client.rpc("is_admin")).data).toBe(false);
      });

      it("o usuário comum não chama report_reprocess", async () => {
        const r = await user.client.rpc("report_reprocess", {
          p_order_id: randomUUID(),
        });
        expect(r.error).not.toBeNull();
      });
    });

    describe("produto novo sem mexer no código", () => {
      it("aparece na vitrine com os títulos das seções, sem as instruções", async () => {
        const p = await newProduct(config(3), true);
        const { data, error } = await anonClient()
          .from("products")
          .select("slug, name, section_titles")
          .eq("slug", p.slug)
          .single();
        expect(error).toBeNull();
        expect(data!.section_titles).toEqual([
          { key: "s1", title: "Seção 1" },
          { key: "s2", title: "Seção 2" },
          { key: "s3", title: "Seção 3" },
        ]);
        expect(JSON.stringify(data)).not.toContain("SEGREDO");
      });

      it("produto inativo não aparece para o público", async () => {
        const p = await newProduct(config(2), false);
        const { data } = await anonClient()
          .from("products")
          .select("slug")
          .eq("slug", p.slug);
        expect(data).toEqual([]);
      });

      it("títulos acompanham a edição das seções", async () => {
        const p = await newProduct(config(2), true);
        await admin
          .from("products")
          .update({ report_sections: config(5) })
          .eq("id", p.id);
        const { data } = await anonClient()
          .from("products")
          .select("section_titles")
          .eq("id", p.id)
          .single();
        expect(data!.section_titles).toHaveLength(5);
      });

      it("gera relatório com as seções do produto novo", async () => {
        const p = await newProduct(config(3), true);
        const orderId = await newOrder("paid", p.id);
        const writer: SectionWriter = {
          write: async () => ({ text: LONG, inputTokens: 1, outputTokens: 1 }),
        };
        const r = await runGeneration(orderId, {
          store,
          writer,
          notify: notifier().notify,
        });
        expect(r).toMatchObject({ state: "ready", total: 3 });
        const { data } = await admin
          .from("reports")
          .select("sections")
          .eq("order_id", orderId)
          .single();
        expect(
          (data!.sections as { title: string }[]).map((s) => s.title),
        ).toEqual(["Seção 1", "Seção 2", "Seção 3"]);
      });
    });

    describe("report_reprocess", () => {
      async function failedOrder() {
        const p = await newProduct(config(4));
        const orderId = await newOrder("generating", p.id);
        await store.getOrCreateReport(
          (await store.getOrder(orderId))!,
          config(4).map((s) => ({
            key: s.key,
            title: s.title,
            content: "",
            status: "pending" as const,
            attempts: 0,
          })),
        );
        const { data: report } = await admin
          .from("reports")
          .select("id")
          .eq("order_id", orderId)
          .single();
        await store.applySection(report!.id, "s1", {
          content: "texto pronto",
          status: "done",
          attempts: 1,
        });
        await store.applySection(report!.id, "s2", {
          status: "failed",
          attempts: 3,
          error: "limite_de_uso",
        });
        await store.applySection(report!.id, "s3", {
          status: "pending",
          attempts: 2,
          error: "tempo_esgotado",
        });
        await admin
          .from("reports")
          .update({ error: "secao_s2_falhou_limite_de_uso" })
          .eq("id", report!.id);
        await admin
          .from("orders")
          .update({ status: "failed" })
          .eq("id", orderId);
        return { orderId, reportId: report!.id as string };
      }

      it("mantém seções prontas, zera as demais e limpa o erro; o pedido volta a 'generating'", async () => {
        const { orderId } = await failedOrder();

        const moved = await admin.rpc("report_reprocess", {
          p_order_id: orderId,
        });
        expect(moved.data).toBe(true);

        const { data: order } = await admin
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .single();
        expect(order!.status).toBe("generating");

        const { data: report } = await admin
          .from("reports")
          .select("sections, error")
          .eq("order_id", orderId)
          .single();
        expect(report!.error).toBeNull();
        const s = report!.sections as {
          key: string;
          status: string;
          attempts: number;
          content: string;
          error?: string;
        }[];
        expect(s.map((x) => x.key)).toEqual(["s1", "s2", "s3", "s4"]);
        expect(s[0]).toMatchObject({ status: "done", content: "texto pronto" });
        for (const x of s.slice(1)) {
          expect(x).toMatchObject({ status: "pending", attempts: 0 });
          expect(x.error).toBeUndefined();
        }
      });

      it("o job retomado escreve só o que faltava e não reenvia o e-mail de pagamento", async () => {
        const { orderId } = await failedOrder();
        await admin.rpc("report_reprocess", { p_order_id: orderId });

        const written: string[] = [];
        const writer: SectionWriter = {
          write: async (req) => {
            written.push(/seção "([^"]+)"/.exec(req.prompt)?.[1] ?? "?");
            return { text: LONG, inputTokens: 1, outputTokens: 1 };
          },
        };
        const { notify, calls } = notifier();
        const r = await runGeneration(orderId, { store, writer, notify });

        expect(r.state).toBe("ready");
        expect(written.sort()).toEqual(["Seção 2", "Seção 3", "Seção 4"]);
        expect(calls).toEqual({ payment: 0, ready: 1 });
      });

      it.each(["pending", "ready", "refunded", "cancelled"])(
        "pedido '%s' não é reprocessado",
        async (status) => {
          const p = await newProduct();
          const orderId = await newOrder(status, p.id);
          const r = await admin.rpc("report_reprocess", {
            p_order_id: orderId,
          });
          expect(r.data).toBe(false);
          const { data } = await admin
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .single();
          expect(data!.status).toBe(status);
        },
      );
    });
  },
);
