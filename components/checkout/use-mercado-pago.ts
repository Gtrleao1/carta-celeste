"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";
import { useSyncExternalStore } from "react";

let initializedWith: string | null = null;

const subscribe = () => () => {};

/**
 * Inicia o SDK do Mercado Pago no navegador (uma vez por chave) e diz quando já
 * dá para desenhar os Bricks. No servidor devolve `false`: o SDK mexe em `window`.
 */
export function useMercadoPago(publicKey: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (initializedWith !== publicKey) {
        initMercadoPago(publicKey, { locale: "pt-BR" });
        initializedWith = publicKey;
      }
      return true;
    },
    () => false,
  );
}
