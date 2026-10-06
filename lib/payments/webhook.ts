import { z } from "zod";

import type { NotificationResult } from "./notification";
import { verifyWebhookSignature } from "./signature";

export type WebhookDeps = {
  /** Chave secreta do webhook (MERCADOPAGO_WEBHOOK_SECRET). */
  secret: string | undefined;
  /** Processa um pagamento já identificado. Se lançar erro, o Mercado Pago tenta de novo. */
  process: (paymentId: string) => Promise<NotificationResult>;
};

// Notificação de pagamento: { type: "payment", data: { id: "123" } }
const bodySchema = z.object({
  type: z.string().optional(),
  action: z.string().optional(),
  data: z
    .object({ id: z.union([z.string(), z.number()]) })
    .partial()
    .optional(),
});

const paymentIdSchema = z.string().regex(/^\d{1,20}$/);

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Trata `POST /api/webhooks/mercadopago`:
 *  1. valida a assinatura (HMAC-SHA256); inválida -> 401;
 *  2. ignora o que não for evento de pagamento;
 *  3. processa o pagamento (consulta a API, confere valor, muda o pedido);
 *  4. responde 200 rápido. O trabalho pesado (gerar o relatório) fica no job.
 */
export async function handleMercadoPagoWebhook(
  request: Request,
  deps: WebhookDeps,
): Promise<Response> {
  const url = new URL(request.url);
  const queryDataId = url.searchParams.get("data.id");

  const valid = verifyWebhookSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId: queryDataId,
    secret: deps.secret,
  });
  if (!valid) return json({ error: "invalid_signature" }, 401);

  let body: z.infer<typeof bodySchema> = {};
  try {
    const parsed = bodySchema.safeParse(
      JSON.parse((await request.text()) || "{}"),
    );
    if (parsed.success) body = parsed.data;
  } catch {
    // corpo ilegível: segue só com a query string
  }

  const type =
    body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  if (type !== "payment")
    return json({ ok: true, ignored: "not_a_payment_event" });

  const rawId =
    queryDataId ?? (body.data?.id != null ? String(body.data.id) : null);
  const paymentId = paymentIdSchema.safeParse(rawId);
  if (!paymentId.success)
    return json({ ok: true, ignored: "invalid_payment_id" });

  try {
    const result = await deps.process(paymentId.data);
    return json({ ok: true, action: result.action });
  } catch (e) {
    // Nunca registra dados pessoais: só o tipo do problema e o id do pagamento.
    console.error(
      `[webhook mercadopago] falha ao processar o pagamento ${paymentId.data}:`,
      e instanceof Error ? e.message : "erro desconhecido",
    );
    return json({ error: "processing_failed" }, 500);
  }
}
