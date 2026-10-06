import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Status do pedido para a página de retorno do pagamento. Lê do banco, nunca
 * de parâmetros da URL, e só devolve pedidos do próprio usuário (RLS).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Não autorizado." }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("status, mp_status")
    .eq("id", id)
    .maybeSingle();
  if (!order)
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });

  return Response.json(
    { status: order.status, mpStatus: order.mp_status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
