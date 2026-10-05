import { z } from "zod";

const email = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

// O Supabase aceita senhas de até 72 caracteres.
const password = z
  .string({ error: "Informe a senha." })
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .max(72, { error: "A senha pode ter no máximo 72 caracteres." });

const fullName = z
  .string({ error: "Informe seu nome." })
  .trim()
  .min(2, { error: "Informe seu nome completo." })
  .max(120, { error: "O nome pode ter no máximo 120 caracteres." });

export const signInSchema = z.object({
  email,
  password: z.string({ error: "Informe a senha." }).min(1, {
    error: "Informe a senha.",
  }),
});

export const signUpSchema = z.object({
  full_name: fullName,
  email,
  password,
  accepted_terms: z.literal("on", {
    error: "É preciso aceitar os termos de uso e a política de privacidade.",
  }),
});

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirm: z.string({ error: "Confirme a nova senha." }),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "As senhas não são iguais.",
  });

const isoDate = z
  .string()
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
  .refine((v) => v <= new Date().toISOString().slice(0, 10), {
    error: "A data não pode estar no futuro.",
  });

export const profileSchema = z.object({
  full_name: fullName,
  // Campo opcional: vazio vira null.
  birth_date_of_buyer: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.union([z.null(), isoDate])),
});

export const deleteBirthProfileSchema = z.object({
  id: z.uuid({ error: "Perfil inválido." }),
});

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(
      z.literal("EXCLUIR", {
        error: 'Digite "EXCLUIR" para confirmar.',
      }),
    ),
});
