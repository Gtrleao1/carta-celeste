import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostContent } from "@/components/blog/post-content";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitizeDoc } from "@/lib/blog/content";
import { createAdminClient } from "@/lib/supabase/admin";

/** Prévia do post (rascunho ou publicado) como o visitante vai ver. */
export default async function PostPreviewPage({
  params,
}: PageProps<"/admin/blog/[id]/previa">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: post } = await createAdminClient()
    .from("posts")
    .select("id, title, cover_url, cover_alt, content, status")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();
  const content = sanitizeDoc(post.content);

  return (
    <>
      <div className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <span>
          Prévia {post.status === "published" ? "(publicado)" : "(rascunho)"}
        </span>
        <Link
          href={`/admin/blog/${post.id}`}
          className="underline underline-offset-4"
        >
          ← Voltar para a edição
        </Link>
      </div>
      <article className="mx-auto grid w-full max-w-3xl gap-8">
        <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          {post.title}
        </h1>
        {post.cover_url && (
          <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden rounded-xl">
            <Image
              src={post.cover_url}
              alt={post.cover_alt}
              fill
              sizes="768px"
              className="object-cover"
            />
          </div>
        )}
        {content.ok && <PostContent doc={content.doc} />}
      </article>
    </>
  );
}
