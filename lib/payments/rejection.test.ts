import { describe, expect, it } from "vitest";

import { rejectionMessage } from "./rejection";

describe("rejectionMessage", () => {
  it("explica os motivos mais comuns em português", () => {
    expect(rejectionMessage("cc_rejected_insufficient_amount")).toMatch(
      /limite ou saldo/i,
    );
    expect(rejectionMessage("cc_rejected_bad_filled_security_code")).toMatch(
      /código de segurança/i,
    );
  });

  it("motivo desconhecido ou ausente recebe orientação genérica, sem expor o código", () => {
    for (const detail of [null, "cc_rejected_high_risk", "qualquer_coisa"]) {
      const msg = rejectionMessage(detail);
      expect(msg).toMatch(/não foi aprovado/i);
      expect(msg).not.toMatch(/cc_|risk/);
    }
  });
});
