import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role key: ignora a RLS. Usar somente em código de
 * servidor, depois de verificar quem está pedindo a operação.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
