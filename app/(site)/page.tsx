import Link from "next/link";
import { Suspense } from "react";

import { ChartWheel } from "@/components/chart/chart-wheel";
import { DeletedNotice } from "@/components/site/deleted-notice";
import { FeaturedProduct } from "@/components/site/featured-product";
import { ProductCard } from "@/components/site/product-card";
import { buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { getActiveProducts } from "@/lib/products";
import { sampleChart } from "@/lib/sample-chart";
import { TESTIMONIALS } from "@/lib/site-config";

// Página estática, regenerada a cada 5 minutos (produtos vêm do banco).
export const revalidate = 300;

const CTA = "Quero minha Carta Celeste";

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
    text: "Seu nome, a data, a hora e a cidade de nascimento. A hora é o detalhe que mais personaliza o mapa: é ela que define o seu Ascendente. Confira na sua certidão de nascimento. Se não souber, dá para seguir sem ela, e o mapa sai mais curto.",
  },
  {
    title: "Receba o seu mapa astral",
    text: "Calculamos o seu céu com precisão astronômica e, em poucos minutos, sua Carta Celeste fica pronta na sua área do cliente para ler, reler e imprimir.",
  },
];

// Com um único mapa à venda não há o que escolher: o primeiro passo é contar quando nasceu.
const STEPS_ONE = [
  {
    title: "Conte quem você é e quando nasceu",
    text: "Seu nome, a data, a hora e a cidade de nascimento. A hora é o detalhe que mais personaliza o mapa: é ela que define o seu Ascendente. Confira na sua certidão de nascimento. Se não souber, dá para seguir sem ela, e o mapa sai mais curto.",
  },
  {
    title: "Confira e pague",
    text: "Você revisa o resumo dos seus dados antes de pagar, para não haver erro. O pagamento é por Pix, boleto ou cartão em até 12x, pelo Mercado Pago.",
  },
  {
    title: "Receba o seu mapa astral",
    text: "Calculamos o seu céu com precisão astronômica e, em poucos minutos, sua Carta Celeste fica pronta na sua área do cliente para ler, reler e imprimir.",
  },
];

const FAQ = [
  {
    q: "Preciso saber a hora em que nasci?",
    a: "Sim, ela é muito importante. É a hora que define o seu Ascendente e as casas do mapa, a parte mais pessoal da sua Carta Celeste. Você costuma encontrá-la na certidão de nascimento ou na Declaração de Nascido Vivo. Se não tiver como descobrir, o mapa também é feito, só que mais curto: sem Ascendente, Meio do Céu e casas. Avisamos isso antes do pagamento.",
  },
  {
    q: "Em quanto tempo recebo o meu mapa?",
    a: "Em poucos minutos depois da confirmação do pagamento. Você recebe um e-mail avisando, e o mapa fica salvo na sua área do cliente. No boleto, o prazo começa a contar quando o banco confirma o pagamento.",
  },
  {
    q: "Como o mapa é calculado?",
    a: "Usamos efemérides astronômicas para encontrar a posição exata do Sol, da Lua e dos planetas na data, hora e cidade em que você nasceu, considerando o fuso horário e o horário de verão da época. A partir disso, calculamos Ascendente, casas e aspectos. Os cálculos são feitos por software astronômico; o texto que interpreta essas posições é redigido com apoio de inteligência artificial, sem usar o seu nome.",
  },
  {
    q: "O mapa é feito só para mim?",
    a: "Sim. Sua Carta Celeste leva o seu nome e é calculada a partir do dia, da hora e da cidade exatos do seu nascimento. Por isso ela é diferente de um horóscopo: duas pessoas do mesmo signo recebem mapas diferentes.",
  },
  {
    q: "Quais formas de pagamento vocês aceitam?",
    a: "Pix, boleto e cartão de crédito em até 12x, pelo Mercado Pago. Nós não guardamos os dados do seu cartão.",
  },
  {
    q: "É uma previsão do futuro?",
    a: "Não. O mapa astral é um retrato das tendências, talentos e desafios presentes no seu céu de nascimento. Ele serve para você se conhecer melhor e fazer escolhas com mais consciência. As decisões continuam sendo suas. O conteúdo é para autoconhecimento e entretenimento.",
  },
  {
    q: "Posso guardar ou imprimir o meu mapa?",
    a: "Sim. Sua Carta Celeste fica salva na sua área do cliente para você reler quando quiser, e pode ser impressa ou salva em PDF direto pelo navegador.",
  },
  {
    q: "O que acontece com os meus dados?",
    a: "Usamos seu nome e seus dados de nascimento apenas para calcular e montar o seu mapa. Não vendemos seus dados a terceiros. Você pode excluir sua conta e seus dados a qualquer momento, na área “Minha conta”. Os detalhes estão na Política de Privacidade.",
  },
];

export default async function Home() {
  const products = await getActiveProducts();
  const lowestPrice = products.length
    ? Math.min(...products.map((p) => p.price_cents))
    : null;
  // Um único mapa à venda: a home vende só ele (vitrine em destaque, passos sem "escolha").
  const single = products.length === 1 ? products[0] : null;
  const steps = single ? STEPS_ONE : STEPS_MANY;
  const faq = single
    ? [
        {
          q: "O que está incluído no meu mapa?",
          a: `Uma leitura completa em ${single.sections.length} partes: Sol, Lua, Ascendente, planetas, casas e aspectos, com a roda do seu mapa e as tabelas de posições. Tudo fica na sua área do cliente, para ler no celular ou imprimir.`,
        },
        ...FAQ,
      ]
    : FAQ;
  const buyHref = single ? `/comprar/${single.slug}` : "#mapas";

  return (
    <>
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="grid gap-6">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">
            Astrologia com precisão astronômica
          </p>
          <h1 className="text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">
            Uma Carta Celeste, escrita para você.
          </h1>
          <p className="text-muted-foreground max-w-prose text-lg leading-relaxed">
            Com o seu nome, a data, a hora e a cidade em que você nasceu,
            calculamos a posição exata de cada planeta naquele instante e
            revelamos o seu mapa astral: quem você é, como trabalha e como ama.
            Pronto em poucos minutos.
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
              href="#como-funciona"
              className={
                buttonVariants({ size: "lg", variant: "outline" }) +
                " h-12 px-6 text-base"
              }
            >
              Como funciona
            </Link>
          </div>
          {lowestPrice !== null && (
            <p className="text-muted-foreground text-sm">
              {single ? "" : "A partir de "}
              {formatBRL(lowestPrice)} · Pix, boleto ou cartão em até 12x
            </p>
          )}
        </div>
        <div className="mx-auto w-full max-w-[520px]">
          <ChartWheel
            chart={sampleChart}
            animated
            title="Exemplo de roda do mapa astral"
          />
        </div>
      </section>

      {/* Vitrine */}
      <section
        id="mapas"
        aria-labelledby="titulo-mapas"
        className={`mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 ${DEFER}`}
      >
        <h2 id="titulo-mapas" className="text-4xl font-semibold">
          {single ? single.name : "Escolha o seu mapa"}
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

      {/* Como funciona */}
      <section
        id="como-funciona"
        aria-labelledby="titulo-como"
        className={`mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 ${DEFER}`}
      >
        <h2 id="titulo-como" className="text-4xl font-semibold">
          Sua Carta Celeste em 3 passos
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="bg-card border-border grid gap-3 rounded-xl border p-6"
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
            href={buyHref}
            className={buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"}
          >
            {CTA}
          </Link>
        </div>
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

      {/* FAQ */}
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

      {/* Chamada final */}
      <section
        aria-labelledby="titulo-final"
        className={`mx-auto w-full max-w-3xl px-4 py-16 text-center ${DEFER}`}
      >
        <h2
          id="titulo-final"
          className="text-4xl font-semibold text-balance sm:text-5xl"
        >
          O seu céu já está escrito. Falta você ler.
        </h2>
        <div className="mt-8">
          <Link
            href={buyHref}
            className={buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"}
          >
            {CTA}
          </Link>
        </div>
      </section>
    </>
  );
}
