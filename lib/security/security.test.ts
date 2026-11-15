import { describe, expect, it } from "vitest";

import { parseCspReports } from "./csp-report";
import {
  ENFORCED_CSP,
  PERMISSIONS_POLICY,
  reportOnlyCsp,
  securityHeaders,
} from "./headers";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    }),
  );

describe("cabeçalhos de segurança", () => {
  const headers = securityHeaders({ supabaseHost: "abc.supabase.co" });
  const get = (key: string) => headers.find((h) => h.key === key)?.value;

  it("tem os cabeçalhos básicos em todas as rotas", () => {
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(get("X-Frame-Options")).toBe("DENY");
    expect(get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    expect(get("Permissions-Policy")).toBe(PERMISSIONS_POLICY);
  });

  it("desliga câmera, microfone e localização", () => {
    for (const p of ["camera=()", "microphone=()", "geolocation=()"]) {
      expect(PERMISSIONS_POLICY).toContain(p);
    }
  });

  it("a parte imposta do CSP não depende de origens e fecha o enquadramento", () => {
    const d = directives(ENFORCED_CSP);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    // nada que possa quebrar pagamento ou rastreamento
    expect(ENFORCED_CSP).not.toMatch(/script-src|connect-src|frame-src/);
    expect(get("Content-Security-Policy")).toBe(ENFORCED_CSP);
  });

  it("a política completa vai só em modo de relatório, com o endereço do relatório", () => {
    const ro = get("Content-Security-Policy-Report-Only");
    expect(ro).toBeTruthy();
    expect(ro).toContain("report-uri /api/csp-report");
  });

  it("em desenvolvimento não há relatório (HMR e React usam eval)", () => {
    const dev = securityHeaders({ isDev: true });
    expect(
      dev.some((h) => h.key === "Content-Security-Policy-Report-Only"),
    ).toBe(false);
    expect(reportOnlyCsp({ isDev: true })).toContain("'unsafe-eval'");
  });

  it("produção nunca libera eval", () => {
    expect(reportOnlyCsp({ isDev: false })).not.toContain("unsafe-eval");
  });
});

describe("política completa de origens", () => {
  const d = directives(reportOnlyCsp({ supabaseHost: "abc.supabase.co" }));

  it("começa fechada: default-src só do próprio site", () => {
    expect(d["default-src"]).toEqual(["'self'"]);
  });

  it("libera o Mercado Pago, o Meta, o Google e o Storage do Supabase", () => {
    expect(d["script-src"]).toContain("https://*.mercadopago.com");
    expect(d["script-src"]).toContain("https://connect.facebook.net");
    expect(d["script-src"]).toContain("https://www.googletagmanager.com");
    expect(d["connect-src"]).toContain("https://*.mercadopago.com");
    expect(d["img-src"]).toContain("https://abc.supabase.co");
    expect(d["frame-src"]).toContain("https://*.mercadopago.com");
  });

  it("não libera origens genéricas nem http", () => {
    const all = reportOnlyCsp({ supabaseHost: "abc.supabase.co" });
    expect(all).not.toMatch(/\s\*[\s;]/);
    expect(all).not.toContain("http://");
    expect(all).not.toContain("upgrade-insecure-requests");
  });

  it("sem Supabase configurado não inventa host", () => {
    expect(reportOnlyCsp({})).not.toContain("undefined");
    expect(reportOnlyCsp({})).not.toContain("null");
  });
});

describe("relatórios de violação", () => {
  it("lê o formato antigo (report-uri) e guarda só host e caminho", () => {
    const out = parseCspReports({
      "csp-report": {
        "document-uri": "https://site.com.br/comprar/x?token=SEGREDO#frag",
        "violated-directive": "script-src-elem",
        "effective-directive": "script-src-elem",
        "blocked-uri": "https://evil.example/a.js?uid=123",
      },
    });
    expect(out).toEqual([
      {
        directive: "script-src-elem",
        blocked: "evil.example",
        page: "/comprar/x",
      },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/SEGREDO|uid=123|frag/);
  });

  it("lê o formato da Reporting API (lista)", () => {
    const out = parseCspReports([
      {
        type: "csp-violation",
        body: {
          documentURL: "https://site.com.br/",
          effectiveDirective: "img-src",
          blockedURL: "inline",
        },
      },
    ]);
    expect(out).toEqual([
      { directive: "img-src", blocked: "inline", page: "/" },
    ]);
  });

  it("limita a 5 por envio e ignora lixo", () => {
    const many = Array.from({ length: 20 }, () => ({
      "csp-report": {
        "violated-directive": "img-src",
        "blocked-uri": "data:x",
      },
    }));
    expect(parseCspReports(many)).toHaveLength(5);
    expect(parseCspReports(null)).toEqual([]);
    expect(parseCspReports("texto")).toEqual([]);
    expect(parseCspReports([1, "a", {}])).toEqual([]);
  });

  it("remove caracteres de controle (log forjado)", () => {
    const [v] = parseCspReports({
      "csp-report": {
        "violated-directive": "img-src\n[csp] falso=1",
        "blocked-uri": "https://a.com\r\nlinha",
        "document-uri": "https://s.com/p\nq",
      },
    });
    expect(`${v.directive}${v.blocked}${v.page}`).not.toMatch(/[\r\n]/);
  });
});
