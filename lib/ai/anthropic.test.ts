import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { classifyError } from "./anthropic";

const apiError = (status: number, message: string) =>
  Anthropic.APIError.generate(
    status,
    { type: "error", error: { type: "invalid_request_error", message } },
    message,
    new Headers(),
  );

describe("classifyError", () => {
  it("saldo esgotado (400) vira sem_credito, para o job pausar em vez de falhar", () => {
    const e = classifyError(
      apiError(
        400,
        "Your credit balance is too low to access the Anthropic API.",
      ),
    );
    expect(e.kind).toBe("sem_credito");
  });

  it("outro 400 continua desconhecido (e não vaza a mensagem bruta)", () => {
    const e = classifyError(apiError(400, "max_tokens inválido"));
    expect(e.kind).toBe("desconhecido");
    expect(e.kind).not.toBe("sem_credito");
  });

  it("chave recusada vira autenticacao; 429, limite_de_uso; 5xx, indisponivel", () => {
    expect(classifyError(apiError(401, "invalid x-api-key")).kind).toBe(
      "autenticacao",
    );
    expect(classifyError(apiError(429, "rate limit")).kind).toBe(
      "limite_de_uso",
    );
    expect(classifyError(apiError(529, "overloaded")).kind).toBe(
      "indisponivel",
    );
  });
});
