import "server-only";

import { getSiteUrl } from "@/lib/site-url";

/**
 * Pede ao job `/api/jobs/generate-report` (Etapa 6) que gere o relatório de um
 * pedido pago. Chamado dentro de `after()`, então não atrasa a resposta do
 * webhook. Falhar aqui não é grave: a página "Meus mapas" e o painel admin
 * retomam pedidos pagos sem relatório.
 */
export async function triggerReportGeneration(orderId: string) {
  const secret = process.env.JOB_SECRET;
  if (!secret) {
    console.error("[job] JOB_SECRET não configurado; relatório não disparado.");
    return;
  }
  try {
    const siteUrl = await getSiteUrl();
    const res = await fetch(`${siteUrl}/api/jobs/generate-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok)
      console.error(`[job] geração do relatório respondeu HTTP ${res.status}`);
  } catch (e) {
    console.error(
      "[job] falha ao disparar a geração:",
      e instanceof Error ? e.message : "erro",
    );
  }
}
