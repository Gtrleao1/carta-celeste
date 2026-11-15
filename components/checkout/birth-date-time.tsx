"use client";

import { useState } from "react";

import { NativeSelect } from "@/components/ui/native-select";
import type { FormState } from "@/lib/auth/form-state";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const pad = (n: number | string) => String(n).padStart(2, "0");
const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

/** Mensagens de erro de um campo, ligadas por aria ao grupo. */
function Errors({ id, errors }: { id: string; errors?: string[] }) {
  return errors ? (
    <p id={id} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  ) : null;
}

/**
 * Data de nascimento em três listas (dia, mês, ano). No desktop, o campo de
 * data nativo obriga a navegar dezenas de anos para trás; aqui o ano é um toque.
 * O dia respeita o mês (fevereiro, meses de 30 dias). Envia `AAAA-MM-DD` no
 * campo oculto `birth_date`, o formato que o servidor valida.
 */
export function BirthDateField({
  state,
  name = "birth_date",
  autofillBirthday = false,
}: {
  state: FormState;
  name?: string;
  /** Deixa o navegador sugerir a data de aniversário da própria pessoa. */
  autofillBirthday?: boolean;
}) {
  // Controlados: o React 19 reseta o formulário após a ação e apagaria a escolha.
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const errors = state.fieldErrors?.[name];
  const errorId = `${name}-error`;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 1900 + 1 }, (_, i) =>
    String(thisYear - i),
  );
  // Sem mês ou ano escolhidos ainda, oferece até 31 (fevereiro só limita depois).
  const maxDay =
    month && year
      ? daysInMonth(Number(year), Number(month))
      : month
        ? daysInMonth(2000, Number(month))
        : 31;

  // Trocar mês ou ano pode deixar o dia inválido (31 de abril): limpa o dia.
  const clampDay = (m: string, y: string) => {
    if (!day || !m) return;
    const limit = daysInMonth(y ? Number(y) : 2000, Number(m));
    if (Number(day) > limit) setDay("");
  };

  const value = day && month && year ? `${year}-${pad(month)}-${pad(day)}` : "";

  return (
    <fieldset
      className="grid gap-1.5"
      aria-describedby={errors ? errorId : undefined}
    >
      <legend className="mb-1.5 text-sm leading-none font-medium">
        Data de nascimento
      </legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-[1fr_1.7fr_1.2fr] gap-2">
        <NativeSelect
          aria-label="Dia do nascimento"
          aria-invalid={errors ? true : undefined}
          autoComplete={autofillBirthday ? "bday-day" : "off"}
          value={day}
          onChange={(e) => setDay(e.target.value)}
        >
          <option value="">Dia</option>
          {Array.from({ length: maxDay }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Mês do nascimento"
          aria-invalid={errors ? true : undefined}
          autoComplete={autofillBirthday ? "bday-month" : "off"}
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            clampDay(e.target.value, year);
          }}
        >
          <option value="">Mês</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Ano do nascimento"
          aria-invalid={errors ? true : undefined}
          autoComplete={autofillBirthday ? "bday-year" : "off"}
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            clampDay(month, e.target.value);
          }}
        >
          <option value="">Ano</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Errors id={errorId} errors={errors} />
    </fieldset>
  );
}

/**
 * Hora de nascimento em duas listas (hora e minuto). Ao escolher a hora, o
 * minuto vira "00" se ainda não foi escolhido. Envia `HH:mm` no campo oculto
 * `birth_time`; desabilitada (e sem enviar nada) quando a pessoa não sabe a hora.
 */
export function BirthTimeField({
  state,
  disabled = false,
  name = "birth_time",
}: {
  state: FormState;
  disabled?: boolean;
  name?: string;
}) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const errors = state.fieldErrors?.[name];
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const value = hour ? `${pad(hour)}:${pad(minute || "0")}` : "";

  return (
    <fieldset
      className="grid gap-1.5"
      disabled={disabled}
      aria-describedby={[errors ? errorId : null, hintId]
        .filter(Boolean)
        .join(" ")}
    >
      <legend className="mb-1.5 text-sm leading-none font-medium">
        Hora de nascimento
      </legend>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <div className="grid grid-cols-2 gap-2">
        <NativeSelect
          aria-label="Hora do nascimento"
          aria-invalid={errors ? true : undefined}
          value={hour}
          onChange={(e) => setHour(e.target.value)}
        >
          <option value="">Hora</option>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {pad(h)} h
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Minuto do nascimento"
          aria-invalid={errors ? true : undefined}
          value={hour ? minute || "0" : minute}
          onChange={(e) => setMinute(e.target.value)}
        >
          <option value="">Min</option>
          {Array.from({ length: 60 }, (_, m) => (
            <option key={m} value={m}>
              {pad(m)} min
            </option>
          ))}
        </NativeSelect>
      </div>
      <p id={hintId} className="text-muted-foreground text-xs">
        É a hora que define o seu Ascendente. Confira na certidão de nascimento.
      </p>
      <Errors id={errorId} errors={errors} />
    </fieldset>
  );
}
