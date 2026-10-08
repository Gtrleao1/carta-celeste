import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  buildManifest,
  describeSignature,
  signWebhook,
  verifyWebhookSignature,
} from "./signature";

const SECRET = "segredo-de-teste-do-webhook";

describe("verifyWebhookSignature", () => {
  const base = { dataId: "123456789", requestId: "req-abc-1", secret: SECRET };
  const valid = signWebhook(
    SECRET,
    base.dataId,
    base.requestId,
    "1742505638683",
  );

  it("aceita uma assinatura válida", () => {
    expect(verifyWebhookSignature({ ...base, signatureHeader: valid })).toBe(
      true,
    );
  });

  it("segue o manifesto oficial: id, request-id e ts", () => {
    expect(buildManifest("123", "req-1", "999")).toBe(
      "id:123;request-id:req-1;ts:999;",
    );
    const manual = createHmac("sha256", SECRET)
      .update("id:123456789;request-id:req-abc-1;ts:1742505638683;")
      .digest("hex");
    expect(valid).toBe(`ts=1742505638683,v1=${manual}`);
  });

  it("omite do manifesto o que não veio na notificação", () => {
    expect(buildManifest(null, "req-1", "999")).toBe(
      "request-id:req-1;ts:999;",
    );
    expect(buildManifest("123", null, "999")).toBe("id:123;ts:999;");
    const header = signWebhook(SECRET, "123", "", "999");
    expect(
      verifyWebhookSignature({
        signatureHeader: header,
        dataId: "123",
        requestId: null,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("trata IDs alfanuméricos em minúsculas", () => {
    const header = signWebhook(SECRET, "ABC123", "req-1", "1");
    expect(
      verifyWebhookSignature({
        signatureHeader: header,
        dataId: "ABC123",
        requestId: "req-1",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("recusa assinatura gerada com outro segredo", () => {
    const forged = signWebhook("outro-segredo", base.dataId, base.requestId);
    expect(verifyWebhookSignature({ ...base, signatureHeader: forged })).toBe(
      false,
    );
  });

  it("recusa se o data.id ou o request-id forem alterados", () => {
    expect(
      verifyWebhookSignature({
        ...base,
        dataId: "999",
        signatureHeader: valid,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        ...base,
        requestId: "outro",
        signatureHeader: valid,
      }),
    ).toBe(false);
  });

  it("recusa se o timestamp for alterado", () => {
    const tampered = valid.replace("ts=1742505638683", "ts=1742505638684");
    expect(verifyWebhookSignature({ ...base, signatureHeader: tampered })).toBe(
      false,
    );
  });

  it("recusa cabeçalho ausente, vazio ou malformado", () => {
    for (const header of [null, "", "lixo", "ts=1", "v1=abc", "ts=,v1="]) {
      expect(verifyWebhookSignature({ ...base, signatureHeader: header })).toBe(
        false,
      );
    }
  });

  it("recusa hash de tamanho diferente sem lançar erro", () => {
    expect(
      verifyWebhookSignature({ ...base, signatureHeader: "ts=1,v1=abcd" }),
    ).toBe(false);
  });

  it("falha fechada quando o segredo não está configurado", () => {
    expect(
      verifyWebhookSignature({
        ...base,
        secret: undefined,
        signatureHeader: valid,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ ...base, secret: "", signatureHeader: valid }),
    ).toBe(false);
  });
});

describe("describeSignature", () => {
  it("expõe ts e só o começo do hash, nunca o hash inteiro nem o segredo", () => {
    const header = signWebhook(SECRET, "123", "req-1", "1742505638683");
    const d = describeSignature(header);
    expect(d.ts).toBe("1742505638683");
    expect(d.v1Prefix).toHaveLength(12);
    expect(header).toContain(d.v1Prefix!);
    expect(header.split("v1=")[1]).not.toBe(d.v1Prefix);
    expect(d.wellFormed).toBe(true);
    expect(JSON.stringify(d)).not.toContain(SECRET);
  });

  it("cabeçalho ausente ou malformado não quebra", () => {
    expect(describeSignature(null)).toEqual({
      ts: null,
      v1Prefix: null,
      wellFormed: false,
    });
    expect(describeSignature("lixo").wellFormed).toBe(false);
    expect(describeSignature("ts=1,v1=curto").wellFormed).toBe(false);
  });
});
