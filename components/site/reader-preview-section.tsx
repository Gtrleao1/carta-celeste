import { ChartWheel } from "@/components/chart/chart-wheel";
import { ReaderPreview } from "@/components/site/reader-preview";
import { focusBySection } from "@/lib/reader/focus";
import { exampleChart } from "@/lib/example-chart";

const STEPS = [
  { key: "sol", title: "O seu Sol" },
  { key: "lua", title: "A sua Lua" },
  { key: "ascendente", title: "O seu Ascendente" },
  { key: "crescimento-desafios", title: "Crescimento e desafios" },
  { key: "aspectos", title: "Aspectos marcantes" },
  { key: "casas", title: "As 12 casas" },
];

/**
 * "Seu mapa vem com a sua mandala": prévia do leitor, com um mapa de exemplo
 * (dados fictícios). Tudo é calculado aqui, no servidor, no build.
 */
export function ReaderPreviewSection() {
  const focus = focusBySection(
    STEPS.map((s) => s.key),
    exampleChart,
  );
  return (
    <section
      id="mandala"
      aria-labelledby="titulo-mandala"
      className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-14"
    >
      <p className="text-primary text-sm font-medium tracking-widest uppercase">
        Dentro do seu mapa
      </p>
      <h2 id="titulo-mandala" className="mt-2 text-4xl font-semibold">
        A sua mandala acompanha a leitura
      </h2>
      <p className="text-muted-foreground mt-2 mb-8 max-w-prose text-lg">
        Ao ler cada parte, a mandala do seu mapa destaca os planetas, signos e
        casas de que o texto fala. Assim você vê onde está cada coisa, sem
        precisar entender de astrologia. Exemplo com um mapa fictício:
      </p>
      <ReaderPreview
        steps={STEPS.map((s) => ({ title: s.title, focus: focus[s.key] }))}
        wheel={
          <ChartWheel
            chart={exampleChart}
            interactive
            idPrefix="previa"
            title="Mandala de um mapa astral de exemplo"
          />
        }
      />
    </section>
  );
}
