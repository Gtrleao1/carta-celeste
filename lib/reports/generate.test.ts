import { describe, expect, it, vi } from "vitest";

import type { ChartInput } from "@/lib/astro";
import { WriteError, type SectionWriter } from "@/lib/ai/types";

import {
  cleanText,
  runGeneration,
  type GenerationOptions,
  type Notifier,
  type OrderRow,
  type ProductRow,
  type ReportRow,
  type ReportStore,
  type SectionPatch,
} from "./generate";
import type { SectionConfig, SectionState } from "./types";

const ORDER_ID = "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e";
const LONG_TEXT = ("palavra ".repeat(300) + "fim").trim();

const BIRTH: ChartInput = {
  birthDate: "1995-07-14",
  birthTime: "15:30",
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
  houseSystem: "placidus",
};

const sectionsConfig = (n: number, houses: string[] = []): SectionConfig[] =>
  Array.from({ length: n }, (_, i) => ({
    key: `s${i + 1}`,
    title: `Seção ${i + 1}`,
    instructions: `Instruções da seção ${i + 1}`,
    needs_houses: houses.includes(`s${i + 1}`),
  }));

/** Banco em memória que imita as garantias do Supabase (transições e trava). */
function memoryStore(opts: {
  config: SectionConfig[];
  birth?: ChartInput | null;
  orderStatus?: string;
  clock: { t: number };
}) {
  const order: OrderRow = {
    id: ORDER_ID,
    status: opts.orderStatus ?? "paid",
    user_id: "u1",
    product_id: "p1",
    birth_profile_id: "b1",
  };
  const product: ProductRow = {
    id: "p1",
    name: "Produto",
    ai_instructions: "Instruções do produto",
    sections: opts.config,
  };
  let report:
    (ReportRow & { lockUntil: number; tokens: [number, number] }) | null = null;
  const events: string[] = [];
  const applied: { key: string; patch: SectionPatch }[] = [];
  let failing: ((key: string) => boolean) | null = null;

  const store: ReportStore = {
    getOrder: async () => ({ ...order }),
    beginGeneration: async () => {
      if (order.status === "paid") {
        order.status = "generating";
        return "started";
      }
      return order.status === "generating" ? "resumed" : "skip";
    },
    getProduct: async () => product,
    getOrCreateReport: async (_o, sections) => {
      report ??= {
        id: "r1",
        chart_data: null,
        sections,
        lockUntil: 0,
        tokens: [0, 0],
      };
      return structuredClone(report);
    },
    getReport: async () => structuredClone(report!),
    acquireLock: async (_id, lease) => {
      if (report!.lockUntil > opts.clock.t) return false;
      report!.lockUntil = opts.clock.t + lease;
      return true;
    },
    releaseLock: async () => {
      report!.lockUntil = 0;
    },
    getChartInput: async () => (opts.birth === undefined ? BIRTH : opts.birth),
    saveChart: async (_id, chart) => {
      report!.chart_data = chart;
      events.push("chart");
    },
    applySection: async (_id, key, patch) => {
      if (failing?.(key)) throw new Error("queda simulada do banco");
      applied.push({ key, patch });
      const s = report!.sections.find((x) => x.key === key)!;
      Object.assign(s, {
        status: patch.status,
        attempts: patch.attempts,
        ...(patch.content !== undefined && { content: patch.content }),
        ...(patch.error !== undefined && { error: patch.error }),
      });
      report!.tokens[0] += patch.inputTokens ?? 0;
      report!.tokens[1] += patch.outputTokens ?? 0;
    },
    markReady: async () => {
      if (order.status !== "generating") return false;
      order.status = "ready";
      events.push("ready");
      return true;
    },
    markFailed: async (_o, _r, message) => {
      order.status = "failed";
      events.push(`failed:${message}`);
    },
  };

  return {
    store,
    order,
    events,
    applied,
    report: () => report!,
    crashOn: (fn: ((key: string) => boolean) | null) => {
      failing = fn;
    },
  };
}

const notifier = () => {
  const calls = { payment: 0, ready: 0 };
  const notify: Notifier = {
    paymentConfirmed: async () => {
      calls.payment++;
    },
    reportReady: async () => {
      calls.ready++;
    },
  };
  return { notify, calls };
};

const okWriter = (): SectionWriter & {
  calls: string[];
  prompts: string[];
  systems: string[];
} => {
  const w = {
    calls: [] as string[],
    prompts: [] as string[],
    systems: [] as string[],
    async write(req: { system: string; prompt: string }) {
      w.systems.push(req.system);
      w.prompts.push(req.prompt);
      w.calls.push(/seção "([^"]+)"/.exec(req.prompt)?.[1] ?? "?");
      return { text: LONG_TEXT, inputTokens: 1000, outputTokens: 800 };
    },
  };
  return w;
};

const FAST: Partial<GenerationOptions> = { softBudgetMs: 25_000 };

describe("runGeneration", () => {
  it("gera todas as seções, calcula o mapa, soma tokens e marca como pronto uma única vez", async () => {
    const clock = { t: 0 };
    const db = memoryStore({ config: sectionsConfig(10), clock });
    const writer = okWriter();
    const { notify, calls } = notifier();

    const r = await runGeneration(ORDER_ID, {
      store: db.store,
      writer,
      notify,
      now: () => clock.t,
      options: FAST,
    });

    expect(r).toMatchObject({ state: "ready", done: 10, total: 10 });
    expect(db.order.status).toBe("ready");
    expect(db.report().chart_data?.ascendant?.sign).toBe("Sagitário");
    expect(
      db
        .report()
        .sections.every((s) => s.status === "done" && s.content.length > 100),
    ).toBe(true);
    expect(db.report().tokens).toEqual([10_000, 8_000]);
    expect(writer.calls).toHaveLength(10);
    expect(new Set(writer.calls).size).toBe(10);
    expect(calls).toEqual({ payment: 1, ready: 1 });
    expect(db.events.filter((e) => e === "ready")).toHaveLength(1);
  });

  it("não manda dados pessoais à IA: só posições calculadas", async () => {
    const clock = { t: 0 };
    const db = memoryStore({ config: sectionsConfig(2), clock });
    const writer = okWriter();
    await runGeneration(ORDER_ID, {
      store: db.store,
      writer,
      notify: notifier().notify,
      now: () => clock.t,
    });
    const everything = [...writer.systems, ...writer.prompts].join("\n");
    for (const forbidden of [
      "1995",
      "15:30",
      "-22.91",
      "-47.06",
      "Sao_Paulo",
      "@",
      "Campinas",
    ]) {
      expect(everything, forbidden).not.toContain(forbidden);
    }
    expect(everything).toContain("Sol: Câncer");
    expect(everything).toContain("Instruções do produto");
  });

  it("derrubar o job no meio e chamar de novo continua de onde parou, sem refazer seções prontas", async () => {
    const clock = { t: 0 };
    const db = memoryStore({ config: sectionsConfig(10), clock });
    const writer = okWriter();
    const { notify, calls } = notifier();
    const run = () =>
      runGeneration(ORDER_ID, {
        store: db.store,
        writer,
        notify,
        now: () => clock.t,
        options: { concurrency: 1 },
      });

    // O banco "cai" ao gravar a 5ª seção: o job inteiro falha.
    db.crashOn((key) => key === "s5");
    await expect(run()).rejects.toThrow("queda simulada");
    const doneBefore = db
      .report()
      .sections.filter((s) => s.status === "done")
      .map((s) => s.key);
    expect(doneBefore).toEqual(["s1", "s2", "s3", "s4"]);
    expect(db.order.status).toBe("generating"); // continua gerando, não falhou

    // Chamada seguinte: continua da s5 e só escreve o que falta.
    db.crashOn(null);
    writer.calls.length = 0;
    const r = await run();
    expect(r).toMatchObject({ state: "ready", done: 10 });
    expect(writer.calls).toEqual([
      "Seção 5",
      "Seção 6",
      "Seção 7",
      "Seção 8",
      "Seção 9",
      "Seção 10",
    ]);
    // O e-mail de pagamento foi enviado só na primeira vez; o de pronto, uma vez.
    expect(calls).toEqual({ payment: 1, ready: 1 });
  });

  it("respeita o orçamento de tempo: para de iniciar seções e devolve 'more'", async () => {
    const clock = { t: 0 };
    const db = memoryStore({ config: sectionsConfig(10), clock });
    const writer: SectionWriter = {
      write: async () => {
        clock.t += 10_000; // cada seção "leva" 10 s
        return { text: LONG_TEXT, inputTokens: 1, outputTokens: 1 };
      },
    };
    const r = await runGeneration(ORDER_ID, {
      store: db.store,
      writer,
      notify: notifier().notify,
      now: () => clock.t,
      options: { concurrency: 1, softBudgetMs: 25_000 },
    });
    // Inicia em 0 s, 10 s e 20 s (antes dos 25 s) e para: 3 seções.
    expect(r).toMatchObject({ state: "more", done: 3, total: 10 });
    expect(db.order.status).toBe("generating");
    expect(db.report().lockUntil).toBe(0); // trava liberada para a próxima chamada
  });

  it("escreve em paralelo, no máximo `concurrency` seções ao mesmo tempo", async () => {
    const clock = { t: 0 };
    const db = memoryStore({ config: sectionsConfig(9), clock });
    let running = 0;
    let peak = 0;
    const writer: SectionWriter = {
      write: async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        return { text: LONG_TEXT, inputTokens: 1, outputTokens: 1 };
      },
    };
    const r = await runGeneration(ORDER_ID, {
      store: db.store,
      writer,
      notify: notifier().notify,
      now: () => clock.t,
      options: { concurrency: 3 },
    });
    expect(r.state).toBe("ready");
    expect(peak).toBe(3);
  });

  describe("tentativas por seção", () => {
    it("falha duas vezes e na terceira dá certo: segue sem falhar o pedido", async () => {
      const clock = { t: 0 };
      const db = memoryStore({ config: sectionsConfig(3), clock });
      let tries = 0;
      const writer: SectionWriter = {
        write: async (req) => {
          if (/seção "Seção 2"/.test(req.prompt) && ++tries <= 2) {
            throw new WriteError("limite_de_uso");
          }
          return { text: LONG_TEXT, inputTokens: 1, outputTokens: 1 };
        },
      };
      const r = await runGeneration(ORDER_ID, {
        store: db.store,
        writer,
        notify: notifier().notify,
        now: () => clock.t,
      });
      expect(r.state).toBe("ready");
      const s2 = db.report().sections.find((s) => s.key === "s2")!;
      expect(s2.status).toBe("done");
      expect(s2.attempts).toBe(2);
      expect(tries).toBe(3);
    });

    it("falha 3 vezes: seção e pedido ficam 'failed', com categoria de erro (sem texto bruto)", async () => {
      const clock = { t: 0 };
      const db = memoryStore({ config: sectionsConfig(3), clock });
      let tries = 0;
      const writer: SectionWriter = {
        write: async (req) => {
          if (/seção "Seção 2"/.test(req.prompt)) {
            tries++;
            throw new WriteError(
              "recusa",
              "mensagem interna que não pode vazar",
            );
          }
          return { text: LONG_TEXT, inputTokens: 1, outputTokens: 1 };
        },
      };
      const { notify, calls } = notifier();
      const r = await runGeneration(ORDER_ID, {
        store: db.store,
        writer,
        notify,
        now: () => clock.t,
      });
      expect(r.state).toBe("failed");
      expect(tries).toBe(3); // exatamente 3 tentativas
      expect(db.order.status).toBe("failed");
      expect(db.events.at(-1)).toBe("failed:secao_s2_falhou_recusa");
      const s2 = db.report().sections.find((s) => s.key === "s2")!;
      expect(s2).toMatchObject({
        status: "failed",
        attempts: 3,
        error: "recusa",
      });
      expect(JSON.stringify(db.report().sections)).not.toContain(
        "mensagem interna",
      );
      expect(calls.ready).toBe(0);
    });

    it("texto curto demais conta como falha", async () => {
      const clock = { t: 0 };
      const db = memoryStore({ config: sectionsConfig(1), clock });
      const writer: SectionWriter = {
        write: async () => ({
          text: "Muito curto.",
          inputTokens: 1,
          outputTokens: 1,
        }),
      };
      const r = await runGeneration(ORDER_ID, {
        store: db.store,
        writer,
        notify: notifier().notify,
        now: () => clock.t,
      });
      expect(r.state).toBe("failed");
      expect(db.report().sections[0].error).toBe("texto_cortado");
    });
  });

  it("sem hora de nascimento: seções de casas viram explicação, sem chamar a IA", async () => {
    const clock = { t: 0 };
    const db = memoryStore({
      config: sectionsConfig(4, ["s2", "s3"]),
      birth: { ...BIRTH, birthTime: null },
      clock,
    });
    const writer = okWriter();
    const r = await runGeneration(ORDER_ID, {
      store: db.store,
      writer,
      notify: notifier().notify,
      now: () => clock.t,
    });
    expect(r.state).toBe("ready");
    expect(writer.calls).toEqual(["Seção 1", "Seção 4"]);
    const s2 = db.report().sections.find((s) => s.key === "s2")!;
    expect(s2.content).toContain("hora exata de nascimento");
    expect(db.report().chart_data?.time_unknown).toBe(true);
    // As demais seções recebem o aviso de hora desconhecida no resumo.
    expect(writer.prompts[0]).toContain("HORA DE NASCIMENTO: DESCONHECIDA");
  });

  describe("estados que não geram nada", () => {
    it("outro job em andamento (trava ativa): 'locked' e nenhuma escrita", async () => {
      const clock = { t: 1_000 };
      const db = memoryStore({ config: sectionsConfig(3), clock });
      const writer = okWriter();
      const deps = {
        store: db.store,
        writer,
        notify: notifier().notify,
        now: () => clock.t,
      };

      // Um job "ocupa" a trava: ele escreve devagar enquanto o segundo chega.
      let release!: () => void;
      const slow: SectionWriter = {
        write: () =>
          new Promise((resolve) => {
            release = () =>
              resolve({ text: LONG_TEXT, inputTokens: 1, outputTokens: 1 });
          }),
      };
      const first = runGeneration(ORDER_ID, {
        ...deps,
        writer: slow,
        options: { concurrency: 1 },
      });
      await vi.waitFor(() => expect(release).toBeTypeOf("function"));

      const second = await runGeneration(ORDER_ID, deps);
      expect(second.state).toBe("locked");
      expect(writer.calls).toHaveLength(0);

      release();
      await vi.waitFor(() =>
        expect(db.report().sections[0].status).toBe("done"),
      );
      void first;
    });

    it("trava vencida (job anterior morreu): outro job assume", async () => {
      const clock = { t: 0 };
      const db = memoryStore({ config: sectionsConfig(2), clock });
      const writer = okWriter();
      const deps = {
        store: db.store,
        writer,
        notify: notifier().notify,
        now: () => clock.t,
      };
      await db.store.beginGeneration(ORDER_ID);
      const rep = await db.store.getOrCreateReport(db.order, [
        {
          key: "s1",
          title: "Seção 1",
          content: "",
          status: "pending",
          attempts: 0,
        },
        {
          key: "s2",
          title: "Seção 2",
          content: "",
          status: "pending",
          attempts: 0,
        },
      ]);
      db.report().lockUntil = 60_000; // job anterior travou até 60 s
      expect(rep.id).toBe("r1");

      clock.t = 30_000;
      expect((await runGeneration(ORDER_ID, deps)).state).toBe("locked");
      clock.t = 61_000; // a trava venceu
      expect((await runGeneration(ORDER_ID, deps)).state).toBe("ready");
    });

    it("pedido já pronto: não faz nada", async () => {
      const clock = { t: 0 };
      const db = memoryStore({
        config: sectionsConfig(2),
        orderStatus: "ready",
        clock,
      });
      const writer = okWriter();
      const r = await runGeneration(ORDER_ID, {
        store: db.store,
        writer,
        notify: notifier().notify,
        now: () => clock.t,
      });
      expect(r.state).toBe("ready");
      expect(writer.calls).toHaveLength(0);
    });

    it.each(["pending", "refunded", "cancelled", "failed"])(
      "pedido '%s' é ignorado (só pedidos pagos geram relatório)",
      async (orderStatus) => {
        const clock = { t: 0 };
        const db = memoryStore({
          config: sectionsConfig(2),
          orderStatus,
          clock,
        });
        const writer = okWriter();
        const r = await runGeneration(ORDER_ID, {
          store: db.store,
          writer,
          notify: notifier().notify,
          now: () => clock.t,
        });
        expect(r.state).toBe("ignored");
        expect(writer.calls).toHaveLength(0);
      },
    );

    it("perfil de nascimento ausente: pedido falha com motivo claro", async () => {
      const clock = { t: 0 };
      const db = memoryStore({ config: sectionsConfig(2), birth: null, clock });
      const r = await runGeneration(ORDER_ID, {
        store: db.store,
        writer: okWriter(),
        notify: notifier().notify,
        now: () => clock.t,
      });
      expect(r).toMatchObject({
        state: "failed",
        reason: "perfil_de_nascimento_ausente",
      });
      expect(db.report().lockUntil).toBe(0);
    });
  });

  it("falha ao enviar e-mail não derruba a geração", async () => {
    const clock = { t: 0 };
    const db = memoryStore({ config: sectionsConfig(2), clock });
    const notify: Notifier = {
      paymentConfirmed: async () => {
        throw new Error("Resend fora do ar");
      },
      reportReady: async () => {
        throw new Error("Resend fora do ar");
      },
    };
    const r = await runGeneration(ORDER_ID, {
      store: db.store,
      writer: okWriter(),
      notify,
      now: () => clock.t,
    });
    expect(r.state).toBe("ready");
  });
});

describe("cleanText", () => {
  it("tira cercas de código em volta do texto todo, mas preserva o resto", () => {
    expect(cleanText("```markdown\n### Título\n\nTexto.\n```")).toBe(
      "### Título\n\nTexto.",
    );
    expect(cleanText("  ### Título\n\nTexto.  ")).toBe("### Título\n\nTexto.");
    expect(cleanText("Texto com `código` no meio")).toBe(
      "Texto com `código` no meio",
    );
  });
});

// Garante que o tipo de estado continua compatível com o que o banco devolve.
const _typecheck: SectionState = {
  key: "k",
  title: "t",
  content: "",
  status: "pending",
  attempts: 0,
};
void _typecheck;
