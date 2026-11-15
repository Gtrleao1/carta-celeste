import { computeChart, type ChartData } from "./chart";
import { PLANETS } from "./constants";
import { eclLon, houseOf, meanNode, norm } from "./core";

/**
 * Céu de hoje em câmera rápida, para a roda animada da home.
 *
 * Todo o cálculo acontece aqui, no servidor: o navegador só interpola entre os
 * quadros e acende o signo e a casa do Sol e da Lua. Nada disto é o mapa de
 * ninguém (não usa dado de cliente): é o céu do instante da geração da página
 * visto de Campinas, com as casas desse instante mantidas fixas durante o
 * filme (só os planetas se movem).
 */

export type SkyTimelapse = {
  /** Céu no primeiro quadro: define a roda (signos, casas, Ascendente). */
  chart: ChartData;
  /** Dias entre um quadro e o seguinte. */
  stepDays: number;
  /**
   * Longitudes por quadro, na ordem de `chart.planets`. São "desenroladas"
   * (sem o salto 359° → 0°), para o navegador interpolar sem tratar a volta.
   * Planetas retrógrados voltam sozinhos: é o movimento real.
   */
  frames: number[][];
  /** Por quadro: `[signo do Sol, casa do Sol, signo da Lua, casa da Lua]` (signo 0-11, casa 1-12). */
  highlights: [number, number, number, number][];
};

const FRAMES = 61;
const STEP_DAYS = 2;
const DAY_MS = 86_400_000;

// Cidade de referência do céu mostrado (Campinas, a mesma do mapa de exemplo).
const SKY_PLACE = {
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
};

/** Data e hora locais (`AAAA-MM-DD`, `HH:mm`) de um instante, no fuso do céu mostrado. */
function localParts(date: Date) {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-CA", {
    timeZone: SKY_PLACE.timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)) {
    p[x.type] = x.value;
  }
  return {
    birthDate: `${p.year}-${p.month}-${p.day}`,
    birthTime: `${p.hour}:${p.minute}`,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeSkyTimelapse(
  now: Date = new Date(),
  frameCount = FRAMES,
  stepDays = STEP_DAYS,
): SkyTimelapse {
  const chart = computeChart({
    ...localParts(now),
    ...SKY_PLACE,
    houseSystem: "placidus",
  });
  const cusps = (chart.cusps ?? []).map((c) => c.longitude);

  const keyOf = new Map<string, (typeof PLANETS)[number]["key"]>(
    PLANETS.map((p) => [p.id, p.key]),
  );
  const longitudeAt = (id: string, date: Date) => {
    const key = keyOf.get(id);
    return key ? eclLon(key, date) : meanNode(date);
  };

  const frames: number[][] = [];
  const highlights: SkyTimelapse["highlights"] = [];
  const sunIndex = chart.planets.findIndex((p) => p.id === "sun");
  const moonIndex = chart.planets.findIndex((p) => p.id === "moon");

  for (let f = 0; f < frameCount; f++) {
    const date = new Date(now.getTime() + f * stepDays * DAY_MS);
    const lons = chart.planets.map((p) => longitudeAt(p.id, date));
    frames.push(
      lons.map((lon, i) => {
        if (f === 0) return round1(norm(lon));
        const prev = frames[f - 1][i];
        // menor diferença com sinal: preserva a retrogradação, sem salto na volta
        const diff = norm(lon - prev + 180) - 180;
        return round1(prev + diff);
      }),
    );
    const sun = lons[sunIndex];
    const moon = lons[moonIndex];
    highlights.push([
      Math.floor(norm(sun) / 30),
      cusps.length ? houseOf(sun, cusps) : 0,
      Math.floor(norm(moon) / 30),
      cusps.length ? houseOf(moon, cusps) : 0,
    ]);
  }

  return { chart, stepDays, frames, highlights };
}
