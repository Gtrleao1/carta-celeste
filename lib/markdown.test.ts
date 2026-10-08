import { describe, expect, it } from "vitest";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("negrito e itálico", () => {
    expect(parseInline("O *jeito* de **sentir** é único")).toEqual([
      { type: "text", text: "O " },
      { type: "em", text: "jeito" },
      { type: "text", text: " de " },
      { type: "strong", text: "sentir" },
      { type: "text", text: " é único" },
    ]);
  });

  it("asterisco solto ou entre espaços não vira itálico", () => {
    expect(parseInline("2 * 3 * 4")).toEqual([
      { type: "text", text: "2 * 3 * 4" },
    ]);
  });

  it("HTML fica como texto (quem renderiza nunca o interpreta)", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([
      { type: "text", text: "<script>alert(1)</script>" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("títulos, parágrafos e listas", () => {
    const blocks = parseMarkdown(
      [
        "### Sol em Câncer",
        "Primeira linha",
        "continua aqui.",
        "",
        "- um",
        "- dois com **ênfase**",
        "",
        "1. primeiro",
        "2) segundo",
        "",
        "#### Detalhe",
        "Fim.",
      ].join("\n"),
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "h3",
      "p",
      "ul",
      "ol",
      "h4",
      "p",
    ]);
    const p = blocks[1];
    expect(p.type === "p" && p.inlines[0]).toEqual({
      type: "text",
      text: "Primeira linha continua aqui.",
    });
    const ul = blocks[2];
    expect(ul.type === "ul" && ul.items).toHaveLength(2);
  });

  it("# e ## viram o mesmo nível de ### (o título da seção já é h2)", () => {
    expect(parseMarkdown("# A\n## B").map((b) => b.type)).toEqual(["h3", "h3"]);
  });

  it("título colado ao parágrafo, sem linha em branco, são dois blocos", () => {
    expect(parseMarkdown("### T\nTexto").map((b) => b.type)).toEqual([
      "h3",
      "p",
    ]);
  });

  it("linha horizontal e vazios são ignorados; CRLF funciona", () => {
    expect(parseMarkdown("A\r\n\r\n---\r\n\r\nB").map((b) => b.type)).toEqual([
      "p",
      "p",
    ]);
    expect(parseMarkdown("   \n\n")).toEqual([]);
  });
});
