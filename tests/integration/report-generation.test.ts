import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { WriteError, type SectionWriter } from "@/lib/ai/types";
import { runGeneration, type Notifier } from "@/lib/reports/generate";
import { createSupabaseStore } from "@/lib/reports/store";

import { createTestUser, hasSupabaseEnv, serviceClient } from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const LONG = ("palavra ".repeat(300) + "fim").trim();

describe.skipIf(!hasSupabaseEnv)("geração do relatório no banco real", () => {
  const admin = hasSupabaseEnv ? serviceClient() : (null as never);
  const store = hasSupabaseEnv ? createSupabaseStore(admin) : (null as never);
  let user: TestUser;
  let other: TestUser;
  let productId: string;
  const orderIds: string[] = [];
  const productIds: string[] = [];

  const sectionConfig = (n: number, houses: string[] = []) =>
    Array.from({ length: n }, (_, i) => ({
      key: `s${i + 1}`,
      title: `Seção ${i + 1}`,
      instructions: `INSTRUÇÃO-SECRETA-${i + 1}`,
      ...(houses.includes(`s${i + 1}`) && { needs_houses: true }),
    }));

  async function newProduct(n = 10, houses: string[] = []) {
    const { data, error } = await admin
      .from("products")
      .insert({
        slug: `teste-relatorio-${randomUUID()}`,
        name: "Produto de teste",
        price_cents: 100,
        ai_instructions: "INSTRUÇÃO-DO-PRODUTO",
        report_sections: sectionConfig(n, houses),
      })
      .select("id")
      .single();
    if (error) throw error;
    productIds.push(data!.id);
    return data!.id as string;
  }

  async function newBirthProfile(timeUnknown = false) {
    const { data, error } = await admin
      .from("birth_profiles")
      .insert({
        user_id: user.id,
        name: "Perfil",
        birth_date: "1995-07-14",
        birth_time: timeUnknown ? null : "15:30",
        time_unknown: timeUnknown,
        city_name: "Campinas, SP",
        latitude: -22.91,
        longitude: -47.06,
        timezone: "America/Sao_Paulo",
      })
      .select("id")
      .single();
    if (error) throw error;
    return data!.id as string;
  }

  async function newPaidOrder(product = productId, birthProfileId?: string) {
    const bp = birthProfileId ?? (await newBirthProfile());
    const { data, error } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product,
        birth_profile_id: bp,
        amount_cents: 100,
        status: "paid",
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

  const okWriter = () => {
    const w = {
      calls: [] as string[],
      async write(req: { prompt: string }) {
        w.calls.push(/seção "([^"]+)"/.exec(req.prompt)?.[1] ?? "?");
        return { text: LONG, inputTokens: 1000, outputTokens: 800 };
      },
    };
    return w satisfies SectionWriter & { calls: string[] };
  };

  const reportOf = async (orderId: string) =>
    (await admin.from("reports").select("*").eq("order_id", orderId).single())
      .data!;
  const statusOf = async (orderId: string) =>
    (await admin.from("orders").select("status").eq("id", orderId).single())
      .data!.status;

  beforeAll(async () => {
    [user, other] = await Promise.all([
      createTestUser("rg1"),
      createTestUser("rg2"),
    ]);
    productId = await newProduct(10);
  }, 60_000);

  afterAll(async () => {
    if (!hasSupabaseEnv) return;
    if (orderIds.length) await admin.from("orders").delete().in("id", orderIds);
    if (productIds.length)
      await admin.from("products").delete().in("id", productIds);
    for (const u of [user, other])
      if (u) await admin.auth.admin.deleteUser(u.id);
  }, 60_000);

  it("pedido pago -> relatório completo, pedido 'ready', mapa calculado e tokens somados", async () => {
    const orderId = await newPaidOrder();
    const writer = okWriter();
    const { notify, calls } = notifier();

    const r = await runGeneration(orderId, { store, writer, notify });

    expect(r).toMatchObject({ state: "ready", done: 10, total: 10 });
    expect(await statusOf(orderId)).toBe("ready");
    const report = await reportOf(orderId);
    expect(report.user_id).toBe(user.id);
    expect(report.house_system).toBe("placidus");
    expect(report.chart_data.ascendant.sign).toBe("Sagitário");
    expect(report.chart_data.planets).toHaveLength(11);
    expect(report.sections).toHaveLength(10);
    for (const s of report.sections) {
      expect(s.status).toBe("done");
      expect(s.content.length).toBeGreaterThan(100);
    }
    expect([report.input_tokens, report.output_tokens]).toEqual([
      10_000, 8_000,
    ]);
    expect(report.lock_until).toBeNull();
    expect(calls).toEqual({ payment: 1, ready: 1 });
  });

  it("as instruções (prompts) NUNCA vão para o relatório que o cliente lê", async () => {
    const orderId = await newPaidOrder();
    await runGeneration(orderId, {
      store,
      writer: okWriter(),
      notify: notifier().notify,
    });

    // O cliente lê o próprio relatório pela RLS; o texto não pode conter prompts.
    const { data } = await user.client
      .from("reports")
      .select("*")
      .eq("order_id", orderId);
    expect(data).toHaveLength(1);
    const visible = JSON.stringify(data);
    expect(visible).not.toContain("INSTRUÇÃO-SECRETA");
    expect(visible).not.toContain("INSTRUÇÃO-DO-PRODUTO");

    // E outro usuário não enxerga o relatório.
    const stolen = await other.client
      .from("reports")
      .select("id")
      .eq("order_id", orderId);
    expect(stolen.data).toEqual([]);
  });

  it("interrompido no meio e chamado de novo: continua de onde parou, sem repetir seções", async () => {
    const orderId = await newPaidOrder();
    const clock = { t: 0 };
    const writer = okWriter();
    const slowWriter: SectionWriter = {
      write: async (req) => {
        clock.t += 10_000; // cada seção "leva" 10 s
        return writer.write(req);
      },
    };
    const { notify, calls } = notifier();
    const deps = {
      store,
      writer: slowWriter,
      notify,
      now: () => clock.t,
      options: { concurrency: 1, softBudgetMs: 25_000 },
    };

    const first = await runGeneration(orderId, deps);
    expect(first).toMatchObject({ state: "more", done: 3, total: 10 });
    expect(await statusOf(orderId)).toBe("generating");
    expect((await reportOf(orderId)).lock_until).toBeNull();

    clock.t = 0;
    let rounds = 0;
    let last = first;
    while (last.state === "more" && rounds++ < 10) {
      clock.t = 0;
      last = await runGeneration(orderId, deps);
    }
    expect(last.state).toBe("ready");
    // Cada seção foi escrita exatamente uma vez no total.
    expect(writer.calls).toHaveLength(10);
    expect(new Set(writer.calls).size).toBe(10);
    expect(calls).toEqual({ payment: 1, ready: 1 });
  });

  it("várias seções gravadas ao mesmo tempo: nenhuma se perde (gravação atômica)", async () => {
    const orderId = await newPaidOrder();
    await store.beginGeneration(orderId);
    const order = (await store.getOrder(orderId))!;
    const report = await store.getOrCreateReport(
      order,
      sectionConfig(10).map((s) => ({
        key: s.key,
        title: s.title,
        content: "",
        status: "pending" as const,
        attempts: 0,
      })),
    );

    await Promise.all(
      report.sections.map((s) =>
        store.applySection(report.id, s.key, {
          content: `texto ${s.key}`,
          status: "done",
          attempts: 0,
          inputTokens: 10,
          outputTokens: 5,
        }),
      ),
    );

    const after = await reportOf(orderId);
    expect(after.sections.map((s: { content: string }) => s.content)).toEqual(
      sectionConfig(10).map((s) => `texto ${s.key}`),
    );
    expect(
      after.sections.every((s: { status: string }) => s.status === "done"),
    ).toBe(true);
    expect([after.input_tokens, after.output_tokens]).toEqual([100, 50]);
  });

  it("trava: só um job por vez; vencida, outro assume", async () => {
    const orderId = await newPaidOrder();
    await store.beginGeneration(orderId);
    const report = await store.getOrCreateReport(
      (await store.getOrder(orderId))!,
      [],
    );

    expect(await store.acquireLock(report.id, 60_000)).toBe(true);
    expect(await store.acquireLock(report.id, 60_000)).toBe(false);
    await store.releaseLock(report.id);
    expect(await store.acquireLock(report.id, 60_000)).toBe(true);

    // Simula job que morreu: trava vencida no passado.
    await admin
      .from("reports")
      .update({ lock_until: new Date(Date.now() - 1000).toISOString() })
      .eq("id", report.id);
    expect(await store.acquireLock(report.id, 60_000)).toBe(true);
  });

  it("dois jobs simultâneos no mesmo pedido: só um escreve", async () => {
    const orderId = await newPaidOrder();
    const writer = okWriter();
    const deps = { store, writer, notify: notifier().notify };
    const results = await Promise.all([
      runGeneration(orderId, deps),
      runGeneration(orderId, deps),
      runGeneration(orderId, deps),
    ]);
    // Uma execução completa; as demais encontram a trava ou o pedido já pronto.
    expect(
      results.filter((r) => r.state === "ready").length,
    ).toBeGreaterThanOrEqual(1);
    expect(writer.calls).toHaveLength(10);
    expect(new Set(writer.calls).size).toBe(10);
    expect(await statusOf(orderId)).toBe("ready");
  });

  it("sem hora de nascimento: seções de casas viram explicação, sem chamar a IA", async () => {
    const pid = await newProduct(4, ["s2", "s3"]);
    const orderId = await newPaidOrder(pid, await newBirthProfile(true));
    const writer = okWriter();
    const r = await runGeneration(orderId, {
      store,
      writer,
      notify: notifier().notify,
    });
    expect(r.state).toBe("ready");
    expect(writer.calls).toEqual(["Seção 1", "Seção 4"]);
    const report = await reportOf(orderId);
    expect(report.chart_data.time_unknown).toBe(true);
    expect(report.chart_data.ascendant).toBeNull();
    expect(report.sections[1].content).toContain("hora exata de nascimento");
  });

  it("falha em 3 tentativas: pedido 'failed', erro categorizado e sem texto interno", async () => {
    const pid = await newProduct(2);
    const orderId = await newPaidOrder(pid);
    let tries = 0;
    const writer: SectionWriter = {
      write: async (req) => {
        if (/seção "Seção 1"/.test(req.prompt)) {
          tries++;
          throw new WriteError("limite_de_uso", "detalhe interno sensível");
        }
        return { text: LONG, inputTokens: 1, outputTokens: 1 };
      },
    };
    const r = await runGeneration(orderId, {
      store,
      writer,
      notify: notifier().notify,
    });
    expect(r.state).toBe("failed");
    expect(tries).toBe(3);
    expect(await statusOf(orderId)).toBe("failed");
    const report = await reportOf(orderId);
    expect(report.error).toBe("secao_s1_falhou_limite_de_uso");
    expect(JSON.stringify(report)).not.toContain("detalhe interno");
    expect(report.sections[0]).toMatchObject({
      status: "failed",
      attempts: 3,
      error: "limite_de_uso",
    });
    expect(report.sections[1].status).toBe("done");
  });

  it("pedido que não está pago é ignorado", async () => {
    const { data } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: productId,
        amount_cents: 100,
        status: "pending",
      })
      .select("id")
      .single();
    orderIds.push(data!.id);
    const writer = okWriter();
    const r = await runGeneration(data!.id, {
      store,
      writer,
      notify: notifier().notify,
    });
    expect(r.state).toBe("ignored");
    expect(writer.calls).toHaveLength(0);
    expect(await statusOf(data!.id)).toBe("pending");
  });
});
