import { describe, expect, it, vi } from "vitest";

import {
  MAX_BULK,
  MAX_SECTION_CHARS,
  ineligibleReason,
  isDeleteConfirmed,
  parseIds,
  runBulk,
  sectionVersion,
  summarize,
  validateSectionEdit,
  type BulkDeps,
  type OrderLite,
} from "./order-ops";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const order = (n: number, status: string): OrderLite => ({
  id: uuid(n),
  status,
  amount_cents: 4900,
  product_name: "Mapa Astral Completo",
  created_at: "2026-11-01T10:00:00Z",
  paid_at: null,
});

function makeDeps(orders: OrderLite[], over: Partial<BulkDeps> = {}): BulkDeps {
  return {
    loadOrders: vi.fn(async (ids: string[]) =>
      orders.filter((o) => ids.includes(o.id)),
    ),
    resend: vi.fn(async () => "enviado" as const),
    remove: vi.fn(async () => true),
    reprocess: vi.fn(async () => true),
    audit: vi.fn(async () => {}),
    ...over,
  };
}

describe("quem pode receber cada ação", () => {
  it("reenviar: só mapa pronto", () => {
    expect(ineligibleReason("resend", "ready")).toBeNull();
    for (const s of [
      "pending",
      "paid",
      "generating",
      "failed",
      "refunded",
      "cancelled",
    ]) {
      expect(ineligibleReason("resend", s)).toBe("nao_pronto");
    }
  });

  it("excluir: qualquer estado, menos o que está sendo gerado agora", () => {
    expect(ineligibleReason("delete", "generating")).toBe("em_geracao");
    for (const s of [
      "pending",
      "paid",
      "ready",
      "failed",
      "refunded",
      "cancelled",
    ]) {
      expect(ineligibleReason("delete", s)).toBeNull();
    }
  });

  it("reprocessar: só pago, em geração ou com falha", () => {
    for (const s of ["paid", "generating", "failed"]) {
      expect(ineligibleReason("reprocess", s)).toBeNull();
    }
    for (const s of ["pending", "ready", "refunded", "cancelled"]) {
      expect(ineligibleReason("reprocess", s)).toBe("estado_invalido");
    }
  });
});

describe("ids marcados", () => {
  it("aceita UUIDs, tira repetidos e normaliza maiúsculas", () => {
    const r = parseIds([uuid(1), uuid(1).toUpperCase(), uuid(2)]);
    expect(r).toEqual({ ids: [uuid(1), uuid(2)] });
  });

  it("ignora lixo e recusa lista vazia", () => {
    expect(
      parseIds(["abc", "", "1; drop table orders", new File([], "x")]),
    ).toEqual({
      error: "Marque pelo menos um pedido.",
    });
  });

  it("limita o tamanho do lote", () => {
    const many = Array.from({ length: MAX_BULK + 1 }, (_, i) => uuid(i + 1));
    expect(parseIds(many)).toHaveProperty("error");
    expect(parseIds(many.slice(0, MAX_BULK))).toHaveProperty("ids");
  });

  it("a confirmação de exclusão é a palavra EXCLUIR, sem diferenciar maiúsculas", () => {
    expect(isDeleteConfirmed("EXCLUIR")).toBe(true);
    expect(isDeleteConfirmed("  excluir ")).toBe(true);
    for (const bad of ["", "excluir tudo", "sim", null, undefined, 1]) {
      expect(isDeleteConfirmed(bad)).toBe(false);
    }
  });
});

describe("ação em lote", () => {
  it("reenvia só os prontos e explica os que não puderam (sem parar no primeiro)", async () => {
    const orders = [order(1, "ready"), order(2, "pending"), order(3, "ready")];
    const deps = makeDeps(orders);
    const out = await runBulk(
      "resend",
      orders.map((o) => o.id),
      deps,
    );
    expect(out.map((o) => o.result)).toEqual(["ok", "skipped", "ok"]);
    expect(out[1].reason).toBe("nao_pronto");
    expect(deps.resend).toHaveBeenCalledTimes(2);
    expect(deps.audit).toHaveBeenCalledTimes(2);
  });

  it("e-mail sem chave ou conta apagada: pula e não registra como reenviado", async () => {
    const orders = [order(1, "ready"), order(2, "ready")];
    const results = ["sem_chave", "sem_conta"] as const;
    let i = 0;
    const deps = makeDeps(orders, { resend: vi.fn(async () => results[i++]) });
    const out = await runBulk(
      "resend",
      orders.map((o) => o.id),
      deps,
    );
    expect(out.map((o) => o.reason)).toEqual(["sem_chave", "sem_conta"]);
    expect(out.every((o) => o.result === "skipped")).toBe(true);
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("falha de envio conta como falha, não como pulado", async () => {
    const deps = makeDeps([order(1, "ready")], {
      resend: vi.fn(async () => "erro" as const),
    });
    const [o] = await runBulk("resend", [uuid(1)], deps);
    expect(o).toMatchObject({ result: "failed", reason: "erro" });
  });

  it("exclui, e só grava o histórico quando a exclusão aconteceu", async () => {
    const orders = [order(1, "pending"), order(2, "paid")];
    const deps = makeDeps(orders, {
      remove: vi.fn(async (o: OrderLite) => o.id === uuid(1)),
    });
    const out = await runBulk("delete", [uuid(1), uuid(2)], deps);
    expect(out.map((o) => o.result)).toEqual(["ok", "failed"]);
    expect(deps.audit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.audit).mock.calls[0][0]).toMatchObject({
      action: "excluir_pedido",
      order: { id: uuid(1), status: "pending", amount_cents: 4900 },
    });
  });

  it("não exclui pedido em geração", async () => {
    const deps = makeDeps([order(1, "generating")]);
    const [o] = await runBulk("delete", [uuid(1)], deps);
    expect(o).toMatchObject({ result: "skipped", reason: "em_geracao" });
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("id que não existe é pulado, e erro inesperado numa dependência não derruba o lote", async () => {
    const orders = [order(1, "paid"), order(2, "failed")];
    let calls = 0;
    const deps = makeDeps(orders, {
      reprocess: vi.fn(async () => {
        if (calls++ === 0) throw new Error("banco fora do ar");
        return true;
      }),
    });
    const out = await runBulk("reprocess", [uuid(1), uuid(2), uuid(9)], deps);
    expect(out.map((o) => o.result)).toEqual(["failed", "ok", "skipped"]);
    expect(out[2].reason).toBe("nao_encontrado");
  });

  it("o histórico não leva dado pessoal: só dados do pedido", async () => {
    const deps = makeDeps([order(1, "ready")]);
    await runBulk("resend", [uuid(1)], deps);
    const entry = vi.mocked(deps.audit).mock.calls[0][0];
    expect(JSON.stringify(entry)).not.toMatch(/@|email|nome|nascimento/i);
  });
});

describe("resumo em português", () => {
  it("conta os concluídos e lista os que não foram, com o motivo", () => {
    const text = summarize("resend", [
      { id: uuid(1), result: "ok" },
      { id: uuid(2), result: "ok" },
      { id: uuid(3), result: "skipped", reason: "nao_pronto" },
    ]);
    expect(text).toContain("2 pedidos reenviados.");
    expect(text).toContain("00000000 (o mapa ainda não está pronto)");
  });

  it("singular, nenhum e limite de itens listados", () => {
    expect(summarize("delete", [{ id: uuid(1), result: "ok" }])).toBe(
      "1 pedido excluído.",
    );
    expect(
      summarize("reprocess", [
        { id: uuid(1), result: "failed", reason: "falhou" },
      ]),
    ).toContain("Nenhum pedido foi reprocessado.");
    const many = Array.from({ length: 14 }, (_, i) => ({
      id: uuid(i + 1),
      result: "skipped" as const,
      reason: "nao_pronto",
    }));
    expect(summarize("resend", many)).toContain("e mais 4.");
  });
});

describe("versão de uma parte (evita sobrescrever edição alheia)", () => {
  it("é estável para o mesmo conteúdo e muda com qualquer alteração", () => {
    const base = { title: "O seu Sol", content: "Texto original." };
    expect(sectionVersion(base)).toBe(sectionVersion({ ...base }));
    expect(sectionVersion(base)).toMatch(/^[0-9a-f]{16}$/);
    expect(sectionVersion({ ...base, content: "Texto original!" })).not.toBe(
      sectionVersion(base),
    );
    expect(sectionVersion({ ...base, title: "O seu sol" })).not.toBe(
      sectionVersion(base),
    );
  });
});

describe("edição do texto de uma parte", () => {
  const ok = "Um texto de exemplo com tamanho suficiente para ser salvo.";

  it("aceita título e texto, normaliza quebras de linha e apara espaços", () => {
    const r = validateSectionEdit({
      title: "  O seu Sol ",
      content: `${ok}\r\n\r\nOutro parágrafo. `,
    });
    expect(r).toEqual({
      ok: true,
      title: "O seu Sol",
      content: `${ok}\n\nOutro parágrafo.`,
    });
  });

  it("remove caracteres de controle", () => {
    const r = validateSectionEdit({
      title: "Sol\u0000",
      content: `${ok}\u0007`,
    });
    expect(r.ok && r.title).toBe("Sol");
    expect(r.ok && r.content).toBe(ok);
  });

  it("recusa título vazio, texto curto e texto grande demais", () => {
    expect(validateSectionEdit({ title: "", content: ok })).toMatchObject({
      ok: false,
      errors: { title: expect.any(String) },
    });
    expect(validateSectionEdit({ title: "A", content: "curto" })).toMatchObject(
      {
        ok: false,
        errors: { content: expect.any(String) },
      },
    );
    expect(
      validateSectionEdit({
        title: "A",
        content: "x".repeat(MAX_SECTION_CHARS + 1),
      }),
    ).toMatchObject({ ok: false });
    expect(validateSectionEdit({ title: 1, content: null })).toMatchObject({
      ok: false,
    });
  });
});
