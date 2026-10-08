import "server-only";

import { Resend } from "resend";

import type { EmailMessage } from "./templates";

export type SendResult =
  { sent: true } | { sent: false; reason: "sem_chave" | "erro" };

/**
 * Envia um e-mail pelo Resend. Sem RESEND_API_KEY (ex.: desenvolvimento), apenas
 * registra no log e segue: e-mail nunca pode travar a geração do relatório.
 *
 * RESEND_FROM_EMAIL precisa ser de um domínio verificado no Resend; o padrão
 * (onboarding@resend.dev) só entrega para o dono da conta do Resend.
 */
export async function sendEmail(
  to: string,
  message: EmailMessage,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[e-mail] RESEND_API_KEY ausente; e-mail não enviado.");
    return { sent: false, reason: "sem_chave" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Carta Celeste <onboarding@resend.dev>";
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      // Só a categoria: a resposta do Resend pode ecoar o destinatário.
      console.error(`[e-mail] Resend recusou o envio (${error.name}).`);
      return { sent: false, reason: "erro" };
    }
    return { sent: true };
  } catch {
    console.error("[e-mail] falha ao chamar o Resend.");
    return { sent: false, reason: "erro" };
  }
}
