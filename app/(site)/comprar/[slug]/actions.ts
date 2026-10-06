"use server";

import { redirect } from "next/navigation";

import { fieldErrorsFrom, type FormState } from "@/lib/auth/form-state";
import { birthProfileFromForm, birthProfileSchema } from "@/lib/birth/schemas";
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

  // Cidade da lista: coordenadas e fuso vêm do banco, não do navegador.
  let cityName: string;
  let latitude: number;
  let longitude: number;
  let timezone: string;
  if (input.city.mode === "db") {
    const { data: city } = await supabase
      .from("cities")
      .select("name, state_or_country, latitude, longitude, timezone")
      .eq("id", input.city.city_id)
      .maybeSingle();
    if (!city) {
      return { fieldErrors: { city: ["Escolha a cidade na lista."] } };
    }
    cityName = `${city.name}, ${city.state_or_country}`;
    latitude = city.latitude;
    longitude = city.longitude;
    timezone = city.timezone;
  } else {
    cityName = input.city.name;
    latitude = input.city.latitude;
    longitude = input.city.longitude;
    timezone = input.city.timezone;
  }

  const { data, error } = await supabase
    .from("birth_profiles")
    .insert({
      user_id: user.id,
      name: input.name,
      birth_date: input.birth_date,
      birth_time: input.time_unknown ? null : input.birth_time,
      time_unknown: input.time_unknown,
      city_name: cityName,
      latitude,
      longitude,
      timezone,
    })
    .select(
      "id, name, birth_date, birth_time, time_unknown, city_name, timezone",
    )
    .single();

  if (error || !data) {
    return { error: "Não foi possível salvar os dados. Tente de novo." };
  }

  return { message: "Dados salvos.", profile: data as SavedBirthProfile };
}
