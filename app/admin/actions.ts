"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseProductForm, toStoredSections } from "@/lib/admin/product-schema";
import { requireAdmin } from "@/lib/admin/auth";
import { fieldErrorsFrom, type FormState } from "@/lib/auth/form-state";
import { triggerReportGeneration } from "@/lib/jobs/trigger";
import { createAdminClient } from "@/lib/supabase/admin";

// Toda ação confere o papel de admin por conta própria: o layout do /admin não
// protege as Server Actions, que são rotas POST chamáveis diretamente.

const uuid = z.string().uuid();

/** Páginas públicas que mostram produtos (estáticas, com revalidação de 5 min). */
function revalidateStorefront(...slugs: (string | null | undefined)[]) {
  revalidatePath("/");
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/mapa/${slug}`);
  }
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export async function saveProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? uuid.safeParse(rawId) : null;
  if (id && !id.success) return { error: "Produto inválido." };

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const state = fieldErrorsFrom(parsed.error);
    // Erros das seções vêm com o caminho `sections.N.campo`: dizemos qual seção.
    const sectionIssues = parsed.error.issues
      .filter((i) => i.path[0] === "sections")
      .map((i) =>
        typeof i.path[1] === "number"
          ? `Seção ${i.path[1] + 1}: ${i.message}`
          : i.message,
      );
    if (sectionIssues.length) {
      state.fieldErrors = { ...state.fieldErrors, sections: sectionIssues };
    }
    return state;
  }
  const { price, sections, ...rest } = parsed.data;

  const admin = createAdminClient();
  const row = {
    ...rest,
    price_cents: price,
    report_sections: toStoredSections(sections),
    sample_excerpt: rest.sample_excerpt || null,
  };

  if (!id) {
    const { data, error } = await admin
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error) return productError(error);
    revalidateStorefront(rest.slug);
    redirect(`/admin/produtos/${data.id}?criado=1`);
  }

  // O slug antigo também precisa sair do cache se mudou.
  const { data: before } = await admin
    .from("products")
    .select("slug")
    .eq("id", id.data)
    .maybeSingle();
  if (!before) return { error: "Produto não encontrado." };

  const { error } = await admin.from("products").update(row).eq("id", id.data);
  if (error) return productError(error);

  revalidateStorefront(rest.slug, before.slug);
  revalidatePath("/admin/produtos");
  return {
    message:
      "Produto salvo. Pedidos novos já usam estas seções e instruções; relatórios prontos não mudam.",
  };
}

function productError(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") {
    return {
      fieldErrors: { slug: ["Já existe um produto com este endereço."] },
    };
  }
  console.error("[admin] erro ao salvar produto:", error.message);
  return { error: "Não foi possível salvar o produto. Tente de novo." };
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/produtos");

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("slug")
    .eq("id", id.data)
    .maybeSingle();

  const { error } = await admin.from("products").delete().eq("id", id.data);
  if (error) {
    // 23503: há pedidos deste produto (FK `on delete restrict`). Só dá para desativar.
    redirect(
      `/admin/produtos/${id.data}?erro=${error.code === "23503" ? "pedidos" : "geral"}`,
    );
  }

  revalidateStorefront(product?.slug);
  redirect("/admin/produtos?apagado=1");
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

/**
 * Reprocessa um pedido com falha ou parado: seções prontas ficam, as demais
 * voltam a pendente com tentativas zeradas, e o job é chamado de novo.
 */
export async function reprocessOrder(formData: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) redirect("/admin");

  const admin = createAdminClient();
  const { data: moved, error } = await admin.rpc("report_reprocess", {
    p_order_id: id.data,
  });
  if (error) {
    console.error("[admin] erro ao reprocessar:", error.message);
    redirect(`/admin/pedidos/${id.data}?erro=reprocessar`);
  }
  if (moved !== true) redirect(`/admin/pedidos/${id.data}?erro=estado`);

  after(() => triggerReportGeneration(id.data));
  revalidatePath("/admin");
  redirect(`/admin/pedidos/${id.data}?reprocessado=1`);
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const houseSystemSchema = z.enum(["placidus", "equal", "whole"], {
  error: "Escolha um sistema de casas.",
});

export async function saveHouseSystem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = houseSystemSchema.safeParse(formData.get("house_system"));
  if (!parsed.success) {
    return { fieldErrors: { house_system: [parsed.error.issues[0].message] } };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: "default_house_system", value: parsed.data });
  if (error) {
    console.error("[admin] erro ao salvar configuração:", error.message);
    return { error: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/admin/configuracoes");
  return {
    message:
      "Salvo. Vale para os próximos relatórios; os que já estão prontos não mudam.",
  };
}
