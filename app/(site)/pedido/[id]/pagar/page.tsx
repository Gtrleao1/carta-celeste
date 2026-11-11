import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { PaymentBrick } from "@/components/checkout/payment-brick";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pagamento",
  robots: { index: false },
};

export default async function PagarPage({
  params,
}: PageProps<"/pedido/[id]/pagar">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/entrar?next=${encodeURIComponent(`/pedido/${id}/pagar`)}`);

  // A RLS só deixa ver pedidos do próprio usuário.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, amount_cents, product_id")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  // Pedido já pago, cancelado… ou sem a chave pública do Mercado Pago: a
  // página de acompanhamento sabe o que mostrar em cada caso.
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  if (order.status !== "pending" || !publicKey) {
    redirect(`/pedido/${id}/retorno`);
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", order.product_id)
    .maybeSingle();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <header className="grid gap-2">
        <p className="text-muted-foreground text-sm">Etapa 3 de 3: pagamento</p>
        <h1 className="text-5xl font-semibold">Pagamento</h1>
      </header>

      <div className="bg-card border-border flex items-center justify-between gap-4 rounded-xl border p-5">
        <div>
          <p className="font-medium">{product?.name ?? "Seu mapa"}</p>
          <p className="text-muted-foreground text-sm">
            Pix, boleto ou cartão em até 12x.
          </p>
        </div>
        <p className="font-heading text-primary text-3xl font-semibold">
          {formatBRL(order.amount_cents)}
        </p>
      </div>

      <PaymentBrick
        orderId={order.id}
        publicKey={publicKey}
        amountCents={order.amount_cents}
        productId={product?.id ?? order.product_id}
        productName={product?.name ?? "Mapa astral"}
      />

      <p className="text-muted-foreground text-xs">
        Pagamento processado pelo Mercado Pago, sem sair do site. Não guardamos
        os dados do seu cartão.
      </p>
    </div>
  );
}
