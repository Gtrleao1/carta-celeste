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
export default async function ComprarIndexPage() {
  const products = await getActiveProducts();
  if (products.length === 1) redirect(`/comprar/${products[0].slug}`);
  redirect("/#mapas");
}
