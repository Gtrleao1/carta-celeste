/**
 * Verificação em dois passos (TOTP, aplicativo autenticador) do Supabase.
 *
 * O Supabase dá a cada sessão um nível de garantia: `aal1` (só a senha) ou
 * `aal2` (senha + código). `currentLevel` é o da sessão; `nextLevel` é o que ela
 * pode alcançar (`aal2` quando a pessoa já cadastrou um aplicativo).
 *
 * O /admin exige `aal2` quando `ADMIN_REQUIRE_MFA=true`. A variável existe para
 * o lançamento ser seguro: primeiro o admin cadastra o aplicativo em
 * `/conta/seguranca`, depois liga a variável. Ligar antes de cadastrar trancaria
 * o admin do lado de fora (a saída é desligar a variável na Vercel).
 */

export type AalInfo = {
  currentLevel: string | null;
  nextLevel: string | null;
};

export type MfaStep = "ok" | "enroll" | "verify";

/** O que falta para a sessão poder entrar numa área protegida. */
export function mfaStep(aal: AalInfo, required: boolean): MfaStep {
  if (!required) return "ok";
  if (aal.currentLevel === "aal2") return "ok";
  // Já tem aplicativo cadastrado: falta digitar o código. Senão: cadastrar.
  return aal.nextLevel === "aal2" ? "verify" : "enroll";
}

export const adminMfaRequired = () => process.env.ADMIN_REQUIRE_MFA === "true";

/** Página onde se cadastra o aplicativo ou digita o código; `next` é para onde voltar. */
export const securityPath = (next: string) =>
  `/conta/seguranca?next=${encodeURIComponent(next)}`;

/** O código do aplicativo tem sempre 6 dígitos. */
export const TOTP_CODE = /^\d{6}$/;
