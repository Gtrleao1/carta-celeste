import { describe, expect, it } from "vitest";

import { isFinal, isWaiting, orderView, shouldKeepPolling } from "./view";

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

  it("recusado NÃO é final: continua consultando, pois pode ter havido nova tentativa aprovada", () => {
    expect(isFinal("declined")).toBe(false);
    expect(shouldKeepPolling("declined")).toBe(true);
    expect(shouldKeepPolling("confirming")).toBe(true);
    expect(shouldKeepPolling("in_review")).toBe(true);
  });

  it("para de consultar só quando o estado não vai mais mudar sozinho", () => {
    for (const v of [
      "approved",
      "preparing_failed",
      "refunded",
      "cancelled",
    ] as const) {
      expect(isFinal(v)).toBe(true);
      expect(shouldKeepPolling(v)).toBe(false);
    }
  });

  it("o indicador de atualização aparece só enquanto a confirmação está em andamento", () => {
    expect(isWaiting("confirming")).toBe(true);
    expect(isWaiting("in_review")).toBe(true);
    expect(isWaiting("declined")).toBe(false);
    expect(isWaiting("approved")).toBe(false);
  });
});
