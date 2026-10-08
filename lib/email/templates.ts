export type EmailMessage = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Moldura simples, em cores seguras para clientes de e-mail (sem CSS externo). */
function layout(
  title: string,
  bodyHtml: string,
  button?: { label: string; url: string },
) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#edeff6;font-family:Arial,Helvetica,sans-serif;color:#1b1f45;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edeff6;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#151938;padding:20px 28px;color:#d4b06a;font-family:Georgia,'Times New Roman',serif;font-size:24px;">Carta Celeste</td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#1b1f45;">${esc(title)}</h1>
            ${bodyHtml}
            ${
              button
                ? `<p style="margin:28px 0 8px;"><a href="${esc(button.url)}" style="background:#8c6820;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:bold;display:inline-block;">${esc(button.label)}</a></p>`
                : ""
            }
          </td></tr>
          <tr><td style="padding:16px 28px 24px;font-size:12px;color:#585c7e;border-top:1px solid #e0e3f0;">
            Conteúdo para autoconhecimento e entretenimento.<br />Você recebeu este e-mail por causa de um pedido feito na Carta Celeste.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;">${text}</p>`;

export function paymentConfirmedEmail(args: {
  firstName: string;
  productName: string;
  orderUrl: string;
}): EmailMessage {
  const hello = args.firstName ? `Olá, ${args.firstName}!` : "Olá!";
  return {
    subject: "Pagamento confirmado: estamos preparando o seu mapa",
    html: layout(
      "Pagamento confirmado",
      p(esc(hello)) +
        p(
          `Recebemos o pagamento do <strong>${esc(args.productName)}</strong>. Estamos calculando o seu céu de nascimento e escrevendo o relatório, o que leva até 5 minutos.`,
        ) +
        p("Assim que ele estiver pronto, você recebe outro e-mail."),
      { label: "Acompanhar o pedido", url: args.orderUrl },
    ),
    text: `${hello}\n\nRecebemos o pagamento do ${args.productName}. Estamos calculando o seu céu de nascimento e escrevendo o relatório, o que leva até 5 minutos. Assim que estiver pronto, você recebe outro e-mail.\n\nAcompanhe o pedido: ${args.orderUrl}\n`,
  };
}

export function reportReadyEmail(args: {
  firstName: string;
  productName: string;
  reportUrl: string;
}): EmailMessage {
  const hello = args.firstName ? `Olá, ${args.firstName}!` : "Olá!";
  return {
    subject: "Seu mapa está pronto",
    html: layout(
      "Seu mapa está pronto",
      p(esc(hello)) +
        p(
          `O seu <strong>${esc(args.productName)}</strong> já está disponível na sua área do cliente. Você pode lê-lo no celular ou no computador, e também imprimir ou salvar em PDF.`,
        ),
      { label: "Ver o meu mapa", url: args.reportUrl },
    ),
    text: `${hello}\n\nO seu ${args.productName} já está disponível na sua área do cliente.\n\nVer o meu mapa: ${args.reportUrl}\n`,
  };
}
