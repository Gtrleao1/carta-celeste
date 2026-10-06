import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

export type ReportSectionSummary = { key: string; title: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  long_description: string;
  price_cents: number;
  age_restricted: boolean;
  /** Só chave e título: as instruções de IA nunca vão para as páginas públicas. */
  sections: ReportSectionSummary[];
  focus_points: string[];
  sample_excerpt: string | null;
};

// Não seleciona `ai_instructions` nem as instruções de cada seção.
const COLUMNS =
  "id, slug, name, short_description, long_description, price_cents, age_restricted, report_sections, focus_points, sample_excerpt";

type Row = Omit<Product, "sections"> & {
  report_sections: { key: string; title: string }[] | null;
};

function toProduct(row: Row): Product {
  const { report_sections, ...rest } = row;
  return {
    ...rest,
    focus_points: Array.isArray(rest.focus_points) ? rest.focus_points : [],
    sections: (report_sections ?? []).map(({ key, title }) => ({ key, title })),
  };
}

/** Produtos ativos, na ordem da vitrine. */
export async function getActiveProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);
  return (data as unknown as Row[]).map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar produto: ${error.message}`);
  return data ? toProduct(data as unknown as Row) : null;
}
