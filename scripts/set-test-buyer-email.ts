/**
 * Troca o e-mail de um comprador de teste (o Mercado Pago recusa domínios como
 * `.test`). Uso:
 *   npx tsx --env-file=.env.local scripts/set-test-buyer-email.ts <userId> <novo-email>
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [id, email] = process.argv.slice(2);
  if (!id || !email)
    throw new Error("Informe o id do usuário e o novo e-mail.");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await admin.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
  });
  if (error) throw error;
  console.log("E-mail atualizado.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
