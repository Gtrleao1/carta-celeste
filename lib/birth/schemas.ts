import { z } from "zod";

import { todayInBrazil } from "./age";
import { isValidTimeZone } from "./summary";

export const birthDateSchema = z
  .string({ error: "Informe a data de nascimento." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe uma data válida." })
  .refine(
    (v) => {
      const [y, m, d] = v.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
      );
    },
    { error: "Informe uma data válida." },
  )
  .refine((v) => v >= "1900-01-01", { error: "Informe uma data válida." })
  .refine((v) => v <= todayInBrazil(), {
    error: "A data de nascimento não pode estar no futuro.",
  });

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Informe uma hora válida." });

/** Aceita vírgula como separador decimal ("-22,91"). */
const coordinate = (label: string, limit: number) =>
  z
    .string({ error: `Informe ${label}.` })
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => v !== "" && Number.isFinite(Number(v)), {
      error: `Informe ${label} em números.`,
    })
    .transform(Number)
    .refine((n) => Math.abs(n) <= limit, {
      error: `${label} fora do intervalo válido.`,
    });

const city = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("db"),
    city_id: z.coerce
      .number({ error: "Escolha a cidade na lista." })
      .int()
      .positive({ error: "Escolha a cidade na lista." }),
  }),
  z.object({
    mode: z.literal("manual"),
    name: z
      .string({ error: "Informe o nome da cidade." })
      .trim()
      .min(2, { error: "Informe o nome da cidade." })
      .max(80, { error: "O nome da cidade é longo demais." }),
    latitude: coordinate("a latitude", 90),
    longitude: coordinate("a longitude", 180),
    timezone: z
      .string({ error: "Informe o fuso horário." })
      .trim()
      .refine(isValidTimeZone, {
        error: "Fuso horário inválido. Exemplo: America/Sao_Paulo.",
      }),
  }),
]);

export const birthProfileSchema = z
  .object({
    name: z
      .string({ error: "Informe o nome." })
      .trim()
      .min(2, { error: "Informe o nome de quem nasceu." })
      .max(80, { error: "O nome pode ter no máximo 80 caracteres." }),
    birth_date: birthDateSchema,
    time_unknown: z.boolean(),
    birth_time: z.string().optional(),
    city,
  })
  .superRefine((v, ctx) => {
    if (!v.time_unknown) {
      if (!v.birth_time) {
        ctx.addIssue({
          code: "custom",
          path: ["birth_time"],
          message: 'Informe a hora de nascimento ou marque "Não sei a hora".',
        });
      } else if (!time.safeParse(v.birth_time).success) {
        ctx.addIssue({
          code: "custom",
          path: ["birth_time"],
          message: "Informe uma hora válida.",
        });
      }
    }
  });

export type BirthProfileInput = z.infer<typeof birthProfileSchema>;

/** Converte os campos do formulário no formato do schema. */
export function birthProfileFromForm(formData: FormData) {
  const get = (k: string) => formData.get(k)?.toString() ?? "";
  const mode = get("city_mode") === "manual" ? "manual" : "db";
  return {
    name: get("name"),
    birth_date: get("birth_date"),
    time_unknown: get("time_unknown") === "on",
    birth_time: get("birth_time") || undefined,
    city:
      mode === "manual"
        ? {
            mode,
            name: get("manual_name"),
            latitude: get("manual_latitude"),
            longitude: get("manual_longitude"),
            timezone: get("manual_timezone"),
          }
        : { mode, city_id: get("city_id") },
  };
}
