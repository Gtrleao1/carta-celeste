"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import {
  isDeleteConfirmed,
  parseIds,
  runBulk,
  sectionVersion,
  summarize,
  validateSectionEdit,
} from "@/lib/admin/order-ops";
import { createOrderOpsDeps, writeAudit } from "@/lib/admin/order-ops-deps";
import { nowMs } from "@/lib/admin/time";
import type { FormState } from "@/lib/auth/form-state";
import type { SectionState } from "@/lib/reports/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Toda ação confere o papel de admin por conta própria (e, com ADMIN_REQUIRE_MFA,
// a verificação em dois passos): o layout do /admin não protege Server Actions.

export type BulkState = FormState & {
  /** A exclusão de um pedido aberto na página dele: volta à lista. */
  deleted?: boolean;
};

const intentSchema = z.enum(["resend", "delete", "reprocess"]);

/**
 * Reenviar o aviso ao comprador, excluir ou reprocessar: um pedido (página do
 * pedido) ou vários marcados na lista. Cada pedido é tratado separadamente; o
 * resultado diz o que foi feito e o que não pôde ser.
 */
export async function bulkOrders(
  _prev: BulkState,
  formData: FormData,
): Promise<BulkState> {
  const { user } = await requireAdmin();

  const intent = intentSchema.safeParse(formData.get("intent"));
  if (!intent.success) return { error: "Ação inválida." };

  const parsed = parseIds(formData.getAll("ids"));
  if ("error" in parsed) return { error: parsed.error };

  if (intent.data === "delete" && !isDeleteConfirmed(formData.get("confirm"))) {
    return {
      fieldErrors: { confirm: ["Digite EXCLUIR para confirmar."] },
    };
  }

  const outcomes = await runBulk(
    intent.data,
    parsed.ids,
    createOrderOpsDeps(user.id),
  );
  revalidatePath("/admin");
  for (const o of outcomes) revalidatePath(`/admin/pedidos/${o.id}`);

  const message = summarize(intent.data, outcomes);
  const anyOk = outcomes.some((o) => o.result === "ok");
  return {
    ...(anyOk ? { message } : { error: message }),
    deleted:
      intent.data === "delete" && parsed.ids.length === 1 && anyOk
        ? true
        : undefined,
  };
}

const editSchema = z.object({
  order_id: z.string().uuid(),
  key: z.string().regex(/^[a-z0-9_-]{1,60}$/),
  // Versão da parte quando a tela carregou (`sectionVersion`): impede sobrescrever
  // uma edição feita por outra pessoa nesse intervalo.
  version: z.string().regex(/^[0-9a-f]{16}$/),
});

/** Edita o título e o texto de UMA parte de um mapa pronto. */
export async function saveSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin();

  const ids = editSchema.safeParse({
    order_id: formData.get("order_id"),
    key: formData.get("key"),
    version: formData.get("version"),
  });
  if (!ids.success) return { error: "Pedido ou parte inválidos." };

  const edit = validateSectionEdit({
    title: formData.get("title"),
    content: formData.get("content"),
  });
  if (!edit.ok) {
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(edit.errors).map(([k, v]) => [k, [v]]),
      ),
    };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, status, amount_cents, created_at, paid_at, product:products(name)",
    )
    .eq("id", ids.data.order_id)
    .maybeSingle();
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== "ready") {
    return {
      error: "Só dá para editar o texto de um mapa que já está pronto.",
    };
  }

  const { data: report } = await admin
    .from("reports")
    .select("sections, updated_at, lock_until")
    .eq("order_id", ids.data.order_id)
    .maybeSingle();
  if (!report) return { error: "Este pedido não tem mapa astral." };
  if (report.lock_until && Date.parse(report.lock_until) > nowMs()) {
    return { error: "O mapa está sendo atualizado agora. Tente em instantes." };
  }
  const sections = (report.sections ?? []) as SectionState[];
  const index = sections.findIndex((s) => s.key === ids.data.key);
  if (index < 0) return { error: "Parte do mapa não encontrada." };
  if (sectionVersion(sections[index]) !== ids.data.version) {
    return {
      error:
        "Esta parte mudou desde que você abriu a página. Recarregue e edite de novo.",
    };
  }

  const next = sections.map((s, i) =>
    i === index
      ? {
          ...s,
          title: edit.title,
          content: edit.content,
          status: "done" as const,
          error: undefined,
          edited_at: new Date().toISOString(),
        }
      : s,
  );

  // `updated_at` na condição: se alguém gravou entre a leitura acima e agora, não grava.
  const { data: saved, error } = await admin
    .from("reports")
    .update({ sections: next })
    .eq("order_id", ids.data.order_id)
    .eq("updated_at", report.updated_at)
    .select("updated_at")
    .maybeSingle();
  if (error || !saved) {
    if (error) console.error("[admin] erro ao salvar parte:", error.message);
    return {
      error: "Não foi possível salvar. Recarregue a página e tente de novo.",
    };
  }

  await writeAudit(user.id, {
    action: "editar_secao",
    detail: `parte ${ids.data.key}`,
    order: {
      id: order.id,
      status: order.status,
      amount_cents: order.amount_cents,
      product_name:
        (order.product as unknown as { name: string } | null)?.name ?? null,
      created_at: order.created_at,
      paid_at: order.paid_at,
    },
  });
  revalidatePath(`/admin/pedidos/${ids.data.order_id}`);
  revalidatePath(`/admin/pedidos/${ids.data.order_id}/editar`);
  return { message: "Parte salva.", pendingEmail: undefined };
}
