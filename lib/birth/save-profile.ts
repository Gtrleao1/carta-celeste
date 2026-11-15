import type { SupabaseClient } from "@supabase/supabase-js";

import type { SavedBirthProfile } from "@/app/(site)/comprar/[slug]/actions";

import type { BirthProfileInput } from "./schemas";

export type SaveProfileResult =
  | { ok: true; profile: SavedBirthProfile }
  | { ok: false; fieldErrors?: Record<string, string[]>; error?: string };

/**
 * Grava um perfil de nascimento para `userId`.
 *
 * Cidade da lista: coordenadas e fuso vêm do banco, nunca do navegador. O
 * cliente decide quem escreve: o da sessão da pessoa (sujeito à RLS) na tela de
 * compra, ou o de serviço no formulário da home, quando a conta acabou de ser
 * criada e ainda não tem sessão (e-mail por confirmar).
 */
export async function saveBirthProfile(
  client: SupabaseClient,
  userId: string,
  input: BirthProfileInput,
): Promise<SaveProfileResult> {
  let cityName: string;
  let latitude: number;
  let longitude: number;
  let timezone: string;
  if (input.city.mode === "db") {
    const { data: city } = await client
      .from("cities")
      .select("name, state_or_country, latitude, longitude, timezone")
      .eq("id", input.city.city_id)
      .maybeSingle();
    if (!city) {
      return {
        ok: false,
        fieldErrors: { city: ["Escolha a cidade na lista."] },
      };
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

  const { data, error } = await client
    .from("birth_profiles")
    .insert({
      user_id: userId,
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
    return {
      ok: false,
      error: "Não foi possível salvar os dados. Tente de novo.",
    };
  }
  return { ok: true, profile: data as SavedBirthProfile };
}
