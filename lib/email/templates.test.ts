import { describe, expect, it } from "vitest";

import { paymentConfirmedEmail, reportReadyEmail } from "./templates";

describe("e-mails do pedido", () => {
  it("pagamento confirmado: em português, com link e saudação pelo primeiro nome", () => {
    const m = paymentConfirmedEmail({
      firstName: "Maria",
      productName: "Mapa Astral Completo",
      orderUrl: "https://site.test/pedido/1/retorno",
    });
    expect(m.subject).toMatch(/Pagamento confirmado/);
    expect(m.html).toContain("Olá, Maria!");
    expect(m.html).toContain("https://site.test/pedido/1/retorno");
    expect(m.text).toContain("Mapa Astral Completo");
  });

  it("sem nome, a saudação é genérica", () => {
    const m = reportReadyEmail({
      firstName: "",
      productName: "Mapa",
      reportUrl: "https://site.test/meus-mapas/1",
    });
    expect(m.html).toContain("Olá!");
    expect(m.text).toContain("https://site.test/meus-mapas/1");
  });

  it("escapa HTML vindo de dados do usuário", () => {
    const m = reportReadyEmail({
      firstName: '<script>alert("x")</script>',
      productName: "<b>Mapa</b>",
      reportUrl: 'https://site.test/"><img src=x>',
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<b>Mapa</b>");
    expect(m.html).not.toContain('"><img');
    expect(m.html).toContain("&lt;script&gt;");
  });
});
