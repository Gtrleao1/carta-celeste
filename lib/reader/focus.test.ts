import { describe, expect, it } from "vitest";

import { computeChart } from "@/lib/astro";
import { sampleChart } from "@/lib/sample-chart";

import {
  EMPTY_FOCUS,
  aspectKey,
  focusBySection,
  focusForSection,
} from "./focus";

const KEYS = [
  "introducao",
  "sol",
  "lua",
  "ascendente",
  "trio",
  "mente-comunicacao",
  "amor-valores",
  "acao-desejo",
  "crescimento-desafios",
  "geracoes",
  "casas",
  "aspectos",
  "sintese",
];

const drawn = new Set(
  sampleChart.aspects
    .filter((a) => a.type !== "conjunction")
    .map((a) => aspectKey(a.planet_a, a.planet_b)),
);
const planetIds = new Set(sampleChart.planets.map((p) => p.id as string));

describe("destaque da roda por parte do mapa", () => {
  it("o Sol destaca o Sol, o signo e a casa dele e os aspectos dele (Referência 1)", () => {
    const f = focusForSection("sol", sampleChart);
    expect(f.planets).toEqual(["sun"]);
    expect(f.signs).toEqual([3]); // Câncer
    expect(f.houses).toEqual([8]);
    expect(f.aspects.length).toBeGreaterThan(0);
    for (const k of f.aspects) expect(k).toContain("sun");
  });

  it("o Ascendente destaca o eixo, a casa 1, o signo e o regente", () => {
    const f = focusForSection("ascendente", sampleChart);
    expect(f.axes).toEqual(["asc"]);
    expect(f.houses).toEqual([1]);
    expect(f.signs).toEqual([8]); // Sagitário
    expect(f.planets).toEqual(["jupiter"]);
  });

  it("o trio junta Sol, Lua e Ascendente sem repetir", () => {
    const f = focusForSection("trio", sampleChart);
    expect(f.planets).toEqual(
      expect.arrayContaining(["sun", "moon", "jupiter"]),
    );
    expect(f.axes).toEqual(["asc"]);
    expect(new Set(f.planets).size).toBe(f.planets.length);
  });

  it("as casas acendem as 12; os aspectos, só os mais exatos", () => {
    expect(focusForSection("casas", sampleChart).houses).toHaveLength(12);
    const top = focusForSection("aspectos", sampleChart);
    expect(top.aspects.length).toBeLessThanOrEqual(6);
    expect(top.aspects.length).toBeGreaterThan(0);
  });

  it("introdução, síntese e chaves desconhecidas não destacam nada", () => {
    for (const k of ["introducao", "sintese", "qualquer-coisa"]) {
      expect(focusForSection(k, sampleChart)).toEqual(EMPTY_FOCUS);
    }
  });

  it("só aponta para elementos que existem de verdade na roda", () => {
    for (const k of KEYS) {
      const f = focusForSection(k, sampleChart);
      for (const id of [...f.planets, ...f.related])
        expect(planetIds.has(id), `${k}: ${id}`).toBe(true);
      for (const a of f.aspects) expect(drawn.has(a), `${k}: ${a}`).toBe(true);
      for (const s of f.signs) expect(s >= 0 && s <= 11).toBe(true);
      for (const h of f.houses) expect(h >= 1 && h <= 12).toBe(true);
      // planeta em destaque total não aparece também como "relacionado"
      expect(f.related.filter((id) => f.planets.includes(id))).toEqual([]);
    }
  });

  it("sem hora de nascimento não inventa casas nem Ascendente", () => {
    const noTime = computeChart({
      birthDate: "1995-07-14",
      birthTime: null,
      timezone: "America/Sao_Paulo",
      latitude: -22.91,
      longitude: -47.06,
      houseSystem: "placidus",
    });
    expect(focusForSection("sol", noTime).houses).toEqual([]);
    expect(focusForSection("ascendente", noTime)).toEqual(EMPTY_FOCUS);
    expect(focusForSection("casas", noTime).houses).toEqual([]);
  });

  it("focusBySection devolve uma entrada por chave", () => {
    expect(Object.keys(focusBySection(KEYS, sampleChart))).toEqual(KEYS);
  });
});
