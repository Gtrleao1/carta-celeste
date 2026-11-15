"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { saveBirthProfile } from "@/lib/birth/save-profile";
import { runStartPurchase } from "@/lib/checkout/start-purchase";
import { getProductBySlug } from "@/lib/products";
import { clientIpFromHeaders, withinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Formulário da home: cria a conta e guarda os dados de nascimento de uma vez
 * (regras em `runStartPurchase`). O perfil é gravado com a chave de serviço
 * porque, com a confirmação de e-mail ligada, a conta ainda não tem sessão; isso
 * só acontece para conta recém-criada (nunca para e-mail que já tinha cadastro).
 */
export async function startPurchase(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = createAdminClient();
  const ip = clientIpFromHeaders(await headers());

  const outcome = await runStartPurchase(
    {
      // Mesmo balde do cadastro: este formulário também revela se o e-mail tem conta.
      underRateLimit: () => withinRateLimit(admin, `cadastro:${ip}`, 10, 3600),
      productExists: async (slug) => Boolean(await getProductBySlug(slug)),
      signUp: async ({ email, password, fullName, next }) => {
        const supabase = await createClient();
        const siteUrl = await getSiteUrl();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // O gatilho handle_new_user copia estes metadados para `profiles`.
            data: {
              full_name: fullName,
              accepted_terms_at: new Date().toISOString(),
            },
            emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        return { data, error };
      },
      saveProfile: async (userId, birth) =>
        (await saveBirthProfile(admin, userId, birth)).ok,
    },
    formData,
  );

  if ("redirectTo" in outcome) redirect(outcome.redirectTo);
  return outcome.state;
}
