import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parsePostForm } from "./post-schema";

const URL_BASE = "https://proj.supabase.co";
const IMG = `${URL_BASE}/storage/v1/object/public/blog/posts/a.webp`;

const doc = (text = "Olá, mundo.") =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_BASE));
afterEach(() => vi.unstubAllEnvs());

describe("parsePostForm", () => {
  it("monta endereço e resumo a partir do título e do texto", () => {
    const r = parsePostForm(
      form({
        title: "Mercúrio Retrógrado!",
        content: doc("Um texto curto."),
        intent: "draft",
      }),
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.slug).toBe("mercurio-retrogrado");
    expect(r.data.excerpt).toBe("Um texto curto.");
    expect(r.data.cover_url).toBeNull();
  });

  it("respeita o endereço e o resumo digitados (e limpa o endereço)", () => {
    const r = parsePostForm(
      form({
        title: "X",
        slug: "Meu Endereço Novo",
        excerpt: "Resumo meu.",
        content: doc(),
        intent: "publish",
      }),
    );
    expect(r.success && r.data.slug).toBe("meu-endereco-novo");
    expect(r.success && r.data.excerpt).toBe("Resumo meu.");
  });

  it("exige título", () => {
    const r = parsePostForm(
      form({ title: "  ", content: doc(), intent: "draft" }),
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.fieldErrors.title?.[0]).toMatch(/título/i);
  });

  it("não deixa publicar sem texto, mas deixa salvar rascunho vazio", () => {
    const empty = JSON.stringify({ type: "doc", content: [] });
    const pub = parsePostForm(
      form({ title: "A", content: empty, intent: "publish" }),
    );
    expect(pub.success).toBe(false);
    if (!pub.success)
      expect(pub.fieldErrors.content?.[0]).toMatch(/Escreva o texto/);
    expect(
      parsePostForm(form({ title: "A", content: empty, intent: "draft" }))
        .success,
    ).toBe(true);
  });

  it("capa só pode ser imagem do nosso Storage", () => {
    const ok = parsePostForm(
      form({ title: "A", cover_url: IMG, content: doc(), intent: "draft" }),
    );
    expect(ok.success && ok.data.cover_url).toBe(IMG);
    const bad = parsePostForm(
      form({
        title: "A",
        cover_url: "https://evil.com/x.png",
        content: doc(),
        intent: "draft",
      }),
    );
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.fieldErrors.cover_url).toBeTruthy();
  });

  it("recusa texto com formato inválido e intenção desconhecida", () => {
    expect(
      parsePostForm(
        form({ title: "A", content: "isso não é json", intent: "draft" }),
      ).success,
    ).toBe(false);
    expect(
      parsePostForm(form({ title: "A", content: doc(), intent: "apagar-tudo" }))
        .success,
    ).toBe(false);
  });

  it("limpa o texto: HTML e links perigosos não chegam ao banco", () => {
    const evil = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "<script>x</script>" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "oi",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    const r = parsePostForm(
      form({ title: "A", content: evil, intent: "draft" }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      const out = JSON.stringify(r.data.content);
      expect(out).not.toMatch(/script|javascript|codeBlock/);
    }
  });
});
