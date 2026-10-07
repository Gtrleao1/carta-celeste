"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/form-parts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import type { FormState } from "@/lib/auth/form-state";

/**
 * Aviso do cadastro quando o e-mail já tem conta: leva a pessoa a entrar ou a
 * criar uma nova senha, com um clique (envia o link de redefinição).
 */
export function ExistingAccountNotice({
  email,
  next,
}: {
  email: string;
  next: string;
}) {
  const [reset, resetAction] = useActionState<FormState, FormData>(
    requestPasswordReset,
    {},
  );
  const sent = Boolean(reset.message);
  const loginHref =
    next !== "/conta" ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar";

  return (
    <Alert role="status">
      <AlertTitle className="text-base">Este e-mail já tem cadastro</AlertTitle>
      <AlertDescription className="grid gap-3">
        <p>
          A conta de <strong className="text-foreground">{email}</strong> já
          existe. Entre com a sua senha ou, se não lembra dela, crie uma nova.
        </p>

        {sent ? (
          <p className="text-foreground">
            Enviamos o link para <strong>{email}</strong>. Abra o e-mail e
            escolha a nova senha (confira também o spam).
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href={loginHref}
              className={buttonVariants({ size: "lg" }) + " h-11 text-base"}
            >
              Entrar
            </Link>
            <form action={resetAction}>
              <input type="hidden" name="email" value={email} />
              <SubmitButton variant="outline" pendingText="Enviando…">
                Criar nova senha
              </SubmitButton>
            </form>
          </div>
        )}

        {reset.error && (
          <p className="text-destructive text-sm">{reset.error}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
