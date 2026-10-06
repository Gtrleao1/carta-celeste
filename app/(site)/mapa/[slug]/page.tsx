import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChartWheel } from "@/components/chart/chart-wheel";
import { MiniMarkdown } from "@/components/site/mini-markdown";
import { buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { getActiveProducts, getProductBySlug } from "@/lib/products";
import { sampleChart } from "@/lib/sample-chart";
import { DISCLAIMER } from "@/lib/site-config";

// Página estática, regenerada a cada 5 minutos; produtos novos entram sem deploy.
export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/mapa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Mapa não encontrado" };
  return {
    title: product.name,
    description: product.short_description,
    openGraph: { title: product.name, description: product.short_description },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/mapa/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const paragraphs = product.long_description.split(/\n{2,}/).filter(Boolean);

  return (
    <article className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px] lg:gap-14 lg:py-14">
      <div className="grid content-start gap-10">
        <header className="grid gap-4">
          <Link
            href="/#mapas"
            className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
          >
            ← Todos os mapas
          </Link>
          <h1 className="text-5xl leading-tight font-semibold text-balance">
            {product.name}
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            {product.short_description}
          </p>
        </header>

        <section aria-labelledby="sobre" className="grid gap-4">
          <h2 id="sobre" className="text-3xl font-semibold">
            Sobre este mapa
          </h2>
          {paragraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed">
              {p}
            </p>
          ))}
        </section>

        {product.sections.length > 0 && (
          <section aria-labelledby="inclui" className="grid gap-4">
            <h2 id="inclui" className="text-3xl font-semibold">
              O que o relatório inclui
            </h2>
            <ol className="grid gap-2 sm:grid-cols-2">
              {product.sections.map((s, i) => (
                <li
                  key={s.key}
                  className="bg-card border-border flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="text-primary font-heading w-6 text-xl font-semibold"
                  >
                    {i + 1}
                  </span>
                  <span>{s.title}</span>
                </li>
              ))}
            </ol>
            {product.focus_points.length > 0 && (
              <ul
                className="flex flex-wrap gap-2 pt-2"
                aria-label="Pontos analisados"
              >
                {product.focus_points.map((point) => (
                  <li
                    key={point}
                    className="border-border text-muted-foreground rounded-full border px-3 py-1 text-sm"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {product.sample_excerpt && (
          <section aria-labelledby="exemplo" className="grid gap-4">
            <h2 id="exemplo" className="text-3xl font-semibold">
              Exemplo de trecho
            </h2>
            <div className="bg-card border-border grid gap-3 rounded-xl border p-6 text-lg leading-relaxed">
              <MiniMarkdown text={product.sample_excerpt} />
              <p className="text-muted-foreground border-border border-t pt-3 text-sm">
                Trecho de um mapa fictício, só para mostrar o estilo do
                relatório. O seu será escrito a partir dos seus dados.
              </p>
            </div>
          </section>
        )}
      </div>

      <aside className="grid content-start gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="bg-card border-border grid gap-4 rounded-xl border p-6">
          <p className="font-heading text-primary text-5xl font-semibold">
            {formatBRL(product.price_cents)}
          </p>
          <p className="text-muted-foreground text-sm">
            Pix, boleto ou cartão em até 12x. Pronto em até 5 minutos após a
            aprovação do pagamento.
          </p>
          {product.age_restricted && (
            <p className="border-border rounded-lg border px-3 py-2 text-sm">
              Este mapa é exclusivo para maiores de 18 anos. Vamos pedir uma
              confirmação antes do pagamento.
            </p>
          )}
          <Link
            href={`/comprar/${product.slug}`}
            className={buttonVariants({ size: "lg" }) + " h-12 text-base"}
          >
            Quero meu mapa
          </Link>
          <p className="text-muted-foreground text-xs">{DISCLAIMER}</p>
        </div>

        <figure className="grid gap-2">
          <ChartWheel
            chart={sampleChart}
            title="Exemplo de roda do mapa astral"
          />
          <figcaption className="text-muted-foreground text-center text-sm">
            Exemplo de roda do mapa. A sua será calculada com os seus dados.
          </figcaption>
        </figure>
      </aside>
    </article>
  );
}
