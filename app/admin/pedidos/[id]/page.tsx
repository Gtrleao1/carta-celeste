import Link from "next/link";
import { notFound } from "next/navigation";

import { reprocessOrder } from "@/app/admin/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { nowMs } from "@/lib/admin/time";
import { formatBRL } from "@/lib/format";
import { estimateCostUsd } from "@/lib/reports/cost";
import { createAdminClient } from "@/lib/supabase/admin";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Sao_Paulo",
});
const when = (iso: string | null) =>
  iso ? dateTime.format(new Date(iso)) : "—";

const SECTION_STATUS: Record<string, string> = {
  pending: "Pendente",
  done: "Pronta",
  failed: "Falhou",
};

const ERRORS: Record<string, string> = {
  reprocessar: "Não foi possível reprocessar. Veja o log do servidor.",
  estado: "Só pedidos pagos, em geração ou com falha podem ser reprocessados.",
};

export default async function AdminOrderPage({
  params,
  searchParams,
}: PageProps<"/admin/pedidos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

  // Id inválido vira 404 em vez de erro do banco.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, status, amount_cents, user_id, created_at, paid_at, updated_at, mp_payment_id, mp_status, paid_via, product:products(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: report }, userResult] = await Promise.all([
    admin
      .from("reports")
      .select(
        "sections, error, input_tokens, output_tokens, house_system, lock_until, updated_at",
      )
      .eq("order_id", id)
      .maybeSingle(),
    order.user_id
      ? admin.auth.admin.getUserById(order.user_id)
      : Promise.resolve(null),
  ]);

  const product = order.product as unknown as { name: string } | null;
  const sections = (report?.sections ?? []) as {
    key: string;
    title: string;
    status: string;
    attempts: number;
    error?: string;
  }[];
  const canReprocess = ["paid", "generating", "failed"].includes(order.status);
  const lockActive =
    report?.lock_until && Date.parse(report.lock_until) > nowMs();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-muted-foreground text-sm underline">
          ← Pedidos
        </Link>
      </div>
      <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
        Pedido <span className="font-mono">{order.id.slice(0, 8)}</span>
        <StatusBadge status={order.status} />
      </h1>

      {query.reprocessado && (
        <Alert>
          <AlertDescription>
            Reprocessamento iniciado. Em instantes o relatório continua de onde
            parou; recarregue esta página para acompanhar.
          </AlertDescription>
        </Alert>
      )}
      {typeof query.erro === "string" && ERRORS[query.erro] && (
        <Alert variant="destructive">
          <AlertDescription>{ERRORS[query.erro]}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do pedido</CardTitle>
          <CardDescription>
            Os dados de nascimento ficam só com o cliente e não aparecem aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Item label="Produto" value={product?.name ?? "—"} />
            <Item label="Valor" value={formatBRL(order.amount_cents)} />
            <Item
              label="Cliente"
              value={userResult?.data?.user?.email ?? "conta excluída"}
            />
            <Item label="Criado em" value={when(order.created_at)} />
            <Item label="Pago em" value={when(order.paid_at)} />
            <Item label="Atualizado em" value={when(order.updated_at)} />
            <Item
              label="Pagamento (Mercado Pago)"
              value={order.mp_payment_id ?? "—"}
            />
            <Item
              label="Status no Mercado Pago"
              value={order.mp_status ?? "—"}
            />
            <Item label="Confirmado por" value={order.paid_via ?? "—"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relatório</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!report ? (
            <p className="text-muted-foreground text-sm">
              Ainda não existe relatório para este pedido.
            </p>
          ) : (
            <>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Item
                  label="Sistema de casas"
                  value={report.house_system ?? "—"}
                />
                <Item label="Atualizado em" value={when(report.updated_at)} />
                <Item
                  label="Tokens (entrada / saída)"
                  value={`${report.input_tokens} / ${report.output_tokens} (≈ US$ ${estimateCostUsd(report.input_tokens, report.output_tokens).toFixed(3)})`}
                />
                <Item
                  label="Em execução agora"
                  value={lockActive ? "Sim (há um job rodando)" : "Não"}
                />
                {report.error && <Item label="Erro" value={report.error} />}
              </dl>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left text-sm">
                  <caption className="sr-only">Seções do relatório</caption>
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Seção
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Situação
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Tentativas
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Erro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sections.map((s) => (
                      <tr key={s.key}>
                        <td className="py-2 pr-3">{s.title}</td>
                        <td className="py-2 pr-3">
                          {SECTION_STATUS[s.status] ?? s.status}
                        </td>
                        <td className="py-2 pr-3">{s.attempts}</td>
                        <td className="py-2 font-mono text-xs">
                          {s.error || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {canReprocess && (
            <form action={reprocessOrder} className="grid gap-2">
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" size="lg" className="h-11 w-fit">
                Reprocessar relatório
              </Button>
              <p className="text-muted-foreground text-xs">
                Mantém as seções prontas e refaz só as pendentes ou com falha
                (tentativas zeradas). Não envia de novo o e-mail de pagamento
                confirmado.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
