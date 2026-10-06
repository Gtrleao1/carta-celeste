import { describe, expect, it } from "vitest";

import { angularDistance, polar, spreadAngles, wheelAngle } from "./geometry";

describe("wheelAngle", () => {
  it("coloca o ascendente à esquerda (180°)", () => {
    expect(wheelAngle(263.63, 263.63)).toBeCloseTo(180, 9);
    const p = polar(300, 300, 100, wheelAngle(263.63, 263.63));
    expect(p.x).toBeCloseTo(200, 6);
    expect(p.y).toBeCloseTo(300, 6);
  });

  it("sem hora, o 0° de Áries fica à esquerda", () => {
    expect(wheelAngle(0, null)).toBeCloseTo(180, 9);
  });

  it("a longitude cresce no sentido anti-horário (180° depois do ascendente, à direita)", () => {
    const p = polar(300, 300, 100, wheelAngle(263.63 + 180, 263.63));
    expect(p.x).toBeCloseTo(400, 6);
    expect(p.y).toBeCloseTo(300, 6);
  });

  it("90° depois do ascendente fica embaixo (casas 1 a 3 abaixo do horizonte)", () => {
    const p = polar(300, 300, 100, wheelAngle(90, 0));
    expect(p.x).toBeCloseTo(300, 6);
    expect(p.y).toBeCloseTo(400, 6);
  });
});

describe("spreadAngles", () => {
  const gaps = (a: number[]) => {
    const s = [...a].sort((x, y) => x - y);
    return s.map((v, i) =>
      i === s.length - 1 ? s[0] + 360 - v : s[i + 1] - v,
    );
  };

  it("não mexe em ângulos já afastados", () => {
    const input = [10, 100, 200, 300];
    const out = spreadAngles(input, 9);
    out.forEach((v, i) => expect(v).toBeCloseTo(input[i], 9));
  });

  it("afasta um aglomerado para pelo menos 9° entre vizinhos", () => {
    const out = spreadAngles([100, 101, 102, 103], 9);
    for (const g of gaps(out)) expect(g).toBeGreaterThanOrEqual(9 - 1e-6);
  });

  it("preserva a ordem e fica perto da posição real", () => {
    const input = [100, 101, 102, 103];
    const out = spreadAngles(input, 9);
    expect([...out].sort((a, b) => a - b)).toEqual(out);
    out.forEach((v, i) =>
      expect(angularDistance(v, input[i])).toBeLessThan(20),
    );
  });

  it("funciona na virada de 360° para 0°", () => {
    const out = spreadAngles([358, 359, 1, 2], 9);
    for (const g of gaps(out)) expect(g).toBeGreaterThanOrEqual(9 - 1e-6);
  });

  it("trata ângulos idênticos e devolve na ordem de entrada", () => {
    const out = spreadAngles([50, 50, 200], 9);
    expect(angularDistance(out[0], out[1])).toBeGreaterThanOrEqual(9 - 1e-6);
    expect(angularDistance(out[2], 200)).toBeLessThan(1e-6);
  });

  it("aceita 0 e 1 elementos", () => {
    expect(spreadAngles([], 9)).toEqual([]);
    expect(spreadAngles([725], 9)).toEqual([5]);
  });
});
