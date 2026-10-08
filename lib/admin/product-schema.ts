import { z } from "zod";

/** `49,90` ou `49.90` ou `49` -> 4990 centavos; `null` se o valor não for um preço. */
export function parsePriceToCents(input: string): number | null {
  const text = input.trim().replace(/^R\$\s*/i, "");
  const m = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(text);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return cents;
}

/** `4900` -> `49,00` (para preencher o campo de preço). */
export function centsToPriceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Uma linha por item; ignora linhas vazias. */
export function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Preço mínimo vendável: o Mercado Pago não cobra valores muito baixos. */
export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 999_999;

export const sectionSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use só letras minúsculas, números e hífens.",
    )
    .max(40, "No máximo 40 caracteres."),
  title: z
    .string()
    .trim()
    .min(2, "Informe o título.")
    .max(80, "No máximo 80 caracteres."),
  instructions: z
    .string()
    .trim()
    .min(10, "Descreva o que a IA deve escrever nesta seção.")
    .max(3000, "No máximo 3000 caracteres."),
  needs_houses: z.boolean().optional(),
});

export const sectionsSchema = z
  .array(sectionSchema)
  .min(1, "Cadastre pelo menos uma seção.")
  .max(20, "No máximo 20 seções.")
  .superRefine((sections, ctx) => {
    const seen = new Set<string>();
    sections.forEach((s, i) => {
      if (seen.has(s.key)) {
        ctx.addIssue({
          code: "custom",
          message: `A chave "${s.key}" está repetida.`,
          path: [i, "key"],
        });
      }
      seen.add(s.key);
    });
  });

export const productSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, "Use pelo menos 3 caracteres.")
    .max(60, "No máximo 60 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use só letras minúsculas, números e hífens (ex.: mapa-da-carreira).",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome.")
    .max(80, "No máximo 80 caracteres."),
  short_description: z
    .string()
    .trim()
    .min(1, "Informe a descrição curta.")
    .max(300, "No máximo 300 caracteres."),
  long_description: z
    .string()
    .trim()
    .max(5000, "No máximo 5000 caracteres.")
    .default(""),
  price: z.string().transform((v, ctx) => {
    const cents = parsePriceToCents(v);
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um preço, ex.: 49,90.",
      });
      return z.NEVER;
    }
    if (cents < MIN_PRICE_CENTS || cents > MAX_PRICE_CENTS) {
      ctx.addIssue({
        code: "custom",
        message: "O preço deve ficar entre R$ 1,00 e R$ 9.999,99.",
      });
      return z.NEVER;
    }
    return cents;
  }),
  active: z.boolean(),
  age_restricted: z.boolean(),
  sort_order: z.coerce
    .number()
    .int("Use um número inteiro.")
    .min(0, "Use zero ou mais.")
    .max(9999, "Use no máximo 9999."),
  ai_instructions: z
    .string()
    .trim()
    .max(6000, "No máximo 6000 caracteres.")
    .default(""),
  focus_points: z
    .array(z.string().max(60, "Cada ponto tem no máximo 60 caracteres."))
    .max(12, "No máximo 12 pontos de foco."),
  sample_excerpt: z
    .string()
    .trim()
    .max(3000, "No máximo 3000 caracteres.")
    .default(""),
  sections: sectionsSchema,
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductSectionInput = z.infer<typeof sectionSchema>;

/** Lê o corpo do formulário de produto (inclusive o JSON das seções) e valida. */
export function parseProductForm(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");

  let sections: unknown = [];
  try {
    sections = JSON.parse(text("sections") || "[]");
  } catch {
    sections = null;
  }

  return productSchema.safeParse({
    slug: text("slug"),
    name: text("name"),
    short_description: text("short_description"),
    long_description: text("long_description"),
    price: text("price"),
    active: formData.get("active") === "on",
    age_restricted: formData.get("age_restricted") === "on",
    sort_order: text("sort_order") || "0",
    ai_instructions: text("ai_instructions"),
    focus_points: linesToList(text("focus_points")),
    sample_excerpt: text("sample_excerpt"),
    sections,
  });
}

/** Seção como é gravada em `products.report_sections`. */
export function toStoredSections(sections: ProductSectionInput[]) {
  return sections.map((s) => ({
    key: s.key,
    title: s.title,
    instructions: s.instructions,
    ...(s.needs_houses ? { needs_houses: true } : {}),
  }));
}
