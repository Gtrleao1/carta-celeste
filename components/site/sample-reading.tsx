import Link from "next/link";

import { MiniMarkdown } from "@/components/site/mini-markdown";
import { buttonVariants } from "@/components/ui/button";
import { SAMPLE_READING } from "@/lib/sample-reading";
import { CTA_LABEL } from "@/lib/site-config";

/**
 * "Folheie um trecho antes de pedir": o começo de um mapa de exemplo (dados
 * fictícios), que desvanece no fim e leva ao formulário de compra. O texto
 * inteiro está na página (leitores de tela e buscadores leem tudo); só a
 * aparência desvanece.
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
      className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-14"
    >
      <p className="text-primary text-sm font-medium tracking-widest uppercase">
        Veja como é por dentro
      </p>
      <h2 id="titulo-folheie" className="mt-2 text-4xl font-semibold">
        Folheie um trecho antes de pedir
      </h2>
      <p className="text-muted-foreground mt-2 max-w-prose text-lg">
        É assim que o seu mapa é escrito: em linguagem simples, com exemplos do
        dia a dia. Este é o começo de um mapa de exemplo.
      </p>

      <div className="bg-card border-border relative mt-8 overflow-hidden rounded-xl border">
        <div className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-6 py-3 text-sm">
          <span className="text-foreground font-medium">
            {SAMPLE_READING.section}
          </span>
          <span>Exemplo com dados fictícios: {SAMPLE_READING.birth}</span>
        </div>
        <div className="max-h-[34rem] overflow-hidden px-6 pt-6 pb-2 text-lg leading-relaxed">
          <MiniMarkdown text={SAMPLE_READING.markdown} />
        </div>
        {/* Desvanece o fim do trecho; é só decoração. */}
        <div
          aria-hidden="true"
          className="from-card pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent"
        />
        <div className="relative grid justify-items-center gap-3 px-6 pt-2 pb-8 text-center">
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
      </div>
    </section>
  );
}
