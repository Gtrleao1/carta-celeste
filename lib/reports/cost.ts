// Preços aproximados do Claude Sonnet 5.5, em dólares por milhão de tokens.
// Servem só para acompanhar o custo médio por relatório (PRD); a fatura da
// Anthropic é a fonte oficial.
export const USD_PER_MTOK_IN = 2;
export const USD_PER_MTOK_OUT = 10;

export function estimateCostUsd(inputTokens: number, outputTokens: number) {
  return (
    (inputTokens / 1e6) * USD_PER_MTOK_IN +
    (outputTokens / 1e6) * USD_PER_MTOK_OUT
  );
}
