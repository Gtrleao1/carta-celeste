import { z } from "zod";

import {
  excerptFromDoc,
  isAllowedImageSrc,
  sanitizeDoc,
  slugify,
  type Doc,
} from "./content";

export const POST_INTENTS = ["draft", "publish", "unpublish"] as const;
export type PostIntent = (typeof POST_INTENTS)[number];

const text = (max: number) => z.string().trim().max(max);

/** Campos do formulário do post (o texto vem como JSON em `content`). */
const postFieldsSchema = z.object({
  title: text(200).min(1, "Escreva um título."),
  slug: text(120),
  excerpt: text(400),
  cover_url: text(600),
  cover_alt: text(300),
  content: z.string().max(2_000_000),
  intent: z.enum(POST_INTENTS),
});

export type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string;
  content: Doc;
  intent: PostIntent;
};

export type PostParseResult =
  | { success: true; data: PostInput }
  | { success: false; fieldErrors: Record<string, string[]> };

/**
 * Valida o formulário do post. O endereço (slug) sai do título se vier vazio;
 * o resumo, do começo do texto; a capa só pode ser uma imagem enviada por nós;
 * o texto passa pelo sanitizador (só blocos permitidos).
 */
export function parsePostForm(formData: FormData): PostParseResult {
  const parsed = postFieldsSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    cover_alt: formData.get("cover_alt") ?? "",
    content: formData.get("content") ?? "",
    intent: formData.get("intent") ?? "draft",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { success: false, fieldErrors };
  }
  const f = parsed.data;
  const errors: Record<string, string[]> = {};

  const slug = f.slug ? slugify(f.slug) : slugify(f.title);
  if (!slug) errors.slug = ["Não consegui montar o endereço. Digite um."];

  if (f.cover_url && !isAllowedImageSrc(f.cover_url)) {
    errors.cover_url = ["A capa precisa ser uma imagem enviada pelo painel."];
  }

  const doc = sanitizeDoc(f.content || { type: "doc", content: [] });
  if (!doc.ok) errors.content = [doc.error];

  if (Object.keys(errors).length || !doc.ok) {
    return { success: false, fieldErrors: errors };
  }

  if (f.intent === "publish" && doc.doc.content.length === 0) {
    return {
      success: false,
      fieldErrors: { content: ["Escreva o texto antes de publicar."] },
    };
  }

  return {
    success: true,
    data: {
      title: f.title,
      slug,
      excerpt: f.excerpt || excerptFromDoc(doc.doc),
      cover_url: f.cover_url || null,
      cover_alt: f.cover_alt,
      content: doc.doc,
      intent: f.intent,
    },
  };
}
