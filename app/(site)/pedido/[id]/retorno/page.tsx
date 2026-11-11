import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { OrderStatus } from "@/components/checkout/order-status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Seu pedido",
  robots: { index: false },
};

export default async function RetornoPage({
  params,
}: PageProps<"/pedido/[id]/retorno">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/entrar?next=${encodeURIComponent(`/pedido/${id}/retorno`)}`);

  // Os parâmetros que o Mercado Pago coloca na URL são ignorados de propósito:
  // o status vem sempre do banco. A RLS só deixa ver pedidos do próprio usuário.
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, mp_status, product_id, amount_cents, mp_last_payment_id, payment_method",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug")
    .eq("id", order.product_id)
    .maybeSingle();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-12">
      <OrderStatus
        orderId={order.id}
        productName={product?.name ?? "Seu mapa"}
        productSlug={product?.slug ?? ""}
        initialStatus={order.status}
        initialMpStatus={order.mp_status}
        paymentId={order.mp_last_payment_id}
        paymentType={order.payment_method}
        publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null}
        purchase={{
          value: order.amount_cents / 100,
          item: {
            item_id: product?.id ?? order.product_id,
            item_name: product?.name ?? "Mapa astral",
            price: order.amount_cents / 100,
          },
        }}
      />
    </div>
  );
}
