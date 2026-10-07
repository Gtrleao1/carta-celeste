/**
 * Descobre se um `supabase.auth.signUp` bateu num e-mail que já tem conta.
 *
 * Com a confirmação de e-mail ligada, o Supabase não devolve erro nesse caso
 * (para não revelar quem é cliente): devolve um usuário "de mentira" com a
 * lista de identidades vazia e não envia e-mail. Sem confirmação, devolve o
 * erro `user_already_exists`. Tratamos os dois.
 */
export function isExistingAccount(result: {
  data: { user: { identities?: unknown[] | null } | null } | null;
  error: { code?: string; message?: string } | null;
}): boolean {
  const { data, error } = result;
  if (error) {
    return (
      error.code === "user_already_exists" ||
      error.code === "email_exists" ||
      /already (been )?registered/i.test(error.message ?? "")
    );
  }
  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}
