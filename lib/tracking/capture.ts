import { parseConsent } from "./consent";

/**
 * Dados de atribuição que o navegador já manda sozinho nos cookies da Meta e do
 * Google. O servidor guarda uma cópia por pedido para poder avisar as
 * plataformas depois (webhook, sem o navegador por perto). Só guarda se a
 * pessoa aceitou os cookies.
 */
export type Attribution = {
  consent: boolean;
  fbp: string | null;
  fbc: string | null;
  gclid: string | null;
  gaClientId: string | null;
  clientIp: string | null;
  userAgent: string | null;
};

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const FBP = /^fb\.\d\.\d{10,14}\.\d{1,20}$/;
const FBC = /^fb\.\d\.\d{10,14}\.[\w-]{1,200}$/;
const GCLID = /^[\w-]{10,200}$/;
const GA_CLIENT = /^\d{1,12}\.\d{1,12}$/;

const ok = (value: string | undefined, re: RegExp) =>
  value && re.test(value) ? value : null;

/** Primeiro IP de `x-forwarded-for` (o cliente, atrás do proxy da Vercel). */
function clientIp(headers: Headers): string | null {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!first || first.length > 45) return null;
  return /^[\da-fA-F:.]+$/.test(first) ? first : null;
}

export function readAttribution(headers: Headers): Attribution {
  const cookieHeader = headers.get("cookie");
  const consent = parseConsent(cookieHeader) === "granted";
  if (!consent) {
    return {
      consent: false,
      fbp: null,
      fbc: null,
      gclid: null,
      gaClientId: null,
      clientIp: null,
      userAgent: null,
    };
  }

  const c = parseCookies(cookieHeader);
  // `_gcl_aw` = "GCL.<timestamp>.<gclid>"; `_ga` = "GA1.<n>.<id>.<timestamp>".
  const gclid = c["_gcl_aw"]?.split(".").slice(2).join(".");
  const gaClient = c["_ga"]?.split(".").slice(2).join(".");

  return {
    consent: true,
    fbp: ok(c["_fbp"], FBP),
    fbc: ok(c["_fbc"], FBC),
    gclid: ok(gclid, GCLID),
    gaClientId: ok(gaClient, GA_CLIENT),
    clientIp: clientIp(headers),
    userAgent: headers.get("user-agent")?.slice(0, 400) ?? null,
  };
}
