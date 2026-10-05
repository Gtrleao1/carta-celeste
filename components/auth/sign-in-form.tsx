"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/auth/form-state";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});

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
        <span>
          Ainda não tem conta?{" "}
          <Link
            href={`/cadastro${next !== "/conta" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-foreground underline underline-offset-4"
          >
            Cadastre-se
          </Link>
        </span>
      </div>
    </form>
  );
}
