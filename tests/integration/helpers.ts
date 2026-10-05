import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

// Os testes de integração rodam contra o projeto Supabase configurado em
// .env.local. Sem as chaves (como no CI), eles são pulados.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseEnv = Boolean(url && anonKey && serviceKey);

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Cliente anônimo (sem login), sujeito à RLS. */
export const anonClient = () => createClient(url!, anonKey!, options);

/** Cliente com a service role key: ignora a RLS. */
export const serviceClient = () => createClient(url!, serviceKey!, options);

/** Cria um usuário de teste já confirmado e devolve um cliente logado como ele. */
export async function createTestUser(label: string) {
  const admin = serviceClient();
  const email = `teste-${label}-${randomUUID()}@exemplo.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Usuário ${label}` },
  });
  if (error || !data.user) throw error ?? new Error("Falha ao criar usuário");

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { id: data.user.id, email, client };
}
