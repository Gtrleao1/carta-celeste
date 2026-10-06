"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { isSettled, orderView, type OrderView } from "@/lib/orders/view";

const POLL_MS = 3000;
const GIVE_UP_MS = 2 * 60 * 1000;

const COPY: Record<OrderView, { title: string; text: string }> = {
  confirming: {
    title: "Confirmando o seu pagamento…",
    text: "Isso costuma levar alguns segundos. Você pode ficar nesta página.",
  },
  in_review: {
    title: "Pagamento em análise",
    text: "O Mercado Pago ainda está processando o pagamento. Pix e cartão costumam confirmar em instantes; o boleto pode levar até alguns dias úteis. Assim que for aprovado, o seu mapa começa a ser preparado.",
  },
  approved: {
    title: "Pagamento aprovado!",
    text: "Estamos calculando o seu céu e escrevendo o relatório. Leva até 5 minutos, e você recebe um e-mail quando estiver pronto.",
  },
  preparing_failed: {
    title: "Estamos finalizando seu mapa",
    text: "O seu pagamento foi aprovado e o relatório está em preparo. Se demorar mais do que o esperado, a nossa equipe já foi avisada.",
  },
  declined: {
    title: "Pagamento recusado",
    text: "O Mercado Pago não aprovou este pagamento. Você pode tentar de novo com outro cartão ou outra forma de pagamento.",
  },
  refunded: {
    title: "Pagamento reembolsado",
    text: "Este pedido foi reembolsado.",
  },
  cancelled: {
    title: "Pedido cancelado",
    text: "Este pedido foi cancelado. Você pode fazer um novo pedido quando quiser.",
  },
};

export function OrderStatus({
  orderId,
  productName,
  productSlug,
  initialStatus,
  initialMpStatus,
}: {
  orderId: string;
  productName: string;
  productSlug: string;
  initialStatus: string;
  initialMpStatus: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [mpStatus, setMpStatus] = useState(initialMpStatus);
  const [gaveUp, setGaveUp] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const view = orderView(status, mpStatus);
  const settled = isSettled(view);

  // Consulta o banco a cada 3 s, por até 2 minutos, até o estado se definir.
  useEffect(() => {
    if (settled) return;
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      try {
        const res = await fetch(`/api/pedidos/${orderId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: string;
          mpStatus: string | null;
        };
        setStatus(data.status);
        setMpStatus(data.mpStatus);
      } catch {
        // sem rede por um instante: tenta de novo na próxima rodada
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [orderId, settled]);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setRetryError(data.error ?? "Não foi possível tentar de novo agora.");
        setRetrying(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setRetryError("Sem conexão com o servidor. Tente de novo.");
      setRetrying(false);
    }
  }

  const copy = COPY[view];
  const stillWaiting = !settled && gaveUp;

  return (
    <div className="grid gap-6">
      <div role="status" aria-live="polite" className="grid gap-2">
        <h2 className="text-4xl font-semibold">
          {stillWaiting ? "Ainda estamos confirmando" : copy.title}
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {stillWaiting
            ? "A confirmação está demorando mais do que o normal. Não precisa pagar de novo: assim que o Mercado Pago confirmar, o seu mapa começa a ser preparado e você recebe um e-mail."
            : copy.text}
        </p>
        <p className="text-muted-foreground text-sm">{productName}</p>
      </div>

      {!settled && !gaveUp && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none"
          />
          Atualizando automaticamente…
        </p>
      )}

      {retryError && (
        <Alert variant="destructive">
          <AlertDescription>{retryError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        {view === "declined" && (
          <Button
            type="button"
            size="lg"
            className="h-12 text-base"
            disabled={retrying}
            onClick={retry}
          >
            {retrying ? "Abrindo o pagamento…" : "Tentar de novo"}
          </Button>
        )}
        {(view === "cancelled" || view === "refunded") && (
          <Link
            href={`/mapa/${productSlug}`}
            className={buttonVariants({ size: "lg" }) + " h-12 text-base"}
          >
            Ver o mapa
          </Link>
        )}
        <Link
          href="/conta"
          className={
            buttonVariants({ size: "lg", variant: "outline" }) +
            " h-12 text-base"
          }
        >
          Minha conta
        </Link>
      </div>
    </div>
  );
}
