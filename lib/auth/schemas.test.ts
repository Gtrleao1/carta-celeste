import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirect";
import {
  deleteAccountSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./schemas";

describe("signUpSchema", () => {
  const valid = {
    full_name: "  Maria Souza ",
    email: "  Maria@Exemplo.com ",
    password: "senha-forte-123",
    accepted_terms: "on",
  };

  it("normaliza nome e e-mail", () => {
    const r = signUpSchema.parse(valid);
    expect(r.full_name).toBe("Maria Souza");
    expect(r.email).toBe("maria@exemplo.com");
  });

  it("exige o aceite dos termos", () => {
    const r = signUpSchema.safeParse({ ...valid, accepted_terms: null });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/termos/i);
  });

  it("recusa e-mail inválido e senha curta, em português", () => {
    const email = signUpSchema.safeParse({ ...valid, email: "maria" });
    expect(email.error?.issues[0].message).toBe("Informe um e-mail válido.");
    const senha = signUpSchema.safeParse({ ...valid, password: "1234567" });
    expect(senha.error?.issues[0].message).toMatch(/8 caracteres/);
  });

  it("recusa senha acima de 72 caracteres", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "a".repeat(73) }).success,
    ).toBe(false);
  });
});

describe("signInSchema", () => {
  it("não impõe tamanho mínimo à senha, só que não seja vazia", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("exige que as senhas sejam iguais", () => {
    const r = updatePasswordSchema.safeParse({
      password: "senha-forte-123",
      confirm: "outra-senha-123",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirm"]);
    expect(r.error?.issues[0].message).toBe("As senhas não são iguais.");
  });
});

describe("profileSchema", () => {
  it("aceita data de nascimento vazia como nula", () => {
    const r = profileSchema.parse({
      full_name: "Ana Lima",
      birth_date_of_buyer: "",
    });
    expect(r.birth_date_of_buyer).toBeNull();
  });

  it("valida a data", () => {
    const ok = profileSchema.safeParse({
      full_name: "Ana Lima",
      birth_date_of_buyer: "1995-07-14",
    });
    expect(ok.success).toBe(true);
    for (const bad of [
      "1995-02-30",
      "14/07/1995",
      "1850-01-01",
      "2999-01-01",
    ]) {
      expect(
        profileSchema.safeParse({
          full_name: "Ana Lima",
          birth_date_of_buyer: bad,
        }).success,
      ).toBe(false);
    }
  });
});

describe("deleteAccountSchema", () => {
  it("aceita EXCLUIR em qualquer caixa", () => {
    expect(
      deleteAccountSchema.safeParse({ confirmation: " excluir " }).success,
    ).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirmation: "sim" }).success).toBe(
      false,
    );
  });
});

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/meus-mapas/123?x=1")).toBe("/meus-mapas/123?x=1");
  });

  it("volta para /conta em redirecionamentos externos ou malformados", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "evil.com",
      "/ok\n/x",
    ]) {
      expect(safeNextPath(bad as string | null)).toBe("/conta");
    }
  });
});
