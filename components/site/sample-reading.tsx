import Link from "next/link";

import { MiniMarkdown } from "@/components/site/mini-markdown";
import { buttonVariants } from "@/components/ui/button";
import { SAMPLE_READING } from "@/lib/sample-reading";
import { CTA_LABEL } from "@/lib/site-config";

/**
 * "Folheie um trecho antes de pedir": o começo de um mapa de exemplo (dados
 * fictícios), na largura da home, com o texto em colunas e um desvanecer no
 * fim, e o botão de compra ao lado. O texto inteiro está na página (leitores
 * de tela e buscadores leem tudo); só a aparência desvanece.
 */
export function SampleReading({
  buyHref,
  parts,
}: {
  buyHref: string;
  /** Quantas partes tem o mapa à venda (omitido quando há vários produtos). */
  parts?: number;
}) {
  return (
    <section
      id="folheie"
      aria-labelledby="titulo-folheie"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14"
    >
      <div className="bg-card border-border grid overflow-hidden rounded-xl border lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Apresentação e compra */}
        <div className="border-border grid content-start gap-4 border-b p-6 lg:border-r lg:border-b-0 lg:p-8">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">
            Veja como é por dentro
          </p>
          <h2 id="titulo-folheie" className="text-4xl font-semibold">
            Folheie um trecho antes de pedir
          </h2>
          <p className="text-muted-foreground text-lg">
            É assim que o seu mapa é escrito: em linguagem simples, com exemplos
            do dia a dia.
          </p>
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">
              {SAMPLE_READING.section}
            </span>
            <br />
            Trecho de um mapa de exemplo (dados fictícios)
          </p>
          <p className="text-muted-foreground text-sm">
            {parts
              ? `O seu mapa tem ${parts} partes como esta, escritas para os seus dados.`
              : "O seu mapa é escrito a partir dos seus dados, parte por parte."}
          </p>
          <Link
            href={buyHref}
            className={buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"}
          >
            {CTA_LABEL}
          </Link>
        </div>

        {/* Trecho, em colunas, desvanecendo no fim */}
        <div className="relative min-w-0">
          <div className="max-h-[30rem] overflow-hidden p-6 text-lg leading-relaxed lg:p-8 [&_h3]:break-after-avoid [&_p]:break-inside-avoid xl:[&>div]:block xl:[&>div]:columns-2 xl:[&>div]:gap-10 xl:[&>div>*]:mb-3">
            <MiniMarkdown text={SAMPLE_READING.markdown} />
          </div>
          {/* Desvanece o fim do trecho; é só decoração. */}
          <div
            aria-hidden="true"
            className="from-card pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
