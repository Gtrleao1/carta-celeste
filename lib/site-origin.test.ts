import { describe, expect, it } from "vitest";

import { normalizeSiteUrl } from "./site-origin";

describe("endereço público do site", () => {
  it("tira a barra do final e espaços (o caso do .env com barra)", () => {
    expect(normalizeSiteUrl("https://www.minhacartaceleste.com.br/")).toBe(
      "https://www.minhacartaceleste.com.br",
    );
    expect(normalizeSiteUrl("  https://www.minhacartaceleste.com.br  ")).toBe(
      "https://www.minhacartaceleste.com.br",
    );
    expect(normalizeSiteUrl("https://www.minhacartaceleste.com.br///")).toBe(
      "https://www.minhacartaceleste.com.br",
    );
  });

  it("guarda só a origem: caminho e parâmetros não entram", () => {
    expect(normalizeSiteUrl("https://site.com.br/blog?x=1#topo")).toBe(
      "https://site.com.br",
    );
  });

  it("mantém porta e http de desenvolvimento", () => {
    expect(normalizeSiteUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("valor ausente ou inválido vira null (quem chama decide o plano B)", () => {
    for (const v of [
      undefined,
      null,
      "",
      "   ",
      "minhacartaceleste.com.br",
      "ftp://a.com",
      "javascript:alert(1)",
    ]) {
      expect(normalizeSiteUrl(v as string | null | undefined)).toBeNull();
    }
  });
});
