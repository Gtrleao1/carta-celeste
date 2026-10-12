import type { ChartData } from "@/lib/astro";
import { PLANETS, SIGN_ELEMENT, SIGN_MODALITY } from "@/lib/astro";

const planetName = new Map<string, string>([
  ...PLANETS.map((p) => [p.id, p.name] as [string, string]),
  ["north_node", "Nodo Norte"],
]);

/**
 * Exatidão de um aspecto em palavras. O texto do mapa não cita orbes em graus
 * (o cliente não precisa do número), então o resumo da IA traz só o rótulo.
 * A lista continua do aspecto mais exato para o menos exato.
 */
export function exactness(orbDegrees: number): string {
  if (orbDegrees < 1) return "praticamente exato";
  if (orbDegrees < 3) return "bem próximo do exato";
  if (orbDegrees < 5) return "próximo do exato";
  return "menos exato, efeito mais sutil";
}

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
 * ângulos, regentes e aspectos com a exatidão em palavras.
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
        `- ${planetName.get(a.planet_a)} ${a.name.toLowerCase()} ${planetName.get(a.planet_b)} (${exactness(a.orb)})`,
      );
    }
  }

  // Agrupamentos prontos: contar quem está em cada signo, casa, elemento e
  // modalidade é aritmética, e a IA erra (já contou o Nodo Norte como planeta).
  // Só os 10 planetas entram; o Nodo Norte é um ponto e fica de fora das contagens.
  const bodies = chart.planets.filter((p) => p.id !== "north_node");
  const names = (list: typeof bodies) => list.map((p) => p.name).join(", ");
  const quantity = (n: number) => `${n} planeta${n > 1 ? "s" : ""}`;

  const crowded: string[] = [];
  for (const sign of new Set(bodies.map((p) => p.sign))) {
    const inSign = bodies.filter((p) => p.sign === sign);
    if (inSign.length >= 2)
      crowded.push(`- ${sign}: ${names(inSign)} (${quantity(inSign.length)})`);
  }
  if (!chart.time_unknown) {
    const houses = [...new Set(bodies.map((p) => p.house))]
      .filter((h): h is number => h !== null)
      .sort((a, b) => a - b);
    for (const house of houses) {
      const inHouse = bodies.filter((p) => p.house === house);
      if (inHouse.length >= 2)
        crowded.push(
          `- Casa ${house}: ${names(inHouse)} (${quantity(inHouse.length)})`,
        );
    }
  }
  lines.push(
    "",
    "CONCENTRAÇÕES (contagens prontas, só dos 10 planetas; o Nodo Norte NÃO é planeta e não entra em nenhuma contagem)",
    ...(crowded.length
      ? crowded
      : ["- Nenhum signo ou casa tem mais de um planeta."]),
  );

  const group = (
    label: string,
    key: (p: (typeof bodies)[number]) => string,
  ) => {
    const keys = [...new Set(bodies.map(key))];
    return `${label}: ${keys
      .map((k) => {
        const members = bodies.filter((p) => key(p) === k);
        return `${k} ${members.length} (${names(members)})`;
      })
      .join("; ")}`;
  };
  lines.push(
    "",
    group("ELEMENTOS (entre os 10 planetas)", (p) =>
      SIGN_ELEMENT[p.sign_index].replace("agua", "água"),
    ),
    group("MODALIDADES (entre os 10 planetas)", (p) =>
      SIGN_MODALITY[p.sign_index].replace("mutavel", "mutável"),
    ),
    "Elemento ou modalidade que não aparece acima tem 0 planetas.",
  );

  return lines.join("\n");
}
