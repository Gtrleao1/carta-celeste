"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { TOTP_CODE } from "@/lib/auth/mfa";
import { safeNextPath } from "@/lib/auth/redirect";
import { withinRateLimit } from "@/lib/rate-limit";
import { SITE } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EnrollState = FormState & {
  /** Dados para a pessoa cadastrar o aplicativo (aparecem só uma vez). */
  enroll?: { factorId: string; qr: string; secret: string };
};

/** Quem pede precisa estar logado; devolve o cliente e o usuário. */
async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta/seguranca");
  return { supabase, user };
}

/**
 * Passo 1: gera o segredo e o QR Code para o aplicativo autenticador. Fatores
 * não confirmados de tentativas anteriores são apagados (eles não valem nada).
 */
export async function startEnrollment(): Promise<EnrollState> {
  const { supabase, user } = await currentUser();

  if (
    !(await withinRateLimit(createAdminClient(), `mfa:${user.id}`, 10, 600))
  ) {
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp?.some((f) => f.status === "verified")) {
    return { error: "A verificação em dois passos já está ativa." };
  }
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    // O nome precisa ser único entre os fatores da pessoa.
    friendlyName: `Aplicativo ${new Date().toISOString().slice(0, 19)}`,
    issuer: SITE.name,
  });
  if (error || !data) {
    return {
      error:
        "Não foi possível iniciar agora. Tente de novo em instantes ou avise o suporte.",
    };
  }
  return {
    enroll: {
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

/**
 * Passo 2 (e também o login de quem já tem aplicativo): confere o código de 6
 * dígitos. Com sucesso a sessão passa a `aal2` e a pessoa segue para `next`.
 */
export async function verifyCode(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const { supabase, user } = await currentUser();

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const factorId = String(formData.get("factor_id") ?? "");
  const next = safeNextPath(formData.get("next")?.toString());

  if (!TOTP_CODE.test(code)) {
    return { fieldErrors: { code: ["Digite os 6 números do aplicativo."] } };
  }
  if (!/^[0-9a-f-]{36}$/i.test(factorId)) {
    return { error: "Não foi possível confirmar. Recarregue a página." };
  }

  // Trava quem tenta adivinhar o código (1 em 1 milhão por tentativa).
  if (
    !(await withinRateLimit(createAdminClient(), `mfa:${user.id}`, 10, 600))
  ) {
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) {
    return {
      fieldErrors: {
        code: [
          "Código incorreto ou vencido. Confira se o horário do celular está automático e tente o código novo.",
        ],
      },
    };
  }

  redirect(next);
}
