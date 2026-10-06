"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createBirthProfile,
  type BirthProfileState,
  type SavedBirthProfile,
} from "@/app/(site)/comprar/[slug]/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { CityPicker } from "@/components/checkout/city-picker";

/** Fusos IANA para sugerir no campo manual (o navegador conhece a lista). */
function timeZoneOptions(): string[] {
  try {
    return (
      Intl as unknown as { supportedValuesOf: (k: string) => string[] }
    ).supportedValuesOf("timeZone");
  } catch {
    return ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "UTC"];
  }
}

export function BirthProfileForm({
  onCreated,
}: {
  onCreated: (profile: SavedBirthProfile) => void;
}) {
  const [state, action] = useActionState<BirthProfileState, FormData>(
    createBirthProfile,
    {},
  );
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (state.profile) onCreated(state.profile);
  }, [state.profile, onCreated]);

  const cityError = state.fieldErrors?.city?.join(" ");

  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field
        name="name"
        label="Nome de quem nasceu"
        autoComplete="off"
        required
        state={state}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="birth_date"
          label="Data de nascimento"
          type="date"
          required
          state={state}
        />
        <Field
          name="birth_time"
          label="Hora de nascimento"
          type="time"
          disabled={timeUnknown}
          state={state}
        />
      </div>

      <label className="flex items-center gap-3 text-base">
        <input
          type="checkbox"
          name="time_unknown"
          checked={timeUnknown}
          onChange={(e) => setTimeUnknown(e.target.checked)}
          className="size-5 shrink-0 accent-current"
        />
        Não sei a hora
      </label>

      {manual ? (
        <fieldset className="border-border grid gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">
            Local de nascimento (manual)
          </legend>
          <input type="hidden" name="city_mode" value="manual" />
          <Field
            name="manual_name"
            label="Nome da cidade"
            required
            state={state}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="manual_latitude"
              label="Latitude"
              inputMode="decimal"
              placeholder="-22,91"
              hint="Em graus decimais. Sul é negativo."
              required
              state={state}
            />
            <Field
              name="manual_longitude"
              label="Longitude"
              inputMode="decimal"
              placeholder="-47,06"
              hint="Em graus decimais. Oeste é negativo."
              required
              state={state}
            />
          </div>
          <Field
            name="manual_timezone"
            label="Fuso horário"
            list="fusos-horarios"
            placeholder="America/Sao_Paulo"
            defaultValue="America/Sao_Paulo"
            required
            state={state}
          />
          <datalist id="fusos-horarios">
            {timeZoneOptions().map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
          >
            Voltar para a busca de cidade
          </button>
        </fieldset>
      ) : (
        <CityPicker error={cityError} onManual={() => setManual(true)} />
      )}

      {timeUnknown && (
        <p className="border-border bg-muted rounded-lg border p-3 text-sm">
          Sem a hora de nascimento, não calculamos o Ascendente, o Meio do Céu e
          as casas, e o seu relatório será mais curto.
        </p>
      )}

      <FormMessage state={state} />
      <SubmitButton pendingText="Salvando…">Continuar</SubmitButton>
    </form>
  );
}
