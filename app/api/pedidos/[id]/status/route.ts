import { after } from "next/server";
import { z } from "zod";

import { triggerReportGeneration } from "@/lib/jobs/trigger";
import { createNotificationDeps } from "@/lib/payments/deps";
import { findMpPaymentIds, getMpPayment } from "@/lib/payments/mercadopago";
import { reconcileOrder } from "@/lib/payments/reconcile";
import { withinRateLimit } from "@/lib/rate-limit";
import { needsResume } from "@/lib/reports/resume";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Só pergunta ao Mercado Pago depois de dar tempo ao webhook de chegar. */
const RECONCILE_AFTER_MS = 10_000;

/**
 * Status do pedido para a página de retorno do pagamento. Lê do banco, nunca
 * de parâmetros da URL, e só devolve pedidos do próprio usuário (RLS).
 *
 * Se o pedido continua `pending` e o webhook ainda não chegou, o servidor
 * reconcilia com o Mercado Pago (consulta pelo `external_reference`), com a
 * mesma regra do webhook. É a rede de segurança contra webhook atrasado.
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
    .select("status, mp_status, created_at, paid_at")
    .eq("id", id)
    .maybeSingle();
  if (!order)
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });

  let { status, mp_status: mpStatus } = order;

  const age = Date.now() - new Date(order.created_at).getTime();
  if (status === "pending" && age >= RECONCILE_AFTER_MS) {
    const admin = createAdminClient();
    // No máximo uma consulta ao Mercado Pago a cada 10 s por pedido.
    if (await withinRateLimit(admin, `reconciliar:${id}`, 1, 10)) {
      try {
        const results = await reconcileOrder(id, {
          ...createNotificationDeps(admin, getMpPayment, "reconciliacao"),
          findPaymentIds: findMpPaymentIds,
        });
        if (results.some((r) => r.triggerJob)) {
          after(() => triggerReportGeneration(id));
        }
        const { data: fresh } = await admin
          .from("orders")
          .select("status, mp_status")
          .eq("id", id)
          .single();
        if (fresh) ({ status, mp_status: mpStatus } = fresh);
      } catch (e) {
        // Se o Mercado Pago estiver fora do ar, segue com o que o banco tem.
        console.error(
          "[reconciliação] falhou:",
          e instanceof Error ? e.message : "erro",
        );
      }
    }
  }

  // Progresso do relatório e retomada automática (pedido pago que não andou).
  let sectionsDone = 0;
  let sectionsTotal = 0;
  if (status === "paid" || status === "generating" || status === "ready") {
    const admin = createAdminClient();
    const { data: report } = await admin
      .from("reports")
      .select("sections, updated_at, lock_until")
      .eq("order_id", id)
      .maybeSingle();

    const sections = (report?.sections ?? []) as { status: string }[];
    sectionsTotal = sections.length;
    sectionsDone = sections.filter((s) => s.status === "done").length;

    if (
      needsResume({
        orderStatus: status,
        paidAt: order.paid_at,
        report: report
          ? { updated_at: report.updated_at, lock_until: report.lock_until }
          : null,
        now: Date.now(),
      }) &&
      // No máximo uma tentativa de retomada a cada 30 s por pedido.
      (await withinRateLimit(admin, `retomar:${id}`, 1, 30))
    ) {
      after(() => triggerReportGeneration(id));
    }
  }

  return Response.json(
    { status, mpStatus, sectionsDone, sectionsTotal },
    { headers: { "Cache-Control": "no-store" } },
  );
}
