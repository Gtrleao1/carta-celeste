import { payOrder } from "@/lib/checkout/pay";
import { createPayDeps } from "@/lib/checkout/pay-deps";
import { paymentSchema } from "@/lib/checkout/schemas";
import { afterOrderPaid } from "@/lib/orders/on-paid";
import { rejectionMessage } from "@/lib/payments/rejection";
import { tooManyRequests, withinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readAttribution } from "@/lib/tracking/capture";
import { saveAttribution } from "@/lib/tracking/send";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Cria o pagamento do pedido com os dados do Payment Brick (pagamento dentro
 * do site). O valor vem do pedido, o e-mail da conta; o navegador só entrega o
 * token do cartão (ou o meio escolhido) e os dados do pagador.
 */
export async function POST(request: Request) {
  // Só aceita chamadas feitas pelo próprio site (proteção contra CSRF).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Origem não permitida." }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Requisição inválida." }, 415);
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user?.email) {
    return json({ error: "Entre na sua conta para continuar." }, 401);
  }

  const admin = createAdminClient();
  // Até 10 envios por minuto por usuário.
  if (!(await withinRateLimit(admin, `pagamento:${user.id}`, 10, 60))) {
    return tooManyRequests(60);
  }

  const body = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "Dados inválidos." }, 400);

  const siteUrl = await getSiteUrl();
  // Atribuição (cookies da Meta e do Google) só se a pessoa aceitou cookies.
  // A leitura do pedido pela RLS dentro de `payOrder` barra pedidos alheios,
  // mas o pedido precisa ser do usuário antes de gravar qualquer coisa.
  const { data: own } = await userClient
    .from("orders")
    .select("id")
    .eq("id", body.data.orderId)
    .maybeSingle();
  if (own) {
    await saveAttribution(
      admin,
      own.id,
      readAttribution(request.headers),
      `${siteUrl}/pedido/${own.id}/pagar`,
    );
  }

  const result = await payOrder(
    body.data.orderId,
    body.data.formData,
    createPayDeps({
      userClient,
      admin,
      payerEmail: user.email,
      siteUrl,
      onReconciledPaid: afterOrderPaid,
    }),
  );

  if (!result.ok) return json({ error: result.error }, result.status);
  if (result.triggerJob) afterOrderPaid(body.data.orderId);

  const rejected = result.status === "rejected";
  return json({
    paymentId: result.paymentId,
    status: result.status,
    ...(rejected && { message: rejectionMessage(result.statusDetail) }),
  });
}
