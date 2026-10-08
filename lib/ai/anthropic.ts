import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  WriteError,
  type SectionWriter,
  type WriteRequest,
  type WriteResult,
} from "./types";

/** Converte erros da SDK em categorias seguras (sem expor mensagens internas). */
export function classifyError(error: unknown): WriteError {
  if (error instanceof WriteError) return error;
  if (error instanceof Anthropic.APIUserAbortError) {
    return new WriteError("tempo_esgotado");
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new WriteError("tempo_esgotado");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new WriteError("limite_de_uso");
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new WriteError("autenticacao");
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    // 529 = sobrecarga da API; 5xx = indisponibilidade temporária.
    if (status === 529 || status >= 500) return new WriteError("indisponivel");
    return new WriteError("desconhecido", `HTTP ${status}`);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new WriteError("indisponivel");
  }
  return new WriteError("desconhecido");
}

/**
 * Escritor de seções com a API da Anthropic (modelo em ANTHROPIC_MODEL).
 *
 * Decisões (Claude Sonnet 5.5):
 *  - `thinking: between_tools` desliga o pensamento: o texto é corrido, e
 *    `disabled` retorna 400 neste modelo. Menos tokens e mais rápido.
 *  - `effort: medium` equilibra qualidade e custo para prosa.
 *  - `fallbacks: "default"` (beta): se o modelo recusar por política, a API
 *    refaz a chamada num modelo de reserva. Só entra em ação (e só cobra) numa recusa.
 *  - Sem temperature/top_p (valores não padrão dão 400 neste modelo) e sem prefill.
 */
export function createAnthropicWriter(
  options: { apiKey?: string; model?: string } = {},
): SectionWriter {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const model = options.model ?? process.env.ANTHROPIC_MODEL;
  if (!apiKey)
    throw new WriteError("autenticacao", "ANTHROPIC_API_KEY ausente");
  if (!model) throw new WriteError("desconhecido", "ANTHROPIC_MODEL ausente");

  // As tentativas do job já são contadas por seção; a SDK refaz só falhas de rede/429/5xx.
  const client = new Anthropic({ apiKey, maxRetries: 2 });

  return {
    async write(req: WriteRequest): Promise<WriteResult> {
      try {
        const response = await client.beta.messages.create(
          {
            model,
            max_tokens: req.maxTokens,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            thinking: { type: "between_tools" },
            output_config: { effort: "medium" },
            system: req.system,
            messages: [{ role: "user", content: req.prompt }],
          } as Anthropic.Beta.MessageCreateParamsNonStreaming,
          { timeout: req.timeoutMs },
        );

        if (response.stop_reason === "refusal") throw new WriteError("recusa");
        if (response.stop_reason === "max_tokens") {
          throw new WriteError("texto_cortado");
        }

        const text = response.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("")
          .trim();

        return {
          text,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch (error) {
        throw classifyError(error);
      }
    },
  };
}
