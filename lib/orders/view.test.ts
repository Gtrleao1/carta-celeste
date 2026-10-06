import { describe, expect, it } from "vitest";

import { isSettled, orderView } from "./view";

describe("orderView", () => {
  it("pago, em geração e pronto são 'aprovado'", () => {
    for (const status of ["paid", "generating", "ready"]) {
      expect(orderView(status, "approved")).toBe("approved");
    }
  });

  it("pendente sem notícia do Mercado Pago: confirmando", () => {
    expect(orderView("pending", null)).toBe("confirming");
  });

  it("pendente com pagamento recusado ou cancelado: recusado", () => {
    expect(orderView("pending", "rejected")).toBe("declined");
    expect(orderView("pending", "cancelled")).toBe("declined");
  });

  it("pendente com pagamento em andamento: em análise", () => {
    for (const mp of ["in_process", "pending", "authorized", "in_mediation"]) {
      expect(orderView("pending", mp)).toBe("in_review");
    }
  });

  it("falha na geração depois de pago: 'estamos finalizando'", () => {
    expect(orderView("failed", "approved")).toBe("preparing_failed");
  });

  it("reembolsado e cancelado", () => {
    expect(orderView("refunded", "refunded")).toBe("refunded");
    expect(orderView("cancelled", null)).toBe("cancelled");
  });

  it("para de consultar quando o estado não vai mais mudar sozinho", () => {
    expect(isSettled("confirming")).toBe(false);
    expect(isSettled("in_review")).toBe(false);
    for (const v of [
      "approved",
      "declined",
      "refunded",
      "cancelled",
      "preparing_failed",
    ] as const) {
      expect(isSettled(v)).toBe(true);
    }
  });
});
