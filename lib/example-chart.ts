import { computeChart, type ChartData } from "@/lib/astro";

/**
 * Mapa de exemplo FICTÍCIO (08/12/2020, 18h30, Campinas) para o que o público
 * vê: prévia da mandala na home, páginas de produto e protótipo do leitor. O
 * texto de exemplo (`docs/referencia/exemplo-ficticio.md`) foi gerado para este
 * mesmo mapa. Não é dado de ninguém. (Os testes usam `sampleChart`, o caso de
 * referência do PRD.)
 */
export const exampleChart: ChartData = computeChart({
  birthDate: "2020-12-08",
  birthTime: "18:30",
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
  houseSystem: "placidus",
});
