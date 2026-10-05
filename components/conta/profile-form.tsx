"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/conta/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

export function ProfileForm({
  fullName,
  birthDateOfBuyer,
}: {
  fullName: string;
  birthDateOfBuyer: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Field
        name="full_name"
        label="Nome completo"
        autoComplete="name"
        defaultValue={fullName}
        required
        state={state}
      />
      <Field
        name="birth_date_of_buyer"
        label="Sua data de nascimento"
        type="date"
        autoComplete="bday"
        defaultValue={birthDateOfBuyer ?? ""}
        hint="Opcional. Usada só para confirmar que você tem 18 anos ou mais nos produtos restritos."
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando…">Salvar dados</SubmitButton>
    </form>
  );
}
