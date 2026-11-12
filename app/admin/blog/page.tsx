import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { nowMs } from "@/lib/admin/time";
import { createAdminClient } from "@/lib/supabase/admin";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminBlogPage({
  searchParams,
}: PageProps<"/admin/blog">) {
  await requireAdmin();
  const query = await searchParams;

  const { data: posts, error } = await createAdminClient()
    .from("posts")
    .select("id, slug, title, status, published_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Erro ao buscar posts: ${error.message}`);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <Link
          href="/admin/blog/novo"
          className={buttonVariants({ size: "lg" }) + " h-11"}
        >
          Novo post
        </Link>
      </div>

      {query.apagado && (
        <Alert>
          <AlertDescription>Post apagado.</AlertDescription>
        </Alert>
      )}

      {(posts ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum post ainda. Clique em “Novo post” para escrever o primeiro.
        </p>
      ) : (
        <ul className="divide-y">
          {(posts ?? []).map((p) => {
            const live =
              p.status === "published" &&
              p.published_at &&
              Date.parse(p.published_at) <= nowMs();
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/blog/${p.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {p.title}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    /blog/{p.slug} ·{" "}
                    {p.published_at
                      ? `publicado em ${dateTime.format(new Date(p.published_at))}`
                      : `editado em ${dateTime.format(new Date(p.updated_at))}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {live && (
                    <Link
                      href={`/blog/${p.slug}`}
                      className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
                    >
                      Ver no site
                    </Link>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      live
                        ? "bg-earth/15 text-earth"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {live ? "Publicado" : "Rascunho"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
