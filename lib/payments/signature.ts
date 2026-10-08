import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validação do cabeçalho `x-signature` dos webhooks do Mercado Pago.
 *
 * Formato do cabeçalho: `ts=<timestamp>,v1=<hash>`.
 * Manifesto assinado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * (o par cujo valor não veio na notificação é omitido do manifesto).
 * Assinatura: HMAC-SHA256 do manifesto, em hexadecimal, com a chave secreta
 * do webhook (Suas integrações > Webhooks > Configurar notificações).
 *
 * Referência: documentação oficial de notificações do Mercado Pago.
 */
export type SignatureInput = {
  /** Valor do cabeçalho `x-signature`. */
  signatureHeader: string | null;
  /** Valor do cabeçalho `x-request-id`. */
  requestId: string | null;
  /** Valor do parâmetro de URL `data.id`. */
  dataId: string | null;
  /** Chave secreta do webhook. */
  secret: string | undefined;
};

function parseSignatureHeader(header: string) {
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const [key, ...rest] = piece.split("=");
    if (key && rest.length) parts[key.trim()] = rest.join("=").trim();
  }
  return { ts: parts.ts, v1: parts.v1 };
}

/**
 * Dados NÃO secretos da assinatura, para diagnosticar recusas no log: o ts, o
 * começo do hash enviado pelo Mercado Pago (12 de 64 caracteres) e se o
 * cabeçalho tem o formato esperado. Nunca inclui o segredo.
 */
export function describeSignature(header: string | null) {
  if (!header) return { ts: null, v1Prefix: null, wellFormed: false };
  const { ts, v1 } = parseSignatureHeader(header);
  return {
    ts: ts ?? null,
    v1Prefix: v1 ? v1.slice(0, 12) : null,
    wellFormed: Boolean(ts && v1 && /^[0-9a-f]{64}$/i.test(v1)),
  };
}

export function buildManifest(
  dataId: string | null,
  requestId: string | null,
  ts: string,
) {
  let manifest = "";
  // O Mercado Pago assina IDs alfanuméricos em minúsculas.
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

export function verifyWebhookSignature({
  signatureHeader,
  requestId,
  dataId,
  secret,
}: SignatureInput): boolean {
  // Sem segredo configurado, nada é considerado válido (falha fechada).
  if (!secret || !signatureHeader) return false;

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return false;

  const expected = createHmac("sha256", secret)
    .update(buildManifest(dataId, requestId, ts))
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  // timingSafeEqual exige o mesmo tamanho; tamanhos diferentes já são inválidos.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Gera um cabeçalho x-signature válido. Usado nos testes e em simulações locais. */
export function signWebhook(
  secret: string,
  dataId: string,
  requestId: string,
  ts = String(Date.now()),
) {
  const v1 = createHmac("sha256", secret)
    .update(buildManifest(dataId, requestId, ts))
    .digest("hex");
  return `ts=${ts},v1=${v1}`;
}
