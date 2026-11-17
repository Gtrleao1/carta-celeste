import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionEditor } from "@/components/admin/section-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { sectionVersion } from "@/lib/admin/order-ops";
import type { SectionState } from "@/lib/reports/types";
import { createAdminClient } from "@/lib/supabase/admin";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function EditOrderPage({
  params,
}: PageProps<"/admin/pedidos/[id]/editar">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: report } = await admin
    .from("reports")
    .select("sections")
    .eq("order_id", id)
    .maybeSingle();
  const sections = ((report?.sections ?? []) as SectionState[]).filter(
    (s) => s.status === "done" && s.content,
  );

  return (
    <>
      <Link
        href={`/admin/pedidos/${id}`}
        className="text-muted-foreground text-sm underline"
      >
        ← Pedido {id.slice(0, 8)}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        Editar o texto do mapa
      </h1>

      <Alert>
        <AlertDescription>
          Este texto é do cliente. Edite só para corrigir erros. Cada parte é
          salva separadamente, vira “editada à mão” (o reprocessamento não a
          sobrescreve) e a ação fica no histórico. Depois de salvar, use{" "}
          <strong>Reenviar ao comprador</strong> na página do pedido, se quiser
          avisá-lo.
        </AlertDescription>
      </Alert>

      {order.status !== "ready" || sections.length === 0 ? (
        <p className="text-muted-foreground">
          Só dá para editar o texto de um mapa que já está pronto.
        </p>
      ) : (
        sections.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="text-lg">{s.title}</CardTitle>
              <CardDescription>Parte “{s.key}”.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionEditor
                orderId={id}
                sectionKey={s.key}
                title={s.title}
                content={s.content}
                version={sectionVersion(s)}
                editedAt={
                  s.edited_at ? dateTime.format(new Date(s.edited_at)) : null
                }
              />
            </CardContent>
          </Card>
        ))
      )}
    </>
  );
}
