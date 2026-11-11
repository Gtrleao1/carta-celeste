import { describe, expect, it, vi } from "vitest";

import {
  buildGa4Purchase,
  buildMetaPurchase,
  sendPurchase,
  sha256,
  type PurchaseDeps,
  type PurchaseOrder,
} from "./purchase";

const ID = "6f0c2b0e-3b0a-4f6e-9a55-0a1f5a1c2d3e";
const NOW = Date.parse("2026-11-11T15:00:00Z");

const order = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  id: ID,
  status: "paid",
  amountCents: 4900,
  productId: "prod-1",
  productName: "Mapa Astral Completo",
  userId: "user-1",
  email: "  Cliente@Exemplo.com ",
  paidAt: "2026-11-11T14:59:00Z",
  purchaseTrackedAt: null,
  tracking: {
    consent: true,
    fbp: "fb.1.1.1",
    fbc: "fb.1.1.abc",
    gclid: "g",
    gaClientId: "111.222",
    clientIp: "177.1.2.3",
    userAgent: "UA",
  },
  ...over,
});

function makeDeps(
  o: PurchaseOrder | null,
  over: Partial<PurchaseDeps> = {},
): PurchaseDeps {
  return {
    load: vi.fn(async () => o),
    claim: vi.fn(async () => true),
    release: vi.fn(async () => {}),
    log: vi.fn(async () => {}),
    sendMeta: vi.fn(async () => ({ ok: true, detail: "http_200" })),
    sendGa4: vi.fn(async () => ({ ok: true, detail: "http_204" })),
    enabled: { meta: true, ga4: true },
    siteUrl: "https://loja.test",
    now: () => NOW,
    ...over,
  };
}

describe("buildMetaPurchase", () => {
  const body = buildMetaPurchase(order(), "https://loja.test", NOW);
  const event = body.data[0];

  it("usa o id do evento do navegador (`pedido:Purchase`) para a Meta juntar os dois", () => {
    expect(event.event_id).toBe(`${ID}:Purchase`);
    expect(event.event_name).toBe("Purchase");
    expect(event.action_source).toBe("website");
  });

  it("manda valor em reais, moeda e produto", () => {
    expect(event.custom_data).toMatchObject({
      currency: "BRL",
      value: 49,
      content_ids: ["prod-1"],
      order_id: ID,
    });
    expect(event.event_time).toBe(
      Math.floor(Date.parse("2026-11-11T14:59:00Z") / 1000),
    );
  });

  it("e-mail vai só em hash SHA-256, normalizado (minúsculas, sem espaços)", () => {
    expect(event.user_data.em).toEqual([sha256("cliente@exemplo.com")]);
    expect(JSON.stringify(body)).not.toMatch(/cliente@exemplo/i);
  });

  it("inclui os identificadores de atribuição", () => {
    expect(event.user_data).toMatchObject({
      fbp: "fb.1.1.1",
      fbc: "fb.1.1.abc",
      client_ip_address: "177.1.2.3",
      client_user_agent: "UA",
    });
  });

  it("test_event_code só aparece quando configurado", () => {
    expect("test_event_code" in body).toBe(false);
    expect(
      buildMetaPurchase(order(), "https://loja.test", NOW, "TEST123"),
    ).toMatchObject({ test_event_code: "TEST123" });
  });
});

describe("buildGa4Purchase", () => {
  it("usa o número do pedido como transaction_id e o client id do cookie _ga", () => {
    const body = buildGa4Purchase(order());
    expect(body.client_id).toBe("111.222");
    expect(body.events[0]).toMatchObject({
      name: "purchase",
      params: { transaction_id: ID, value: 49, currency: "BRL" },
    });
  });

  it("sem cookie do GA, gera um client id estável por pedido", () => {
    const o = order({ tracking: { ...order().tracking!, gaClientId: null } });
    expect(buildGa4Purchase(o).client_id).toBe(buildGa4Purchase(o).client_id);
  });
});

describe("não vaza dados pessoais", () => {
  it("nenhum payload carrega nome, nascimento, CPF ou texto do mapa", () => {
    const all = JSON.stringify([
      buildMetaPurchase(order(), "https://loja.test", NOW),
      buildGa4Purchase(order()),
    ]);
    expect(all).not.toMatch(/birth|nasc|cpf|document|full_name|sections/i);
  });
});

describe("sendPurchase", () => {
  it("pedido pago, com consentimento: envia a Meta e ao GA4, marca e registra", async () => {
    const deps = makeDeps(order());
    const r = await sendPurchase(ID, deps);
    expect(r).toEqual({ action: "sent", platforms: ["meta", "ga4"] });
    expect(deps.claim).toHaveBeenCalledWith(ID);
    expect(deps.log).toHaveBeenCalledTimes(2);
    expect(deps.release).not.toHaveBeenCalled();
  });

  it("sem consentimento, não envia nada e registra o motivo", async () => {
    const deps = makeDeps(
      order({ tracking: { ...order().tracking!, consent: false } }),
    );
    expect(await sendPurchase(ID, deps)).toEqual({
      action: "skipped",
      reason: "sem_consentimento",
    });
    expect(deps.sendMeta).not.toHaveBeenCalled();
    expect(deps.sendGa4).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({
        status: "skipped",
        detail: "sem_consentimento",
      }),
    );
  });

  it("sem registro de atribuição, também conta como sem consentimento", async () => {
    const deps = makeDeps(order({ tracking: null }));
    expect(await sendPurchase(ID, deps)).toMatchObject({
      action: "skipped",
      reason: "sem_consentimento",
    });
  });

  it("não envia de novo uma compra já enviada", async () => {
    const deps = makeDeps(order({ purchaseTrackedAt: "2026-11-11T15:00:00Z" }));
    expect(await sendPurchase(ID, deps)).toMatchObject({
      reason: "ja_enviado",
    });
    expect(deps.sendMeta).not.toHaveBeenCalled();
  });

  it("duas chamadas simultâneas: só quem ganha a marca envia", async () => {
    const deps = makeDeps(order(), { claim: vi.fn(async () => false) });
    expect(await sendPurchase(ID, deps)).toMatchObject({
      reason: "ja_enviado",
    });
    expect(deps.sendMeta).not.toHaveBeenCalled();
  });

  it("pedido pendente ou reembolsado não é compra", async () => {
    for (const status of ["pending", "cancelled", "refunded"]) {
      const deps = makeDeps(order({ status }));
      expect(await sendPurchase(ID, deps)).toMatchObject({
        reason: "pedido_nao_pago",
      });
      expect(deps.sendMeta).not.toHaveBeenCalled();
    }
  });

  it("sem nenhuma plataforma configurada, não faz nada", async () => {
    const deps = makeDeps(order(), { enabled: { meta: false, ga4: false } });
    expect(await sendPurchase(ID, deps)).toMatchObject({
      reason: "sem_plataforma",
    });
    expect(deps.load).not.toHaveBeenCalled();
  });

  it("só a plataforma configurada recebe", async () => {
    const deps = makeDeps(order(), { enabled: { meta: true, ga4: false } });
    expect(await sendPurchase(ID, deps)).toEqual({
      action: "sent",
      platforms: ["meta"],
    });
    expect(deps.sendGa4).not.toHaveBeenCalled();
  });

  it("se uma plataforma falha, a outra segue e a marca permanece", async () => {
    const deps = makeDeps(order(), {
      sendMeta: vi.fn(async () => ({ ok: false, detail: "http_500" })),
    });
    expect(await sendPurchase(ID, deps)).toEqual({
      action: "sent",
      platforms: ["ga4"],
    });
    expect(deps.release).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ platform: "meta", status: "error" }),
    );
  });

  it("se todas falham (ou lançam erro), libera a marca para reenviar depois", async () => {
    const deps = makeDeps(order(), {
      sendMeta: vi.fn(async () => {
        throw new Error("rede");
      }),
      sendGa4: vi.fn(async () => ({ ok: false, detail: "http_503" })),
    });
    expect(await sendPurchase(ID, deps)).toEqual({
      action: "sent",
      platforms: [],
    });
    expect(deps.release).toHaveBeenCalledWith(ID);
  });
});
