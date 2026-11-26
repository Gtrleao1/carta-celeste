import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MapList, type MapOrder } from "@/components/conta/map-list";
import { buttonVariants } from "@/components/ui/button";
import { getActiveProducts } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Meus mapas",
  robots: { index: false },
};

export default async function MeusMapasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/meus-mapas");

  // A RLS devolve só os pedidos e os dados de nascimento do próprio usuário.
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, product:products(name), birth:birth_profiles(name, birth_date, birth_time, time_unknown, city_name, timezone)",
    )
    .order("created_at", { ascending: false });
  // Falha de leitura não pode parecer "você não tem mapas".
  if (error) throw new Error("meus_mapas_indisponivel");
  const orders = (data ?? []) as unknown as MapOrder[];

  // Com um único mapa à venda, o botão leva direto à compra; com vários, à vitrine.
  const products = await getActiveProducts();
  const single = products.length === 1 ? products[0] : null;
  const buyHref = single ? `/comprar/${single.slug}` : "/#mapas";
  const addPersonHref = single ? `/comprar/${single.slug}?novo=1` : "/#mapas";

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <header className="grid gap-1">
        <h1 className="font-heading text-4xl font-semibold">Meus mapas</h1>
        <p className="text-muted-foreground">
          Cada mapa fica guardado aqui para você ler quando quiser.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="border-border grid gap-4 rounded-xl border p-6">
          <p className="text-lg">Você ainda não tem mapas.</p>
          <p className="text-muted-foreground">
            Quando você pedir o seu mapa astral, ele aparece aqui. Ele fica
            pronto em poucos minutos depois do pagamento.
          </p>
          <Link
            href={buyHref}
            className={buttonVariants({ size: "lg" }) + " h-12 w-fit text-base"}
          >
            Quero meu mapa
          </Link>
        </div>
      ) : (
        <>
          <MapList orders={orders} />

          <div className="border-border grid gap-3 rounded-xl border border-dashed p-4">
            <p className="text-sm">
              Quer o mapa de outra pessoa? Informe os dados de nascimento dela e
              peça um novo mapa. O dela também fica guardado aqui.
            </p>
            <Link
              href={addPersonHref}
              className={
                buttonVariants({ size: "lg", variant: "outline" }) +
                " h-11 w-fit"
              }
            >
              Adicionar outra pessoa
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
