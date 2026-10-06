import Link from "next/link";
import { Suspense } from "react";

import { ChartWheel } from "@/components/chart/chart-wheel";
import { DeletedNotice } from "@/components/site/deleted-notice";
import { ProductCard } from "@/components/site/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getActiveProducts } from "@/lib/products";
import { sampleChart } from "@/lib/sample-chart";

// Página estática, regenerada a cada 5 minutos (produtos vêm do banco).
export const revalidate = 300;

const STEPS = [
  {
    title: "Escolha o seu mapa",
    text: "Cada mapa olha para uma parte da sua vida: a visão geral, a carreira ou o amor.",
  },
  {
    title: "Conte quando e onde você nasceu",
    text: "Data, hora e cidade de nascimento. Se não souber a hora, o mapa também funciona, só que mais curto.",
  },
  {
    title: "Receba em poucos minutos",
    text: "Calculamos o seu céu com precisão astronômica e escrevemos o relatório para você. Ele fica na sua área do cliente, pronto para ler e imprimir.",
  },
];

const TESTIMONIALS = [1, 2, 3];

const FAQ = [
  {
    q: "Preciso saber a hora em que nasci?",
    a: "A hora ajuda muito: sem ela, não dá para calcular o Ascendente, o Meio do Céu e as casas. Se você não souber, ainda assim geramos o mapa com Sol, Lua e planetas nos signos, e o relatório será mais curto. Avisamos isso antes do pagamento.",
  },
  {
    q: "Em quanto tempo recebo o relatório?",
    a: "Em até 5 minutos depois da aprovação do pagamento. Com Pix, a aprovação é imediata. Você recebe um e-mail avisando e encontra o relatório em “Meus mapas”.",
  },
  {
    q: "Como o mapa é calculado?",
    a: "Usamos efemérides astronômicas (posições reais dos astros) para a sua data, hora e cidade de nascimento, com zodíaco tropical. Nossos cálculos batem com os de referências do mercado com diferença de no máximo 1 minuto de arco.",
  },
  {
    q: "A inteligência artificial inventa as posições dos planetas?",
    a: "Não. Todas as posições são calculadas por um motor astronômico. A IA só recebe o resultado pronto e escreve a interpretação em português, em cima desses dados.",
  },
  {
    q: "Quais formas de pagamento vocês aceitam?",
    a: "Pix, cartão de crédito em até 12 vezes e boleto, pelo Mercado Pago. Nós não guardamos os dados do seu cartão.",
  },
  {
    q: "É uma previsão do futuro?",
    a: "Não. O mapa é uma ferramenta de autoconhecimento: fala de tendências, qualidades e desafios, sem previsões fechadas. O conteúdo é para autoconhecimento e entretenimento.",
  },
  {
    q: "Posso guardar ou imprimir o meu mapa?",
    a: "Sim. O relatório fica na sua conta e você pode imprimir ou salvar em PDF direto pelo navegador, com a roda do mapa em uma página própria.",
  },
  {
    q: "O que acontece com os meus dados?",
    a: "Usamos seus dados só para gerar o relatório e atender o seu pedido. Você pode excluir sua conta e seus dados a qualquer momento, na área “Minha conta”. Leia a Política de Privacidade para os detalhes.",
  },
];

export default async function Home() {
  const products = await getActiveProducts();

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
            Seu céu de nascimento, escrito para você.
          </h1>
          <p className="text-muted-foreground max-w-prose text-lg leading-relaxed">
            Relatórios astrológicos personalizados, calculados com precisão
            astronômica e interpretados por inteligência artificial. Entregues
            na sua área do cliente em poucos minutos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#mapas"
              className={
                buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"
              }
            >
              Escolher meu mapa
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
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14"
      >
        <h2 id="titulo-mapas" className="text-4xl font-semibold">
          Escolha o seu mapa
        </h2>
        <p className="text-muted-foreground mt-2 max-w-prose text-lg">
          Três leituras, cada uma com um foco. Todas calculadas para a sua data,
          hora e lugar de nascimento.
        </p>
        {products.length > 0 ? (
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
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14"
      >
        <h2 id="titulo-como" className="text-4xl font-semibold">
          Como funciona
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
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
      </section>

      {/* Depoimentos (espaço reservado) */}
      <section
        aria-labelledby="titulo-depoimentos"
        className="mx-auto w-full max-w-6xl px-4 py-14"
      >
        <h2 id="titulo-depoimentos" className="text-4xl font-semibold">
          O que dizem os clientes
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((n) => (
            <figure
              key={n}
              className="border-border text-muted-foreground grid gap-3 rounded-xl border border-dashed p-6"
            >
              <blockquote className="italic">
                Espaço reservado para um depoimento de cliente.
              </blockquote>
              <figcaption className="text-sm">
                Depoimentos reais serão publicados aqui após o lançamento.
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="perguntas"
        aria-labelledby="titulo-faq"
        className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-14"
      >
        <h2 id="titulo-faq" className="text-4xl font-semibold">
          Perguntas frequentes
        </h2>
        <div className="mt-8 grid gap-3">
          {FAQ.map((item) => (
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
    </>
  );
}
