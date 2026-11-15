"use client";

import { useActionState } from "react";

import { resendConfirmation } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/form-parts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/auth/form-state";

/**
 * Aviso de "confirme o seu e-mail", com saída para quem não recebeu ou digitou
 * o e-mail errado: reenviar o link ou voltar e corrigir o formulário.
 */
export function ConfirmEmailNotice({
  email,
  next,
  message,
  onEdit,
}: {
  email: string;
  /** Para onde o link do e-mail leva depois de confirmar. */
  next: string;
  /** Texto principal (o do cadastro). */
  message: string;
  /** Volta ao formulário para corrigir o e-mail. */
  onEdit: () => void;
}) {
  const [resend, resendAction] = useActionState<FormState, FormData>(
    resendConfirmation,
    {},
  );

  return (
    <Alert role="status">
      <AlertTitle className="text-base">Confirme o seu e-mail</AlertTitle>
      <AlertDescription className="grid gap-4">
        <p>{resend.message ?? message}</p>
        {resend.error && (
          <p role="alert" className="text-destructive">
            {resend.error}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <form action={resendAction}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="next" value={next} />
            <SubmitButton variant="outline" pendingText="Enviando…">
              Reenviar o e-mail
            </SubmitButton>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11 text-base"
            onClick={onEdit}
          >
            Corrigir o e-mail
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
