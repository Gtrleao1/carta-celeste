import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/lib/products";
import { DISCLAIMER } from "@/lib/site-config";

/**
 * Vitrine para quando o site vende um único mapa: o produto ocupa a seção
 * inteira, com o que vem nele, o preço e o botão de compra. Com mais de um
 * produto ativo, a home volta a mostrar os cartões (`ProductCard`).
 */
export function FeaturedProduct({ product }: { product: Product }) {
  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div className="grid gap-6">
        {product.tagline && (
          <p className="text-primary text-sm font-medium tracking-wide">
            {product.tagline}
          </p>
        )}
        <p className="text-lg leading-relaxed">{product.short_description}</p>

        {product.sections.length > 0 && (
          <div className="grid gap-3">
            <h3 className="font-heading text-2xl font-semibold">
              O que vem no seu mapa
            </h3>
            <p className="text-muted-foreground">
              Uma leitura completa em {product.sections.length} partes, com a
              roda do seu mapa e as tabelas de posições.
            </p>
            <ol className="grid gap-x-8 sm:grid-cols-2">
              {product.sections.map((s, i) => (
                <li
                  key={s.key}
                  className="border-border/60 flex gap-3 border-b py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="text-primary font-heading w-6 shrink-0"
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </li>
              ))}
            </ol>
          </div>
        )}

        {product.focus_points.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Pontos analisados">
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
      </div>

      <aside className="bg-card border-border order-first grid gap-4 rounded-xl border p-6 lg:order-none">
        <div>
          <p className="font-heading text-primary text-5xl font-semibold">
            {formatBRL(product.price_cents)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Pix, boleto ou cartão em até 12x
          </p>
        </div>
        <ul className="text-muted-foreground grid gap-2 text-sm">
          <li>Calculado para o dia, a hora e a cidade em que você nasceu</li>
          <li>Pronto em poucos minutos, na sua área do cliente</li>
          <li>Para ler no celular e imprimir ou salvar em PDF</li>
        </ul>
        <Link
          href={`/comprar/${product.slug}`}
          className={buttonVariants({ size: "lg" }) + " h-12 text-base"}
        >
          Quero meu {product.name}
        </Link>
        <Link
          href={`/mapa/${product.slug}`}
          className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
        >
          Ver exemplo e mais detalhes
        </Link>
        <p className="text-muted-foreground text-xs">{DISCLAIMER}</p>
      </aside>
    </div>
  );
}
