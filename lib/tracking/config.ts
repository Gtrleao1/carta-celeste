/**
 * Identificadores públicos das plataformas de mídia. Vazios = aquela plataforma
 * fica desligada. Os `NEXT_PUBLIC_*` vão para o navegador por desenho (são os
 * mesmos IDs que aparecem no código de qualquer site); os segredos (token da
 * API de Conversões, segredo do GA4) ficam só no servidor.
 */
export const TRACKING = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || null,
  ga4Id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || null,
  adsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || null,
  adsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || null,
} as const;

/** Há alguma plataforma configurada? Sem nenhuma, não há o que consentir. */
export const trackingEnabled = Boolean(
  TRACKING.metaPixelId || TRACKING.ga4Id || TRACKING.adsId,
);
