"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { bulkOrders, type BulkState } from "@/app/admin/pedidos-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/format";

export type OrderRow = {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  product_name: string | null;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const PAID_LIKE = new Set([
  "paid",
  "generating",
  "ready",
  "failed",
  "refunded",
]);

/**
 * Lista de pedidos com seleção (um a um ou todos da página) e ações em lote:
 * reenviar o aviso "mapa pronto" ao comprador, reprocessar e excluir. A
 * exclusão pede para digitar EXCLUIR. O resultado de cada ação lista o que foi
 * feito e o que não pôde ser (e por quê).
 */
export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [state, dispatch, pending] = useActionState<BulkState, FormData>(
    bulkOrders,
    {},
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const allRef = useRef<HTMLInputElement>(null);

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0 && !allSelected;

  // "Selecionar todos" fica meio marcado quando só alguns estão marcados.
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someSelected;
  }, [someSelected]);

  // Ação concluída: limpa a seleção e fecha a confirmação.
  useEffect(() => {
    if (state.message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(new Set());
      setConfirming(false);
    }
  }, [state]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));

  /** Cada botão envia o mesmo formulário com a sua ação. */
  const submitAs = (intent: string) => (formData: FormData) => {
    formData.set("intent", intent);
    dispatch(formData);
  };

  const paidSelected = orders.filter(
    (o) => selected.has(o.id) && PAID_LIKE.has(o.status),
  ).length;

  return (
    <form action={dispatch} className="grid gap-4">
      {(state.message || state.error) && (
        <Alert role="status" variant={state.error ? "destructive" : "default"}>
          <AlertDescription>{state.message ?? state.error}</AlertDescription>
        </Alert>
      )}

      <div
        className="bg-card border-border flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
        aria-live="polite"
      >
        <span className="text-sm font-medium">
          {selected.size === 0
            ? "Marque pedidos para agir em lote"
            : `${selected.size} selecionado${selected.size > 1 ? "s" : ""}`}
        </span>
        <Button
          type="submit"
          formAction={submitAs("resend")}
          variant="outline"
          disabled={selected.size === 0 || pending}
        >
          Reenviar ao comprador
        </Button>
        <Button
          type="submit"
          formAction={submitAs("reprocess")}
          variant="outline"
          disabled={selected.size === 0 || pending}
        >
          Reprocessar
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={selected.size === 0 || pending}
          onClick={() => setConfirming((v) => !v)}
          aria-expanded={confirming}
        >
          Excluir…
        </Button>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
          >
            Limpar seleção
          </button>
        )}
      </div>

      {confirming && selected.size > 0 && (
        <div className="border-destructive/50 grid gap-3 rounded-lg border p-4">
          <p className="text-sm">
            Excluir <strong>{selected.size}</strong> pedido
            {selected.size > 1 ? "s" : ""} e os mapas astrais deles. Não dá para
            desfazer.
            {paidSelected > 0 && (
              <>
                {" "}
                <strong>{paidSelected}</strong> já{" "}
                {paidSelected > 1 ? "têm" : "tem"} pagamento: o registro do
                valor continua só no histórico de ações.
              </>
            )}
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

      {/* Os marcados vão no formulário como `ids`. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <caption className="sr-only">Lista de pedidos</caption>
          <thead className="text-muted-foreground border-b">
            <tr>
              <th scope="col" className="w-10 py-2 pr-3">
                <input
                  ref={allRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos os pedidos desta página"
                  className="size-5 accent-current"
                />
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Pedido
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Produto
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Status
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Valor
              </th>
              <th scope="col" className="py-2 font-medium">
                Criado em
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr
                key={o.id}
                className={selected.has(o.id) ? "bg-muted/50" : ""}
              >
                <td className="py-3 pr-3">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    aria-label={`Selecionar o pedido ${o.id.slice(0, 8)}`}
                    className="size-5 accent-current"
                  />
                </td>
                <td className="py-3 pr-3">
                  <Link
                    href={`/admin/pedidos/${o.id}`}
                    className="font-mono underline underline-offset-4"
                  >
                    {o.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-3 pr-3">{o.product_name ?? "—"}</td>
                <td className="py-3 pr-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="py-3 pr-3">{formatBRL(o.amount_cents)}</td>
                <td className="py-3">
                  {dateTime.format(new Date(o.created_at))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
