import { describe, expect, it } from "vitest";

import { isAuthorizedCron, parseTtlDays } from "./cron";

const SECRET = "segredo-de-teste-com-mais-de-16";

describe("autorização do cron", () => {
  it("aceita só o Bearer com o segredo exato", () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedCron(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCron(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCron(null, SECRET)).toBe(false);
  });

  it("falha fechado sem segredo (ou com segredo curto demais)", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer curto", "curto")).toBe(false);
  });
});

describe("prazo das contas não confirmadas", () => {
  it("aceita número inteiro de 1 a 365 dias", () => {
    expect(parseTtlDays("14")).toBe(14);
    expect(parseTtlDays(" 7 ")).toBe(7);
    expect(parseTtlDays("365")).toBe(365);
    expect(parseTtlDays("1")).toBe(1);
  });

  it("sem valor válido a limpeza fica desligada (null)", () => {
    for (const v of [undefined, "", "0", "366", "-3", "7.5", "sete", "1e2"]) {
      expect(parseTtlDays(v)).toBeNull();
    }
  });
});
