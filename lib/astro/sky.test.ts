import { describe, expect, it } from "vitest";

import { computeSkyTimelapse } from "./sky";

const NOW = new Date("2026-11-15T17:00:00Z");

describe("céu em câmera rápida (home)", () => {
  const sky = computeSkyTimelapse(NOW, 31, 2);

  it("tem um quadro por passo e uma longitude por planeta da roda", () => {
    expect(sky.frames).toHaveLength(31);
    expect(sky.highlights).toHaveLength(31);
    for (const frame of sky.frames) {
      expect(frame).toHaveLength(sky.chart.planets.length);
    }
  });

  it("o primeiro quadro é o céu do mapa (até o arredondamento de 0,1°)", () => {
    sky.chart.planets.forEach((p, i) => {
      expect(Math.abs(sky.frames[0][i] - p.longitude)).toBeLessThan(0.06);
    });
  });

  it("não tem salto: entre quadros ninguém anda mais que a Lua (≤ 16°/dia)", () => {
    for (let f = 1; f < sky.frames.length; f++) {
      sky.frames[f].forEach((lon, i) => {
        expect(Math.abs(lon - sky.frames[f - 1][i])).toBeLessThan(16 * 2);
      });
    }
  });

  it("a Lua dá voltas (longitude desenrolada passa de 360°) e o Sol anda ~1°/dia", () => {
    const moon = sky.chart.planets.findIndex((p) => p.id === "moon");
    const sun = sky.chart.planets.findIndex((p) => p.id === "sun");
    const last = sky.frames.length - 1;
    expect(sky.frames[last][moon] - sky.frames[0][moon]).toBeGreaterThan(360);
    const sunMoved = sky.frames[last][sun] - sky.frames[0][sun];
    expect(sunMoved).toBeGreaterThan(55);
    expect(sunMoved).toBeLessThan(65);
  });

  it("destaques: signo 0-11 e casa 1-12 do Sol e da Lua em todo quadro", () => {
    for (const [sunSign, sunHouse, moonSign, moonHouse] of sky.highlights) {
      for (const sign of [sunSign, moonSign]) {
        expect(sign).toBeGreaterThanOrEqual(0);
        expect(sign).toBeLessThanOrEqual(11);
      }
      for (const house of [sunHouse, moonHouse]) {
        expect(house).toBeGreaterThanOrEqual(1);
        expect(house).toBeLessThanOrEqual(12);
      }
    }
  });

  it("o signo destacado bate com a longitude do quadro", () => {
    const sun = sky.chart.planets.findIndex((p) => p.id === "sun");
    sky.frames.forEach((frame, f) => {
      expect(sky.highlights[f][0]).toBe(
        Math.floor((((frame[sun] % 360) + 360) % 360) / 30),
      );
    });
  });
});
