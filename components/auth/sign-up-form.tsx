"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { signUp } from "@/app/(auth)/actions";
import { ConfirmEmailNotice } from "@/components/auth/confirm-email-notice";
import { ExistingAccountNotice } from "@/components/auth/existing-account-notice";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  const termsError = state.fieldErrors?.accepted_terms;
  // Controlado: o React 19 reseta o formulário após o envio, o que desmarcaria o aceite.
  const [accepted, setAccepted] = useState(false);
  // Conta criada: aviso de confirmar o e-mail no lugar do formulário (que fica
  // montado, escondido, para "Corrigir o e-mail" não perder o que foi digitado).
  const [editedFor, setEditedFor] = useState<FormState | null>(null);
  const showNotice = Boolean(state.pendingEmail) && editedFor !== state;

  return (
    <div className="grid gap-4">
      {showNotice && state.pendingEmail && (
        <ConfirmEmailNotice
          email={state.pendingEmail}
          next={next}
          message={state.message ?? ""}
          onEdit={() => setEditedFor(state)}
        />
      )}
      {state.existingAccountEmail && !showNotice && (
        <ExistingAccountNotice email={state.existingAccountEmail} next={next} />
      )}
      <form
        action={action}
        className={showNotice ? "hidden" : "grid gap-4"}
        noValidate
      >
        <input type="hidden" name="next" value={next} />
        <Field
          name="full_name"
          label="Nome completo"
          autoComplete="name"
          required
          state={state}
        />
        <Field
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          state={state}
        />
        <Field
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Use pelo menos 8 caracteres."
          required
          state={state}
        />

        <div className="grid gap-1.5">
          <label className="flex items-start gap-3 text-sm leading-snug">
            <input
              type="checkbox"
              name="accepted_terms"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              required
              aria-invalid={termsError ? true : undefined}
              aria-describedby={termsError ? "accepted_terms-error" : undefined}
              className="mt-0.5 size-5 shrink-0 accent-current"
            />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" className="underline underline-offset-4">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                className="underline underline-offset-4"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          {termsError && (
            <p id="accepted_terms-error" className="text-destructive text-sm">
              {termsError.join(" ")}
            </p>
          )}
        </div>

        <FormMessage state={state} />
        <SubmitButton pendingText="Criando conta…">Criar conta</SubmitButton>
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{" "}
          <Link
            href={
              next !== "/conta"
                ? `/entrar?next=${encodeURIComponent(next)}`
                : "/entrar"
            }
            className="text-foreground underline underline-offset-4"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
