import {
  ELEMENTS,
  MODALITIES,
  SIGN_ELEMENT,
  SIGN_MODALITY,
  SIGNS,
  type ChartData,
} from "@/lib/astro";
import { parseMarkdown } from "@/lib/markdown";

import { aspectKey, summarize, type Focus } from "./focus";

/** Subtópico de uma parte: um `###` do texto, com o que ele destaca na roda. */
export type Subtopic = {
  /** Endereço do subtítulo no texto (`id` do `<h3>`). */
  id: string;
  /** Título completo, como está no texto. */
  title: string;
  /** Título curto para o menu (até os dois-pontos). */
  label: string;
  focus: Focus;
};

/** Sem acento, minúsculo e com espaços simples: base da busca por nomes. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const PLANET_WORDS: [string, RegExp][] = [
  ["sun", /\bsol\b/],
  ["moon", /\blua\b/],
  ["mercury", /\bmercurio\b/],
  ["venus", /\bvenus\b/],
  ["mars", /\bmarte\b/],
  ["jupiter", /\bjupiter\b/],
  ["saturn", /\bsaturno\b/],
  ["uranus", /\burano\b/],
  ["neptune", /\bnetuno\b/],
  ["pluto", /\bplutao\b/],
  ["north_node", /\bnodo norte\b/],
];

const SIGN_WORDS = SIGNS.map((s) => new RegExp(`\\b${norm(s)}\\b`));
const ELEMENT_WORDS: Record<string, RegExp> = {
  fogo: /\bfogo\b/,
  terra: /\bterra\b/,
  ar: /\bar\b/,
  agua: /\bagua\b/,
};
const MODALITY_WORDS: Record<string, RegExp> = {
  cardinal: /\bcardinal\b/,
  fixo: /\bfixo\b/,
  mutavel: /\bmutavel\b/,
};
const HOUSE_WORD = /\bcasas? (\d{1,2})\b/g;
const TEN_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Título curto para o menu: o que vem antes dos dois-pontos. */
export const shortLabel = (title: string) =>
  title.split(":")[0].trim() || title.trim();

/**
 * O que um subtítulo destaca na roda. A regra é só de leitura do TÍTULO (os
 * nomes de planetas, signos, casas, eixos, elementos e modalidades que ele cita),
 * cruzados com o mapa já calculado: nada é calculado de novo e nenhuma IA é
 * chamada. Se o título não cita nada reconhecível, vale o destaque da parte.
 */
export function focusForHeading(
  title: string,
  chart: ChartData,
  fallback: Focus,
): Focus {
  const text = norm(title);

  const planetIds = PLANET_WORDS.filter(([, re]) => re.test(text))
    .map(([id]) => id)
    .filter((id) => chart.planets.some((p) => p.id === id));
  const signs = SIGN_WORDS.flatMap((re, i) => (re.test(text) ? [i] : []));
  const houses = [...text.matchAll(HOUSE_WORD)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 12 && chart.cusps);
  const axes: ("asc" | "mc")[] = [];
  if (/\bascendente\b/.test(text) && chart.ascendant) axes.push("asc");
  if (/\bmeio do ceu\b|\bmc\b/.test(text) && chart.midheaven) axes.push("mc");

  const planets = [...planetIds];
  const outSigns = [...signs];
  const outHouses = [...houses];

  // Citou um planeta: o signo e a casa dele entram.
  for (const id of planetIds) {
    const p = chart.planets.find((x) => x.id === id)!;
    outSigns.push(p.sign_index);
    if (p.house !== null) outHouses.push(p.house);
  }
  // Citou um signo: os planetas que estão nele entram.
  for (const i of signs) {
    planets.push(
      ...chart.planets
        .filter((p) => p.sign_index === i && p.id !== "north_node")
        .map((p) => p.id),
    );
  }
  // Citou uma casa: os planetas que estão nela entram.
  for (const h of houses) {
    planets.push(
      ...chart.planets.filter((p) => p.house === h).map((p) => p.id),
    );
  }
  if (axes.includes("asc") && chart.ascendant)
    outSigns.push(chart.ascendant.sign_index);
  if (axes.includes("asc")) outHouses.push(1);
  if (axes.includes("mc") && chart.midheaven) {
    outSigns.push(chart.midheaven.sign_index);
    outHouses.push(10);
  }

  // Elementos e modalidades só valem quando o título não cita mais nada.
  if (!planetIds.length && !signs.length && !houses.length && !axes.length) {
    const elements = ELEMENTS.filter((e) => ELEMENT_WORDS[e].test(text));
    const modalities = MODALITIES.filter((m) => MODALITY_WORDS[m].test(text));
    if (elements.length || modalities.length) {
      const idx = SIGNS.map((_, i) => i).filter(
        (i) =>
          (elements.length && elements.includes(SIGN_ELEMENT[i])) ||
          (modalities.length && modalities.includes(SIGN_MODALITY[i])),
      );
      outSigns.push(...idx);
      planets.push(
        ...chart.planets
          .filter(
            (p) => TEN_PLANETS.includes(p.id) && idx.includes(p.sign_index),
          )
          .map((p) => p.id),
      );
    }
  }

  const finalPlanets = uniq(planets);
  if (
    !finalPlanets.length &&
    !outSigns.length &&
    !outHouses.length &&
    !axes.length
  ) {
    return fallback;
  }

  // Aspectos: só os que ligam dois planetas citados no título.
  const aspects = chart.aspects
    .filter(
      (a) =>
        a.type !== "conjunction" &&
        planetIds.includes(a.planet_a) &&
        planetIds.includes(a.planet_b),
    )
    .map((a) => aspectKey(a.planet_a, a.planet_b));

  const names = finalPlanets.map(
    (id) => chart.planets.find((p) => p.id === id)?.name ?? id,
  );
  return {
    planets: finalPlanets,
    related: [],
    signs: uniq(outSigns),
    houses: uniq(outHouses),
    aspects,
    axes: uniq(axes),
    label: `${shortLabel(title)} · ${summarize(names, uniq(outSigns), uniq(outHouses), aspects.length, chart)}`,
  };
}

/** Subtópicos (`###`) de uma parte, na ordem do texto, com o destaque de cada um. */
export function subtopicsOf(
  markdown: string,
  sectionKey: string,
  chart: ChartData,
  sectionFocus: Focus,
): Subtopic[] {
  let n = 0;
  return parseMarkdown(markdown).flatMap((block) => {
    if (block.type !== "h3") return [];
    const title = block.inlines
      .map((i) => i.text)
      .join("")
      .trim();
    if (!title) return [];
    const id = `${sectionKey}-sub-${n++}`;
    return [
      {
        id,
        title,
        label: shortLabel(title),
        focus: focusForHeading(title, chart, sectionFocus),
      },
    ];
  });
}
