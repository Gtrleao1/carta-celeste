/**
 * Consentimento para medição e anúncios (LGPD). Fica num cookie próprio para
 * que o servidor também o enxergue: a API de Conversões só recebe dados de quem
 * aceitou. Nada é carregado nem enviado às plataformas sem "granted".
 */
export const CONSENT_COOKIE = "cc_consent";
export const CONSENT_EVENT = "cc:consent";
const SIX_MONTHS = 60 * 60 * 24 * 180;

export type Consent = "granted" | "denied" | null;

export function parseConsent(cookieHeader: string | null | undefined): Consent {
  const match = cookieHeader?.match(
    new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(granted|denied)(?:;|$)`),
  );
  return (match?.[1] as Consent) ?? null;
}

export function readConsent(): Consent {
  if (typeof document === "undefined") return null;
  return parseConsent(document.cookie);
}

function emit() {
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function writeConsent(value: "granted" | "denied") {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${SIX_MONTHS}; Path=/; SameSite=Lax${secure}`;
  emit();
}

/** Volta a perguntar (link "Preferências de cookies"). */
export function clearConsent() {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  emit();
}

export function subscribeConsent(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}
