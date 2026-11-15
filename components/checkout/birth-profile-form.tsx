"use client";

import { useActionState, useEffect } from "react";

import {
  createBirthProfile,
  type BirthProfileState,
  type SavedBirthProfile,
} from "@/app/(site)/comprar/[slug]/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { BirthFields } from "@/components/checkout/birth-fields";

export function BirthProfileForm({
  onCreated,
}: {
  onCreated: (profile: SavedBirthProfile) => void;
}) {
  const [state, action] = useActionState<BirthProfileState, FormData>(
    createBirthProfile,
    {},
  );

  useEffect(() => {
    if (state.profile) onCreated(state.profile);
  }, [state.profile, onCreated]);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field
        name="name"
        label="Nome de quem nasceu"
        autoComplete="off"
        required
        state={state}
      />

      <BirthFields state={state} />

      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando…">Continuar</SubmitButton>
    </form>
  );
}
