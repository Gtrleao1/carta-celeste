import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limite de requisições por chave, guardado no Postgres (função
 * `check_rate_limit`), então vale entre instâncias serverless.
 * Devolve `true` se a requisição ainda está dentro do limite.
 * Se o limitador falhar, deixa passar (não derruba compras por causa dele).
 */
export async function withinRateLimit(
  admin: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] falhou:", error.message);
    return true;
  }
  return data === true;
}

/** IP do cliente, atrás do proxy da Vercel, a partir dos cabeçalhos da requisição. */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "desconhecido"
  );
}

export const clientIp = (request: Request) =>
  clientIpFromHeaders(request.headers);

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Muitas tentativas. Aguarde um instante e tente de novo." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
