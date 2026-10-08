import type { ChartData } from "@/lib/astro";
import { PLANETS } from "@/lib/astro";

const planetName = new Map<string, string>([
  ...PLANETS.map((p) => [p.id, p.name] as [string, string]),
  ["north_node", "Nodo Norte"],
]);

/** 23.6333 -> `23°38′` (minutos truncados, como nos mapas de referência). */
export function formatDegree(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  // 1e-6 evita que erros de ponto flutuante (7.05 -> 2.9999…) derrubem um minuto.
  const min = Math.floor((degreeInSign - deg) * 60 + 1e-6);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

const SYSTEM_LABEL = {
  placidus: "Placidus",
  equal: "casas iguais",
  whole: "casas inteiras (whole sign)",
} as const;

/**
 * Resumo legível do mapa para a IA: planeta, signo, grau, casa, retrógrado,
 * ângulos, regentes e aspectos com orbes.
 *
 * PRIVACIDADE: usa só as posições calculadas. Não inclui nome, e-mail, data,
 * hora, cidade, coordenadas nem fuso (a Política de Privacidade promete isso).
 * Há um teste que garante.
 */
export function summarizeChart(chart: ChartData): string {
  const lines: string[] = [];

  if (chart.time_unknown) {
    lines.push(
      "HORA DE NASCIMENTO: DESCONHECIDA. O Ascendente, o Meio do Céu e as casas NÃO foram calculados: não os mencione nem os interprete, e não cite casas.",
    );
  } else if (chart.input.house_system) {
    const sistema = SYSTEM_LABEL[chart.input.house_system];
    lines.push(`SISTEMA DE CASAS: ${sistema}.`);
    if (chart.house_fallback_reason) {
      lines.push(
        `Observação: o sistema ${SYSTEM_LABEL[chart.input.house_system_requested]} não se aplica a este local; foram usadas ${sistema}.`,
      );
    }
  }

  if (chart.ascendant && chart.midheaven) {
    lines.push(
      "",
      "ÂNGULOS",
      `- Ascendente: ${chart.ascendant.sign} ${formatDegree(chart.ascendant.degree)}`,
      `- Meio do Céu: ${chart.midheaven.sign} ${formatDegree(chart.midheaven.degree)}`,
    );
  }

  lines.push("", "PLANETAS");
  for (const p of chart.planets) {
    const parts = [`${p.sign} ${formatDegree(p.degree)}`];
    if (p.house) parts.push(`casa ${p.house}`);
    if (p.retrograde) parts.push("retrógrado");
    lines.push(`- ${p.name}: ${parts.join(", ")}`);
  }

  if (chart.cusps && chart.house_rulers) {
    lines.push("", "CASAS (signo na cúspide, regente e onde o regente está)");
    for (const cusp of chart.cusps) {
      const r = chart.house_rulers.find((h) => h.house === cusp.house)!;
      const traditional =
        r.traditional_ruler !== r.ruler
          ? ` (regente tradicional: ${r.traditional_ruler})`
          : "";
      const where = r.ruler_house
        ? `${r.ruler_sign}, casa ${r.ruler_house}`
        : r.ruler_sign;
      lines.push(
        `- Casa ${cusp.house}: ${cusp.sign} ${formatDegree(cusp.degree)}; regente ${r.ruler}${traditional}, em ${where}`,
      );
    }
  }

  if (chart.aspects.length) {
    lines.push("", "ASPECTOS (do mais exato para o menos exato)");
    for (const a of chart.aspects) {
      lines.push(
        `- ${planetName.get(a.planet_a)} ${a.name.toLowerCase()} ${planetName.get(a.planet_b)} (orbe ${formatDegree(a.orb)})`,
      );
    }
  }

  const e = chart.elements;
  const m = chart.modalities;
  lines.push(
    "",
    `ELEMENTOS (entre os 10 planetas): fogo ${e.fogo}, terra ${e.terra}, ar ${e.ar}, água ${e.agua}`,
    `MODALIDADES: cardinal ${m.cardinal}, fixo ${m.fixo}, mutável ${m.mutavel}`,
  );

  return lines.join("\n");
}
