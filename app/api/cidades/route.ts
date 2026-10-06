import { z } from "zod";

import { clientIp, tooManyRequests, withinRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

const querySchema = z.object({
  q: z.string().trim().min(2).max(60),
});

/**
 * Autocompletar de cidades: a partir de 2 letras, sem acento e sem diferenciar
 * maiúsculas. Limitado a 60 buscas por minuto por IP.
 */
export async function GET(request: Request) {
  const parsed = querySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!parsed.success) return Response.json({ cities: [] });

  const admin = createAdminClient();
  if (!(await withinRateLimit(admin, `cidades:${clientIp(request)}`, 60, 60))) {
    return tooManyRequests(30);
  }

  const supabase = createPublicClient();
  if (!supabase) return Response.json({ cities: [] });

  const { data, error } = await supabase.rpc("search_cities", {
    q: parsed.data.q,
    max_results: 8,
  });
  if (error)
    return Response.json({ error: "Falha na busca." }, { status: 500 });

  return Response.json(
    {
      cities: (data ?? []).map(
        (c: {
          id: number;
          name: string;
          state_or_country: string;
          latitude: number;
          longitude: number;
          timezone: string;
        }) => ({
          id: c.id,
          label: `${c.name}, ${c.state_or_country}`,
          latitude: c.latitude,
          longitude: c.longitude,
          timezone: c.timezone,
        }),
      ),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
