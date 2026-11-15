import { SITE } from "@/lib/site-config";

/**
 * Canal para quem encontrar uma falha de segurança (RFC 9116). Só existe depois
 * que o e-mail de contato é definido em `lib/site-config.ts`; sem ele, 404
 * (melhor nada do que um endereço errado).
 */
export function GET(request: Request) {
  if (!SITE.contactEmail) return new Response("Not found", { status: 404 });

  const origin = new URL(request.url).origin;
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const body = [
    `Contact: mailto:${SITE.contactEmail}`,
    `Expires: ${expires}`,
    "Preferred-Languages: pt, en",
    `Canonical: ${origin}/.well-known/security.txt`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
