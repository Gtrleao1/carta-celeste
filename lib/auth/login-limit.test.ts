import { describe, expect, it } from "vitest";

import { loginRateKeys } from "./login-limit";

describe("limite de tentativas de login", () => {
  it("a chave nunca contém o e-mail, só um hash", () => {
    const k = loginRateKeys("1.2.3.4", "maria@exemplo.com.br");
    expect(k.account.key).not.toContain("maria");
    expect(k.account.key).not.toContain("exemplo");
    expect(k.account.key).toMatch(/^login:1\.2\.3\.4:[0-9a-f]{24}$/);
  });

  it("maiúsculas e espaços não furam o limite (mesmo e-mail, mesma chave)", () => {
    const a = loginRateKeys("1.2.3.4", "Maria@Exemplo.com.br");
    const b = loginRateKeys("1.2.3.4", "  maria@exemplo.com.br ");
    expect(a.account.key).toBe(b.account.key);
  });

  it("IPs diferentes têm limites separados: ninguém trava o login de outra pessoa", () => {
    const a = loginRateKeys("1.2.3.4", "maria@exemplo.com.br");
    const b = loginRateKeys("9.9.9.9", "maria@exemplo.com.br");
    expect(a.account.key).not.toBe(b.account.key);
  });

  it("o limite por conta é mais apertado que o por IP", () => {
    const k = loginRateKeys("1.2.3.4", "a@b.co");
    expect(k.account.max).toBeLessThan(k.ip.max);
    expect(k.account.windowSeconds).toBe(k.ip.windowSeconds);
  });
});
