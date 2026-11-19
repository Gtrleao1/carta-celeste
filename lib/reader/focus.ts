import type { ChartData } from "@/lib/astro";

/**
 * Que elementos da roda cada parte do mapa destaca no leitor.
 *
 * Tudo sai do `chart_data` por regra fixa: não há IA aqui e nada é calculado de
 * novo. O destaque NUNCA muda a posição de nada na roda; só liga ou desliga
 * `data-on` nos elementos que já estão desenhados (ver `ReportReader`).
 */
export type Focus = {
  /** Planetas em destaque total. */
  planets: string[];
  /** Planetas ligados aos de cima por aspecto (destaque mais fraco). */
  related: string[];
  /** Índices dos signos (0 = Áries). */
  signs: number[];
  /** Números das casas (1-12). */
  houses: number[];
  /** Chaves das linhas de aspecto (`aspectKey`). */
  aspects: string[];
  /** Eixos em destaque. */
  axes: ("asc" | "mc")[];
  /** Resumo em português do que está em foco. */
  label: string;
};

export const EMPTY_FOCUS: Focus = {
  planets: [],
  related: [],
  signs: [],
  houses: [],
  aspects: [],
  axes: [],
  label: "Mapa inteiro",
};

/** Chave de uma linha de aspecto na roda (a mesma usada no SVG). */
export const aspectKey = (a: string, b: string) => `${a}~${b}`;

const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Aspectos que a roda desenha: a conjunção fica de fora (planetas juntos). */
const drawnAspects = (chart: ChartData) =>
  chart.aspects.filter((a) => a.type !== "conjunction");

function forPlanets(chart: ChartData, ids: string[]): Focus {
  const planets = chart.planets.filter((p) => ids.includes(p.id));
  const aspects = drawnAspects(chart).filter(
    (a) => ids.includes(a.planet_a) || ids.includes(a.planet_b),
  );
  const present = planets.map((p) => p.id);
  const related = uniq(
    aspects
      .flatMap((a) => [a.planet_a, a.planet_b])
      .filter((id) => !present.includes(id)),
  );
  const names = planets.map((p) => p.name);
  const houses = uniq(
    planets.map((p) => p.house).filter((h): h is number => h !== null),
  );
  const signs = uniq(planets.map((p) => p.sign_index));
  return {
    planets: present,
    related,
    signs,
    houses,
    aspects: aspects.map((a) => aspectKey(a.planet_a, a.planet_b)),
    axes: [],
    label: summarize(names, signs, houses, aspects.length, chart),
  };
}

function summarize(
  names: string[],
  signs: number[],
  houses: number[],
  aspectCount: number,
  chart: ChartData,
): string {
  const signNames = signs.map(
    (i) =>
      chart.planets.find((p) => p.sign_index === i)?.sign ??
      chart.ascendant?.sign ??
      "",
  );
  const parts = [
    names.join(", "),
    uniq(signNames).filter(Boolean).join(", "),
    houses.length
      ? `casa${houses.length > 1 ? "s" : ""} ${houses.join(", ")}`
      : "",
    aspectCount ? `${aspectCount} aspecto${aspectCount > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function merge(chart: ChartData, ...focuses: Focus[]): Focus {
  const planets = uniq(focuses.flatMap((f) => f.planets));
  const aspects = uniq(focuses.flatMap((f) => f.aspects));
  return {
    planets,
    related: uniq(focuses.flatMap((f) => f.related)).filter(
      (id) => !planets.includes(id),
    ),
    signs: uniq(focuses.flatMap((f) => f.signs)),
    houses: uniq(focuses.flatMap((f) => f.houses)),
    aspects,
    axes: uniq(focuses.flatMap((f) => f.axes)),
    label: focuses
      .map((f) => f.label)
      .filter(Boolean)
      .join(" + "),
  };
}

function ascendant(chart: ChartData): Focus {
  if (!chart.ascendant) return EMPTY_FOCUS;
  const rulerName = chart.house_rulers?.[0]?.ruler;
  const ruler = chart.planets.find((p) => p.name === rulerName);
  return {
    planets: ruler ? [ruler.id] : [],
    related: [],
    signs: [chart.ascendant.sign_index],
    houses: [1],
    aspects: [],
    axes: ["asc"],
    label: `Ascendente em ${chart.ascendant.sign} · casa 1${ruler ? ` · regente ${ruler.name}` : ""}`,
  };
}

/** Quantos aspectos a parte "Aspectos marcantes" acende (os mais exatos). */
const TOP_ASPECTS = 6;

/**
 * Elementos em destaque para a parte do mapa de chave `key`. Chave desconhecida,
 * introdução e síntese não destacam nada (a roda aparece inteira).
 */
export function focusForSection(key: string, chart: ChartData): Focus {
  switch (key) {
    case "sol":
      return forPlanets(chart, ["sun"]);
    case "lua":
      return forPlanets(chart, ["moon"]);
    case "ascendente":
      return ascendant(chart);
    case "trio":
      return merge(chart, forPlanets(chart, ["sun", "moon"]), ascendant(chart));
    case "mente-comunicacao":
      return forPlanets(chart, ["mercury"]);
    case "amor-valores":
      return forPlanets(chart, ["venus"]);
    case "acao-desejo":
      return forPlanets(chart, ["mars"]);
    case "crescimento-desafios":
      return forPlanets(chart, ["jupiter", "saturn"]);
    case "geracoes":
      return forPlanets(chart, ["uranus", "neptune", "pluto"]);
    case "casas":
      return {
        ...EMPTY_FOCUS,
        planets: chart.planets.map((p) => p.id),
        houses: chart.cusps ? chart.cusps.map((c) => c.house) : [],
        label: "As 12 casas",
      };
    case "aspectos": {
      const top = [...drawnAspects(chart)]
        .sort((a, b) => a.orb - b.orb)
        .slice(0, TOP_ASPECTS);
      const planets = uniq(top.flatMap((a) => [a.planet_a, a.planet_b]));
      return {
        ...EMPTY_FOCUS,
        planets,
        aspects: top.map((a) => aspectKey(a.planet_a, a.planet_b)),
        label: `Os ${top.length} aspectos mais exatos`,
      };
    }
    default:
      return EMPTY_FOCUS;
  }
}

/** Foco de todas as partes de uma vez (calculado no servidor e enviado pronto). */
export function focusBySection(
  keys: string[],
  chart: ChartData,
): Record<string, Focus> {
  return Object.fromEntries(keys.map((k) => [k, focusForSection(k, chart)]));
}
