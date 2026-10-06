import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anônimo, sem cookies, para ler dados públicos (produtos, cidades).
 * Por não depender da sessão, permite páginas estáticas com revalidação.
 * Devolve `null` se o Supabase não estiver configurado (ex.: build no CI).
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
