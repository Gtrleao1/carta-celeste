import { createHash } from "node:crypto";

/**
 * Envio da compra às plataformas pelo servidor (API de Conversões da Meta e
 * Measurement Protocol do GA4). Funciona mesmo que a pessoa feche a aba antes
 * da página de confirmação, e não depende de bloqueadores no navegador.
 *
 * O que vai: valor, moeda, produto, número do pedido e identificadores de
 * atribuição (com e-mail só em hash SHA-256). O que NÃO vai, nunca: nome, data,
 * hora ou local de nascimento, CPF, nem o conteúdo do mapa.
 */

export type PurchaseOrder = {
  id: string;
  status: string;
  amountCents: number;
  productId: string;
  productName: string;
  userId: string | null;
  email: string | null;
  paidAt: string | null;
  purchaseTrackedAt: string | null;
  tracking: {
    consent: boolean;
    fbp: string | null;
    fbc: string | null;
    gclid: string | null;
    gaClientId: string | null;
    clientIp: string | null;
    userAgent: string | null;
  } | null;
};

export type SendOutcome = { ok: boolean; detail: string };

export type PurchaseDeps = {
  load(orderId: string): Promise<PurchaseOrder | null>;
  /** Marca o envio de forma atômica. `false` se outra chamada já marcou. */
  claim(orderId: string): Promise<boolean>;
  release(orderId: string): Promise<void>;
  log(
    orderId: string,
    row: {
      platform: "meta" | "ga4";
      eventName: string;
      eventId: string;
      status: "sent" | "skipped" | "error";
      detail?: string;
    },
  ): Promise<void>;
  sendMeta(body: unknown): Promise<SendOutcome>;
  sendGa4(body: unknown): Promise<SendOutcome>;
  enabled: { meta: boolean; ga4: boolean };
  siteUrl: string;
  now(): number;
};

export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Id do evento: o mesmo no navegador e no servidor, para a Meta contar uma venda só. */
export const purchaseEventId = (orderId: string) => `${orderId}:Purchase`;

const PAID = new Set(["paid", "generating", "ready", "failed"]);

export function buildMetaPurchase(
  order: PurchaseOrder,
  siteUrl: string,
  nowMs: number,
  testEventCode?: string,
) {
  const t = order.tracking;
  const paidMs = order.paidAt ? Date.parse(order.paidAt) : nowMs;
  const userData: Record<string, unknown> = {};
  if (order.email) userData.em = [sha256(order.email.trim().toLowerCase())];
  if (order.userId) userData.external_id = [sha256(order.userId)];
  if (t?.fbp) userData.fbp = t.fbp;
  if (t?.fbc) userData.fbc = t.fbc;
  if (t?.clientIp) userData.client_ip_address = t.clientIp;
  if (t?.userAgent) userData.client_user_agent = t.userAgent;

  return {
    data: [
      {
        event_name: "Purchase",
        // A Meta aceita eventos de até 7 dias atrás; usa a hora do pagamento.
        event_time: Math.floor(paidMs / 1000),
        event_id: purchaseEventId(order.id),
        event_source_url: `${siteUrl}/pedido/${order.id}/retorno`,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: "BRL",
          value: order.amountCents / 100,
          content_ids: [order.productId],
          content_type: "product",
          content_name: order.productName,
          order_id: order.id,
        },
      },
    ],
    ...(testEventCode && { test_event_code: testEventCode }),
  };
}

export function buildGa4Purchase(order: PurchaseOrder) {
  const value = order.amountCents / 100;
  return {
    // Sem o cookie do GA, um id estável por pedido ainda registra a receita.
    client_id:
      order.tracking?.gaClientId ?? `${sha256(order.id).slice(0, 10)}.1`,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: order.id,
          value,
          currency: "BRL",
          items: [
            {
              item_id: order.productId,
              item_name: order.productName,
              price: value,
              quantity: 1,
            },
          ],
        },
      },
    ],
  };
}

export type PurchaseResult =
  | { action: "sent"; platforms: string[] }
  | { action: "skipped"; reason: string };

/**
 * Envia a compra uma única vez. Só segue se o pedido está pago, a pessoa
 * aceitou os cookies e há alguma plataforma configurada. Falhas ficam em
 * `tracking_events` (e o painel admin pode reenviar), nunca derrubam o pedido.
 */
export async function sendPurchase(
  orderId: string,
  deps: PurchaseDeps,
): Promise<PurchaseResult> {
  const skip = (reason: string): PurchaseResult => ({
    action: "skipped",
    reason,
  });
  if (!deps.enabled.meta && !deps.enabled.ga4) return skip("sem_plataforma");

  const order = await deps.load(orderId);
  if (!order) return skip("pedido_inexistente");
  if (!PAID.has(order.status)) return skip("pedido_nao_pago");
  if (order.purchaseTrackedAt) return skip("ja_enviado");

  const eventId = purchaseEventId(order.id);
  if (!order.tracking?.consent) {
    for (const platform of ["meta", "ga4"] as const) {
      if (deps.enabled[platform]) {
        await deps.log(order.id, {
          platform,
          eventName: "Purchase",
          eventId,
          status: "skipped",
          detail: "sem_consentimento",
        });
      }
    }
    return skip("sem_consentimento");
  }

  if (!(await deps.claim(order.id))) return skip("ja_enviado");

  const sent: string[] = [];
  let failures = 0;
  const run = async (
    platform: "meta" | "ga4",
    send: () => Promise<SendOutcome>,
  ) => {
    let outcome: SendOutcome;
    try {
      outcome = await send();
    } catch (e) {
      outcome = {
        ok: false,
        detail: e instanceof Error ? "excecao_de_rede" : "erro",
      };
    }
    if (outcome.ok) sent.push(platform);
    else failures += 1;
    await deps.log(order.id, {
      platform,
      eventName: "Purchase",
      eventId,
      status: outcome.ok ? "sent" : "error",
      detail: outcome.detail,
    });
  };

  if (deps.enabled.meta) {
    await run("meta", () =>
      deps.sendMeta(
        buildMetaPurchase(
          order,
          deps.siteUrl,
          deps.now(),
          process.env.META_TEST_EVENT_CODE || undefined,
        ),
      ),
    );
  }
  if (deps.enabled.ga4) {
    await run("ga4", () => deps.sendGa4(buildGa4Purchase(order)));
  }

  // Se nada foi entregue, libera a marca: o painel (ou uma nova tentativa) reenvia.
  if (sent.length === 0 && failures > 0) await deps.release(order.id);
  return { action: "sent", platforms: sent };
}
