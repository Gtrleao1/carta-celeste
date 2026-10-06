import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { SavedBirthProfile } from "@/app/(site)/comprar/[slug]/actions";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { getProductBySlug } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Comprar",
  robots: { index: false },
};

export default async function ComprarPage({
  params,
}: PageProps<"/comprar/[slug]">) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/comprar/${slug}`)}`);

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [{ data: profiles }, { data: profile }] = await Promise.all([
    supabase
      .from("birth_profiles")
      .select(
        "id, name, birth_date, birth_time, time_unknown, city_name, timezone",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("birth_date_of_buyer")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <Link
          href={`/mapa/${product.slug}`}
          className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
        >
          ← {product.name}
        </Link>
        <h1 className="text-5xl font-semibold">Seu mapa</h1>
      </header>

      <CheckoutFlow
        product={{
          slug: product.slug,
          name: product.name,
          price_cents: product.price_cents,
          age_restricted: product.age_restricted,
        }}
        profiles={(profiles ?? []) as SavedBirthProfile[]}
        buyerBirthDate={profile?.birth_date_of_buyer ?? null}
      />
    </div>
  );
}
