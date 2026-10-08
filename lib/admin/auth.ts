import "server-only";

import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Garante, no servidor, que quem pede é um admin (`user_roles`, via `is_admin()`
 * do banco, que lê o `auth.uid()` da sessão). Esconder links não protege nada:
 * todo layout, página e Server Action do /admin chama esta função.
 *
 * - Sem login: vai para /entrar.
 * - Logado sem o papel: 404 (não revela que a área existe).
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  return { user };
}
