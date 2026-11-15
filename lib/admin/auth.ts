import "server-only";

import { notFound, redirect } from "next/navigation";

import { adminMfaRequired, mfaStep, securityPath } from "@/lib/auth/mfa";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante, no servidor, que quem pede é um admin (`user_roles`, via `is_admin()`
 * do banco, que lê o `auth.uid()` da sessão). Esconder links não protege nada:
 * todo layout, página e Server Action do /admin chama esta função.
 *
 * - Sem login: vai para /entrar.
 * - Logado sem o papel: 404 (não revela que a área existe).
 * - Com `ADMIN_REQUIRE_MFA=true`: a sessão precisa ter confirmado o código do
 *   aplicativo autenticador (`aal2`); senão vai para /conta/seguranca.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  if (adminMfaRequired()) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const step = mfaStep(
      {
        currentLevel: aal?.currentLevel ?? null,
        nextLevel: aal?.nextLevel ?? null,
      },
      true,
    );
    if (step !== "ok") redirect(securityPath("/admin"));
  }

  return { user };
}
