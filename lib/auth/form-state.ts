import type { z } from "zod";

export type FormState = {
  /** Erro geral do formulário. */
  error?: string;
  /** Mensagem de sucesso. */
  message?: string;
  /** Erros por campo. */
  fieldErrors?: Record<string, string[]>;
};

/** Converte os erros do Zod em erros por campo. */
export function fieldErrorsFrom(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { fieldErrors };
}
