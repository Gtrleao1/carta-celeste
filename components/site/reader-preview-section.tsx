import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ChartWheel } from "@/components/chart/chart-wheel";
import { MiniMarkdown } from "@/components/site/mini-markdown";
import { ReaderPreview } from "@/components/site/reader-preview";
import { exampleChart } from "@/lib/example-chart";
import { focusBySection } from "@/lib/reader/focus";

const STEPS = [
  { key: "sol", title: "O seu Sol" },
  { key: "lua", title: "A sua Lua" },
  { key: "ascendente", title: "O seu Ascendente" },
  { key: "amor-valores", title: "Amor e valores" },
  { key: "crescimento-desafios", title: "Crescimento e desafios" },
  { key: "aspectos", title: "Aspectos marcantes" },
  { key: "casas", title: "As 12 casas" },
];

const MAX_WORDS = 120;

/** Partes do mapa de exemplo fictício, pelo título (lido no build). */
function exampleTexts(): Map<string, string> {
  const raw = readFileSync(
    join(process.cwd(), "docs", "referencia", "exemplo-ficticio.md"),
    "utf8",
  );
  const texts = new Map<string, string>();
  for (const block of raw.split(/^## /m).slice(1)) {
    const [heading, ...rest] = block.split("\n");
    texts.set(heading.trim(), rest.join("\n").trim());
  }
  return texts;
}

/** Começo do texto: blocos inteiros até ~MAX_WORDS palavras, sem terminar em título. */
export function excerpt(text: string, maxWords = MAX_WORDS): string {
  const blocks = text.split(/\n\s*\n/);
  const out: string[] = [];
  let words = 0;
  for (const b of blocks) {
    out.push(b);
    words += b.split(/\s+/).filter(Boolean).length;
    if (words >= maxWords && !b.startsWith("#")) break;
  }
  while (out.length > 1 && out.at(-1)!.startsWith("#")) out.pop();
  return out.join("\n\n");
}

const TITLES: Record<string, string> = {
  sol: "O seu Sol",
  lua: "A sua Lua",
  ascendente: "O seu Ascendente",
  "amor-valores": "Amor e valores",
  "crescimento-desafios": "Crescimento e desafios",
  aspectos: "Aspectos marcantes",
  casas: "As 12 casas",
};

/**
 * "A sua mandala acompanha a leitura": prévia do leitor (capítulos, mandala e
 * texto), com o mapa de exemplo fictício. Tudo é preparado no servidor, no build.
 */
export function ReaderPreviewSection() {
  const texts = exampleTexts();
  const focus = focusBySection(
    STEPS.map((s) => s.key),
    exampleChart,
  );
  return (
    <section
      id="mandala"
      aria-labelledby="titulo-mandala"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14"
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
        steps={STEPS.map((s) => ({
          key: s.key,
          title: s.title,
          focus: focus[s.key],
          body: <MiniMarkdown text={excerpt(texts.get(TITLES[s.key]) ?? "")} />,
        }))}
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
