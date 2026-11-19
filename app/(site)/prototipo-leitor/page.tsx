import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import { ChartWheel } from "@/components/chart/chart-wheel";
import {
  ReportReader,
  type ReaderPart,
} from "@/components/report/report-reader";
import { MiniMarkdown } from "@/components/site/mini-markdown";
import { focusBySection } from "@/lib/reader/focus";
import { subtopicsOf } from "@/lib/reader/subtopics";
import { exampleChart } from "@/lib/example-chart";

export const metadata: Metadata = {
  title: "Protótipo do leitor",
  robots: { index: false, follow: false },
};

// Partes do Mapa Astral Completo, na ordem do produto.
const PARTS: { key: string; title: string }[] = [
  { key: "introducao", title: "Introdução ao seu mapa" },
  { key: "sol", title: "O seu Sol" },
  { key: "lua", title: "A sua Lua" },
  { key: "ascendente", title: "O seu Ascendente" },
  { key: "trio", title: "Como o trio conversa" },
  { key: "mente-comunicacao", title: "Mente e comunicação" },
  { key: "amor-valores", title: "Amor e valores" },
  { key: "acao-desejo", title: "Ação e desejo" },
  { key: "crescimento-desafios", title: "Crescimento e desafios" },
  { key: "geracoes", title: "Gerações" },
  { key: "casas", title: "As 12 casas" },
  { key: "aspectos", title: "Aspectos marcantes" },
  { key: "sintese", title: "Síntese" },
];

/** Texto do mapa de referência aprovado (fictício, do mesmo mapa da roda), lido no build. */
function referenceTexts(): Map<string, string> {
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

/**
 * PROTÓTIPO do leitor interativo, com o mapa de exemplo (dados fictícios) e o
 * texto do mapa de referência. Serve para avaliar o desenho antes de aplicar
 * nos mapas reais. Fora do Google (noindex) e sem chamar a IA: só lê arquivos.
 */
export default function PrototypePage() {
  const texts = referenceTexts();
  const focusByKey = focusBySection(
    PARTS.map((p) => p.key),
    exampleChart,
  );
  const parts: ReaderPart[] = PARTS.map((p) => {
    const text = texts.get(p.title) ?? "Texto não encontrado.";
    return {
      key: p.key,
      title: p.title,
      body: <MiniMarkdown text={text} headingIdPrefix={p.key} />,
      subs: subtopicsOf(text, p.key, exampleChart, focusByKey[p.key]).map(
        ({ id, label, focus }) => ({ id, label, focus }),
      ),
    };
  });

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10">
      <header className="grid gap-1">
        <p className="text-primary text-sm font-medium tracking-widest uppercase">
          Protótipo
        </p>
        <h1 className="font-heading text-4xl font-semibold">
          Mapa Astral Completo
        </h1>
        <p className="text-muted-foreground">
          Escolha um capítulo ou um subtópico e veja a roda destacar o que ele
          trata. As posições nunca mudam: só o destaque.
        </p>
        <p className="text-muted-foreground text-sm">
          Mapa de exemplo fictício: 08/12/2020, 18h30, Campinas.
        </p>
      </header>

      <ReportReader
        parts={parts}
        focusByKey={focusByKey}
        wheel={
          <ChartWheel
            chart={exampleChart}
            interactive
            idPrefix="leitor"
            title="Roda do mapa astral de exemplo"
          />
        }
      />
    </div>
  );
}
