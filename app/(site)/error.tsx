"use client";

import { ErrorState } from "@/components/site/error-state";
import { Button } from "@/components/ui/button";

/**
 * Erro inesperado numa página do site. Cabeçalho e rodapé continuam (o erro
 * fica dentro do layout). Não mostra a mensagem do erro, só o código (`digest`)
 * que aparece no log do servidor.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <ErrorState
      eyebrow="Algo não deu certo"
      title="Tivemos um problema por aqui"
      code={digest || undefined}
      actions={
        <Button
          type="button"
          size="lg"
          className="h-12 px-6 text-base"
          onClick={() => retry()}
        >
          Tentar de novo
        </Button>
      }
    >
      <p>
        Não foi culpa sua. Tente de novo em instantes. Se você estava pagando,
        seu pedido continua salvo em “Meus mapas”: confira lá antes de pagar de
        novo.
      </p>
    </ErrorState>
  );
}
