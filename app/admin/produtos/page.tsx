import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { formatBRL } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/produtos">) {
  await requireAdmin();
  const query = await searchParams;

  const { data: products, error } = await createAdminClient()
    .from("products")
    .select(
      "id, slug, name, price_cents, active, age_restricted, section_titles",
    )
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className={buttonVariants({ size: "lg" }) + " h-11"}
        >
          Novo produto
        </Link>
      </div>

      {query.apagado && (
        <Alert>
          <AlertDescription>Produto apagado.</AlertDescription>
        </Alert>
      )}

      <ul className="divide-y">
        {(products ?? []).map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div className="min-w-0">
              <Link
                href={`/admin/produtos/${p.id}`}
                className="font-medium underline underline-offset-4"
              >
                {p.name}
              </Link>
              <p className="text-muted-foreground text-sm">
                /mapa/{p.slug} · {formatBRL(p.price_cents)} ·{" "}
                {(p.section_titles as unknown[]).length} seções
                {p.age_restricted ? " · 18+" : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                p.active
                  ? "bg-earth/15 text-earth"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {p.active ? "Ativo" : "Inativo"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
