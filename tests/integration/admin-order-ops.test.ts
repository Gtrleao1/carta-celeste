import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { runBulk } from "@/lib/admin/order-ops";
import { createOrderOpsDeps } from "@/lib/admin/order-ops-deps";

import {
  anonClient,
  createTestUser,
  hasSupabaseEnv,
  serviceClient,
} from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

/**
 * As ações do admin sobre pedidos com as dependências REAIS (banco de verdade):
 * leitura, exclusão em cascata, histórico sem dado pessoal e e-mail sem chave.
 * Os dados são descartáveis e saem no fim.
 */
describe.skipIf(!hasSupabaseEnv)(
  "admin: ações sobre pedidos (banco real)",
  () => {
    const db = hasSupabaseEnv ? serviceClient() : (null as never);
    let user: TestUser;
    let productId: string;
    const orderIds: string[] = [];

    async function makeOrder(status: string) {
      const { data: bp, error: bpError } = await db
        .from("birth_profiles")
        .insert({
          user_id: user.id,
          name: "Perfil de teste",
          birth_date: "1990-01-01",
          time_unknown: true,
          city_name: "São Paulo, SP",
          latitude: -23.55,
          longitude: -46.63,
          timezone: "America/Sao_Paulo",
        })
        .select("id")
        .single();
      if (bpError) throw bpError;
      const { data: order, error } = await db
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: productId,
          birth_profile_id: bp!.id,
          amount_cents: 4900,
          status,
        })
        .select("id")
        .single();
      if (error) throw error;
      orderIds.push(order!.id);
      const { error: reportError } = await db.from("reports").insert({
        order_id: order!.id,
        user_id: user.id,
        sections: [
          {
            key: "sol",
            title: "O seu Sol",
            content: "x".repeat(40),
            status: "done",
            attempts: 0,
          },
        ],
      });
      if (reportError) throw reportError;
      return order!.id as string;
    }

    beforeAll(async () => {
      user = await createTestUser("ops");
      const { data: product } = await db
        .from("products")
        .select("id")
        .eq("slug", "mapa-astral-completo")
        .single();
      productId = product!.id;
    }, 60_000);

    afterAll(async () => {
      if (!hasSupabaseEnv) return;
      if (orderIds.length) {
        await db.from("admin_audit_log").delete().in("order_id", orderIds);
        await db.from("orders").delete().in("id", orderIds);
      }
      if (user) await db.auth.admin.deleteUser(user.id);
    }, 60_000);

    it("lê o pedido com o nome do produto e os dados que o histórico guarda", async () => {
      const id = await makeOrder("ready");
      const [order] = await createOrderOpsDeps(user.id).loadOrders([id]);
      expect(order).toMatchObject({
        id,
        status: "ready",
        amount_cents: 4900,
        product_name: "Mapa Astral Completo",
      });
      expect(order.created_at).toBeTruthy();
    });

    it("exclui o pedido, leva o mapa junto (cascata) e grava o histórico sem dado pessoal", async () => {
      const id = await makeOrder("pending");
      const [outcome] = await runBulk(
        "delete",
        [id],
        createOrderOpsDeps(user.id),
      );
      expect(outcome).toMatchObject({ id, result: "ok" });

      const { data: order } = await db.from("orders").select("id").eq("id", id);
      expect(order).toEqual([]);
      const { data: report } = await db
        .from("reports")
        .select("id")
        .eq("order_id", id);
      expect(report).toEqual([]);

      const { data: log } = await db
        .from("admin_audit_log")
        .select("*")
        .eq("order_id", id);
      expect(log).toHaveLength(1);
      expect(log![0]).toMatchObject({
        action: "excluir_pedido",
        admin_id: user.id,
        order_status: "pending",
        amount_cents: 4900,
        product_name: "Mapa Astral Completo",
      });
      // nem e-mail, nem nome, nem dado de nascimento no histórico
      const text = JSON.stringify(log![0]);
      expect(text).not.toContain(user.email);
      expect(text).not.toMatch(/Perfil de teste|1990-01-01|São Paulo, SP/);
    });

    it("não exclui pedido em geração", async () => {
      const id = await makeOrder("generating");
      const [outcome] = await runBulk(
        "delete",
        [id],
        createOrderOpsDeps(user.id),
      );
      expect(outcome).toMatchObject({
        result: "skipped",
        reason: "em_geracao",
      });
      const { data } = await db.from("orders").select("id").eq("id", id);
      expect(data).toHaveLength(1);
    });

    it("reenviar sem chave de e-mail pula o pedido e não registra reenvio", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const id = await makeOrder("ready");
      const [outcome] = await runBulk(
        "resend",
        [id],
        createOrderOpsDeps(user.id),
      );
      vi.unstubAllEnvs();
      expect(outcome).toMatchObject({ result: "skipped", reason: "sem_chave" });
      const { data } = await db
        .from("admin_audit_log")
        .select("id")
        .eq("order_id", id);
      expect(data).toEqual([]);
    });

    it("reenviar pedido que não está pronto não faz nada", async () => {
      const id = await makeOrder("paid");
      const [outcome] = await runBulk(
        "resend",
        [id],
        createOrderOpsDeps(user.id),
      );
      expect(outcome).toMatchObject({
        result: "skipped",
        reason: "nao_pronto",
      });
    });

    it("o histórico é invisível para o navegador (sem login e logado)", async () => {
      const anon = await anonClient()
        .from("admin_audit_log")
        .select("id")
        .limit(1);
      expect(anon.error || (anon.data ?? []).length === 0).toBeTruthy();
      const logged = await user.client
        .from("admin_audit_log")
        .select("id")
        .limit(1);
      expect(logged.error || (logged.data ?? []).length === 0).toBeTruthy();
      const write = await user.client.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "excluir_pedido",
        order_id: orderIds[0],
      });
      expect(write.error).not.toBeNull();
    });
  },
);
