"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, type FormState } from "@/lib/auth/form-state";
import { safeNextPath } from "@/lib/auth/redirect";
import { isExistingAccount } from "@/lib/auth/signup-result";
import { clientIpFromHeaders, withinRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth/schemas";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

/** Limite de tentativas por IP e por tipo de ação (guardado no Postgres). */
async function underLimit(scope: string, max: number, windowSeconds: number) {
  const ip = clientIpFromHeaders(await headers());
  return withinRateLimit(
    createAdminClient(),
    `${scope}:${ip}`,
    max,
    windowSeconds,
  );
}

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Confirme seu e-mail antes de entrar. Enviamos um link para a sua caixa de entrada.",
      };
    }
    // Mensagem única para não revelar se o e-mail tem cadastro.
    return { error: "E-mail ou senha incorretos." };
  }

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    accepted_terms: formData.get("accepted_terms"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  // Como o cadastro revela se um e-mail já tem conta, limita tentativas por IP.
  if (!(await underLimit("cadastro", 10, 3600))) {
    return {
      error: "Muitas tentativas de cadastro. Aguarde um pouco e tente de novo.",
    };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // O gatilho handle_new_user copia estes metadados para `profiles`.
      data: {
        full_name: parsed.data.full_name,
        accepted_terms_at: new Date().toISOString(),
      },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/conta`,
    },
  });

  // E-mail que já tem conta: o Supabase não envia nada. Avisamos a pessoa e
  // oferecemos entrar ou criar uma nova senha.
  if (isExistingAccount({ data, error })) {
    return { existingAccountEmail: parsed.data.email };
  }

  if (error) {
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo."
          : "Não foi possível criar a conta agora. Tente de novo em instantes.",
    };
  }

  // Com confirmação de e-mail ligada, não há sessão até o clique no link.
  if (!data.session) {
    return {
      message:
        "Quase lá! Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar sua conta (confira também o spam).",
    };
  }

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  if (!(await underLimit("recuperar", 10, 3600))) {
    return {
      error: "Muitas tentativas. Aguarde um pouco e tente de novo.",
    };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });

  // Mesma resposta exista ou não o cadastro, para não revelar quem é cliente.
  return {
    message:
      "Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha. Confira também a caixa de spam.",
  };
}

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "O link expirou ou já foi usado. Peça um novo link para redefinir sua senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error:
        "Não foi possível alterar a senha. Escolha uma senha diferente da atual e tente de novo.",
    };
  }

  redirect("/conta?senha=alterada");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
