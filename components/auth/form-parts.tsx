"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/auth/form-state";

/** Botão de envio que desabilita e troca o texto enquanto a ação roda. */
export function SubmitButton({
  children,
  pendingText = "Aguarde…",
  variant,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      variant={variant}
      disabled={pending}
      className="h-11 w-full text-base"
    >
      {pending ? pendingText : children}
    </Button>
  );
}

/** Campo com rótulo e mensagens de erro ligadas por aria. */
export function Field({
  name,
  label,
  state,
  hint,
  defaultValue,
  ...props
}: {
  name: string;
  label: string;
  state: FormState;
  hint?: string;
  defaultValue?: string;
} & Omit<
  React.ComponentProps<"input">,
  "name" | "value" | "defaultValue" | "onChange"
>) {
  // Campo controlado: o React 19 reseta formulários com Server Action depois do
  // envio, o que apagaria o que a pessoa digitou quando há erro de validação.
  const [value, setValue] = useState(defaultValue ?? "");
  const errors = state.fieldErrors?.[name];
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={errors ? true : undefined}
        aria-describedby={
          [errors ? errorId : null, hint ? hintId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className="h-11 text-base"
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {errors && (
        <p id={errorId} className="text-destructive text-sm">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

/** Mostra o erro geral ou a mensagem de sucesso do formulário. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.message) {
    return (
      <Alert>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
