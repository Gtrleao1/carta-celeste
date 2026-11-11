"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  flushTrackingQueue,
  revokeTracking,
  trackEvent,
} from "@/lib/tracking/browser";
import { TRACKING, trackingEnabled } from "@/lib/tracking/config";
import {
  readConsent,
  subscribeConsent,
  writeConsent,
  type Consent,
} from "@/lib/tracking/consent";

const useConsent = (): Consent =>
  useSyncExternalStore(subscribeConsent, readConsent, () => null);

/** Trecho que cria `fbq` e carrega o Pixel da Meta (padrão oficial). */
const pixelScript = (id: string) => `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${JSON.stringify(id)});`;

/** Trecho que cria `gtag` já com o consentimento dado (Consent Mode v2). */
const gtagScript = (ids: string[]) => `
window.dataLayer=window.dataLayer||[];
window.gtag=function(){window.dataLayer.push(arguments)};
gtag('consent','default',{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});
gtag('js',new Date());
${ids.map((id) => `gtag('config',${JSON.stringify(id)}${id === TRACKING.ga4Id ? ",{send_page_view:false}" : ""});`).join("\n")}`;

/**
 * Banner de cookies e, só depois do "aceito", os scripts do Pixel da Meta e do
 * Google (GA4 e Ads). Sem nenhuma plataforma configurada, não renderiza nada.
 */
export function TrackingRoot() {
  const consent = useConsent();
  const pathname = usePathname();

  // Uma visualização de página por rota (o App Router não recarrega a página).
  useEffect(() => {
    if (consent === "granted") trackEvent("PageView");
  }, [consent, pathname]);

  useEffect(() => {
    if (consent === "denied") revokeTracking();
  }, [consent]);

  if (!trackingEnabled) return null;

  const googleIds = [TRACKING.ga4Id, TRACKING.adsId].filter(
    (id): id is string => Boolean(id),
  );

  return (
    <>
      {consent === "granted" && (
        <>
          {TRACKING.metaPixelId && (
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              onReady={flushTrackingQueue}
            >
              {pixelScript(TRACKING.metaPixelId)}
            </Script>
          )}
          {googleIds.length > 0 && (
            <>
              <Script
                id="gtag-loader"
                src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleIds[0])}`}
                strategy="afterInteractive"
              />
              <Script
                id="gtag-init"
                strategy="afterInteractive"
                onReady={flushTrackingQueue}
              >
                {gtagScript(googleIds)}
              </Script>
            </>
          )}
        </>
      )}

      {consent === null && <ConsentBanner />}
    </>
  );
}

function ConsentBanner() {
  return (
    <section
      aria-label="Aviso de cookies"
      className="bg-card border-border no-print fixed inset-x-0 bottom-0 z-50 border-t px-4 py-4 shadow-lg"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed sm:max-w-3xl">
          Usamos cookies para medir como o site é usado e para saber se os
          nossos anúncios funcionam. Isso envia dados de navegação e da compra
          (sem o seu nome, a sua data de nascimento ou o conteúdo do mapa) à
          Meta e ao Google. Você escolhe, e pode mudar depois. Veja a{" "}
          <a href="/privacidade" className="underline underline-offset-4">
            Política de Privacidade
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 text-base"
            onClick={() => writeConsent("denied")}
          >
            Recusar
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-11 text-base"
            onClick={() => writeConsent("granted")}
          >
            Aceitar
          </Button>
        </div>
      </div>
    </section>
  );
}
