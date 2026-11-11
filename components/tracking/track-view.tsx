"use client";

import { useEffect } from "react";

import { markPurchaseSent, trackEvent } from "@/lib/tracking/browser";

type Item = { item_id: string; item_name: string; price: number };

/** Avisa as plataformas que a pessoa viu a página de um mapa (ViewContent). */
export function TrackViewContent({
  value,
  item,
}: {
  value: number;
  item: Item;
}) {
  useEffect(() => {
    trackEvent("ViewContent", { value, currency: "BRL", items: [item] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, item.item_id]);
  return null;
}

/**
 * Compra confirmada, vista pelo navegador. O `eventId` é o mesmo do envio pelo
 * servidor (`{pedido}:Purchase`): a Meta junta os dois e conta uma venda só. O
 * GA4 e o Google Ads fazem o mesmo pelo número do pedido.
 */
export function TrackPurchase({
  orderId,
  value,
  item,
}: {
  orderId: string;
  value: number;
  item: Item;
}) {
  useEffect(() => {
    if (!markPurchaseSent(orderId)) return;
    trackEvent("Purchase", {
      value,
      currency: "BRL",
      items: [item],
      eventId: `${orderId}:Purchase`,
      transactionId: orderId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  return null;
}
