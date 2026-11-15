"use client";

import { ErrorState } from "@/components/site/error-state";
import { Button } from "@/components/ui/button";

/**
 * Erro inesperado fora do layout do site (entrar, cadastro, admin). Sem
 * cabeçalho, só a mensagem; o conteúdo do erro nunca vai para a tela.
 */
export default function RootError({
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
    <main className="flex flex-1 items-center justify-center">
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
        <p>Não foi culpa sua. Tente de novo em instantes.</p>
      </ErrorState>
    </main>
  );
}
