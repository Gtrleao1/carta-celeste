"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import type { FormState } from "@/lib/auth/form-state";
import { parsePostForm } from "@/lib/blog/post-schema";
import { createAdminClient } from "@/lib/supabase/admin";

// Toda ação confere o papel de admin por conta própria: o layout do /admin não
// protege as Server Actions.

const uuid = z.string().uuid();

/** Páginas públicas que mostram posts (estáticas, com revalidação de 5 min). */
function revalidateBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/blog/${slug}`);
  }
  revalidatePath("/admin/blog");
}

export async function savePost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? uuid.safeParse(rawId) : null;
  if (id && !id.success) return { error: "Post inválido." };

  const parsed = parsePostForm(formData);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.fieldErrors,
      error: "Confira os campos destacados.",
    };
  }
  const { intent, ...fields } = parsed.data;

  const admin = createAdminClient();
  const existing = id
    ? (
        await admin
          .from("posts")
          .select("slug, status, published_at")
          .eq("id", id.data)
          .maybeSingle()
      ).data
    : null;
  if (id && !existing) return { error: "Post não encontrado." };

  // Publicar: mantém a data original se o post já foi publicado; senão, agora.
  // Despublicar: volta a rascunho (a data fica guardada para quando republicar).
  const status =
    intent === "publish"
      ? "published"
      : intent === "unpublish"
        ? "draft"
        : (existing?.status ?? "draft");
  const publishedAt =
    status === "published"
      ? (existing?.published_at ?? new Date().toISOString())
      : (existing?.published_at ?? null);

  const row = { ...fields, status, published_at: publishedAt };

  if (!id) {
    const { data, error } = await admin
      .from("posts")
      .insert(row)
      .select("id")
      .single();
    if (error) return postError(error);
    revalidateBlog(fields.slug);
    redirect(`/admin/blog/${data.id}?criado=1`);
  }

  const { error } = await admin.from("posts").update(row).eq("id", id.data);
  if (error) return postError(error);

  revalidateBlog(fields.slug, existing?.slug);
  // A própria tela de edição também muda (botões Publicar / Tirar do ar).
  revalidatePath(`/admin/blog/${id.data}`);
  return {
    message:
      intent === "publish"
        ? "Post publicado. Ele aparece no blog em até 5 minutos."
        : intent === "unpublish"
          ? "Post tirado do ar. Ele voltou a ser rascunho."
          : status === "published"
            ? "Alterações salvas. O texto no blog atualiza em até 5 minutos."
            : "Rascunho salvo.",
  };
}

function postError(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") {
    return {
      fieldErrors: { slug: ["Já existe um post com este endereço."] },
    };
  }
  console.error("[admin] erro ao salvar post:", error.message);
  return { error: "Não foi possível salvar o post. Tente de novo." };
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/blog");

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("slug")
    .eq("id", id.data)
    .maybeSingle();

  const { error } = await admin.from("posts").delete().eq("id", id.data);
  if (error) {
    console.error("[admin] erro ao apagar post:", error.message);
    redirect(`/admin/blog/${id.data}?erro=1`);
  }

  revalidateBlog(post?.slug);
  redirect("/admin/blog?apagado=1");
}
