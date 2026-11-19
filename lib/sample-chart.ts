import { computeChart, type ChartData } from "@/lib/astro";

/**
 * Mapa de referência do PRD (14/07/1995, 15h30, Campinas), usado só nos
 * testes. O que o público vê é `exampleChart` (fictício, `lib/example-chart.ts`).
 */
export const sampleChart: ChartData = computeChart({
  birthDate: "1995-07-14",
  birthTime: "15:30",
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
  houseSystem: "placidus",
});
