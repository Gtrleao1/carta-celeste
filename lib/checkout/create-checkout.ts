import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdult } from "@/lib/birth/age";
import { birthDateSchema } from "@/lib/birth/schemas";
import type { createMpPreference } from "@/lib/payments/mercadopago";

import type { CheckoutInput } from "./schemas";

export type CheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; status: number; error: string };

export type CheckoutParams = {
  /** Cliente com a sessão do usuário (sujeito à RLS). */
  userClient: SupabaseClient;
  /** Cliente com a service role (só para escrever pedidos). */
  admin: SupabaseClient;
  user: { id: string; email: string };
  input: CheckoutInput;
  siteUrl: string;
  createPreference: typeof createMpPreference;
};

type ProductRow = {
  id: string;
  name: string;
  price_cents: number;
  active: boolean;
  age_restricted: boolean;
};

const fail = (status: number, error: string): CheckoutResult => ({
  ok: false,
  status,
  error,
});

const UNAVAILABLE = "Este mapa não está disponível no momento.";
const PAYMENT_ERROR =
  "Não foi possível iniciar o pagamento agora. Tente de novo em instantes.";

/**
 * Cria (ou retoma) o pedido e a preferência do Mercado Pago.
 * Regras: sessão obrigatória, produto ativo, perfil de nascimento do próprio
 * usuário, 18+ nos produtos restritos e preço sempre lido do banco.
 */
export async function createCheckout(
  p: CheckoutParams,
): Promise<CheckoutResult> {
  const { userClient, admin, user, input } = p;

  // --- Nova tentativa de pagamento de um pedido pendente ----------------
  if ("orderId" in input) {
    const { data: order } = await userClient
      .from("orders")
      .select("id, status, amount_cents, product_id")
      .eq("id", input.orderId)
      .maybeSingle();
    if (!order) return fail(404, "Pedido não encontrado.");
    if (order.status !== "pending") {
      return fail(409, "Este pedido já foi pago ou encerrado.");
    }
    const { data: product } = await admin
      .from("products")
      .select("id, name, active")
      .eq("id", order.product_id)
      .maybeSingle();
    if (!product?.active) return fail(409, UNAVAILABLE);

    return startPayment(p, {
      orderId: order.id,
      productId: product.id,
      title: product.name,
      amountCents: order.amount_cents,
    });
  }

  // --- Novo pedido --------------------------------------------------------
  const { data: product } = await admin
    .from("products")
    .select("id, name, price_cents, active, age_restricted")
    .eq("slug", input.productSlug)
    .maybeSingle<ProductRow>();
  if (!product || !product.active) return fail(404, UNAVAILABLE);

  // A RLS garante que só enxergamos perfis do próprio usuário.
  const { data: birthProfile } = await userClient
    .from("birth_profiles")
    .select("id")
    .eq("id", input.birthProfileId)
    .maybeSingle();
  if (!birthProfile) return fail(404, "Perfil de nascimento não encontrado.");

  let ageConfirmedAt: string | null = null;
  if (product.age_restricted) {
    const buyerDate = birthDateSchema.safeParse(input.buyerBirthDate);
    if (input.ageDeclared !== true || !buyerDate.success) {
      return fail(
        400,
        "Este mapa é exclusivo para maiores de 18 anos. Confirme sua idade para continuar.",
      );
    }
    if (!isAdult(buyerDate.data)) {
      return fail(403, "Este mapa é exclusivo para maiores de 18 anos.");
    }
    await userClient
      .from("profiles")
      .update({ birth_date_of_buyer: buyerDate.data })
      .eq("id", user.id);
    ageConfirmedAt = new Date().toISOString();
  }

  // O preço sai do banco, nunca do navegador.
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: product.id,
      birth_profile_id: birthProfile.id,
      amount_cents: product.price_cents,
      age_confirmed_at: ageConfirmedAt,
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("[checkout] erro ao criar o pedido:", error?.message);
    return fail(500, PAYMENT_ERROR);
  }

  const result = await startPayment(p, {
    orderId: order.id,
    productId: product.id,
    title: product.name,
    amountCents: product.price_cents,
  });
  // Se o pagamento não pôde ser iniciado, o pedido não fica pendurado.
  if (!result.ok) {
    await admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("status", "pending");
  }
  return result;
}

async function startPayment(
  p: CheckoutParams,
  o: { orderId: string; productId: string; title: string; amountCents: number },
): Promise<CheckoutResult> {
  try {
    const preference = await p.createPreference({
      orderId: o.orderId,
      productId: o.productId,
      title: o.title,
      amountCents: o.amountCents,
      payerEmail: p.user.email,
      siteUrl: p.siteUrl,
    });
    await p.admin
      .from("orders")
      .update({ mp_preference_id: preference.id })
      .eq("id", o.orderId);
    return { ok: true, url: preference.initPoint, orderId: o.orderId };
  } catch (e) {
    console.error(
      "[checkout] erro ao criar a preferência:",
      e instanceof Error ? e.message : "erro desconhecido",
    );
    return fail(502, PAYMENT_ERROR);
  }
}
