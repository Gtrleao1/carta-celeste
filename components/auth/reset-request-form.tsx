"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

export function ResetRequestForm() {
  const [state, action] = useActionState<FormState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Field
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Enviando…">Enviar link</SubmitButton>
      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/entrar"
          className="text-foreground underline underline-offset-4"
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
