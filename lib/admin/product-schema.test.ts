import { describe, expect, it } from "vitest";

import {
  centsToPriceInput,
  linesToList,
  parsePriceToCents,
  parseProductForm,
  toStoredSections,
} from "./product-schema";

const baseForm = () => {
  const f = new FormData();
  f.set("slug", "mapa-da-carreira");
  f.set("name", "Mapa da Carreira");
  f.set("short_description", "Vocação e trabalho.");
  f.set("long_description", "");
  f.set("price", "59,90");
  f.set("active", "on");
  f.set("sort_order", "40");
  f.set("ai_instructions", "Escreva com foco em carreira.");
  f.set("focus_points", "Meio do Céu\n\n  Casa 10  \n");
  f.set("sample_excerpt", "");
  f.set(
    "sections",
    JSON.stringify([
      {
        key: "vocacao",
        title: "Sua vocação",
        instructions: "Interprete o Meio do Céu e o Sol.",
      },
      {
        key: "casas",
        title: "Casas",
        instructions: "Percorra as casas relevantes.",
        needs_houses: true,
      },
    ]),
  );
  return f;
};

describe("parsePriceToCents", () => {
  it.each([
    ["49,90", 4990],
    ["49.90", 4990],
    ["49", 4900],
    ["49,9", 4990],
    ["R$ 1.234", null],
    ["R$ 69,00", 6900],
    [" 0,50 ", 50],
  ])("%s -> %s", (input, expected) => {
    expect(parsePriceToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1,234", "12,", "1e3"])("rejeita '%s'", (input) => {
    expect(parsePriceToCents(input)).toBeNull();
  });

  it("ida e volta com o campo do formulário", () => {
    expect(centsToPriceInput(4900)).toBe("49,00");
    expect(parsePriceToCents(centsToPriceInput(6990))).toBe(6990);
  });
});

describe("linesToList", () => {
  it("uma linha por item, sem vazias nem espaços sobrando", () => {
    expect(linesToList(" Sol \r\n\r\nLua\n  \n")).toEqual(["Sol", "Lua"]);
  });
});

describe("parseProductForm", () => {
  it("aceita um produto novo completo", () => {
    const r = parseProductForm(baseForm());
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.price).toBe(5990);
    expect(r.data.active).toBe(true);
    expect(r.data.age_restricted).toBe(false);
    expect(r.data.focus_points).toEqual(["Meio do Céu", "Casa 10"]);
    expect(toStoredSections(r.data.sections)).toEqual([
      {
        key: "vocacao",
        title: "Sua vocação",
        instructions: "Interprete o Meio do Céu e o Sol.",
      },
      {
        key: "casas",
        title: "Casas",
        instructions: "Percorra as casas relevantes.",
        needs_houses: true,
      },
    ]);
  });

  it("checkboxes desmarcados viram false", () => {
    const f = baseForm();
    f.delete("active");
    const r = parseProductForm(f);
    expect(r.success && r.data.active).toBe(false);
  });

  it("recusa slug com maiúsculas, espaços ou acentos", () => {
    for (const slug of ["Mapa Novo", "mapa_novo", "mapá", "-mapa", "ab"]) {
      const f = baseForm();
      f.set("slug", slug);
      expect(parseProductForm(f).success, slug).toBe(false);
    }
  });

  it("recusa preço inválido, abaixo do mínimo ou acima do máximo", () => {
    for (const price of ["", "grátis", "0,50", "10000"]) {
      const f = baseForm();
      f.set("price", price);
      expect(parseProductForm(f).success, price).toBe(false);
    }
  });

  it("exige ao menos uma seção, com chaves únicas e válidas", () => {
    const empty = baseForm();
    empty.set("sections", "[]");
    expect(parseProductForm(empty).success).toBe(false);

    const broken = baseForm();
    broken.set("sections", "{não é json");
    expect(parseProductForm(broken).success).toBe(false);

    const dup = baseForm();
    dup.set(
      "sections",
      JSON.stringify([
        { key: "a", title: "A", instructions: "Instruções da seção A." },
        { key: "a", title: "B", instructions: "Instruções da seção B." },
      ]),
    );
    const r = parseProductForm(dup);
    expect(r.success).toBe(false);

    const badKey = baseForm();
    badKey.set(
      "sections",
      JSON.stringify([
        {
          key: "Sua Vocação",
          title: "A",
          instructions: "Instruções da seção.",
        },
      ]),
    );
    expect(parseProductForm(badKey).success).toBe(false);
  });

  it("não aceita campos extras vindos do navegador (preço em centavos, id)", () => {
    const f = baseForm();
    f.set("price_cents", "1");
    f.set("id", "outro");
    const r = parseProductForm(f);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(Object.keys(r.data)).not.toContain("price_cents");
      expect(Object.keys(r.data)).not.toContain("id");
    }
  });
});
