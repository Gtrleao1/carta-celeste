"use server";

import { redirect } from "next/navigation";

import { fieldErrorsFrom, type FormState } from "@/lib/auth/form-state";
import { birthProfileFromForm, birthProfileSchema } from "@/lib/birth/schemas";
import { saveBirthProfile } from "@/lib/birth/save-profile";
import { withinRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Perfil salvo, no formato que a tela de compra usa. */
export type SavedBirthProfile = {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  city_name: string;
  timezone: string;
};

export type BirthProfileState = FormState & { profile?: SavedBirthProfile };

const MAX_PROFILES = 20;

export async function createBirthProfile(
  _prev: BirthProfileState,
  formData: FormData,
): Promise<BirthProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const parsed = birthProfileSchema.safeParse(birthProfileFromForm(formData));
  // Erros da cidade (campo aninhado) saem agrupados sob a chave "city".
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;

  const admin = createAdminClient();
  if (!(await withinRateLimit(admin, `perfil:${user.id}`, 20, 3600))) {
    return { error: "Muitas tentativas. Aguarde um pouco e tente de novo." };
  }

  const { count } = await supabase
    .from("birth_profiles")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_PROFILES) {
    return {
      error: `Você já tem ${MAX_PROFILES} perfis salvos. Apague algum em "Minha conta" para criar outro.`,
    };
  }

  const saved = await saveBirthProfile(supabase, user.id, input);
  if (!saved.ok) {
    return saved.fieldErrors
      ? { fieldErrors: saved.fieldErrors }
      : { error: saved.error };
  }

  return { message: "Dados salvos.", profile: saved.profile };
}
