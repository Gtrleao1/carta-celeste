import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

import type { Attribution } from "./capture";
import { TRACKING } from "./config";
import {
  sendPurchase,
  type PurchaseDeps,
  type PurchaseOrder,
  type PurchaseResult,
} from "./purchase";

const META_API_VERSION = "v21.0";
const TIMEOUT_MS = 8_000;

const metaToken = () => process.env.META_CAPI_ACCESS_TOKEN || null;
const ga4Secret = () => process.env.GA4_API_SECRET || null;

/** Guarda a atribuição do pedido (ou só a recusa de cookies). Nunca derruba o fluxo de compra. */
export async function saveAttribution(
  admin: SupabaseClient,
  orderId: string,
  attr: Attribution,
  sourceUrl: string,
) {
  const { error } = await admin.from("order_tracking").upsert(
    {
      order_id: orderId,
      consent_marketing: attr.consent,
      fbp: attr.fbp,
      fbc: attr.fbc,
      gclid: attr.gclid,
      ga_client_id: attr.gaClientId,
      client_ip: attr.clientIp,
      user_agent: attr.userAgent,
      source_url: attr.consent ? sourceUrl : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id" },
  );
  if (error) {
    console.error("[tracking] não foi possível guardar a atribuição.");
  }
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
}

function createDeps(admin: SupabaseClient, siteUrl: string): PurchaseDeps {
  const pixel = TRACKING.metaPixelId;
  const token = metaToken();
  const ga4 = TRACKING.ga4Id;
  const secret = ga4Secret();

  return {
    enabled: { meta: Boolean(pixel && token), ga4: Boolean(ga4 && secret) },
    siteUrl,
    now: () => Date.now(),

    async load(orderId) {
      const { data: order } = await admin
        .from("orders")
        .select(
          "id, status, amount_cents, product_id, user_id, paid_at, purchase_tracked_at",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return null;

      const [{ data: product }, { data: tracking }, user] = await Promise.all([
        admin
          .from("products")
          .select("name")
          .eq("id", order.product_id)
          .maybeSingle(),
        admin
          .from("order_tracking")
          .select(
            "consent_marketing, fbp, fbc, gclid, ga_client_id, client_ip, user_agent",
          )
          .eq("order_id", orderId)
          .maybeSingle(),
        order.user_id
          ? admin.auth.admin.getUserById(order.user_id)
          : Promise.resolve(null),
      ]);

      const result: PurchaseOrder = {
        id: order.id,
        status: order.status,
        amountCents: order.amount_cents,
        productId: order.product_id,
        productName: product?.name ?? "Mapa astral",
        userId: order.user_id,
        email: user?.data.user?.email ?? null,
        paidAt: order.paid_at,
        purchaseTrackedAt: order.purchase_tracked_at,
        tracking: tracking
          ? {
              consent: tracking.consent_marketing,
              fbp: tracking.fbp,
              fbc: tracking.fbc,
              gclid: tracking.gclid,
              gaClientId: tracking.ga_client_id,
              clientIp: tracking.client_ip,
              userAgent: tracking.user_agent,
            }
          : null,
      };
      return result;
    },

    async claim(orderId) {
      const { data } = await admin
        .from("orders")
        .update({ purchase_tracked_at: new Date().toISOString() })
        .eq("id", orderId)
        .is("purchase_tracked_at", null)
        .select("id");
      return (data?.length ?? 0) > 0;
    },

    async release(orderId) {
      await admin
        .from("orders")
        .update({ purchase_tracked_at: null })
        .eq("id", orderId);
    },

    async log(orderId, row) {
      await admin.from("tracking_events").insert({
        order_id: orderId,
        platform: row.platform,
        event_name: row.eventName,
        event_id: row.eventId,
        status: row.status,
        detail: row.detail ?? null,
      });
    },

    async sendMeta(body) {
      const res = await post(
        `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(pixel!)}/events?access_token=${encodeURIComponent(token!)}`,
        body,
      );
      return { ok: res.ok, detail: `http_${res.status}` };
    },

    async sendGa4(body) {
      const res = await post(
        `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(ga4!)}&api_secret=${encodeURIComponent(secret!)}`,
        body,
      );
      // O Measurement Protocol responde 2xx mesmo para eventos descartados;
      // `/debug/mp/collect` é quem valida. Aqui basta confirmar o recebimento.
      return { ok: res.ok, detail: `http_${res.status}` };
    },
  };
}

/**
 * Avisa Meta e Google da compra. Chamado depois que o pedido vira `paid`; nunca
 * lança erro (uma falha de rastreamento não pode atrapalhar a entrega do mapa).
 */
export async function sendServerPurchase(
  orderId: string,
): Promise<PurchaseResult | null> {
  try {
    const admin = createAdminClient();
    return await sendPurchase(orderId, createDeps(admin, await getSiteUrl()));
  } catch (e) {
    console.error(
      "[tracking] falha ao enviar a compra:",
      e instanceof Error ? e.message : "erro",
    );
    return null;
  }
}

/** Admin: libera a marca e envia de novo (ex.: a Meta estava fora do ar). */
export async function resendServerPurchase(orderId: string) {
  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({ purchase_tracked_at: null })
    .eq("id", orderId);
  return sendServerPurchase(orderId);
}
