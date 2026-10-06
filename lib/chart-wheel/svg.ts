import type { ChartData } from "@/lib/astro";
import { SIGNS } from "@/lib/astro";

import { polar, spreadAngles, wheelAngle } from "./geometry";

/**
 * Gera o SVG da roda do mapa como texto.
 *
 * É texto (e não JSX) de propósito: um SVG com centenas de elementos, como
 * árvore do React, vai inteiro no payload da página e precisa ser hidratado no
 * navegador, o que pesa no carregamento. Como texto, entra num único
 * `dangerouslySetInnerHTML` que o React não percorre.
 *
 * Segurança: tudo o que entra no SVG vem do cálculo (números) ou de constantes
 * (nomes de signos e planetas); o título é escapado. Nenhuma entrada de
 * usuário chega aqui sem passar por `esc`.
 */

/** Símbolos astrológicos; U+FE0E força a versão de texto (não emoji). */
const TEXT = "︎";
const SIGN_GLYPHS = [
  "♈",
  "♉",
  "♊",
  "♋",
  "♌",
  "♍",
  "♎",
  "♏",
  "♐",
  "♑",
  "♒",
  "♓",
].map((g) => g + TEXT);
const PLANET_GLYPHS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  north_node: "☊",
};

// Cores por elemento (Fogo, Terra, Ar, Água), repetidas de Áries a Peixes.
const SECTOR_FILL = [
  "fill-fire/20",
  "fill-earth/20",
  "fill-air/20",
  "fill-water/20",
];
const SIGN_TEXT = ["fill-fire", "fill-earth", "fill-air", "fill-water"];

// Raios (viewBox centrado em 300,300).
const C = 300;
const R_OUT = 285;
const R_SIGN_IN = 240;
const R_GLYPH = 206;
const R_DEGREE = 180;
const R_HOUSE = 160;
const R_HOUSE_NUM = 146;
const R_ASPECT = 128;
const MIN_GAP = 9; // afastamento mínimo entre planetas, em graus

const f = (n: number) => Number(n.toFixed(2));
const pt = (r: number, a: number) => {
  const p = polar(C, C, r, a);
  return `${f(p.x)} ${f(p.y)}`;
};

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Setor de um signo: do raio externo ao interno, de a0 a a1 (anti-horário). */
function sectorPath(a0: number, a1: number) {
  return [
    `M ${pt(R_OUT, a0)}`,
    `A ${R_OUT} ${R_OUT} 0 0 0 ${pt(R_OUT, a1)}`,
    `L ${pt(R_SIGN_IN, a1)}`,
    `A ${R_SIGN_IN} ${R_SIGN_IN} 0 0 1 ${pt(R_SIGN_IN, a0)}`,
    "Z",
  ].join(" ");
}

/** Descrição em texto do mapa, para leitores de tela. */
export function describeChart(chart: ChartData) {
  const parts: string[] = [];
  if (chart.ascendant) parts.push(`Ascendente em ${chart.ascendant.sign}`);
  if (chart.midheaven) parts.push(`Meio do Céu em ${chart.midheaven.sign}`);
  for (const p of chart.planets) {
    parts.push(
      `${p.name} em ${p.sign} ${Math.floor(p.degree)}°${
        p.retrograde ? " retrógrado" : ""
      }${p.house ? `, casa ${p.house}` : ""}`,
    );
  }
  return parts.join(". ") + ".";
}

export type WheelOptions = {
  /** Animação de entrada (respeita prefers-reduced-motion). */
  animated?: boolean;
  className?: string;
  title?: string;
  /** Prefixo dos ids de título/descrição; use valores distintos se houver várias rodas na página. */
  idPrefix?: string;
};

const text = (
  x: number,
  y: number,
  size: number,
  cls: string,
  content: string,
  extra = "",
) =>
  `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" font-size="${size}" class="${cls}" aria-hidden="true"${extra}>${content}</text>`;

export function renderChartWheelSvg(
  chart: ChartData,
  {
    animated = false,
    className = "",
    title = "Roda do mapa astral",
    idPrefix = "chart-wheel",
  }: WheelOptions = {},
): string {
  const asc = chart.ascendant?.longitude ?? null;
  const ang = (lon: number) => wheelAngle(lon, asc);
  const delay = (i: number) => `style="--i:${i}"`;

  // Planetas: posição real e posição exibida (afastada para não sobrepor).
  const realAngles = chart.planets.map((p) => ang(p.longitude));
  const shownAngles = spreadAngles(realAngles, MIN_GAP);

  const axes =
    chart.ascendant && chart.midheaven
      ? [
          { label: "AC", lon: chart.ascendant.longitude },
          { label: "FC", lon: chart.midheaven.longitude + 180 },
          { label: "DC", lon: chart.ascendant.longitude + 180 },
          { label: "MC", lon: chart.midheaven.longitude },
        ]
      : [];

  // Marcas de grau: 1° (curta), 5° (média) e 10° (longa).
  const ticks = { one: "", five: "", ten: "" };
  for (let d = 0; d < 360; d++) {
    if (d % 30 === 0) continue; // limites de signo já têm linha
    const a = ang(d);
    const len = d % 10 === 0 ? 11 : d % 5 === 0 ? 8 : 4;
    const seg = `M ${pt(R_SIGN_IN, a)} L ${pt(R_SIGN_IN - len, a)} `;
    if (len === 11) ticks.ten += seg;
    else if (len === 8) ticks.five += seg;
    else ticks.one += seg;
  }

  const aspects = chart.aspects.filter((a) => a.type !== "conjunction");
  const planetIndex = new Map(chart.planets.map((p, i) => [p.id, i]));
  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-desc`;

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 680 680" role="img" aria-labelledby="${titleId} ${descId}" class="h-auto w-full${
      animated ? " wheel-animated" : ""
    }${className ? ` ${esc(className)}` : ""}" data-testid="chart-wheel">`,
    `<title id="${titleId}">${esc(title)}</title>`,
    `<desc id="${descId}">${esc(describeChart(chart))}</desc>`,
  );

  // Anel decorativo externo (pontilhado).
  out.push(
    `<g aria-hidden="true"><circle cx="${C}" cy="${C}" r="${R_OUT + 16}" fill="none" class="stroke-primary/50" stroke-width="1" stroke-dasharray="1 9" stroke-linecap="round"/></g>`,
  );

  // Anel do zodíaco: um setor por signo, na cor do elemento.
  out.push(`<g class="wheel-fade" ${delay(0)}>`);
  SIGNS.forEach((sign, i) => {
    const a0 = ang(i * 30);
    const glyph = polar(C, C, 263, a0 + 15);
    out.push(
      `<path d="${sectorPath(a0, a0 + 30)}" class="${SECTOR_FILL[i % 4]} stroke-border" stroke-width="1"/>`,
      text(
        glyph.x,
        glyph.y,
        22,
        `font-symbols ${SIGN_TEXT[i % 4]}`,
        SIGN_GLYPHS[i],
      ),
    );
  });
  out.push(
    `<circle cx="${C}" cy="${C}" r="${R_SIGN_IN}" fill="none" class="stroke-muted-foreground/60" stroke-width="1"/>`,
    `<path d="${ticks.one}" class="stroke-muted-foreground/60" stroke-width="0.6" fill="none"/>`,
    `<path d="${ticks.five}" class="stroke-muted-foreground/70" stroke-width="0.8" fill="none"/>`,
    `<path d="${ticks.ten}" class="stroke-muted-foreground/80" stroke-width="1" fill="none"/>`,
    `</g>`,
  );

  // Círculos internos
  out.push(
    `<g aria-hidden="true"><circle cx="${C}" cy="${C}" r="${R_HOUSE}" fill="none" class="stroke-muted-foreground/50" stroke-width="1"/><circle cx="${C}" cy="${C}" r="${R_ASPECT}" class="fill-card/60 stroke-muted-foreground/40" stroke-width="1"/></g>`,
  );

  // Cúspides e números das casas (só com hora de nascimento).
  if (chart.cusps) {
    const cusps = chart.cusps;
    out.push(`<g class="wheel-fade" ${delay(2)}>`);
    cusps.forEach((cusp, i) => {
      const a = ang(cusp.longitude);
      const next = cusps[(i + 1) % 12].longitude;
      const span = (((next - cusp.longitude) % 360) + 360) % 360;
      const num = polar(C, C, R_HOUSE_NUM, ang(cusp.longitude + span / 2));
      const inner = polar(C, C, R_HOUSE, a);
      const outer = polar(C, C, R_SIGN_IN, a);
      out.push(
        `<line x1="${f(inner.x)}" y1="${f(inner.y)}" x2="${f(outer.x)}" y2="${f(outer.y)}" class="stroke-muted-foreground/60" stroke-width="1"/>`,
        text(num.x, num.y, 11, "fill-muted-foreground", String(cusp.house)),
      );
    });
    out.push(`</g>`);
  }

  // Eixos AC / MC / DC / FC em latão. Um único grupo animado: cada grupo
  // animado vira uma camada própria, e dezenas delas pesam na pintura.
  if (axes.length) out.push(`<g class="wheel-fade" ${delay(2)}>`);
  for (const { label, lon } of axes) {
    const a = ang(lon);
    const from = polar(C, C, R_HOUSE, a);
    const to = polar(C, C, R_OUT + 8, a);
    const lab = polar(C, C, R_OUT + 24, a);
    out.push(
      `<line x1="${f(from.x)}" y1="${f(from.y)}" x2="${f(to.x)}" y2="${f(to.y)}" class="stroke-primary" stroke-width="2" stroke-linecap="round"/>`,
      text(lab.x, lab.y, 14, "fill-primary", label, ' font-weight="700"'),
    );
  }
  if (axes.length) out.push(`</g>`);

  // Aspectos: azul para harmônicos, vermelho para tensos.
  out.push(`<g aria-hidden="true" class="wheel-fade" ${delay(3)}>`);
  aspects.forEach((asp) => {
    const a = polar(C, C, R_ASPECT, realAngles[planetIndex.get(asp.planet_a)!]);
    const b = polar(C, C, R_ASPECT, realAngles[planetIndex.get(asp.planet_b)!]);
    out.push(
      `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" class="${
        asp.tone === "harmonic" ? "stroke-air" : "stroke-fire"
      }" stroke-width="${asp.orb < 2 ? 1.8 : 1.1}" stroke-opacity="${
        asp.orb < 4 ? 0.9 : 0.6
      }" stroke-linecap="round"/>`,
    );
  });
  out.push(`</g>`);

  // Planetas: marca na posição real, linha-guia e símbolo afastado.
  out.push(`<g class="wheel-fade" ${delay(4)}>`);
  chart.planets.forEach((planet, i) => {
    const real = realAngles[i];
    const shown = shownAngles[i];
    const glyph = polar(C, C, R_GLYPH, shown);
    const deg = polar(C, C, R_DEGREE, shown);
    const retro = polar(C, C, R_GLYPH + 19, shown);
    const from = polar(C, C, R_SIGN_IN - 1, real);
    const to = polar(C, C, R_GLYPH + 14, shown);
    out.push(
      `<g data-planet="${planet.id}" data-angle="${f(shown)}">`,
      `<line x1="${f(from.x)}" y1="${f(from.y)}" x2="${f(to.x)}" y2="${f(to.y)}" class="stroke-primary/60" stroke-width="0.8"/>`,
      text(
        glyph.x,
        glyph.y,
        21,
        "fill-foreground font-symbols",
        PLANET_GLYPHS[planet.id] + TEXT,
      ),
      text(
        deg.x,
        deg.y,
        11,
        "fill-muted-foreground",
        `${Math.floor(planet.degree)}°`,
      ),
      planet.retrograde
        ? text(retro.x, retro.y, 11, "fill-primary", "℞", ' font-weight="700"')
        : "",
      `</g>`,
    );
  });

  out.push(`</g>`);

  // Borda externa
  out.push(
    `<circle cx="${C}" cy="${C}" r="${R_OUT}" fill="none" class="stroke-primary/70" stroke-width="1.5" aria-hidden="true"/>`,
    `</svg>`,
  );

  return out.join("");
}
