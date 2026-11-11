import { describe, expect, it } from "vitest";

import { readAttribution } from "./capture";
import { parseConsent } from "./consent";

const headers = (cookie: string, extra: Record<string, string> = {}) =>
  new Headers({ cookie, "user-agent": "Mozilla/5.0 Teste", ...extra });

describe("parseConsent", () => {
  it("lê granted e denied; qualquer outra coisa é 'sem resposta'", () => {
    expect(parseConsent("a=1; cc_consent=granted; b=2")).toBe("granted");
    expect(parseConsent("cc_consent=denied")).toBe("denied");
    expect(parseConsent("cc_consent=talvez")).toBeNull();
    expect(parseConsent("xcc_consent=granted")).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });
});

describe("readAttribution", () => {
  const cookies = [
    "cc_consent=granted",
    "_fbp=fb.1.1700000000000.1234567890",
    "_fbc=fb.1.1700000000000.AbCdEf-123",
    "_ga=GA1.1.123456789.1700000000",
    "_gcl_aw=GCL.1700000000.Cj0KCQ-teste_123456",
  ].join("; ");

  it("com consentimento, extrai fbp, fbc, gclid, client id do GA, IP e navegador", () => {
    const a = readAttribution(
      headers(cookies, { "x-forwarded-for": "177.10.20.30, 10.0.0.1" }),
    );
    expect(a).toEqual({
      consent: true,
      fbp: "fb.1.1700000000000.1234567890",
      fbc: "fb.1.1700000000000.AbCdEf-123",
      gclid: "Cj0KCQ-teste_123456",
      gaClientId: "123456789.1700000000",
      clientIp: "177.10.20.30",
      userAgent: "Mozilla/5.0 Teste",
    });
  });

  it("sem consentimento, não guarda nada além da recusa", () => {
    const a = readAttribution(
      headers(cookies.replace("granted", "denied"), {
        "x-forwarded-for": "177.10.20.30",
      }),
    );
    expect(a).toEqual({
      consent: false,
      fbp: null,
      fbc: null,
      gclid: null,
      gaClientId: null,
      clientIp: null,
      userAgent: null,
    });
  });

  it("sem resposta de cookies também não guarda", () => {
    expect(readAttribution(headers("_fbp=fb.1.1700000000000.1")).consent).toBe(
      false,
    );
  });

  it("descarta valores fora do formato esperado (cookie adulterado)", () => {
    const a = readAttribution(
      headers(
        "cc_consent=granted; _fbp=<script>; _fbc=x; _ga=lixo; _gcl_aw=GCL.1.a b",
        { "x-forwarded-for": "não-é-ip" },
      ),
    );
    expect(a).toMatchObject({
      consent: true,
      fbp: null,
      fbc: null,
      gclid: null,
      gaClientId: null,
      clientIp: null,
    });
  });
});
