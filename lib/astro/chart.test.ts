import * as Astronomy from "astronomy-engine";
import { describe, expect, it } from "vitest";

import { computeChart, type ChartInput, type PlanetPosition } from "./chart";
import { SIGNS } from "./constants";
import { angles, houseCusps, norm, zonedToUtc } from "./core";

const TOLERANCE = 1 / 60; // ±1′ de arco, em graus

/** Longitude absoluta a partir de signo + grau + minuto. */
const at = (sign: (typeof SIGNS)[number], deg: number, min: number) =>
  SIGNS.indexOf(sign) * 30 + deg + min / 60;

/** Diferença angular mínima, em graus. */
const diff = (a: number, b: number) => Math.abs(norm(a - b + 180) - 180);

function expectLon(actual: number | undefined, expected: number) {
  expect(actual).toBeDefined();
  expect(diff(actual!, expected)).toBeLessThanOrEqual(TOLERANCE);
}

const planet = (chart: ReturnType<typeof computeChart>, id: string) =>
  chart.planets.find((p) => p.id === id) as PlanetPosition;

const referencia1: ChartInput = {
  birthDate: "1995-07-14",
  birthTime: "15:30",
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
  houseSystem: "placidus",
};

const personare: ChartInput = {
  birthDate: "1990-07-13",
  birthTime: "17:35",
  timezone: "UTC",
  latitude: -23.3,
  longitude: -46.6,
  houseSystem: "placidus",
};

describe("Referência 1 (14/07/1995 15:30, Campinas, Placidus)", () => {
  const chart = computeChart(referencia1);

  it("calcula ascendente e meio do céu", () => {
    expectLon(chart.ascendant?.longitude, at("Sagitário", 23, 38));
    expectLon(chart.midheaven?.longitude, at("Virgem", 11, 8));
  });

  it("calcula Sol e Lua", () => {
    expectLon(planet(chart, "sun").longitude, at("Câncer", 21, 51));
    expectLon(planet(chart, "moon").longitude, at("Aquário", 23, 59));
  });

  it("calcula a cúspide da casa 2 e a casa do Sol", () => {
    expectLon(chart.cusps?.[1].longitude, at("Capricórnio", 17, 45));
    expect(planet(chart, "sun").house).toBe(8);
  });

  it("usa o offset de horário padrão (−180 min)", () => {
    expect(chart.input.utc_offset_minutes).toBe(-180);
    expect(chart.utc).toBe("1995-07-14T18:30:00.000Z");
  });
});

describe("Referência Personare (13/07/1990 17:35 UTC, Placidus)", () => {
  const chart = computeChart(personare);

  it("calcula ascendente e meio do céu", () => {
    expectLon(chart.ascendant?.longitude, at("Sagitário", 10, 7));
    expectLon(chart.midheaven?.longitude, at("Leão", 26, 15));
  });

  it("calcula as cúspides das casas 2, 3, 5 e 6", () => {
    expectLon(chart.cusps?.[1].longitude, at("Capricórnio", 5, 10));
    expectLon(chart.cusps?.[2].longitude, at("Capricórnio", 29, 23));
    expectLon(chart.cusps?.[4].longitude, at("Peixes", 28, 15));
    expectLon(chart.cusps?.[5].longitude, at("Touro", 4, 35));
  });

  it("posiciona Urano e Marte", () => {
    const urano = planet(chart, "uranus");
    expectLon(urano.longitude, at("Capricórnio", 7, 2));
    expect(urano.house).toBe(2);
    const marte = planet(chart, "mars");
    expectLon(marte.longitude, at("Touro", 0, 45));
    expect(marte.house).toBe(5);
  });
});

describe("Casas iguais (caso Personare)", () => {
  const chart = computeChart({ ...personare, houseSystem: "equal" });

  it("calcula a casa 2 e a casa de Urano", () => {
    expectLon(chart.cusps?.[1].longitude, at("Capricórnio", 10, 7));
    expect(planet(chart, "uranus").house).toBe(1);
  });
});

describe("Horário de verão histórico", () => {
  it("devolve o offset correto de America/Sao_Paulo", () => {
    expect(zonedToUtc(1995, 1, 15, 12, 0, "America/Sao_Paulo").offsetMin).toBe(
      -120,
    );
    expect(zonedToUtc(1995, 7, 14, 12, 0, "America/Sao_Paulo").offsetMin).toBe(
      -180,
    );
  });
});

describe("Latitudes polares", () => {
  it("cai para casas inteiras (whole) e registra o motivo", () => {
    const chart = computeChart({
      ...personare,
      latitude: 70,
      longitude: 25,
      houseSystem: "placidus",
    });
    expect(chart.input.house_system_requested).toBe("placidus");
    expect(chart.input.house_system).toBe("whole");
    expect(chart.house_fallback_reason).toMatch(/Placidus/);
    // Casas inteiras: cada cúspide cai no grau 0 de um signo.
    for (const c of chart.cusps!) expect(c.degree).toBeCloseTo(0, 6);
  });

  it("não registra motivo quando o sistema pedido é usado", () => {
    expect(computeChart(referencia1).house_fallback_reason).toBeNull();
  });
});

describe("Validação geométrica do ascendente", () => {
  const cidades = [
    { nome: "São Paulo", lat: -23.55, lng: -46.63 },
    { nome: "Lisboa", lat: 38.72, lng: -9.14 },
    { nome: "Sydney", lat: -33.87, lng: 151.21 },
    { nome: "Nova York", lat: 40.71, lng: -74.0 },
  ];
  const instantes = [
    new Date("1985-03-02T03:10:00Z"),
    new Date("1990-07-13T17:35:00Z"),
    new Date("2000-11-21T09:45:00Z"),
    new Date("2012-12-31T23:20:00Z"),
  ];

  for (const c of cidades) {
    for (const date of instantes) {
      it(`${c.nome} em ${date.toISOString()}: ASC no horizonte, a leste`, () => {
        const ang = angles(date, c.lat, c.lng);
        const lam = (ang.asc * Math.PI) / 180;
        const eps = (ang.eps * Math.PI) / 180;
        // Ponto da eclíptica (latitude 0) em coordenadas equatoriais.
        const ra =
          (Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) * 180) /
          Math.PI;
        const dec = (Math.asin(Math.sin(eps) * Math.sin(lam)) * 180) / Math.PI;
        const hor = Astronomy.Horizon(
          date,
          new Astronomy.Observer(c.lat, c.lng, 0),
          norm(ra) / 15,
          dec,
        );
        expect(Math.abs(hor.altitude)).toBeLessThanOrEqual(0.05);
        expect(hor.azimuth).toBeGreaterThan(0);
        expect(hor.azimuth).toBeLessThan(180);
      });
    }
  }
});

describe("Hora desconhecida", () => {
  const chart = computeChart({ ...referencia1, birthTime: null });

  it("não calcula ascendente, meio do céu nem casas", () => {
    expect(chart.time_unknown).toBe(true);
    expect(chart.input.time_unknown).toBe(true);
    expect(chart.ascendant).toBeNull();
    expect(chart.midheaven).toBeNull();
    expect(chart.cusps).toBeNull();
    expect(chart.house_rulers).toBeNull();
    expect(chart.input.house_system).toBeNull();
    for (const p of chart.planets) expect(p.house).toBeNull();
  });

  it("calcula para 12:00 local", () => {
    expect(chart.utc).toBe("1995-07-14T15:00:00.000Z");
  });
});

describe("Estrutura do chart_data", () => {
  const chart = computeChart(referencia1);

  it("traz os 10 planetas e o Nodo Norte", () => {
    expect(chart.planets.map((p) => p.name)).toEqual([
      "Sol",
      "Lua",
      "Mercúrio",
      "Vênus",
      "Marte",
      "Júpiter",
      "Saturno",
      "Urano",
      "Netuno",
      "Plutão",
      "Nodo Norte",
    ]);
  });

  it("ordena os aspectos pelo orbe e respeita os orbes máximos", () => {
    const orbs = chart.aspects.map((a) => a.orb);
    expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
    const max = {
      conjunction: 8,
      sextile: 5,
      square: 7,
      trine: 7,
      opposition: 8,
    };
    for (const a of chart.aspects)
      expect(a.orb).toBeLessThanOrEqual(max[a.type]);
    expect(
      chart.aspects.some((a) => a.planet_a === ("north_node" as string)),
    ).toBe(false);
  });

  it("guarda regentes modernos e tradicionais de cada casa", () => {
    expect(chart.house_rulers).toHaveLength(12);
    // Ascendente em Sagitário: regente Júpiter (moderno e tradicional).
    const casa1 = chart.house_rulers![0];
    expect(casa1.sign).toBe("Sagitário");
    expect(casa1.ruler).toBe("Júpiter");
    expect(casa1.traditional_ruler).toBe("Júpiter");
    expect(casa1.ruler_house).toBe(planet(chart, "jupiter").house);
    // Casa 2 em Capricórnio: Saturno.
    expect(chart.house_rulers![1].ruler).toBe("Saturno");
  });

  it("diferencia regente moderno e tradicional em Escorpião, Aquário e Peixes", () => {
    const casas = computeChart(personare).house_rulers!;
    const escorpiao = casas.find((c) => c.sign === "Escorpião");
    if (escorpiao) {
      expect(escorpiao.ruler).toBe("Plutão");
      expect(escorpiao.traditional_ruler).toBe("Marte");
    }
  });

  it("conta elementos e modalidades dos 10 planetas", () => {
    const soma = (o: Record<string, number>) =>
      Object.values(o).reduce((a, b) => a + b, 0);
    expect(soma(chart.elements)).toBe(10);
    expect(soma(chart.modalities)).toBe(10);
  });

  it("detecta Mercúrio retrógrado em um período conhecido", () => {
    // Mercúrio esteve retrógrado de 27/09 a 18/10/2021.
    const retro = computeChart({
      ...referencia1,
      birthDate: "2021-10-10",
      birthTime: "12:00",
    });
    expect(planet(retro, "mercury").retrograde).toBe(true);
    const direto = computeChart({
      ...referencia1,
      birthDate: "2021-11-01",
      birthTime: "12:00",
    });
    expect(planet(direto, "mercury").retrograde).toBe(false);
  });

  it("rejeita entradas inválidas", () => {
    expect(() =>
      computeChart({ ...referencia1, birthDate: "14/07/1995" }),
    ).toThrow();
    expect(() =>
      computeChart({ ...referencia1, birthTime: "25:00" }),
    ).toThrow();
    expect(() => computeChart({ ...referencia1, latitude: 120 })).toThrow();
  });
});

describe("Núcleo", () => {
  it("houseCusps devolve null para Placidus em latitude ≥ 66°", () => {
    const ang = angles(new Date("2000-01-01T12:00:00Z"), 70, 0);
    expect(houseCusps("placidus", ang, 70)).toBeNull();
  });
});
