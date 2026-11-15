/**
 * Cabeçalhos de segurança do site (usados por `next.config.ts`).
 *
 * Duas camadas de CSP:
 * - **Imposta** (`ENFORCED_CSP`): só as regras que não dependem de listar
 *   origens (bloqueia enquadramento do site, plugins, troca de `<base>` e envio
 *   de formulário para fora). Não pode quebrar pagamento nem rastreamento.
 * - **Em relatório** (`reportOnlyCsp`): a política completa de origens
 *   (Mercado Pago, Meta, Google, Supabase). Só registra violações em
 *   `/api/csp-report`; depois de uma semana sem violações legítimas, passa a
 *   ser imposta (ver `PENDENCIAS.md`).
 *
 * Sem *nonce* de propósito: nonce obriga renderização dinâmica em todas as
 * páginas, o que desliga o cache estático e pesa no desempenho e no custo. Por
 * isso `script-src` aceita `'unsafe-inline'` (o Next e nossos scripts curtos
 * são inline); o ganho do CSP aqui é fechar origens e enquadramento.
 */

export const CSP_REPORT_PATH = "/api/csp-report";

/** Regras que valem sem listar origens: impostas desde já. */
export const ENFORCED_CSP = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

// Mercado Pago (SDK, Payment Brick, antifraude), Meta e Google (só depois do consentimento).
const MERCADO_PAGO = [
  "https://*.mercadopago.com",
  "https://*.mercadopago.com.br",
  "https://*.mercadolibre.com",
  "https://*.mercadolivre.com.br",
  "https://*.mlstatic.com",
];
const META = ["https://connect.facebook.net", "https://www.facebook.com"];
const GOOGLE = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.doubleclick.net",
  "https://www.googleadservices.com",
  "https://www.google.com",
];

/** Política completa de origens, para o modo de relatório. */
export function reportOnlyCsp({
  supabaseHost,
  isDev = false,
}: {
  /** Host do projeto Supabase (imagens do blog no Storage). */
  supabaseHost?: string | null;
  isDev?: boolean;
}) {
  const supabase = supabaseHost ? [`https://${supabaseHost}`] : [];
  const list = (...groups: string[][]) => groups.flat().join(" ");

  return [
    "default-src 'self'",
    // 'unsafe-inline': ver o comentário do topo. 'unsafe-eval' só no desenvolvimento (React).
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${list(MERCADO_PAGO, META, GOOGLE)}`,
    `style-src 'self' 'unsafe-inline' ${list(MERCADO_PAGO)}`,
    `img-src 'self' data: blob: ${list(MERCADO_PAGO, META, GOOGLE, supabase)}`,
    `font-src 'self' data: ${list(MERCADO_PAGO)}`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""} ${list(MERCADO_PAGO, META, GOOGLE, supabase)}`,
    `frame-src 'self' ${list(MERCADO_PAGO, META, GOOGLE)}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Sem `upgrade-insecure-requests`: não vale em modo de relatório (o navegador
    // reclama) e o HSTS já força https.
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ");
}

/** Permissões do navegador que o site nunca usa ficam desligadas. */
export const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "usb=()",
  "interest-cohort=()",
  "browsing-topics=()",
].join(", ");

export type Header = { key: string; value: string };

/** Cabeçalhos para todas as rotas. */
export function securityHeaders(opts: {
  supabaseHost?: string | null;
  isDev?: boolean;
}): Header[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    // Redundante com frame-ancestors, mas cobre navegadores antigos.
    { key: "X-Frame-Options", value: "DENY" },
    // Mantém janelas abertas por nós (3DS do banco) funcionando.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Content-Security-Policy", value: ENFORCED_CSP },
    // Em desenvolvimento não há relatório: o HMR e o React usam recursos que o CSP barra.
    ...(opts.isDev
      ? []
      : [
          {
            key: "Content-Security-Policy-Report-Only",
            value: reportOnlyCsp(opts),
          },
        ]),
  ];
}
