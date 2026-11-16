/**
 * Endereço público do site, a partir de `NEXT_PUBLIC_SITE_URL`, sempre só a
 * origem (`https://www.exemplo.com.br`): sem barra no final, sem caminho. Assim
 * `https://www.exemplo.com.br/` (com barra) e um valor com espaço sobrando não
 * geram endereços com `//` nem links quebrados. Sem módulo `server-only` de
 * propósito: é usado em páginas, no sitemap e no `robots`.
 */
export function normalizeSiteUrl(
  raw: string | null | undefined,
): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

const DEV_URL = "http://localhost:3000";

/** O endereço do site para páginas estáticas; em desenvolvimento, `localhost:3000`. */
export const SITE_URL =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? DEV_URL;
