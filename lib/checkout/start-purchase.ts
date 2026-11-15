import { fieldErrorsFrom, type FormState } from "@/lib/auth/form-state";
import { signUpSchema } from "@/lib/auth/schemas";
import { isExistingAccount } from "@/lib/auth/signup-result";
import { birthProfileFromForm, birthProfileSchema } from "@/lib/birth/schemas";
import type { BirthProfileInput } from "@/lib/birth/schemas";

/**
 * Compra começada pela home: um formulário só cria a conta e guarda os dados de
 * nascimento. Lógica pura, com as dependências injetadas (como `payOrder`), para
 * testar sem rede; a Server Action só liga as dependências reais.
 *
 * Ordem: valida tudo → limite de tentativas → produto existe → cria a conta →
 * guarda o perfil → segue. O perfil só é guardado para conta recém-criada: se o
 * e-mail já tem conta, nada é gravado (ninguém escreve na conta de outra pessoa).
 */

export type StartPurchaseDeps = {
  underRateLimit(): Promise<boolean>;
  productExists(slug: string): Promise<boolean>;
  signUp(args: {
    email: string;
    password: string;
    fullName: string;
    /** Para onde o link de confirmação do e-mail leva. */
    next: string;
  }): Promise<{
    data: {
      user: { id: string; identities?: unknown[] | null } | null;
      session: unknown | null;
    } | null;
    error: { code?: string; message?: string } | null;
  }>;
  /** Grava o perfil de nascimento da conta nova. `false` se não conseguiu. */
  saveProfile(userId: string, birth: BirthProfileInput): Promise<boolean>;
};

export type StartPurchaseOutcome =
  { state: FormState } | { redirectTo: string };

const SLUG = /^[a-z0-9][a-z0-9-]{0,60}$/;

export const purchasePath = (slug: string) => `/comprar/${slug}?confirmar=1`;

export async function runStartPurchase(
  deps: StartPurchaseDeps,
  formData: FormData,
): Promise<StartPurchaseOutcome> {
  const get = (k: string) => formData.get(k);
  const slug = get("product_slug")?.toString() ?? "";

  const account = signUpSchema.safeParse({
    full_name: get("full_name"),
    email: get("email"),
    password: get("password"),
    accepted_terms: get("accepted_terms"),
  });
  // O nome da conta é também o nome de quem nasceu (um campo só na home).
  const birth = birthProfileSchema.safeParse({
    ...birthProfileFromForm(formData),
    name: get("full_name")?.toString() ?? "",
  });

  if (!account.success || !birth.success) {
    const fieldErrors: Record<string, string[]> = {};
    const add = (key: string, messages: string[]) => {
      const list = (fieldErrors[key] ??= []);
      for (const m of messages) if (!list.includes(m)) list.push(m);
    };
    if (!account.success) {
      for (const [k, v] of Object.entries(
        fieldErrorsFrom(account.error).fieldErrors ?? {},
      )) {
        add(k, v);
      }
    }
    if (!birth.success) {
      for (const [k, v] of Object.entries(
        fieldErrorsFrom(birth.error).fieldErrors ?? {},
      )) {
        // O nome é um campo só: o erro do nome de quem nasceu só vale se o da conta não disse o mesmo.
        if (k === "name") {
          if (!fieldErrors.full_name) add("full_name", v);
        } else add(k, v);
      }
    }
    return { state: { fieldErrors } };
  }

  if (!(await deps.underRateLimit())) {
    return {
      state: {
        error: "Muitas tentativas. Aguarde um pouco e tente de novo.",
      },
    };
  }

  if (!SLUG.test(slug) || !(await deps.productExists(slug))) {
    return { state: { error: "Este mapa não está disponível agora." } };
  }

  const next = purchasePath(slug);
  const { data, error } = await deps.signUp({
    email: account.data.email,
    password: account.data.password,
    fullName: account.data.full_name,
    next,
  });

  // E-mail que já tem conta: não grava nada; oferece entrar ou criar nova senha.
  if (isExistingAccount({ data, error })) {
    return { state: { existingAccountEmail: account.data.email } };
  }
  if (error) {
    return {
      state: {
        error:
          error.code === "over_email_send_rate_limit"
            ? "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo."
            : "Não foi possível criar a conta agora. Tente de novo em instantes.",
      },
    };
  }
  const userId = data?.user?.id;
  if (!userId) {
    return {
      state: {
        error:
          "Não foi possível criar a conta agora. Tente de novo em instantes.",
      },
    };
  }

  // Se não gravar, a compra segue: a tela seguinte pede os dados de novo.
  await deps.saveProfile(userId, birth.data);

  if (data?.session) return { redirectTo: next };

  // Com confirmação de e-mail ligada não há sessão até o clique no link.
  return {
    state: {
      message: `Quase lá! Enviamos um link de confirmação para ${account.data.email}. Abra-o para ativar sua conta e seguir para o pagamento, com os seus dados já preenchidos (confira também o spam).`,
    },
  };
}
