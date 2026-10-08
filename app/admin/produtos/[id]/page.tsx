import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProduct } from "@/app/admin/actions";
import { ProductForm } from "@/components/admin/product-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { centsToPriceInput } from "@/lib/admin/product-schema";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/produtos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: p } = await createAdminClient()
    .from("products")
    .select(
      "id, slug, name, short_description, long_description, price_cents, active, age_restricted, sort_order, ai_instructions, focus_points, sample_excerpt, report_sections",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  return (
    <>
      <Link
        href="/admin/produtos"
        className="text-muted-foreground text-sm underline"
      >
        ← Produtos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>

      {query.criado && (
        <Alert>
          <AlertDescription>
            Produto criado. Marque &quot;Ativo&quot; quando quiser colocá-lo na
            vitrine.
          </AlertDescription>
        </Alert>
      )}
      {query.erro === "pedidos" && (
        <Alert variant="destructive">
          <AlertDescription>
            Este produto já tem pedidos e não pode ser apagado. Desmarque
            &quot;Ativo&quot; para tirá-lo da vitrine.
          </AlertDescription>
        </Alert>
      )}
      {query.erro === "geral" && (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível apagar o produto.
          </AlertDescription>
        </Alert>
      )}

      <ProductForm
        key={p.id}
        initial={{
          id: p.id,
          slug: p.slug,
          name: p.name,
          short_description: p.short_description,
          long_description: p.long_description,
          price: centsToPriceInput(p.price_cents),
          active: p.active,
          age_restricted: p.age_restricted,
          sort_order: p.sort_order,
          ai_instructions: p.ai_instructions,
          focus_points: Array.isArray(p.focus_points)
            ? (p.focus_points as string[])
            : [],
          sample_excerpt: p.sample_excerpt ?? "",
          sections: Array.isArray(p.report_sections)
            ? (p.report_sections as {
                key: string;
                title: string;
                instructions: string;
                needs_houses?: boolean;
              }[])
            : [],
        }}
      />

      <details className="border-border rounded-lg border p-4">
        <summary className="text-destructive cursor-pointer text-sm font-medium">
          Apagar este produto
        </summary>
        <form action={deleteProduct} className="mt-3 grid gap-2">
          <input type="hidden" name="id" value={p.id} />
          <p className="text-muted-foreground text-sm">
            Só é possível apagar produtos sem pedidos. Para tirar um produto da
            vitrine sem perder o histórico, desmarque &quot;Ativo&quot;.
          </p>
          <Button
            type="submit"
            variant="destructive"
            size="lg"
            className="w-fit"
          >
            Apagar definitivamente
          </Button>
        </form>
      </details>
    </>
  );
}
