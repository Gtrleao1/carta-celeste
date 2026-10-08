import { timingSafeEqual } from "node:crypto";

import { after } from "next/server";
import { z } from "zod";

import { createAnthropicWriter } from "@/lib/ai/anthropic";
import { triggerReportGeneration } from "@/lib/jobs/trigger";
import { runGeneration } from "@/lib/reports/generate";
import { createNotifier } from "@/lib/reports/notify";
import { createSupabaseStore } from "@/lib/reports/store";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

// Limite da função na Vercel. O orquestrador para de iniciar seções aos 25 s e
// nenhuma chamada passa dos 55 s; o que faltar continua numa nova chamada.
export const maxDuration = 60;

const bodySchema = z.object({ orderId: z.uuid() });

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Compara o segredo em tempo constante. Sem JOB_SECRET configurado, recusa tudo. */
function authorized(request: Request): boolean {
  const secret = process.env.JOB_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Gera o relatório de um pedido pago, por seções. Chamado pelo webhook, pela
 * reconciliação, pela retomada automática e por si mesmo (encadeado) enquanto
 * ainda houver seções pendentes. Idempotente e retomável.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return json({ error: "Não autorizado." }, 401);

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "Dados inválidos." }, 400);
  const { orderId } = body.data;

  let writer;
  try {
    writer = createAnthropicWriter({});
  } catch {
    console.error(
      "[job] IA não configurada (ANTHROPIC_API_KEY / ANTHROPIC_MODEL).",
    );
    return json({ error: "IA não configurada." }, 500);
  }

  const admin = createAdminClient();
  try {
    const result = await runGeneration(orderId, {
      store: createSupabaseStore(admin),
      writer,
      notify: createNotifier(admin, await getSiteUrl()),
      // Sem dados pessoais: só ids e contagens.
      log: (message) => console.info(`[job] ${orderId.slice(0, 8)} ${message}`),
    });

    // Faltam seções: continua numa nova chamada, depois de responder.
    if (result.state === "more") {
      after(() => triggerReportGeneration(orderId));
    }
    return json(result, result.state === "locked" ? 202 : 200);
  } catch (e) {
    // O estado fica salvo seção a seção; a retomada automática continua depois.
    console.error(
      `[job] ${orderId.slice(0, 8)} erro:`,
      e instanceof Error ? e.message : "desconhecido",
    );
    return json({ error: "Falha ao gerar o relatório." }, 500);
  }
}
