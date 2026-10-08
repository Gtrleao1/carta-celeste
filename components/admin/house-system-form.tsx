"use client";

import { useActionState, useState } from "react";

import { saveHouseSystem } from "@/app/admin/actions";
import { FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

const OPTIONS = [
  {
    value: "placidus",
    label: "Placidus",
    hint: "O mais usado no mercado e o padrão do site.",
  },
  {
    value: "equal",
    label: "Casas iguais",
    hint: "Cada casa tem 30°, a partir do Ascendente.",
  },
  {
    value: "whole",
    label: "Casas inteiras",
    hint: "Cada signo é uma casa, a partir do signo do Ascendente.",
  },
];

export function HouseSystemForm({ current }: { current: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    saveHouseSystem,
    {},
  );
  const [value, setValue] = useState(current);

  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="sr-only">Sistema de casas</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex items-start gap-3">
            <input
              type="radio"
              name="house_system"
              value={o.value}
              checked={value === o.value}
              onChange={() => setValue(o.value)}
              className="accent-primary mt-0.5 size-5"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{o.label}</span>
              <span className="text-muted-foreground text-xs">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {state.fieldErrors?.house_system && (
        <p className="text-destructive text-sm">
          {state.fieldErrors.house_system.join(" ")}
        </p>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
    </form>
  );
}
