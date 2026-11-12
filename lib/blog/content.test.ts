import { describe, expect, it } from "vitest";

import {
  excerptFromDoc,
  isAllowedImageSrc,
  isSafeHref,
  plainText,
  readingMinutes,
  sanitizeDoc,
  slugify,
  type Doc,
} from "./content";

const PREFIX = "https://proj.supabase.co/storage/v1/object/public/blog/";

const text = (t: string, marks?: unknown[]) => ({
  type: "text",
  text: t,
  marks,
});
const doc = (...content: unknown[]) => ({ type: "doc", content });
const ok = (input: unknown) => {
  const r = sanitizeDoc(input, PREFIX);
  if (!r.ok) throw new Error(r.error);
  return r.doc;
};

describe("isSafeHref", () => {
  it("aceita http(s), mailto, tel, âncora e caminho interno", () => {
    for (const h of [
      "https://exemplo.com/a?b=1",
      "http://exemplo.com",
      "mailto:oi@exemplo.com",
      "tel:+5511999999999",
      "/blog/outro-post",
      "#secao",
    ]) {
      expect(isSafeHref(h)).toBe(true);
    }
  });

  it("recusa javascript:, data:, protocolo relativo e lixo", () => {
    for (const h of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>",
      "//outro.site",
      "vbscript:x",
      "",
      "not a url",
      "https://a.com/ x",
    ]) {
      expect(isSafeHref(h)).toBe(false);
    }
  });
});

describe("isAllowedImageSrc", () => {
  it("só aceita imagens do nosso Storage", () => {
    expect(isAllowedImageSrc(`${PREFIX}posts/a.webp`, PREFIX)).toBe(true);
    expect(isAllowedImageSrc("https://outro.site/a.png", PREFIX)).toBe(false);
    expect(isAllowedImageSrc("data:image/png;base64,AAAA", PREFIX)).toBe(false);
    expect(isAllowedImageSrc(`${PREFIX}a b.png`, PREFIX)).toBe(false);
    expect(isAllowedImageSrc("x", null)).toBe(false);
  });
});

describe("sanitizeDoc", () => {
  it("mantém parágrafos, títulos 2 e 3, negrito, itálico e links seguros", () => {
    const d = ok(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [text("Título")] },
        {
          type: "paragraph",
          content: [
            text("Olá ", [{ type: "bold" }]),
            text("mundo", [
              { type: "italic" },
              {
                type: "link",
                attrs: { href: "https://exemplo.com", target: "_blank" },
              },
            ]),
          ],
        },
      ),
    );
    expect(d.content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    });
    const p = d.content[1] as { content: { marks?: unknown[] }[] };
    expect(p.content[0].marks).toEqual([{ type: "bold" }]);
    expect(p.content[1].marks).toEqual([
      { type: "italic" },
      { type: "link", attrs: { href: "https://exemplo.com" } },
    ]);
  });

  it("título de nível 1, 4… vira nível 2 (o site só usa 2 e 3)", () => {
    const d = ok(
      doc({ type: "heading", attrs: { level: 1 }, content: [text("X")] }),
    );
    expect(d.content[0]).toMatchObject({ attrs: { level: 2 } });
  });

  it("descarta link perigoso mas mantém o texto", () => {
    const d = ok(
      doc({
        type: "paragraph",
        content: [
          text("clique", [
            { type: "link", attrs: { href: "javascript:alert(1)" } },
          ]),
        ],
      }),
    );
    expect(JSON.stringify(d)).not.toContain("javascript");
    expect(plainText(d)).toBe("clique");
  });

  it("descarta blocos desconhecidos (código, tabela, HTML) e atributos extras", () => {
    const d = ok(
      doc(
        { type: "codeBlock", content: [text("<script>alert(1)</script>")] },
        { type: "html", html: "<img onerror=alert(1)>" },
        { type: "paragraph", attrs: { onclick: "x" }, content: [text("ok")] },
      ),
    );
    expect(d.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "ok" }] },
    ]);
  });

  it("imagem do nosso Storage passa; de fora é descartada", () => {
    const d = ok(
      doc(
        {
          type: "image",
          attrs: {
            src: `${PREFIX}posts/a.webp`,
            alt: "Lua",
            width: 1600,
            height: 900,
          },
        },
        { type: "image", attrs: { src: "https://evil.com/x.png", alt: "x" } },
        { type: "image", attrs: { src: "javascript:alert(1)" } },
      ),
    );
    expect(d.content).toEqual([
      {
        type: "image",
        attrs: {
          src: `${PREFIX}posts/a.webp`,
          alt: "Lua",
          width: 1600,
          height: 900,
        },
      },
    ]);
  });

  it("listas e citações mantêm a estrutura; lista sem itens some", () => {
    const d = ok(
      doc(
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [text("a")] }],
            },
          ],
        },
        { type: "orderedList", content: [] },
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [text("frase")] }],
        },
      ),
    );
    expect(d.content.map((n) => n.type)).toEqual(["bulletList", "blockquote"]);
  });

  it("aceita o JSON como texto e recusa formatos inválidos", () => {
    expect(sanitizeDoc(JSON.stringify(doc()), PREFIX)).toEqual({
      ok: true,
      doc: { type: "doc", content: [] },
    });
    expect(sanitizeDoc("não é json", PREFIX).ok).toBe(false);
    expect(sanitizeDoc({ type: "paragraph" }, PREFIX).ok).toBe(false);
    expect(sanitizeDoc(null, PREFIX).ok).toBe(false);
  });

  it("recusa aninhamento exagerado", () => {
    let node: unknown = { type: "paragraph", content: [text("x")] };
    for (let i = 0; i < 10; i++) node = { type: "blockquote", content: [node] };
    expect(sanitizeDoc(doc(node), PREFIX).ok).toBe(false);
  });
});

describe("utilidades de leitura", () => {
  const d: Doc = ok(
    doc(
      { type: "heading", attrs: { level: 2 }, content: [text("Lua nova")] },
      { type: "paragraph", content: [text("Um texto curto sobre a lua.")] },
    ),
  );

  it("plainText junta os blocos com espaço", () => {
    expect(plainText(d)).toBe("Lua nova Um texto curto sobre a lua.");
  });

  it("readingMinutes: no mínimo 1", () => {
    expect(readingMinutes(d)).toBe(1);
  });

  it("excerptFromDoc corta sem partir palavra", () => {
    const long = ok(
      doc({ type: "paragraph", content: [text("palavra ".repeat(60))] }),
    );
    const e = excerptFromDoc(long, 50);
    expect(e.endsWith("…")).toBe(true);
    expect(e.length).toBeLessThanOrEqual(51);
    expect(excerptFromDoc(d, 200)).toBe("Lua nova Um texto curto sobre a lua.");
  });
});

describe("slugify", () => {
  it("tira acentos, põe hífens e limita o tamanho", () => {
    expect(slugify("Mercúrio Retrógrado: o que muda?")).toBe(
      "mercurio-retrogrado-o-que-muda",
    );
    expect(slugify("  --Olá   Mundo!!  ")).toBe("ola-mundo");
    expect(slugify("Ação & Coração")).toBe("acao-coracao");
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
    expect(slugify("???")).toBe("");
  });
});
