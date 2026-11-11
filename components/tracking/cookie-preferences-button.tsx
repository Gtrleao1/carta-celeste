"use client";

import { trackingEnabled } from "@/lib/tracking/config";
import { clearConsent } from "@/lib/tracking/consent";

/** Link do rodapé para rever a escolha de cookies. Some se não há o que escolher. */
export function CookiePreferencesButton() {
  if (!trackingEnabled) return null;
  return (
    <button type="button" onClick={clearConsent} className="hover:underline">
      Preferências de cookies
    </button>
  );
}
