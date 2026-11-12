import Link from "next/link";
import { notFound } from "next/navigation";

import { deletePost } from "@/app/admin/blog/actions";
import { PostForm } from "@/components/admin/post-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { nowMs } from "@/lib/admin/time";
import { sanitizeDoc } from "@/lib/blog/content";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditPostPage({
  params,
  searchParams,
}: PageProps<"/admin/blog/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: post } = await createAdminClient()
    .from("posts")
    .select(
      "id, slug, title, excerpt, cover_url, cover_alt, content, status, published_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  const content = sanitizeDoc(post.content);
  const live =
    post.status === "published" &&
    post.published_at &&
    Date.parse(post.published_at) <= nowMs();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <Link
            href="/admin/blog"
            className="text-muted-foreground w-fit text-sm underline"
          >
            ← Blog
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Editar post</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            href={`/admin/blog/${post.id}/previa`}
            className="text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Prévia
          </Link>
          {live && (
            <Link
              href={`/blog/${post.slug}`}
              className="text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Ver no site
            </Link>
          )}
        </div>
      </div>

      {query.criado && (
        <Alert>
          <AlertDescription>
            Rascunho criado. Escreva à vontade e clique em “Publicar” quando
            estiver pronto.
          </AlertDescription>
        </Alert>
      )}
      {query.erro && (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível apagar o post. Veja o log do servidor.
          </AlertDescription>
        </Alert>
      )}

      <PostForm
        key={`${post.id}-${post.status}`}
        initial={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          cover_url: post.cover_url ?? "",
          cover_alt: post.cover_alt,
          content: content.ok ? content.doc : { type: "doc", content: [] },
          status: post.status as "draft" | "published",
        }}
      />

      <form action={deletePost} className="border-t pt-6">
        <input type="hidden" name="id" value={post.id} />
        <Button type="submit" variant="destructive" size="lg" className="h-11">
          Apagar post
        </Button>
        <p className="text-muted-foreground mt-2 text-xs">
          Apaga o post para sempre. As imagens enviadas continuam guardadas.
        </p>
      </form>
    </>
  );
}
