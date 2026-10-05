"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, type FormState } from "@/lib/auth/form-state";
import {
  deleteAccountSchema,
  deleteBirthProfileSchema,
  profileSchema,
} from "@/lib/auth/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta");
  return { supabase, user };
}

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    birth_date_of_buyer: formData.get("birth_date_of_buyer") ?? "",
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);
  if (error) {
    return { error: "Não foi possível salvar seus dados. Tente de novo." };
  }

  revalidatePath("/conta");
  return { message: "Dados salvos." };
}

export async function deleteBirthProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const parsed = deleteBirthProfileSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) return;

  // A RLS já restringe ao dono; o filtro por user_id é uma segunda barreira.
  await supabase
    .from("birth_profiles")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  revalidatePath("/conta");
}

/**
 * LGPD: apaga a conta e os dados pessoais. Perfis de nascimento, relatórios e
 * papéis saem em cascata; os pedidos ficam anonimizados (user_id nulo) para
 * fins fiscais.
 */
export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return {
      error:
        "Não foi possível excluir sua conta agora. Tente de novo em instantes.",
    };
  }

  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}
