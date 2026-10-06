import { computeChart, type ChartData } from "@/lib/astro";

/**
 * Mapa de exemplo (Referência 1 do PRD: 14/07/1995, 15h30, Campinas) usado
 * na roda animada da home e nas páginas de produto. Não é dado de cliente.
 */
export const sampleChart: ChartData = computeChart({
  birthDate: "1995-07-14",
  birthTime: "15:30",
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
  houseSystem: "placidus",
});
