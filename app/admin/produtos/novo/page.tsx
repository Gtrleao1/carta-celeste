import Link from "next/link";

import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/auth";

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <>
      <Link
        href="/admin/produtos"
        className="text-muted-foreground text-sm underline"
      >
        ← Produtos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
      <p className="text-muted-foreground text-sm">
        O produto novo começa inativo: ative quando as seções e o texto
        estiverem prontos. Ao ativar, ele aparece na vitrine e já gera relatório
        com as seções abaixo.
      </p>
      <ProductForm initial={EMPTY_PRODUCT} />
    </>
  );
}
