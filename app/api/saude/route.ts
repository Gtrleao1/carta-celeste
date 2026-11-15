import { createPublicClient } from "@/lib/supabase/public";

/**
 * Verificação de saúde para monitoramento (UptimeRobot, BetterStack, etc.):
 * 200 se o site responde e o banco está acessível, 503 se não. A resposta é
 * curta e sem detalhes (nada de erro bruto nem chave). O CDN guarda por 30 s,
 * então um monitor frequente não vira carga no banco. `versao` é o início do
 * commit publicado: serve para confirmar qual deploy está no ar.
 */
export async function GET() {
  const versao = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  let banco = false;
  try {
    const supabase = createPublicClient();
    if (supabase) {
      const { error } = await supabase.from("products").select("id").limit(1);
      banco = !error;
    }
  } catch {
    banco = false;
  }

  return Response.json(
    {
      status: banco ? "ok" : "degradado",
      banco: banco ? "ok" : "falha",
      versao,
    },
    {
      status: banco ? 200 : 503,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    },
  );
}
