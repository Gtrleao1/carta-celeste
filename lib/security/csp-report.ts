/**
 * Relatórios de violação do CSP. O navegador manda o que bloqueou (ou, em modo
 * de relatório, o que bloquearia); aqui só extraímos o necessário para ajustar a
 * política, **sem dado pessoal**: do endereço visitado guardamos só o caminho
 * (sem `?` nem `#`, que podem ter tokens) e do recurso bloqueado só o host.
 */

export type CspViolation = {
  directive: string;
  /** Host do recurso bloqueado, ou `inline`, `eval`, `data`, `blob`. */
  blocked: string;
  /** Caminho da página (sem query nem fragmento). */
  page: string;
};

/** Tira caracteres de controle (evita quebrar/forjar linhas de log) e limita o tamanho. */
const clean = (value: unknown, max = 120) =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max)
    : "";

function blockedLabel(raw: unknown): string {
  const value = clean(raw, 300);
  if (!value) return "desconhecido";
  if (value === "inline" || value === "eval" || value === "data") return value;
  if (value.startsWith("data:")) return "data";
  if (value.startsWith("blob:")) return "blob";
  try {
    return clean(new URL(value).host) || "desconhecido";
  } catch {
    return clean(value, 40);
  }
}

function pageLabel(raw: unknown): string {
  try {
    return clean(new URL(clean(raw, 400)).pathname, 100) || "/";
  } catch {
    return "/";
  }
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

function fromBody(body: Record<string, unknown>): CspViolation | null {
  const directive = clean(
    body["effective-directive"] ??
      body.effectiveDirective ??
      body["violated-directive"] ??
      body.violatedDirective,
    60,
  );
  if (!directive) return null;
  return {
    directive: directive.split(" ")[0],
    blocked: blockedLabel(body["blocked-uri"] ?? body.blockedURL),
    page: pageLabel(body["document-uri"] ?? body.documentURL),
  };
}

/**
 * Aceita os dois formatos: o antigo (`{ "csp-report": {...} }`, `report-uri`) e
 * o da Reporting API (lista de `{ type: "csp-violation", body: {...} }`).
 * Devolve até 5 violações por envio.
 */
export function parseCspReports(payload: unknown): CspViolation[] {
  const items = Array.isArray(payload) ? payload : [payload];
  const out: CspViolation[] = [];
  for (const item of items.slice(0, 5)) {
    const obj = asRecord(item);
    if (!obj) continue;
    const body = asRecord(obj["csp-report"]) ?? asRecord(obj.body);
    const violation = body ? fromBody(body) : null;
    if (violation) out.push(violation);
  }
  return out;
}
