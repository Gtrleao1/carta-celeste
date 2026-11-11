import { TRACKING } from "./config";
import { readConsent } from "./consent";

export type TrackName =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

export type TrackParams = {
  value?: number;
  currency?: string;
  items?: { item_id: string; item_name: string; price: number }[];
  /** Mesmo id do envio pelo servidor: a Meta junta os dois e conta uma venda só. */
  eventId?: string;
  /** Número do pedido (o GA4 e o Google Ads descartam compras repetidas). */
  transactionId?: string;
};

/** Nome do evento equivalente no GA4. */
const GA_NAME: Record<TrackName, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  InitiateCheckout: "begin_checkout",
  AddPaymentInfo: "add_payment_info",
  Purchase: "purchase",
};

type Win = Window & {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

/** Eventos disparados antes de os scripts das plataformas estarem prontos. */
const queue: [TrackName, TrackParams][] = [];

function platformsReady(w: Win) {
  return (
    (!TRACKING.metaPixelId || w.fbq) &&
    (!(TRACKING.ga4Id || TRACKING.adsId) || w.gtag)
  );
}

function dispatch(name: TrackName, p: TrackParams) {
  const w = window as Win;
  const ids = p.items?.map((i) => i.item_id);

  if (TRACKING.metaPixelId && w.fbq) {
    const data: Record<string, unknown> = {};
    if (p.value !== undefined) data.value = p.value;
    if (p.currency) data.currency = p.currency;
    if (ids?.length) {
      data.content_ids = ids;
      data.content_type = "product";
      data.content_name = p.items?.[0]?.item_name;
    }
    w.fbq("track", name, data, p.eventId ? { eventID: p.eventId } : undefined);
  }

  const gtagTarget = w.gtag;
  if (gtagTarget && (TRACKING.ga4Id || TRACKING.adsId)) {
    gtagTarget("event", GA_NAME[name], {
      ...(p.value !== undefined && { value: p.value }),
      ...(p.currency && { currency: p.currency }),
      ...(p.items && { items: p.items }),
      ...(p.transactionId && { transaction_id: p.transactionId }),
    });
    if (name === "Purchase" && TRACKING.adsId && TRACKING.adsPurchaseLabel) {
      gtagTarget("event", "conversion", {
        send_to: `${TRACKING.adsId}/${TRACKING.adsPurchaseLabel}`,
        ...(p.value !== undefined && { value: p.value }),
        currency: p.currency ?? "BRL",
        ...(p.transactionId && { transaction_id: p.transactionId }),
      });
    }
  }
}

/** Envia o evento às plataformas, mas só para quem aceitou. */
export function trackEvent(name: TrackName, params: TrackParams = {}) {
  if (typeof window === "undefined" || readConsent() !== "granted") return;
  if (!platformsReady(window as Win)) {
    queue.push([name, params]);
    return;
  }
  dispatch(name, params);
}

/** Chamado quando os scripts terminam de iniciar: despacha o que ficou na fila. */
export function flushTrackingQueue() {
  if (typeof window === "undefined" || readConsent() !== "granted") {
    queue.length = 0;
    return;
  }
  if (!platformsReady(window as Win)) return;
  for (let next = queue.shift(); next; next = queue.shift()) {
    dispatch(...next);
  }
}

/** Compra já enviada por este navegador (evita repetir ao recarregar a página). */
export function markPurchaseSent(orderId: string): boolean {
  const key = `cc_purchase_${orderId}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch {
    // sem armazenamento: o GA4/Ads descartam por transaction_id e a Meta por event_id
  }
  return true;
}

export function revokeTracking() {
  const w = window as Win;
  w.fbq?.("consent", "revoke");
  w.gtag?.("consent", "update", {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
