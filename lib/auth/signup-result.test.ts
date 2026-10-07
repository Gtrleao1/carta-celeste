import { describe, expect, it } from "vitest";

import { isExistingAccount } from "./signup-result";

describe("isExistingAccount", () => {
  it("usuário de mentira (identidades vazias) = e-mail já cadastrado", () => {
    expect(
      isExistingAccount({ data: { user: { identities: [] } }, error: null }),
    ).toBe(true);
  });

  it("conta nova (com identidade) não é duplicada", () => {
    expect(
      isExistingAccount({
        data: { user: { identities: [{ id: "x" }] } },
        error: null,
      }),
    ).toBe(false);
  });

  it("conta ainda não confirmada que recebeu novo e-mail não é 'já cadastrada'", () => {
    expect(
      isExistingAccount({
        data: { user: { identities: [{ id: "x" }] } },
        error: null,
      }),
    ).toBe(false);
  });

  it("reconhece o erro de usuário já existente", () => {
    for (const error of [
      { code: "user_already_exists" },
      { code: "email_exists" },
      { message: "User already registered" },
      { message: "Email address has already been registered" },
    ]) {
      expect(isExistingAccount({ data: null, error })).toBe(true);
    }
  });

  it("outros erros não são tratados como conta existente", () => {
    for (const error of [
      { code: "over_email_send_rate_limit", message: "rate limit" },
      { code: "weak_password", message: "Password is too weak" },
      { message: "Invalid email" },
    ]) {
      expect(isExistingAccount({ data: null, error })).toBe(false);
    }
  });

  it("sem usuário nem identidades, não conclui nada", () => {
    expect(isExistingAccount({ data: { user: null }, error: null })).toBe(
      false,
    );
    expect(isExistingAccount({ data: null, error: null })).toBe(false);
    expect(
      isExistingAccount({ data: { user: { identities: null } }, error: null }),
    ).toBe(false);
  });
});
