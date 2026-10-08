import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { PrintButton } from "@/components/report/print-button";
import {
  ReportView,
  type ReportSection,
} from "@/components/report/report-view";
import type { ChartData } from "@/lib/astro";
import { formatBirthSummary } from "@/lib/birth/summary";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Meu mapa",
  robots: { index: false, follow: false },
};

export default async function MapaPage({
  params,
}: PageProps<"/meus-mapas/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/entrar?next=${encodeURIComponent(`/meus-mapas/${id}`)}`);

  // A RLS só deixa ver pedidos e relatórios do próprio usuário: o de outra
  // pessoa simplesmente não existe aqui (404).
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, product_id, birth_profile_id")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  // Ainda não está pronto: a página de acompanhamento mostra o progresso,
  // retoma geração parada e leva para cá quando terminar.
  if (order.status !== "ready") redirect(`/pedido/${id}/retorno`);

  const [{ data: report }, { data: product }, { data: birth }] =
    await Promise.all([
      supabase
        .from("reports")
        .select("chart_data, sections")
        .eq("order_id", id)
        .maybeSingle(),
      supabase
        .from("products")
        .select("name")
        .eq("id", order.product_id)
        .maybeSingle(),
      order.birth_profile_id
        ? supabase
            .from("birth_profiles")
            .select(
              "name, birth_date, birth_time, time_unknown, city_name, timezone",
            )
            .eq("id", order.birth_profile_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  if (!report?.chart_data) redirect(`/pedido/${id}/retorno`);

  const birthSummary = birth
    ? `${birth.name} · ${formatBirthSummary({
        birthDate: birth.birth_date,
        birthTime: birth.time_unknown
          ? null
          : (birth.birth_time?.slice(0, 5) ?? null),
        timezone: birth.timezone,
        cityName: birth.city_name,
      })}`
    : null;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/meus-mapas"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          ← Meus mapas
        </Link>
        <PrintButton />
      </div>

      <ReportView
        productName={product?.name ?? "Seu mapa astral"}
        birthSummary={birthSummary}
        chart={report.chart_data as ChartData}
        sections={report.sections as ReportSection[]}
      />
    </div>
  );
}
