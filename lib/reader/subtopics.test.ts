import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { sampleChart } from "@/lib/sample-chart";

import { aspectKey, focusForSection, type Focus } from "./focus";
import { focusForHeading, shortLabel, subtopicsOf } from "./subtopics";

const PARTS = [
  ["introducao", "Introdução ao seu mapa"],
  ["sol", "O seu Sol"],
  ["lua", "A sua Lua"],
  ["ascendente", "O seu Ascendente"],
  ["trio", "Como o trio conversa"],
  ["mente-comunicacao", "Mente e comunicação"],
  ["amor-valores", "Amor e valores"],
  ["acao-desejo", "Ação e desejo"],
  ["crescimento-desafios", "Crescimento e desafios"],
  ["geracoes", "Gerações"],
  ["casas", "As 12 casas"],
  ["aspectos", "Aspectos marcantes"],
  ["sintese", "Síntese"],
] as const;

const raw = readFileSync(
  join(process.cwd(), "docs", "referencia", "exemplo-ficticio.md"),
  "utf8",
);
const texts = new Map(
  raw
    .split(/^## /m)
    .slice(1)
    .map((b) => {
      const [h, ...rest] = b.split("\n");
      return [h.trim(), rest.join("\n")] as const;
    }),
);

const fallback: Focus = {
  planets: [],
  related: [],
  signs: [],
  houses: [],
  aspects: [],
  axes: [],
  label: "",
};
const f = (title: string) => focusForHeading(title, sampleChart, fallback);

describe("destaque por subtítulo (Referência 1)", () => {
  it("planetas citados acendem junto com o signo, a casa e o aspecto entre eles", () => {
    const x = f("Saturno e Netuno: estrutura que sustenta o sonho");
    expect(x.planets).toEqual(["saturn", "neptune"]);
    expect(x.aspects).toEqual([aspectKey("saturn", "neptune")]);
    expect(x.signs.length).toBeGreaterThan(0);
    // Júpiter e Saturno não têm aspecto neste mapa: nada de linha inventada
    expect(f("Júpiter e Saturno: expandir e sustentar").aspects).toEqual([]);
  });

  it("um signo citado acende o signo e os planetas que estão nele", () => {
    const x = f("Capricórnio: duas gerações na mesma estrada");
    expect(x.signs).toContain(9);
    expect(x.planets).toEqual(expect.arrayContaining(["uranus", "neptune"]));
  });

  it("uma casa citada acende a casa e quem está nela", () => {
    const x = f("Casa 8: profundidade, vínculos intensos e transformação");
    expect(x.houses).toContain(8);
    expect(x.planets).toContain("sun");
  });

  it("elementos e modalidades acendem os signos e planetas deles", () => {
    const water = f(
      "Água e terra: sentir fundo e construir com os pés no chão",
    );
    // Sol, Mercúrio, Vênus (Câncer) e Plutão (Escorpião) são água; Marte (Virgem), Urano e Netuno (Capricórnio) são terra
    expect(water.planets).toEqual(
      expect.arrayContaining([
        "sun",
        "mercury",
        "venus",
        "pluto",
        "mars",
        "uranus",
        "neptune",
      ]),
    );
    expect(water.planets).not.toContain("moon"); // Lua em Aquário (ar)
    const cardinal = f("Modalidade cardinal: a capacidade de recomeçar");
    expect(cardinal.planets).toEqual(
      expect.arrayContaining(["sun", "uranus", "neptune"]),
    );
  });

  it("o Ascendente acende o eixo, a casa 1 e o signo", () => {
    const x = f("Ascendente em Sagitário: o jeito de chegar");
    expect(x.axes).toEqual(["asc"]);
    expect(x.houses).toContain(1);
    expect(x.signs).toContain(8);
  });

  it("título sem nada reconhecível usa o destaque da parte", () => {
    const part = focusForSection("sol", sampleChart);
    expect(
      focusForHeading("Um jeito de olhar para isso", sampleChart, part),
    ).toBe(part);
  });

  it("ignora acentos e maiúsculas, e não confunde palavras parecidas", () => {
    expect(f("SOL E VENUS").planets).toEqual(["sun", "venus"]);
    // "console" e "solução" não são o Sol
    expect(f("Uma solução para o console").planets).toEqual([]);
  });

  it("o rótulo curto é o que vem antes dos dois-pontos", () => {
    expect(shortLabel("Júpiter e Saturno: expandir e sustentar")).toBe(
      "Júpiter e Saturno",
    );
    expect(shortLabel("Sem dois pontos")).toBe("Sem dois pontos");
  });
});

describe("subtópicos do mapa de referência inteiro", () => {
  for (const [key, title] of PARTS) {
    const text = texts.get(title) ?? "";
    const subs = subtopicsOf(
      text,
      key,
      sampleChart,
      focusForSection(key, sampleChart),
    );

    it(`${title}: ids únicos e destaques válidos`, () => {
      expect(new Set(subs.map((s) => s.id)).size).toBe(subs.length);
      const planetIds = new Set(sampleChart.planets.map((p) => p.id as string));
      const drawn = new Set(
        sampleChart.aspects
          .filter((a) => a.type !== "conjunction")
          .map((a) => aspectKey(a.planet_a, a.planet_b)),
      );
      for (const s of subs) {
        expect(s.label.length).toBeGreaterThan(0);
        for (const p of [...s.focus.planets, ...s.focus.related])
          expect(planetIds.has(p)).toBe(true);
        for (const a of s.focus.aspects) expect(drawn.has(a)).toBe(true);
        for (const h of s.focus.houses) expect(h >= 1 && h <= 12).toBe(true);
        for (const i of s.focus.signs) expect(i >= 0 && i <= 11).toBe(true);
      }
    });
  }

  it("a maioria dos subtítulos destaca algo próprio (não só o da parte)", () => {
    let own = 0;
    let total = 0;
    for (const [key, title] of PARTS) {
      const part = focusForSection(key, sampleChart);
      for (const s of subtopicsOf(
        texts.get(title) ?? "",
        key,
        sampleChart,
        part,
      )) {
        total++;
        if (s.focus !== part) own++;
      }
    }
    expect(total).toBeGreaterThan(20);
    expect(own / total).toBeGreaterThan(0.6);
  });
});
