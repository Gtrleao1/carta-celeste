/**
 * Cria um comprador de teste (usuário confirmado + perfil de nascimento) para
 * testar a compra à mão no navegador. Grava e-mail e senha só no arquivo
 * indicado (fora do repositório); nada é impresso.
 *
 *   npx tsx --env-file=.env.local scripts/make-test-buyer.ts <saida.json>
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("Informe o arquivo de saída.");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const email = `teste-manual-${randomUUID().slice(0, 8)}@exemplo.test`;
  const password = randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Comprador de Teste" },
  });
  if (error || !data.user) throw error ?? new Error("Falha ao criar usuário");

  const { error: bpError } = await admin.from("birth_profiles").insert({
    user_id: data.user.id,
    name: "Perfil de teste",
    birth_date: "1995-07-14",
    birth_time: "15:30",
    city_name: "Campinas, SP",
    latitude: -22.9,
    longitude: -47.06,
    timezone: "America/Sao_Paulo",
  });
  if (bpError) throw bpError;

  writeFileSync(out, JSON.stringify({ id: data.user.id, email, password }));
  console.log("Comprador de teste criado.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
