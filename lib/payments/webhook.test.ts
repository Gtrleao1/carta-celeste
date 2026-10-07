import { describe, expect, it, vi } from "vitest";

import type { NotificationResult } from "./notification";
import { signWebhook } from "./signature";
import { handleMercadoPagoWebhook } from "./webhook";

const SECRET = "segredo-de-teste-do-webhook";
const URL_BASE = "https://exemplo.test/api/webhooks/mercadopago";

const result: NotificationResult = {
  action: "paid",
  orderId: "x",
  triggerJob: true,
};

function setup(processImpl?: () => Promise<NotificationResult>) {
  const process = vi.fn(processImpl ?? (async () => result));
  const call = (init: {
    dataId?: string;
    requestId?: string;
    signature?: string | null;
    body?: unknown;
    query?: string;
    secret?: string | undefined;
  }) => {
    const dataId = init.dataId ?? "987654321";
    const requestId = init.requestId ?? "req-1";
    const headers: Record<string, string> = {
      "x-request-id": requestId,
      "content-type": "application/json",
    };
    const signature =
      init.signature === undefined
        ? signWebhook(SECRET, dataId, requestId)
        : init.signature;
    if (signature !== null) headers["x-signature"] = signature;
    const request = new Request(
      `${URL_BASE}?data.id=${dataId}${init.query ?? ""}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(
          init.body ?? {
            type: "payment",
            action: "payment.updated",
            data: { id: dataId },
          },
        ),
      },
    );
    return handleMercadoPagoWebhook(request, {
      secret: "secret" in init ? init.secret : SECRET,
      process,
    });
  };
  return { process, call };
}

describe("webhook do Mercado Pago", () => {
  it("assinatura válida: processa o pagamento e responde 200", async () => {
    const { process, call } = setup();
    const res = await call({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, action: "paid" });
    expect(process).toHaveBeenCalledExactlyOnceWith("987654321");
  });

  it("assinatura inválida: 401 e nada é processado", async () => {
    const { process, call } = setup();
    const forged = signWebhook("outro-segredo", "987654321", "req-1");
    const res = await call({ signature: forged });
    expect(res.status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it("sem cabeçalho de assinatura: 401", async () => {
    const { process, call } = setup();
    expect((await call({ signature: null })).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it("assinatura de um pagamento usada em outro: 401", async () => {
    const { process, call } = setup();
    const signatureOfAnother = signWebhook(SECRET, "111", "req-1");
    const res = await call({ dataId: "222", signature: signatureOfAnother });
    expect(res.status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it("aceita mais de um segredo (teste e produção), separados por vírgula", async () => {
    const { process: process_, call } = setup();
    const both = `outro-segredo-de-producao, ${SECRET}`;
    expect((await call({ secret: both })).status).toBe(200);
    // Assinado com o segredo "de produção", configurado em segundo lugar.
    const prod = signWebhook("outro-segredo-de-producao", "987654321", "req-1");
    expect((await call({ secret: both, signature: prod })).status).toBe(200);
    expect(process_).toHaveBeenCalledTimes(2);
    // Segredo que não está na lista continua recusado.
    const forged = signWebhook("terceiro", "987654321", "req-1");
    expect((await call({ secret: both, signature: forged })).status).toBe(401);
  });

  it("ao recusar, registra só metadados no log (nunca o segredo)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { call } = setup();
    await call({ signature: signWebhook("errado", "987654321", "req-1") });
    const line = warn.mock.calls[0]?.[0] as string;
    expect(line).toContain("assinatura recusada");
    expect(line).toContain("data.id=987654321");
    expect(line).toContain("x-signature=presente");
    expect(line).not.toContain(SECRET);
    expect(line).not.toContain("errado");
    warn.mockRestore();
  });

  it("segredo não configurado: recusa tudo", async () => {
    const { process, call } = setup();
    expect((await call({ secret: undefined })).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it("evento repetido: cada aviso passa pelo processamento (que é idempotente)", async () => {
    const calls: NotificationResult[] = [
      { action: "paid", orderId: "x", triggerJob: true },
      { action: "already_processed", orderId: "x", triggerJob: false },
    ];
    const { process, call } = setup(async () => calls.shift()!);
    expect(await (await call({})).json()).toEqual({ ok: true, action: "paid" });
    expect(await (await call({})).json()).toEqual({
      ok: true,
      action: "already_processed",
    });
    expect(process).toHaveBeenCalledTimes(2);
  });

  it("ignora eventos que não são de pagamento (com assinatura válida)", async () => {
    const { process, call } = setup();
    const res = await call({
      body: { type: "merchant_order", data: { id: "1" } },
    });
    expect(res.status).toBe(200);
    expect(process).not.toHaveBeenCalled();
  });

  it("ignora id de pagamento que não é numérico", async () => {
    const { process, call } = setup();
    const res = await call({ dataId: "abc-def" });
    expect(res.status).toBe(200);
    expect(process).not.toHaveBeenCalled();
  });

  it("corpo ilegível não derruba o webhook", async () => {
    const { call } = setup();
    const res = await call({
      body: "isto nao e um objeto",
      query: "&type=payment",
    });
    expect(res.status).toBe(200);
  });

  it("falha no processamento: 500, para o Mercado Pago tentar de novo", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { call } = setup(async () => {
      throw new Error("banco fora do ar");
    });
    const res = await call({});
    expect(res.status).toBe(500);
    err.mockRestore();
  });
});
