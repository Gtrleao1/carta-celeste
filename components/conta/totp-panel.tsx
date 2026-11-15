"use client";

/* eslint-disable @next/next/no-img-element -- QR Code é um data URL gerado pelo Supabase */

import { useActionState, useState, useTransition } from "react";

import {
  startEnrollment,
  verifyCode,
  type EnrollState,
} from "@/app/conta/seguranca/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";

/** Campo do código: só números, com teclado numérico e preenchimento automático do celular. */
function CodeForm({
  factorId,
  next,
  action,
  state,
  label,
}: {
  factorId: string;
  next: string;
  action: (payload: FormData) => void;
  state: EnrollState;
  label: string;
}) {
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="factor_id" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <Field
        name="code"
        label={label}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        required
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Conferindo…">Confirmar</SubmitButton>
    </form>
  );
}

/**
 * Cadastro do aplicativo autenticador (QR Code + código) ou, para quem já tem,
 * a digitação do código. O segredo e o QR aparecem só neste momento.
 */
export function TotpPanel({
  mode,
  factorId,
  next,
}: {
  mode: "enroll" | "verify";
  /** Fator já cadastrado (modo `verify`). */
  factorId: string | null;
  next: string;
}) {
  const [verifyState, verifyAction] = useActionState<EnrollState, FormData>(
    verifyCode,
    {},
  );
  const [enrollState, setEnrollState] = useState<EnrollState>({});
  const [pending, startTransition] = useTransition();

  if (mode === "verify" && factorId) {
    return (
      <CodeForm
        factorId={factorId}
        next={next}
        action={verifyAction}
        state={verifyState}
        label="Código do aplicativo autenticador"
      />
    );
  }

  if (!enrollState.enroll) {
    return (
      <div className="grid gap-4">
        <ol className="text-muted-foreground grid list-decimal gap-1 pl-5 text-sm">
          <li>
            Instale um aplicativo autenticador no celular (Google Authenticator,
            Microsoft Authenticator, Authy ou 1Password).
          </li>
          <li>Toque em “Gerar QR Code” e escaneie com o aplicativo.</li>
          <li>Digite aqui o código de 6 números que ele mostrar.</li>
        </ol>
        {enrollState.error && (
          <p role="alert" className="text-destructive text-sm">
            {enrollState.error}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          className="h-11 text-base"
          disabled={pending}
          onClick={() =>
            startTransition(async () => setEnrollState(await startEnrollment()))
          }
        >
          {pending ? "Gerando…" : "Gerar QR Code"}
        </Button>
      </div>
    );
  }

  const { factorId: newFactor, qr, secret } = enrollState.enroll;
  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-3">
        {/* Fundo branco: o QR Code precisa de contraste para ser lido. */}
        <img
          src={qr}
          alt="QR Code para cadastrar o aplicativo autenticador"
          width={192}
          height={192}
          className="rounded-lg bg-white p-2"
        />
        <details className="text-muted-foreground text-sm">
          <summary className="cursor-pointer underline underline-offset-4">
            Não consigo escanear
          </summary>
          <p className="mt-2">
            No aplicativo, escolha “inserir chave” e digite:
          </p>
          <code className="bg-muted mt-1 block rounded px-2 py-1 font-mono text-xs break-all">
            {secret}
          </code>
        </details>
      </div>
      <CodeForm
        factorId={newFactor}
        next={next}
        action={verifyAction}
        state={verifyState}
        label="Código de 6 números do aplicativo"
      />
    </div>
  );
}
