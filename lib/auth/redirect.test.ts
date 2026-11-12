import { describe, expect, it } from "vitest";

import { afterSignInPath, isPurchasePath, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("aceita só caminhos internos; o resto vira /conta", () => {
    expect(safeNextPath("/comprar/mapa-astral-completo")).toBe(
      "/comprar/mapa-astral-completo",
    );
    for (const bad of [
      "https://outro.site",
      "//outro.site",
      "\\outro",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad as string | null | undefined)).toBe("/conta");
    }
  });
});

describe("isPurchasePath", () => {
  it("reconhece o início da compra", () => {
    expect(isPurchasePath("/comprar/mapa-astral-completo")).toBe(true);
    expect(isPurchasePath("/comprar")).toBe(true);
    expect(isPurchasePath("/comprarx")).toBe(false);
    expect(isPurchasePath("/meus-mapas")).toBe(false);
    expect(isPurchasePath("/pedido/x/pagar")).toBe(false);
  });
});

describe("afterSignInPath (quem já tinha conta e entrou)", () => {
  it("vindo de 'Quero meu mapa', cai em Meus mapas", () => {
    expect(afterSignInPath("/comprar/mapa-astral-completo")).toBe(
      "/meus-mapas",
    );
  });

  it("vindo de outras páginas, volta para onde estava", () => {
    expect(afterSignInPath("/pedido/abc/retorno")).toBe("/pedido/abc/retorno");
    expect(afterSignInPath("/meus-mapas/abc")).toBe("/meus-mapas/abc");
    expect(afterSignInPath("/admin")).toBe("/admin");
  });

  it("sem destino ou com destino inseguro, vai para /conta", () => {
    expect(afterSignInPath(null)).toBe("/conta");
    expect(afterSignInPath("https://outro.site")).toBe("/conta");
  });
});
