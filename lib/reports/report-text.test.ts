import { describe, expect, it } from "vitest";

import { computeChart } from "@/lib/astro";
import { sampleChart } from "@/lib/sample-chart";

import { exactness, formatDegree, summarizeChart } from "./chart-summary";
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

  it("concentrações: cada linha lista exatamente os planetas do signo/casa, sem o Nodo Norte", () => {
    // Só a seção de concentrações (as cúspides também têm linhas "- Casa N:").
    const lines = text
      .slice(text.indexOf("CONCENTRAÇÕES"), text.indexOf("ELEMENTOS"))
      .split("\n");
    const planets = sampleChart.planets.filter((p) => p.id !== "north_node");
    const names = (list: typeof planets) => list.map((p) => p.name).join(", ");

    // Cada signo com 2+ planetas aparece com os nomes certos e a contagem certa.
    const signs = new Set(planets.map((p) => p.sign));
    for (const sign of signs) {
      const inSign = planets.filter((p) => p.sign === sign);
      const line = lines.find((l) => l.startsWith(`- ${sign}:`));
      if (inSign.length >= 2) {
        expect(line).toBe(
          `- ${sign}: ${names(inSign)} (${inSign.length} planetas)`,
        );
      } else {
        expect(line).toBeUndefined();
      }
    }
    // Idem para as casas.
    for (let house = 1; house <= 12; house++) {
      const inHouse = planets.filter((p) => p.house === house);
      const line = lines.find((l) => l.startsWith(`- Casa ${house}:`));
      if (inHouse.length >= 2) {
        expect(line).toBe(
          `- Casa ${house}: ${names(inHouse)} (${inHouse.length} planetas)`,
        );
      } else {
        expect(line).toBeUndefined();
      }
    }

    expect(text).toContain("o Nodo Norte NÃO é planeta");
    const section = text.slice(
      text.indexOf("CONCENTRAÇÕES"),
      text.indexOf("ELEMENTOS"),
    );
    expect(section).not.toContain("Nodo Norte (");
  });

  it("o Nodo Norte nunca entra numa contagem, mesmo no signo de um planeta", () => {
    // Mapa de 1989: Saturno, Urano e Netuno em Capricórnio e o Nodo Norte em Aquário.
    const chart = computeChart({
      birthDate: "1989-03-10",
      birthTime: "12:00",
      timezone: "America/Sao_Paulo",
      latitude: -23.55,
      longitude: -46.63,
      houseSystem: "placidus",
    });
    const t = summarizeChart(chart);
    const inCap = chart.planets.filter(
      (p) => p.sign === "Capricórnio" && p.id !== "north_node",
    );
    expect(inCap.map((p) => p.name)).toEqual(["Saturno", "Urano", "Netuno"]);
    expect(t).toContain("- Capricórnio: Saturno, Urano, Netuno (3 planetas)");
    expect(t).not.toMatch(/- (Capricórnio|Aquário):.*Nodo/);
  });

  it("elementos e modalidades trazem a contagem E quem está em cada um, somando 10", () => {
    const lines = text.split("\n");
    const total = (l: string) =>
      [...l.matchAll(/ (\d+) \(/g)].reduce((n, m) => n + Number(m[1]), 0);
    for (const prefix of ["ELEMENTOS", "MODALIDADES"]) {
      const line = lines.find((l) => l.startsWith(prefix))!;
      expect(line).not.toContain("Nodo");
      expect(total(line)).toBe(10);
    }
    expect(lines.find((l) => l.startsWith("ELEMENTOS"))).toContain(
      "terra 3 (Marte, Urano, Netuno)",
    );
  });

  it("lista aspectos do mais exato ao menos exato, com a exatidão em palavras e SEM orbe numérico", () => {
    const labels = [
      "praticamente exato",
      "bem próximo do exato",
      "próximo do exato",
      "menos exato, efeito mais sutil",
    ];
    const aspectLines = text
      .split("\n")
      .filter((l) =>
        /^- .+ (conjunção|sextil|quadratura|trígono|oposição) .+ \(.+\)$/.test(
          l,
        ),
      );
    expect(aspectLines.length).toBe(sampleChart.aspects.length);
    expect(aspectLines.length).toBeGreaterThan(5);
    // Nenhum grau de orbe no texto dos aspectos.
    for (const l of aspectLines) expect(l).not.toMatch(/\d+°/);
    // A ordem acompanha a exatidão (rótulos só podem piorar ao longo da lista).
    const rank = aspectLines.map((l) =>
      labels.findIndex((label) => l.endsWith(`(${label})`)),
    );
    expect(rank.every((r) => r >= 0)).toBe(true);
    expect(rank).toEqual([...rank].sort((x, y) => x - y));
  });

  it("exactness: limites dos rótulos", () => {
    expect(exactness(0.4)).toBe("praticamente exato");
    expect(exactness(1.5)).toBe("bem próximo do exato");
    expect(exactness(4.2)).toBe("próximo do exato");
    expect(exactness(6.7)).toBe("menos exato, efeito mais sutil");
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

  it("as concentrações não citam casas, mas seguem contando por signo", () => {
    expect(text).toContain("CONCENTRAÇÕES");
    expect(text).not.toMatch(/- Casa \d+:/);
    expect(text).toContain("- Câncer: Sol, Mercúrio, Vênus (3 planetas)");
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
    expect(s).toContain("300 e 800 palavras");
    expect(s).toContain("Foque em carreira.");
  });

  it("o prompt de sistema proíbe a IA de contar por conta própria e de incluir o Nodo Norte", () => {
    const s = buildSystemPrompt("");
    expect(s).toContain("NÃO conte nem agrupe por conta própria");
    expect(s).toContain("CONCENTRAÇÕES");
    expect(s).toMatch(/Nodo Norte e os ângulos .* não são planetas/);
    expect(s).toContain("bloco fechado sobre UM único tema");
    expect(s).toContain("LADO POSITIVO");
    expect(s).toContain("LADO DIFÍCIL");
    expect(s).toContain("a que sinais prestar atenção");
    expect(s).toContain("cite apenas aspectos DESSE planeta");
    expect(s).toContain("parágrafo final de FECHAMENTO");
    expect(s).toContain("Seja concreto");
    expect(s).toContain("nomeie TODOS os corpos contados");
    // Regras do feedback do dono (influência mútua, convivência, vocabulário, síntese).
    expect(s).toContain("influência nos dois sentidos");
    expect(s).toContain("desenvolva a convivência dos dois");
    expect(s).toContain("“sustentar” e “sustentação”");
    expect(s).toContain("em vez de “cobrar” e “cobrança”");
    expect(s).toContain("não use “cobrar”");
    expect(s).toContain("NÃO leva subtítulo próprio");
    expect(s).toContain("NUNCA use fórmulas repetidas");
    expect(s).toContain("Seja enxuto");
    expect(s).toContain("CAMINHO concreto em passos");
    expect(s).toContain("capacidade de se reinventar e de recomeçar");
    expect(s).toContain("mais forte do que antes");
    expect(s).toContain("nomes naturais e claros");
    expect(s).toContain("não repita os mesmos exemplos e conselhos práticos");
    expect(s).toContain("NÃO cite orbes nem graus de aspectos");
    expect(s).toContain("não use a palavra");
    expect(s).toContain("INFLUÊNCIA POSITIVA");
    expect(s).toContain("apresente-o por inteiro");
    expect(s).toContain("nunca de passagem no fim de um parágrafo");
    expect(s).toContain("termina com ORIENTAÇÃO");
    expect(s).toContain(
      "o que a pessoa pode focar para expressar o melhor daquela posição e o que evitar",
    );
    expect(s).toContain("tome consciência");
    expect(s).toContain("atitudes ou hábitos");
    expect(s).toContain(
      "abra apresentando o tema, desenvolva e conclua dentro dele",
    );
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

  it("o prompt da seção informa a próxima seção, ou que é a última", () => {
    const titles = ["Introdução", "Mente e comunicação", "Síntese"];
    const meio = buildSectionPrompt({
      section: { ...section, title: "Mente e comunicação" },
      allTitles: titles,
      chartSummary: "PLANETAS",
    });
    expect(meio).toContain('Próxima seção do mapa: "Síntese"');
    expect(meio).toMatch(/Termine com/);
    const ultima = buildSectionPrompt({
      section: { ...section, title: "Síntese" },
      allTitles: titles,
      chartSummary: "PLANETAS",
    });
    expect(ultima).toContain("Esta é a última seção do mapa");
    expect(ultima).not.toContain("Próxima seção do mapa");
  });

  it("o estilo do fechamento alterna entre seções vizinhas", () => {
    const titles = ["A", "B", "C", "D", "E", "F"];
    const style = (t: string) =>
      buildSectionPrompt({
        section: { ...section, title: t },
        allTitles: titles,
        chartSummary: "PLANETAS",
      })
        .split("\n")
        .find((l) => l.startsWith("Próxima seção do mapa"))!
        .replace(/^Próxima seção do mapa: "[^"]*"\. /, "");
    const estilos = ["A", "B", "C", "D"].map(style);
    expect(new Set(estilos).size).toBe(4);
    // Cicla: a quinta seção volta ao estilo da primeira.
    expect(style("E")).not.toBe(estilos[3]);
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
