import { describe, expect, it } from "vitest";

import { computeChart } from "@/lib/astro";
import { sampleChart } from "@/lib/sample-chart";

import { angularDistance } from "./geometry";
import { renderChartWheelSvg } from "./svg";

const render = (chart = sampleChart, animated = false) =>
  renderChartWheelSvg(chart, { animated });

/** Ângulos exibidos de cada planeta (atributo data-angle). */
const shownAngles = (html: string) =>
  [...html.matchAll(/data-angle="([\d.]+)"/g)].map((m) => Number(m[1]));

describe("roda do mapa — caso Referência 1", () => {
  const html = render();

  it("é uma imagem acessível, com título e descrição do mapa", () => {
    expect(html).toContain('role="img"');
    expect(html).toContain("aria-labelledby=");
    expect(html).toContain("Ascendente em Sagitário");
    expect(html).toContain("Sol em Câncer");
    expect(html).toContain("Lua em Aquário");
  });

  it("desenha os 10 planetas e o Nodo Norte", () => {
    expect(html.match(/data-planet="/g)).toHaveLength(11);
  });

  it("não sobrepõe planetas: no mínimo 9° entre vizinhos", () => {
    const angles = shownAngles(html).sort((a, b) => a - b);
    expect(angles).toHaveLength(11);
    angles.forEach((a, i) => {
      const next = angles[(i + 1) % angles.length];
      expect(angularDistance(a, next)).toBeGreaterThanOrEqual(9 - 0.02);
    });
  });

  it("desenha eixos, cúspides e números das 12 casas", () => {
    for (const label of ["AC", "MC", "DC", "FC"]) {
      expect(html).toContain(`>${label}</text>`);
    }
    for (let h = 1; h <= 12; h++) expect(html).toContain(`>${h}</text>`);
  });

  it("usa a versão de texto dos símbolos (sem emoji)", () => {
    expect(html).toContain("︎");
  });

  it("desenha linhas de aspecto harmônicas (azul) e tensas (vermelho)", () => {
    expect(html).toContain("stroke-air");
    expect(html).toContain("stroke-fire");
  });

  it("só anima quando pedido", () => {
    expect(html).not.toContain("wheel-animated");
    expect(render(sampleChart, true)).toContain("wheel-animated");
  });

  it("é um SVG bem formado e fechado", () => {
    expect(html.startsWith("<svg ")).toBe(true);
    expect(html.endsWith("</svg>")).toBe(true);
    expect(html.match(/<g[ >]/g)?.length).toBe(html.match(/<\/g>/g)?.length);
  });

  it("escapa o título (nada de HTML vindo de fora)", () => {
    const evil = renderChartWheelSvg(sampleChart, {
      title: '"><script>alert(1)</script>',
      className: '" onload="x',
    });
    expect(evil).not.toContain("<script>");
    expect(evil).not.toContain('" onload="x');
    expect(evil).toContain("&lt;script&gt;");
  });
});

describe("roda do mapa — sem hora de nascimento", () => {
  const chart = computeChart({
    birthDate: "1995-07-14",
    birthTime: null,
    timezone: "America/Sao_Paulo",
    latitude: -22.91,
    longitude: -47.06,
    houseSystem: "placidus",
  });
  const html = render(chart);

  it("não desenha eixos nem casas", () => {
    expect(html).not.toContain(">AC</text>");
    expect(html).not.toContain(">MC</text>");
    expect(html).not.toContain(">1</text>");
    expect(html).not.toContain("Ascendente em");
  });

  it("continua desenhando os planetas, sem sobreposição", () => {
    const angles = shownAngles(html).sort((a, b) => a - b);
    expect(angles).toHaveLength(11);
    angles.forEach((a, i) => {
      expect(
        angularDistance(a, angles[(i + 1) % angles.length]),
      ).toBeGreaterThanOrEqual(9 - 0.02);
    });
  });
});
