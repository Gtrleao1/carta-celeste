import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-semibold">
          {product.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-muted-foreground text-base leading-relaxed">
          {product.short_description}
        </p>
        {product.focus_points.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Pontos do mapa">
            {product.focus_points.slice(0, 6).map((point) => (
              <li
                key={point}
                className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
              >
                {point}
              </li>
            ))}
          </ul>
        )}
        {product.age_restricted && (
          <p className="text-muted-foreground text-xs">
            Somente para maiores de 18 anos.
          </p>
        )}
        <div className="mt-auto grid gap-3 pt-2">
          <div>
            <p className="font-heading text-primary text-3xl font-semibold">
              {formatBRL(product.price_cents)}
            </p>
            <p className="text-muted-foreground text-xs">
              Pix, boleto ou cartão em até 12x
            </p>
          </div>
          <Link
            href={`/mapa/${product.slug}`}
            className={buttonVariants({ size: "lg" }) + " h-11 text-base"}
            aria-label={`Ver detalhes do ${product.name}`}
          >
            Ver detalhes
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
