import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Meus mapas",
  robots: { index: false },
};

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
});

type Row = {
  id: string;
  status: string;
  created_at: string;
  product: { name: string } | null;
};

/** Para onde cada pedido leva: o relatório, se pronto; senão, o acompanhamento. */
const hrefFor = (o: Row) =>
  o.status === "ready" ? `/meus-mapas/${o.id}` : `/pedido/${o.id}/retorno`;

const ctaFor = (status: string) =>
  status === "ready"
    ? "Ler meu mapa"
    : status === "pending"
      ? "Ver pagamento"
      : "Acompanhar";

export default async function MeusMapasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/meus-mapas");

  // A RLS devolve só os pedidos do próprio usuário.
  const { data } = await supabase
    .from("orders")
    .select("id, status, created_at, product:products(name)")
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <header className="grid gap-1">
        <h1 className="font-heading text-4xl font-semibold">Meus mapas</h1>
        <p className="text-muted-foreground">
          Seus pedidos e relatórios. Cada mapa fica guardado aqui para você ler
          quando quiser.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="border-border grid gap-4 rounded-xl border p-6">
          <p className="text-lg">Você ainda não tem mapas.</p>
          <p className="text-muted-foreground">
            Escolha o mapa que combina com o seu momento. O relatório fica
            pronto em poucos minutos depois do pagamento.
          </p>
          <Link
            href="/#mapas"
            className={buttonVariants({ size: "lg" }) + " h-12 w-fit text-base"}
          >
            Ver os mapas
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="grid gap-1">
                <p className="font-heading text-xl font-semibold">
                  {o.product?.name ?? "Mapa"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {date.format(new Date(o.created_at))}
                </p>
                <div>
                  <StatusBadge status={o.status} audience="customer" />
                </div>
              </div>
              {o.status !== "cancelled" && o.status !== "refunded" && (
                <Link
                  href={hrefFor(o)}
                  className={
                    buttonVariants({
                      size: "lg",
                      variant: o.status === "ready" ? "default" : "outline",
                    }) + " h-11 text-base"
                  }
                >
                  {ctaFor(o.status)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
