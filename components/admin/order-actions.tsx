"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { bulkOrders, type BulkState } from "@/app/admin/pedidos-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Ações de UM pedido, na página dele: reenviar o aviso "mapa pronto" ao
 * comprador, editar o texto, reprocessar e excluir. Usa as mesmas ações em
 * lote da lista (com um id só), então as regras e o histórico são os mesmos.
 */
export function OrderActions({
  orderId,
  canResend,
  canEdit,
  canReprocess,
}: {
  orderId: string;
  canResend: boolean;
  canEdit: boolean;
  canReprocess: boolean;
}) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState<BulkState, FormData>(
    bulkOrders,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  // Pedido excluído: a página dele deixa de existir; volta à lista.
  useEffect(() => {
    if (state.deleted) router.push("/admin");
  }, [state.deleted, router]);

  const submitAs = (intent: string) => (formData: FormData) => {
    formData.set("intent", intent);
    dispatch(formData);
  };

  return (
    <form action={dispatch} className="grid gap-4">
      <input type="hidden" name="ids" value={orderId} />

      {(state.message || state.error) && (
        <Alert role="status" variant={state.error ? "destructive" : "default"}>
          <AlertDescription>{state.message ?? state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        {canResend && (
          <Button
            type="submit"
            formAction={submitAs("resend")}
            size="lg"
            className="h-11"
            disabled={pending}
          >
            Reenviar ao comprador
          </Button>
        )}
        {canEdit && (
          <Link
            href={`/admin/pedidos/${orderId}/editar`}
            className={
              buttonVariants({ variant: "outline", size: "lg" }) + " h-11"
            }
          >
            Editar o texto do mapa
          </Link>
        )}
        {canReprocess && (
          <Button
            type="submit"
            formAction={submitAs("reprocess")}
            size="lg"
            variant="outline"
            className="h-11"
            disabled={pending}
          >
            Reprocessar
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          variant="destructive"
          className="h-11"
          onClick={() => setConfirming((v) => !v)}
          aria-expanded={confirming}
          disabled={pending}
        >
          Excluir pedido…
        </Button>
      </div>

      {canResend && (
        <p className="text-muted-foreground text-xs">
          Reenviar manda de novo o e-mail “Seu mapa está pronto”, com o link
          para ler o mapa (no máximo 3 vezes por hora por pedido).
        </p>
      )}

      {confirming && (
        <div className="border-destructive/50 grid gap-3 rounded-lg border p-4">
          <p className="text-sm">
            Excluir este pedido e o mapa astral dele. Não dá para desfazer; um
            registro do valor e da data fica no histórico de ações.
          </p>
          <div className="grid max-w-xs gap-1.5">
            <label htmlFor="confirmar-exclusao" className="text-sm font-medium">
              Digite EXCLUIR para confirmar
            </label>
            <Input
              id="confirmar-exclusao"
              name="confirm"
              autoComplete="off"
              aria-invalid={state.fieldErrors?.confirm ? true : undefined}
              className="h-11"
            />
            {state.fieldErrors?.confirm && (
              <p role="alert" className="text-destructive text-sm">
                {state.fieldErrors.confirm.join(" ")}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              formAction={submitAs("delete")}
              variant="destructive"
              disabled={pending}
            >
              Excluir definitivamente
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
