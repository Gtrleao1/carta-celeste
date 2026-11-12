import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { sanitizeDoc, type Doc } from "./content";

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string;
  published_at: string;
};

export type Post = PostSummary & { content: Doc; updated_at: string };

const SUMMARY = "id, slug, title, excerpt, cover_url, cover_alt, published_at";

// A RLS já deixa o visitante ler só posts publicados e com a data de
// publicação vencida; o filtro abaixo só deixa isso explícito.
const nowIso = () => new Date().toISOString();

/** Posts publicados, do mais novo para o mais antigo. Sem Supabase (CI), lista vazia. */
export async function getPublishedPosts(): Promise<PostSummary[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(SUMMARY)
    .eq("status", "published")
    .lte("published_at", nowIso())
    .order("published_at", { ascending: false });
  if (error) throw new Error(`Erro ao buscar posts: ${error.message}`);
  return (data ?? []) as PostSummary[];
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<Post | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("posts")
    .select(`${SUMMARY}, content, updated_at`)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", nowIso())
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar o post: ${error.message}`);
  if (!data) return null;

  // O conteúdo já foi limpo ao salvar, mas passa de novo por aqui: nada que
  // esteja no banco chega ao navegador sem checagem.
  const clean = sanitizeDoc(data.content);
  return {
    ...(data as Omit<Post, "content">),
    content: clean.ok ? clean.doc : { type: "doc", content: [] },
  };
}
