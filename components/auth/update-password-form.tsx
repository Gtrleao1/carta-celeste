"use client";

import { useActionState } from "react";

import { updatePassword } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

export function UpdatePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(
    updatePassword,
    {},
  );

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Field
        name="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint="Use pelo menos 8 caracteres."
        required
        state={state}
      />
      <Field
        name="confirm"
        label="Repita a nova senha"
        type="password"
        autoComplete="new-password"
        required
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando…">Salvar nova senha</SubmitButton>
    </form>
  );
}
