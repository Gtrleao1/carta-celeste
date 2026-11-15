"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { startPurchase } from "@/app/(site)/actions";
import { ExistingAccountNotice } from "@/components/auth/existing-account-notice";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { BirthFields } from "@/components/checkout/birth-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FormState } from "@/lib/auth/form-state";
import { purchasePath } from "@/lib/checkout/purchase-path";

/**
 * O formulário em si (nome, nascimento, e-mail, senha e termos). Carregado sob
 * demanda por `HomeOrderForm`, quando chega perto da tela.
 */
export function OrderForm({ slug, name }: { slug: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    startPurchase,
    {},
  );
  // Controlado: o React 19 reseta o formulário após o envio, o que desmarcaria o aceite.
  const [accepted, setAccepted] = useState(false);
  const termsError = state.fieldErrors?.accepted_terms;

  // Conta criada: no lugar do formulário, só o próximo passo.
  if (state.message) {
    return (
      <Alert role="status">
        <AlertTitle className="text-base">Confirme o seu e-mail</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      {state.existingAccountEmail && (
        <ExistingAccountNotice
          email={state.existingAccountEmail}
          next={purchasePath(slug)}
        />
      )}
      <form action={action} className="grid gap-4" noValidate>
        <input type="hidden" name="product_slug" value={slug} />

        <Field
          name="full_name"
          label="Seu nome completo"
          autoComplete="name"
          required
          state={state}
        />
        <BirthFields state={state} />
        <Field
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          hint="É por ele que você entra e recebe o aviso do mapa."
          required
          state={state}
        />
        <Field
          name="password"
          label="Crie uma senha"
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
        <SubmitButton pendingText="Criando sua conta…">
          Quero meu {name}
        </SubmitButton>
        <p className="text-muted-foreground text-center text-xs">
          Você confere os dados e paga na próxima etapa. Já tem conta?{" "}
          <Link
            href={`/entrar?next=${encodeURIComponent(`/comprar/${slug}`)}`}
            className="text-foreground underline underline-offset-4"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
