"use client";

import { useActionState } from "react";

import { deleteAccount } from "@/app/conta/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

export function DeleteAccountForm() {
  const [state, action] = useActionState<FormState, FormData>(
    deleteAccount,
    {},
  );

  return (
    <form action={action} className="grid gap-4" noValidate>
      <p className="text-sm">
        Isso apaga sua conta, seus perfis de nascimento e seus mapas, e não pode
        ser desfeito. Os registros dos pedidos ficam guardados sem seus dados
        pessoais, para fins fiscais.
      </p>
      <Field
        name="confirmation"
        label='Digite "EXCLUIR" para confirmar'
        autoComplete="off"
        required
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton variant="destructive" pendingText="Excluindo…">
        Excluir minha conta e meus dados
      </SubmitButton>
    </form>
  );
}
