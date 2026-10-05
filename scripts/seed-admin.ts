/**
 * Dá o papel de admin ao usuário cujo e-mail é ADMIN_EMAIL.
 *
 * O usuário precisa já ter criado a conta em /cadastro (e confirmado o
 * e-mail, se a confirmação estiver ligada). Nenhuma senha é definida aqui.
 *
 * Uso: npm run db:seed-admin
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !adminEmail) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e ADMIN_EMAIL no .env.local.",
    );
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  for (let page = 1; !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`Erro ao listar usuários: ${error.message}`);
    userId =
      data.users.find((u) => u.email?.toLowerCase() === adminEmail)?.id ?? null;
    if (data.users.length < 200) break;
  }

  if (!userId) {
    console.log(
      `Nenhum usuário com o e-mail ${adminEmail}. Crie a conta em /cadastro e rode este comando de novo.`,
    );
    process.exit(1);
  }

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  if (error)
    throw new Error(`Erro ao gravar o papel de admin: ${error.message}`);
  console.log(`Papel de admin concedido a ${adminEmail}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
