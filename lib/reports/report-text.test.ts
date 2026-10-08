import { describe, expect, it } from "vitest";

import { computeChart } from "@/lib/astro";
import { sampleChart } from "@/lib/sample-chart";

import { formatDegree, summarizeChart } from "./chart-summary";
import {
  buildSectionPrompt,
  buildSystemPrompt,
  countWords,
  timeUnknownExplanation,
} from "./prompt";

describe("formatDegree", () => {
  it("formata grau e minutos truncados", () => {
    expect(formatDegree(23.6333)).toBe("23°37′");
    expect(formatDegree(0)).toBe("0°00′");
    expect(formatDegree(29.9999)).toBe("29°59′");
    expect(formatDegree(7.05)).toBe("7°03′");
  });
});

describe("summarizeChart — Referência 1", () => {
  const text = summarizeChart(sampleChart);

  it("traz ângulos, planetas com casa e retrogradação, e regentes", () => {
    expect(text).toContain("SISTEMA DE CASAS: Placidus.");
    expect(text).toContain("- Ascendente: Sagitário 23°");
    expect(text).toContain("- Meio do Céu: Virgem 11°");
    expect(text).toMatch(/- Sol: Câncer 21°\d\d′, casa 8/);
    expect(text).toMatch(/- Lua: Aquário 23°\d\d′, casa \d+/);
    expect(text).toContain("retrógrado");
    expect(text).toMatch(/- Casa 1: Sagitário .*regente Júpiter/);
    expect(text).toContain("- Nodo Norte:");
  });

  it("lista aspectos com orbe, do mais exato ao menos exato", () => {
    const aspects = text
      .split("\n")
      .filter((l) => /\(orbe \d+°\d\d′\)/.test(l));
    expect(aspects.length).toBeGreaterThan(5);
    const orbs = aspects.map((l) => {
      const m = /orbe (\d+)°(\d\d)′/.exec(l)!;
      return Number(m[1]) * 60 + Number(m[2]);
    });
    expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
  });

  it("não inclui NENHUM dado pessoal: data, hora, local, coordenadas, fuso", () => {
    const forbidden = [
      "1995",
      "14/07",
      "07-14",
      "15:30",
      "15h30",
      "Campinas",
      "São Paulo",
      "Sao_Paulo",
      "America/",
      "-22.91",
      "-47.06",
      "-22,91",
      "-47,06",
      "UTC",
      sampleChart.utc,
    ];
    for (const f of forbidden) expect(text, f).not.toContain(f);
  });
});

describe("summarizeChart — sem hora de nascimento", () => {
  const chart = computeChart({
    birthDate: "1995-07-14",
    birthTime: null,
    timezone: "America/Sao_Paulo",
    latitude: -22.91,
    longitude: -47.06,
    houseSystem: "placidus",
  });
  const text = summarizeChart(chart);

  it("avisa que a hora é desconhecida e omite ângulos e casas", () => {
    expect(text).toContain("DESCONHECIDA");
    expect(text).not.toContain("ÂNGULOS");
    expect(text).not.toContain("CASAS (");
    expect(text).not.toMatch(/- Ascendente/);
    // Nenhum planeta ganha casa quando a hora é desconhecida.
    expect(text).not.toMatch(/casa \d+/i);
  });

  it("continua trazendo os planetas nos signos", () => {
    expect(text).toMatch(/- Sol: Câncer/);
    expect(text).toMatch(/- Lua: Aquário/);
  });
});

describe("prompts", () => {
  const section = {
    key: "mente",
    title: "Mente e comunicação",
    instructions: "Interprete Mercúrio.",
  };

  it("o prompt de sistema traz as regras e as instruções do produto", () => {
    const s = buildSystemPrompt("Foque em carreira.");
    expect(s).toContain("português do Brasil");
    expect(s).toContain("SOMENTE as posições do mapa fornecidas");
    expect(s).toMatch(/previsões deterministas/);
    expect(s).toMatch(/financeiros, de investimento ou jurídicos/);
    expect(s).toContain("350 e 700 palavras");
    expect(s).toContain("Foque em carreira.");
  });

  it("o prompt da seção lista as outras seções (sem repetir a atual) e o mapa", () => {
    const p = buildSectionPrompt({
      section,
      allTitles: ["Introdução", "Mente e comunicação", "Síntese"],
      chartSummary: "PLANETAS\n- Sol: Câncer 21°51′, casa 8",
    });
    expect(p).toContain('Escreva a seção "Mente e comunicação"');
    expect(p).toContain("Interprete Mercúrio.");
    expect(p).toContain("- Introdução");
    expect(p).toContain("- Síntese");
    expect(p.match(/- Mente e comunicação/g)).toBeNull();
    expect(p).toContain("- Sol: Câncer 21°51′, casa 8");
  });

  it("nenhum prompt contém dados pessoais quando só o resumo é usado", () => {
    const p =
      buildSystemPrompt("Instruções.") +
      buildSectionPrompt({
        section,
        allTitles: [section.title],
        chartSummary: summarizeChart(sampleChart),
      });
    expect(p).not.toMatch(/@/);
    expect(p).not.toContain("1995");
    expect(p).not.toContain("Campinas");
  });

  it("a explicação de hora desconhecida é curta e honesta", () => {
    const t = timeUnknownExplanation("Rotina e trabalho (casa 6)");
    expect(t).toContain("hora exata de nascimento");
    expect(t).toContain("Rotina e trabalho (casa 6)");
    expect(countWords(t)).toBeLessThan(120);
  });

  it("countWords", () => {
    expect(countWords("  uma   frase\ncom cinco palavras ")).toBe(5);
    expect(countWords("")).toBe(0);
  });
});
