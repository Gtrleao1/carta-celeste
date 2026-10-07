import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isExistingAccount } from "@/lib/auth/signup-result";

import { anonClient, hasSupabaseEnv, serviceClient } from "./helpers";

/**
 * Confere, no Supabase real, que cadastrar de novo um e-mail já confirmado é
 * reconhecido por `isExistingAccount`. Não testa o caso de e-mail novo de
 * propósito: ele dispararia um e-mail de verdade e consumiria o limite de
 * envios do Supabase.
 */
describe.skipIf(!hasSupabaseEnv)("cadastro com e-mail já existente", () => {
  const admin = hasSupabaseEnv ? serviceClient() : (null as never);
  const email = `existente-${randomUUID()}@exemplo.test`;
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }, 30_000);

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 30_000);

  it("é reconhecido como conta existente, ignorando maiúsculas", async () => {
    for (const variant of [email, email.toUpperCase()]) {
      const result = await anonClient().auth.signUp({
        email: variant,
        password: randomUUID(),
      });
      expect(isExistingAccount(result)).toBe(true);
      // Nenhuma sessão é criada e nenhum usuário novo aparece.
      expect(result.data.session).toBeNull();
    }
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
    expect(
      data.users.filter((u) => u.email?.toLowerCase() === email),
    ).toHaveLength(1);
  });
});
