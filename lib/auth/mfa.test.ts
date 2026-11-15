import { afterEach, describe, expect, it, vi } from "vitest";

import { adminMfaRequired, mfaStep, securityPath, TOTP_CODE } from "./mfa";

describe("verificação em dois passos", () => {
  it("desligada: nunca exige nada", () => {
    for (const aal of [
      { currentLevel: "aal1", nextLevel: "aal1" },
      { currentLevel: "aal1", nextLevel: "aal2" },
      { currentLevel: null, nextLevel: null },
    ]) {
      expect(mfaStep(aal, false)).toBe("ok");
    }
  });

  it("ligada, sessão já com código: passa", () => {
    expect(mfaStep({ currentLevel: "aal2", nextLevel: "aal2" }, true)).toBe(
      "ok",
    );
  });

  it("ligada, aplicativo cadastrado mas sem código nesta sessão: pede o código", () => {
    expect(mfaStep({ currentLevel: "aal1", nextLevel: "aal2" }, true)).toBe(
      "verify",
    );
  });

  it("ligada, sem aplicativo: manda cadastrar", () => {
    expect(mfaStep({ currentLevel: "aal1", nextLevel: "aal1" }, true)).toBe(
      "enroll",
    );
  });

  it("ligada, sem informação do nível: falha fechado (manda cadastrar)", () => {
    expect(mfaStep({ currentLevel: null, nextLevel: null }, true)).toBe(
      "enroll",
    );
  });

  it("o código tem exatamente 6 dígitos", () => {
    expect(TOTP_CODE.test("123456")).toBe(true);
    for (const bad of [
      "12345",
      "1234567",
      "12345a",
      "",
      " 123456",
      "123 456",
    ]) {
      expect(TOTP_CODE.test(bad)).toBe(false);
    }
  });

  it("o endereço de retorno é codificado", () => {
    expect(securityPath("/admin")).toBe("/conta/seguranca?next=%2Fadmin");
  });
});

describe("variável ADMIN_REQUIRE_MFA", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("só liga com o texto exato 'true'", () => {
    vi.stubEnv("ADMIN_REQUIRE_MFA", "true");
    expect(adminMfaRequired()).toBe(true);
    for (const v of ["", "false", "1", "TRUE", "sim"]) {
      vi.stubEnv("ADMIN_REQUIRE_MFA", v);
      expect(adminMfaRequired()).toBe(false);
    }
  });

  it("ausente: desligada", () => {
    vi.stubEnv("ADMIN_REQUIRE_MFA", undefined as unknown as string);
    expect(adminMfaRequired()).toBe(false);
  });
});
