"use client";

import { Payment } from "@mercadopago/sdk-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMercadoPago } from "@/components/checkout/use-mercado-pago";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trackEvent } from "@/lib/tracking/browser";

type Props = {
  orderId: string;
  publicKey: string;
  amountCents: number;
  productId: string;
  productName: string;
};

/**
 * Pagamento dentro do site (Payment Brick do Mercado Pago): cartão, Pix e
 * boleto sem sair da página. O valor mostrado vem do pedido, mas quem decide o
 * valor cobrado é o servidor (`/api/pagamento`), nunca este componente.
 */
export function PaymentBrick({
  orderId,
  publicKey,
  amountCents,
  productId,
  productName,
}: Props) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const ready = useMercadoPago(publicKey);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("InitiateCheckout", {
      value: amountCents / 100,
      currency: "BRL",
      items: [
        {
          item_id: productId,
          item_name: productName,
          price: amountCents / 100,
        },
      ],
    });
  }, [amountCents, productId, productName]);

  async function onSubmit(param: { formData: unknown }): Promise<void> {
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, formData: param.formData }),
      });
    } catch {
      setError("Sem conexão com o servidor. Tente de novo.");
      throw new Error("sem_conexao");
    }

    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      error?: string;
    };

    // Pedido já pago (ou encerrado): a página de acompanhamento mostra o resultado.
    if (res.status === 409) {
      router.push(`/pedido/${orderId}/retorno`);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Não foi possível processar o pagamento.");
      throw new Error("pagamento_falhou");
    }
    if (data.status === "rejected") {
      setError(
        data.message ??
          "O pagamento não foi aprovado. Tente outro cartão ou outra forma de pagamento.",
      );
      throw new Error("recusado");
    }

    trackEvent("AddPaymentInfo", {
      value: amountCents / 100,
      currency: "BRL",
    });
    router.push(`/pedido/${orderId}/retorno`);
  }

  return (
    <div className="grid gap-4">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loaded && (
        <p
          className="text-muted-foreground flex items-center gap-2 text-sm"
          role="status"
        >
          <span
            aria-hidden="true"
            className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none"
          />
          Carregando as formas de pagamento…
        </p>
      )}

      {ready && (
        <Payment
          key={resolvedTheme}
          initialization={{ amount: amountCents / 100 }}
          customization={{
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              ticket: "all",
              bankTransfer: "all",
              maxInstallments: 12,
            },
            visual: {
              style: { theme: resolvedTheme === "light" ? "default" : "dark" },
            },
          }}
          onSubmit={onSubmit}
          onReady={() => setLoaded(true)}
          onError={() =>
            setError(
              "Não foi possível carregar o pagamento. Atualize a página e tente de novo.",
            )
          }
        />
      )}
    </div>
  );
}
