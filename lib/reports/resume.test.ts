import { describe, expect, it } from "vitest";

import { GRACE_AFTER_PAID_MS, STALE_AFTER_MS, needsResume } from "./resume";

const NOW = Date.parse("2026-10-08T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ahead = (ms: number) => new Date(NOW + ms).toISOString();

describe("needsResume", () => {
  it("pago e sem relatório depois do prazo de tolerância: retoma (o job do webhook falhou)", () => {
    expect(
      needsResume({
        orderStatus: "paid",
        paidAt: ago(GRACE_AFTER_PAID_MS + 1000),
        report: null,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("recém-pago: espera, o job do webhook ainda deve chegar", () => {
    expect(
      needsResume({
        orderStatus: "paid",
        paidAt: ago(5_000),
        report: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("gerando e parado há mais de 3 minutos, sem trava ativa: retoma", () => {
    expect(
      needsResume({
        orderStatus: "generating",
        paidAt: ago(10 * 60_000),
        report: { updated_at: ago(STALE_AFTER_MS + 1000), lock_until: null },
        now: NOW,
      }),
    ).toBe(true);
    // Trava vencida também conta como sem trava.
    expect(
      needsResume({
        orderStatus: "generating",
        paidAt: ago(10 * 60_000),
        report: {
          updated_at: ago(STALE_AFTER_MS + 1000),
          lock_until: ago(60_000),
        },
        now: NOW,
      }),
    ).toBe(true);
  });

  it("gerando com atualização recente: não retoma", () => {
    expect(
      needsResume({
        orderStatus: "generating",
        paidAt: ago(60_000),
        report: { updated_at: ago(30_000), lock_until: null },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("trava ativa: outro job está trabalhando, não retoma", () => {
    expect(
      needsResume({
        orderStatus: "generating",
        paidAt: ago(10 * 60_000),
        report: {
          updated_at: ago(STALE_AFTER_MS + 60_000),
          lock_until: ahead(20_000),
        },
        now: NOW,
      }),
    ).toBe(false);
  });

  it.each(["pending", "ready", "failed", "refunded", "cancelled"])(
    "pedido '%s' nunca é retomado automaticamente",
    (orderStatus) => {
      expect(
        needsResume({
          orderStatus,
          paidAt: ago(60 * 60_000),
          report: null,
          now: NOW,
        }),
      ).toBe(false);
    },
  );
});
