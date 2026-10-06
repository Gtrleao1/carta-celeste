import { createCheckout } from "@/lib/checkout/create-checkout";
import { checkoutSchema } from "@/lib/checkout/schemas";
import { createMpPreference } from "@/lib/payments/mercadopago";
import { tooManyRequests, withinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

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
  // Até 10 tentativas por minuto por usuário.
  if (!(await withinRateLimit(admin, `checkout:${user.id}`, 10, 60))) {
    return tooManyRequests(60);
  }

  const body = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "Dados inválidos." }, 400);

  const result = await createCheckout({
    userClient,
    admin,
    user: { id: user.id, email: user.email },
    input: body.data,
    siteUrl: await getSiteUrl(),
    createPreference: createMpPreference,
  });

  if (!result.ok) return json({ error: result.error }, result.status);
  return json({ url: result.url, orderId: result.orderId });
}
