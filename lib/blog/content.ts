/**
 * Conteúdo dos posts do blog: o JSON do editor (TipTap), reduzido aos blocos
 * que o site sabe desenhar. Nada de HTML cru: o texto é guardado como uma
 * árvore de dados e desenhado por `components/blog/post-content.tsx`.
 *
 * `sanitizeDoc` reconstrói a árvore só com o que é permitido (tipos, níveis de
 * título, links e imagens seguros). O que o navegador mandar fora disso é
 * descartado ou recusado, então o editor não é uma porta para HTML malicioso.
 */

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

export type Node =
  | { type: "text"; text: string; marks?: Mark[] }
  | { type: "hardBreak" }
  | { type: "horizontalRule" }
  | { type: "paragraph"; content?: Node[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: Node[] }
  | { type: "bulletList"; content: Node[] }
  | { type: "orderedList"; content: Node[] }
  | { type: "listItem"; content: Node[] }
  | { type: "blockquote"; content: Node[] }
  | {
      type: "image";
      attrs: {
        src: string;
        alt: string;
        width: number | null;
        height: number | null;
      };
    };

export type Doc = { type: "doc"; content: Node[] };

export const EMPTY_DOC: Doc = { type: "doc", content: [] };

const MAX_DEPTH = 6;
const MAX_NODES = 5000;
const MAX_TEXT = 20_000;

/** Endereço público das imagens do blog (bucket `blog` do Supabase Storage). */
export function blogImagePrefix(
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  return supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/blog/`
    : null;
}

/** Só imagens enviadas por nós (evita imagem de terceiros e esquemas estranhos). */
export function isAllowedImageSrc(
  src: string,
  prefix: string | null = blogImagePrefix(),
): boolean {
  return Boolean(prefix) && src.startsWith(prefix!) && !/\s/.test(src);
}

/** Links http(s), e-mail, telefone ou caminhos internos. Nunca `javascript:`. */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value || /[\u0000-\u001f\s]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  if (value.startsWith("#")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

type Ctx = { count: number; imagePrefix: string | null };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function cleanMarks(raw: unknown): Mark[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const marks: Mark[] = [];
  for (const m of raw) {
    if (!isRecord(m)) continue;
    if (m.type === "bold") marks.push({ type: "bold" });
    else if (m.type === "italic") marks.push({ type: "italic" });
    else if (m.type === "link" && isRecord(m.attrs)) {
      const href = typeof m.attrs.href === "string" ? m.attrs.href.trim() : "";
      if (isSafeHref(href)) marks.push({ type: "link", attrs: { href } });
    }
  }
  return marks.length ? marks : undefined;
}

const toDim = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 10_000
    ? Math.round(v)
    : null;

function cleanChildren(raw: unknown, depth: number, ctx: Ctx): Node[] {
  if (!Array.isArray(raw)) return [];
  const out: Node[] = [];
  for (const child of raw) {
    const node = cleanNode(child, depth, ctx);
    if (node) out.push(node);
  }
  return out;
}

function cleanNode(raw: unknown, depth: number, ctx: Ctx): Node | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  if (depth > MAX_DEPTH)
    throw new Error("O texto tem blocos aninhados demais.");
  if (++ctx.count > MAX_NODES) throw new Error("O texto é grande demais.");

  switch (raw.type) {
    case "text": {
      if (typeof raw.text !== "string" || raw.text === "") return null;
      if (raw.text.length > MAX_TEXT) {
        throw new Error("Um trecho de texto é grande demais.");
      }
      const marks = cleanMarks(raw.marks);
      return marks
        ? { type: "text", text: raw.text, marks }
        : { type: "text", text: raw.text };
    }
    case "hardBreak":
      return { type: "hardBreak" };
    case "horizontalRule":
      return { type: "horizontalRule" };
    case "paragraph": {
      const content = cleanChildren(raw.content, depth + 1, ctx);
      return content.length
        ? { type: "paragraph", content }
        : { type: "paragraph" };
    }
    case "heading": {
      const level = isRecord(raw.attrs) && raw.attrs.level === 3 ? 3 : 2;
      const content = cleanChildren(raw.content, depth + 1, ctx);
      return content.length
        ? { type: "heading", attrs: { level }, content }
        : { type: "heading", attrs: { level } };
    }
    case "bulletList":
    case "orderedList": {
      const content = cleanChildren(raw.content, depth + 1, ctx).filter(
        (n) => n.type === "listItem",
      );
      return content.length ? { type: raw.type, content } : null;
    }
    case "listItem": {
      const content = cleanChildren(raw.content, depth + 1, ctx);
      return content.length ? { type: "listItem", content } : null;
    }
    case "blockquote": {
      const content = cleanChildren(raw.content, depth + 1, ctx);
      return content.length ? { type: "blockquote", content } : null;
    }
    case "image": {
      if (!isRecord(raw.attrs)) return null;
      const src = typeof raw.attrs.src === "string" ? raw.attrs.src : "";
      if (!isAllowedImageSrc(src, ctx.imagePrefix)) return null;
      const alt =
        typeof raw.attrs.alt === "string" ? raw.attrs.alt.slice(0, 300) : "";
      return {
        type: "image",
        attrs: {
          src,
          alt,
          width: toDim(raw.attrs.width),
          height: toDim(raw.attrs.height),
        },
      };
    }
    default:
      return null; // bloco desconhecido (código, tabela…): descartado
  }
}

export type SanitizeResult =
  { ok: true; doc: Doc } | { ok: false; error: string };

/** Recebe o JSON do editor (texto ou objeto) e devolve só o que é permitido. */
export function sanitizeDoc(
  input: unknown,
  imagePrefix: string | null = blogImagePrefix(),
): SanitizeResult {
  let raw = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return {
        ok: false,
        error: "O texto do post está em um formato inválido.",
      };
    }
  }
  if (!isRecord(raw) || raw.type !== "doc") {
    return { ok: false, error: "O texto do post está em um formato inválido." };
  }
  try {
    const ctx: Ctx = { count: 0, imagePrefix };
    return {
      ok: true,
      doc: { type: "doc", content: cleanChildren(raw.content, 1, ctx) },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Texto inválido.",
    };
  }
}

// --- Utilidades de leitura --------------------------------------------------

export function plainText(node: Doc | Node): string {
  if (node.type === "text") return node.text;
  if (node.type === "hardBreak") return " ";
  if (node.type === "image" || node.type === "horizontalRule") return "";
  const children = "content" in node && node.content ? node.content : [];
  const sep = [
    "paragraph",
    "heading",
    "listItem",
    "blockquote",
    "doc",
  ].includes(node.type)
    ? " "
    : "";
  return children.map(plainText).join(sep);
}

/** Minutos de leitura (200 palavras por minuto, no mínimo 1). */
export function readingMinutes(doc: Doc): number {
  const words = plainText(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Resumo automático quando a pessoa não escreve um. */
export function excerptFromDoc(doc: Doc, max = 160): string {
  const text = plainText(doc).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : max)}…`;
}

/** Endereço do post a partir do título: sem acentos, minúsculo, com hífens. */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
