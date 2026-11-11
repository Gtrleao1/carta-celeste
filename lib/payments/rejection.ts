/**
 * Mensagem em português para o motivo da recusa (`status_detail` do Mercado
 * Pago). Não revela detalhes de antifraude: nesses casos, a orientação é
 * genérica.
 */
const MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount:
    "O cartão não tem limite ou saldo suficiente. Tente outro cartão ou outra forma de pagamento.",
  cc_rejected_bad_filled_card_number:
    "O número do cartão parece incorreto. Confira e tente de novo.",
  cc_rejected_bad_filled_date:
    "A data de validade do cartão parece incorreta. Confira e tente de novo.",
  cc_rejected_bad_filled_security_code:
    "O código de segurança do cartão parece incorreto. Confira e tente de novo.",
  cc_rejected_bad_filled_other:
    "Algum dado do cartão parece incorreto. Confira e tente de novo.",
  cc_rejected_call_for_authorize:
    "O banco pede que você autorize este pagamento. Ligue para o banco ou use outro cartão.",
  cc_rejected_card_disabled:
    "O cartão está desativado. Ative-o com o banco ou use outro cartão.",
  cc_rejected_duplicated_payment:
    "Você já fez um pagamento igual a este. Veja se ele foi aprovado antes de tentar de novo.",
  cc_rejected_invalid_installments:
    "Este cartão não aceita o número de parcelas escolhido. Escolha outro número de parcelas.",
  cc_rejected_max_attempts:
    "Você atingiu o limite de tentativas com este cartão. Use outro cartão ou outra forma de pagamento.",
};

const GENERIC =
  "O pagamento não foi aprovado. Tente outro cartão ou outra forma de pagamento.";

export function rejectionMessage(statusDetail: string | null): string {
  if (!statusDetail) return GENERIC;
  return MESSAGES[statusDetail] ?? GENERIC;
}
