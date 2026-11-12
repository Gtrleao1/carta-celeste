"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { buttonVariants } from "@/components/ui/button";
import type { FormState } from "@/lib/auth/form-state";

export function SignInForm({
  next,
  purchase = false,
}: {
  next: string;
  /** Veio do botão "Quero meu mapa": destaca a criação de conta. */
  purchase?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  const signUpHref = `/cadastro${next !== "/conta" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
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
        autoComplete="current-password"
        required
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      <div className="text-muted-foreground flex flex-col gap-1 text-center text-sm">
        <Link href="/recuperar-senha" className="underline underline-offset-4">
          Esqueci minha senha
        </Link>
        {!purchase && (
          <span>
            Ainda não tem conta?{" "}
            <Link
              href={signUpHref}
              className="text-foreground underline underline-offset-4"
            >
              Cadastre-se
            </Link>
          </span>
        )}
      </div>
      {purchase && (
        <div className="border-border grid gap-2 border-t pt-4">
          <p className="text-center text-sm">É a primeira vez aqui?</p>
          <Link
            href={signUpHref}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Criar minha conta
          </Link>
        </div>
      )}
    </form>
  );
}
