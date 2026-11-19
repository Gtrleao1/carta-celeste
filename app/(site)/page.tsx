import Link from "next/link";
import { Suspense } from "react";

import { SkyWheel } from "@/components/chart/sky-wheel";
import { BeyondSign } from "@/components/site/beyond-sign";
import { ReaderPreviewSection } from "@/components/site/reader-preview-section";
import { SampleReading } from "@/components/site/sample-reading";
import { DeletedNotice } from "@/components/site/deleted-notice";
import { FeaturedProduct } from "@/components/site/featured-product";
import { IntroSplash } from "@/components/site/intro-splash";
import { ProductCard } from "@/components/site/product-card";
import { buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { getActiveProducts } from "@/lib/products";
import { CTA_LABEL, TESTIMONIALS } from "@/lib/site-config";

// Página estática, regenerada a cada 5 minutos (produtos vêm do banco).
export const revalidate = 300;

const CTA = CTA_LABEL;

// Seções abaixo da dobra: o navegador só calcula estilo e layout delas quando
// chegam perto da tela (menos trabalho no carregamento).
const DEFER = "[content-visibility:auto] [contain-intrinsic-size:auto_900px]";

const STEPS_MANY = [
  {
    title: "Escolha o seu mapa",
    text: "Visão geral, carreira ou amor. Comece pela pergunta que mais importa para você agora.",
  },
  {
    title: "Conte quem você é e quando nasceu",
    text: "Seu nome, a data, a hora e a cidade de nascimento. A hora é o detalhe que mais personaliza o mapa: é ela que define o seu Ascendente. Se não souber, dá para seguir sem ela, e o mapa sai mais curto.",
  },
  {
    title: "Receba o seu mapa astral",
    text: "Calculamos o seu céu com precisão astronômica e, em poucos minutos, sua Carta Celeste fica pronta na sua área do cliente para ler, reler e imprimir.",
  },
];

export default async function Home() {
  const products = await getActiveProducts();
  const lowestPrice = products.length
    ? Math.min(...products.map((p) => p.price_cents))
    : null;
  // Um único mapa à venda: a home vende só ele (vitrine em destaque, passos sem "escolha").
  const single = products.length === 1 ? products[0] : null;
  const price = lowestPrice !== null ? formatBRL(lowestPrice) : null;
  const buyHref = single ? `/comprar/${single.slug}` : "#mapas";

  const steps = single
    ? [
        {
          title: "Conte quando e onde você nasceu",
          text: "Nome, data, horário e cidade. Se não souber a hora, tudo bem: avisamos o que muda no seu mapa.",
        },
        {
          title: `Pague${price ? ` ${price}` : ""}`,
          text: "Cartão (até 12x), Pix ou boleto, pelo Mercado Pago, em ambiente seguro. Você revisa o resumo antes de pagar.",
        },
        {
          title: "Calculamos o seu céu",
          text: "As posições vêm de cálculo astronômico, com precisão de arco em minutos. Depois o seu mapa é escrito a partir desses dados.",
        },
        {
          title: "Leia e guarde",
          text: "Em poucos minutos o mapa aparece na sua conta e chega um e-mail avisando. Dá para reler quando quiser e imprimir.",
        },
      ]
    : STEPS_MANY;

  const parts = single?.sections.length;
  const faq = [
    {
      q: "O que eu recebo exatamente?",
      a: `Um mapa astral${parts ? ` com ${parts} seções` : ""}, escrito exclusivamente para você, com a mandala interativa.`,
    },
    {
      q: "Como o mapa é calculado?",
      a: "Com cálculo astronômico a partir da sua data, hora e cidade.",
    },
    {
      q: "Quanto tempo leva?",
      a: "Em geral poucos minutos depois do pagamento. Avisamos por e-mail.",
    },
    {
      q: "É seguro pagar e informar meus dados?",
      a: "Pagamento pelo Mercado Pago, dados protegidos conforme a LGPD, sem guardar CPF.",
    },
    {
      q: "Posso comprar para outra pessoa?",
      a: "Sim, é só adicionar os dados dela em “Adicionar outra pessoa”.",
    },
    {
      q: "Preciso entender de astrologia?",
      a: "Não. A linguagem é simples e a mandala mostra onde está cada aspecto.",
    },
    {
      q: "Posso imprimir ou reler depois?",
      a: "Sim, fica na sua conta.",
    },
  ];

  return (
    <>
      <IntroSplash />
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>

      {/* 1. Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="grid gap-6">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">
            Mapa astral personalizado
          </p>
          <h1 className="text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">
            Seu céu, sua história.
          </h1>
          <p className="text-muted-foreground max-w-prose text-lg leading-relaxed">
            Uma leitura escrita só para você, a partir do céu do momento em que
            você nasceu. Descubra quem você é, como sente, como ama e por que
            age do seu jeito.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#mapas"
              className={
                buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"
              }
            >
              {CTA}
            </Link>
            <Link
              href="#mandala"
              className={
                buttonVariants({ size: "lg", variant: "outline" }) +
                " h-12 px-6 text-base"
              }
            >
              Ver como é por dentro
            </Link>
          </div>
          {price && (
            <p className="text-muted-foreground text-sm">
              {single ? "" : "A partir de "}
              {price} · pagamento único · pronta em poucos minutos
            </p>
          )}
        </div>
        <div className="mx-auto w-full max-w-[520px]">
          <SkyWheel />
        </div>
      </section>

      {/* 2. Muito além do seu signo solar */}
      <div className={DEFER}>
        <BeyondSign buyHref="#mapas" />
      </div>

      {/* 3. A mandala interativa */}
      <div className={DEFER}>
        <ReaderPreviewSection buyHref="#mapas" />
      </div>

      {/* 4. Um trecho do mapa de exemplo (fictício) */}
      <div className={DEFER}>
        <SampleReading buyHref="#mapas" parts={parts} />
      </div>

      {/* 5. Como funciona */}
      <section
        id="como-funciona"
        aria-labelledby="titulo-como"
        className={`mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 ${DEFER}`}
      >
        <h2 id="titulo-como" className="text-4xl font-semibold">
          {single ? "Do cadastro à leitura, em 4 passos" : "Como funciona"}
        </h2>
        <ol
          className={`mt-8 grid gap-6 ${
            steps.length === 4
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "md:grid-cols-3"
          }`}
        >
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="bg-card border-border grid content-start gap-3 rounded-xl border p-6"
            >
              <span
                aria-hidden="true"
                className="border-primary text-primary font-heading flex size-10 items-center justify-center rounded-full border text-xl font-semibold"
              >
                {i + 1}
              </span>
              <h3 className="text-2xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Link
            href="#mapas"
            className={buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"}
          >
            {CTA}
          </Link>
        </div>
      </section>

      {/* 6. Vitrine: a Carta Celeste completa */}
      <section
        id="mapas"
        aria-labelledby="titulo-mapas"
        className={`mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 ${DEFER}`}
      >
        <h2 id="titulo-mapas" className="text-4xl font-semibold">
          {single ? "Sua Carta Celeste completa" : "Escolha o seu mapa"}
        </h2>
        {!single && (
          <p className="text-muted-foreground mt-2 max-w-prose text-lg">
            Cada mapa responde a uma pergunta diferente. Todos são calculados
            para o dia, a hora e a cidade em que você nasceu.
          </p>
        )}
        {single ? (
          <FeaturedProduct product={single} />
        ) : products.length > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-8">
            Os mapas estarão disponíveis em breve.
          </p>
        )}
      </section>

      {/* Depoimentos: só aparecem quando houver depoimentos reais em lib/site-config.ts */}
      {TESTIMONIALS.length > 0 && (
        <section
          aria-labelledby="titulo-depoimentos"
          className="mx-auto w-full max-w-6xl px-4 py-14"
        >
          <h2 id="titulo-depoimentos" className="text-4xl font-semibold">
            O que dizem os clientes
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.author}
                className="bg-card border-border grid gap-3 rounded-xl border p-6"
              >
                <blockquote className="leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="text-muted-foreground text-sm">
                  {t.author} · {t.product}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* 7. FAQ */}
      <section
        id="perguntas"
        aria-labelledby="titulo-faq"
        className={`mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-14 ${DEFER}`}
      >
        <h2 id="titulo-faq" className="text-4xl font-semibold">
          Perguntas frequentes
        </h2>
        <div className="mt-8 grid gap-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="bg-card border-border group rounded-xl border px-5 py-4 open:pb-5"
            >
              <summary className="cursor-pointer list-none text-lg font-medium marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-primary text-2xl leading-none transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* 8. Chamada final */}
      <section
        aria-labelledby="titulo-final"
        className={`mx-auto w-full max-w-3xl px-4 py-16 text-center ${DEFER}`}
      >
        <h2
          id="titulo-final"
          className="text-4xl font-semibold text-balance sm:text-5xl"
        >
          Seu céu já contava a sua história quando você nasceu. Falta você ler.
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-prose text-lg">
          Em poucos minutos você sabe mais sobre quem você é, como sente e por
          que age do seu jeito.
        </p>
        <div className="mt-8">
          <Link
            href={buyHref}
            className={buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"}
          >
            {CTA}
          </Link>
        </div>
        {price && (
          <p className="text-muted-foreground mt-3 text-sm">
            {price} · pagamento único · Pix, boleto ou cartão em até 12x
          </p>
        )}
      </section>
    </>
  );
}
