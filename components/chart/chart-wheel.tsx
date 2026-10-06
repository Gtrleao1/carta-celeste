import { renderChartWheelSvg, type WheelOptions } from "@/lib/chart-wheel/svg";
import type { ChartData } from "@/lib/astro";

/**
 * Roda do mapa em SVG. O SVG é gerado como texto no servidor
 * (`renderChartWheelSvg`) e injetado de uma vez, para não pesar na hidratação
 * da página. Todo o conteúdo vem do cálculo do mapa, nunca de entrada de usuário.
 */
export function ChartWheel({
  chart,
  ...options
}: { chart: ChartData } & WheelOptions) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: renderChartWheelSvg(chart, options) }}
    />
  );
}
