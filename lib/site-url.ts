import "server-only";

import { headers } from "next/headers";

import { normalizeSiteUrl } from "@/lib/site-origin";

/** URL pública do site, sem barra no final. */
export async function getSiteUrl() {
  const configured = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
