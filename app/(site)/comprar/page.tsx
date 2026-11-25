import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getActiveProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Receber minha carta",
  robots: { index: false },
};

/**
 * Entrada do botão "Receber minha carta" do menu. Deslogado, o proxy já levou a
 * pessoa para entrar ou criar a conta (e a trouxe de volta aqui). Com um único
 * mapa à venda, vai direto para a compra dele; com vários, para a vitrine.
 */
export default async function ComprarIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmar?: string }>;
}) {
  const { confirmar } = await searchParams;
  const products = await getActiveProducts();
  if (products.length === 1) {
    // Vindo do link do e-mail de confirmação, abre direto na conferência dos dados.
    const suffix = confirmar === "1" ? "?confirmar=1" : "";
    redirect(`/comprar/${products[0].slug}${suffix}`);
  }
  redirect("/#mapas");
}
