import { ChartWheel } from "@/components/chart/chart-wheel";
import {
  ReportReader,
  type ReaderPart,
} from "@/components/report/report-reader";
import { MiniMarkdown } from "@/components/site/mini-markdown";
import type { ChartData } from "@/lib/astro";
import { ELEMENTS, MODALITIES } from "@/lib/astro";
import { focusBySection } from "@/lib/reader/focus";
import { subtopicsOf } from "@/lib/reader/subtopics";
import { formatDegree } from "@/lib/reports/chart-summary";

const ELEMENT_LABEL = {
  fogo: "Fogo",
  terra: "Terra",
  ar: "Ar",
  agua: "Água",
} as const;
const MODALITY_LABEL = {
  cardinal: "Cardinal",
  fixo: "Fixo",
  mutavel: "Mutável",
} as const;
const SYSTEM_LABEL = {
  placidus: "Placidus",
  equal: "Casas iguais",
  whole: "Casas inteiras",
} as const;
const TONE_LABEL = {
  harmonic: "fluidez",
  tense: "tensão",
  neutral: "fusão",
} as const;

export type ReportSection = {
  key: string;
  title: string;
  content: string;
  status: string;
};

function DataTable({
  caption,
  head,
  children,
}: {
  caption: string;
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="print-avoid-break grid gap-2">
      <h3 className="font-heading text-xl font-semibold">{caption}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-muted-foreground border-b">
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col" className="py-2 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const Cell = ({ children }: { children: React.ReactNode }) => (
  <td className="py-2 pr-3">{children}</td>
);

/**
 * O mapa astral inteiro: roda, tabelas de posições e o texto por seções. Só
 * recebe dados já prontos; nada aqui calcula posições.
 */
export function ReportView({
  productName,
  birthSummary,
  chart,
  sections,
}: {
  productName: string;
  /** Linha legível dos dados de nascimento, ou `null` se o perfil foi apagado. */
  birthSummary: string | null;
  chart: ChartData;
  sections: ReportSection[];
}) {
  const planetName = new Map(chart.planets.map((p) => [p.id, p.name]));
  const system = chart.input.house_system;

  // Partes prontas, na ordem do produto. O destaque de cada parte e de cada
  // subtópico sai de regras fixas sobre o mapa já calculado (sem IA).
  const done = sections.filter((s) => s.status === "done" && s.content);
  const focusByKey = focusBySection(
    done.map((s) => s.key),
    chart,
  );
  const parts: ReaderPart[] = done.map((s) => ({
    key: s.key,
    title: s.title,
    body: <MiniMarkdown text={s.content} headingIdPrefix={s.key} />,
    subs: subtopicsOf(s.content, s.key, chart, focusByKey[s.key]).map(
      ({ id, label, focus }) => ({ id, label, focus }),
    ),
  }));

  return (
    <article className="grid gap-10">
      <header className="mx-auto grid w-full max-w-3xl gap-2">
        <p className="text-muted-foreground text-sm tracking-wide uppercase">
          Carta Celeste
        </p>
        <h1 className="font-heading text-4xl font-semibold">{productName}</h1>
        {birthSummary && (
          <p className="text-muted-foreground">{birthSummary}</p>
        )}
      </header>

      {chart.time_unknown && (
        <p className="border-border mx-auto w-full max-w-3xl rounded-lg border p-4 text-sm">
          Você não informou a hora de nascimento. Por isso o Ascendente, o Meio
          do Céu e as casas não foram calculados, e o mapa astral é mais curto.
          A roda mostra os planetas nos signos, com Áries à esquerda.
        </p>
      )}
      {chart.house_fallback_reason && (
        <p className="border-border mx-auto w-full max-w-3xl rounded-lg border p-4 text-sm">
          {chart.house_fallback_reason}
        </p>
      )}

      {/* Leitor: capítulos à esquerda, a mandala interativa e o texto ao lado. */}
      {parts.length > 0 && (
        <ReportReader
          parts={parts}
          focusByKey={focusByKey}
          wheel={
            <ChartWheel
              chart={chart}
              interactive
              idPrefix="relatorio"
              title={`Roda do mapa astral de ${productName}`}
            />
          }
        />
      )}

      <section
        aria-labelledby="posicoes"
        className="print-page-break mx-auto grid w-full max-w-3xl gap-8"
      >
        <h2 id="posicoes" className="font-heading text-2xl font-semibold">
          Posições
        </h2>

        <DataTable
          caption="Planetas"
          head={["Corpo", "Signo", "Grau", "Casa", "Movimento"]}
        >
          {chart.planets.map((p) => (
            <tr key={p.id}>
              <Cell>{p.name}</Cell>
              <Cell>{p.sign}</Cell>
              <Cell>{formatDegree(p.degree)}</Cell>
              <Cell>{p.house ?? "—"}</Cell>
              <Cell>{p.retrograde ? "Retrógrado ℞" : "Direto"}</Cell>
            </tr>
          ))}
        </DataTable>

        {chart.ascendant && chart.midheaven && (
          <DataTable caption="Ângulos" head={["Ponto", "Signo", "Grau"]}>
            <tr>
              <Cell>Ascendente</Cell>
              <Cell>{chart.ascendant.sign}</Cell>
              <Cell>{formatDegree(chart.ascendant.degree)}</Cell>
            </tr>
            <tr>
              <Cell>Meio do Céu</Cell>
              <Cell>{chart.midheaven.sign}</Cell>
              <Cell>{formatDegree(chart.midheaven.degree)}</Cell>
            </tr>
          </DataTable>
        )}

        {chart.cusps && (
          <DataTable
            caption={`Casas${system ? ` (${SYSTEM_LABEL[system]})` : ""}`}
            head={["Casa", "Signo na cúspide", "Grau", "Regente"]}
          >
            {chart.cusps.map((c) => (
              <tr key={c.house}>
                <Cell>{c.house}</Cell>
                <Cell>{c.sign}</Cell>
                <Cell>{formatDegree(c.degree)}</Cell>
                <Cell>{c.ruler}</Cell>
              </tr>
            ))}
          </DataTable>
        )}

        {chart.aspects.length > 0 && (
          <DataTable
            caption="Aspectos"
            head={["Planeta", "Aspecto", "Planeta", "Orbe", "Natureza"]}
          >
            {chart.aspects.map((a) => (
              <tr key={`${a.planet_a}-${a.type}-${a.planet_b}`}>
                <Cell>{planetName.get(a.planet_a)}</Cell>
                <Cell>{a.name}</Cell>
                <Cell>{planetName.get(a.planet_b)}</Cell>
                <Cell>{formatDegree(a.orb)}</Cell>
                <Cell>{TONE_LABEL[a.tone]}</Cell>
              </tr>
            ))}
          </DataTable>
        )}

        <div className="print-avoid-break grid gap-6 sm:grid-cols-2">
          <DataTable caption="Elementos" head={["Elemento", "Planetas"]}>
            {ELEMENTS.map((e) => (
              <tr key={e}>
                <Cell>{ELEMENT_LABEL[e]}</Cell>
                <Cell>{chart.elements[e]}</Cell>
              </tr>
            ))}
          </DataTable>
          <DataTable caption="Modalidades" head={["Modalidade", "Planetas"]}>
            {MODALITIES.map((m) => (
              <tr key={m}>
                <Cell>{MODALITY_LABEL[m]}</Cell>
                <Cell>{chart.modalities[m]}</Cell>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>

      <p className="text-muted-foreground mx-auto w-full max-w-3xl border-t pt-6 text-sm">
        Conteúdo para autoconhecimento e entretenimento. Não substitui
        orientação médica, psicológica, financeira ou jurídica, e não faz
        previsões deterministas.
      </p>
    </article>
  );
}
