import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONSTELLATIONS, CONSTELLATION_SLUGS } from "./data";
import { backdropFor, reportArt } from "./pick";
import { allArtFiles, constellationSvg } from "./svg";

describe("constelações (dados)", () => {
  it("há 16 constelações, com endereços únicos", () => {
    expect(CONSTELLATIONS).toHaveLength(16);
    expect(new Set(CONSTELLATION_SLUGS).size).toBe(16);
  });

  it("estrelas, linhas e fita só apontam para estrelas que existem", () => {
    for (const c of CONSTELLATIONS) {
      const max = c.stars.length - 1;
      const ok = (i: number) => Number.isInteger(i) && i >= 0 && i <= max;
      for (const [a, b] of c.lines)
        expect([c.slug, ok(a), ok(b)]).toEqual([c.slug, true, true]);
      for (const i of c.ribbon) expect([c.slug, ok(i)]).toEqual([c.slug, true]);
      expect(c.ribbon.length).toBeGreaterThanOrEqual(2);
      for (const [x, y, b] of c.stars) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
        expect([1, 2, 3, 4]).toContain(b);
      }
    }
  });
});

describe("constelações (SVG)", () => {
  it("são SVGs fechados, sem script nem cor própria (só transparência)", () => {
    for (const [name, svg] of Object.entries(allArtFiles())) {
      expect(svg.startsWith("<svg "), name).toBe(true);
      expect(svg.endsWith("</svg>"), name).toBe(true);
      expect(svg, name).not.toMatch(/<script|onload|href=|<image/i);
      // a cor vem do tema (máscara): nada além de branco
      const colors = [...svg.matchAll(/#[0-9a-f]{3,6}\b/gi)].map((m) => m[0]);
      expect(new Set(colors), name).toEqual(new Set(["#fff"]));
    }
  });

  it("a versão abstrata tem fita e anéis; a de linhas, não", () => {
    const c = CONSTELLATIONS[0];
    const abstract = constellationSvg(c, "abstrata");
    const lines = constellationSvg(c, "linhas");
    expect(abstract).toContain('<circle cx="50" cy="50" r="47"');
    expect(abstract).toContain('stroke-width="10"');
    expect(lines).not.toContain('r="47"');
    expect(abstract.length).toBeGreaterThan(lines.length);
  });

  it("é determinístico (mesma semente, mesmo desenho)", () => {
    const c = CONSTELLATIONS[1];
    expect(constellationSvg(c, "abstrata")).toBe(
      constellationSvg(c, "abstrata"),
    );
  });

  it("os arquivos de public/constellations estão em dia (rode npm run build:constellations)", () => {
    const dir = join(process.cwd(), "public", "constellations");
    for (const [name, svg] of Object.entries(allArtFiles())) {
      const file = join(dir, name);
      expect(existsSync(file), `${name} não existe`).toBe(true);
      expect(readFileSync(file, "utf8").trim(), `${name} defasado`).toBe(svg);
    }
  });
});

describe("escolha do fundo por página", () => {
  const existing = new Set(CONSTELLATION_SLUGS);

  it("a home tem as suas, e todas existem", () => {
    const home = backdropFor("/");
    expect(home.map((a) => a.slug)).toEqual([
      "cruzeiro-do-sul",
      "orion",
      "leao",
    ]);
    for (const a of home) expect(existing.has(a.slug)).toBe(true);
  });

  it("outras páginas: três constelações distintas e sempre as mesmas", () => {
    for (const path of [
      "/blog",
      "/blog/mercurio-retrogrado",
      "/entrar",
      "/meus-mapas/abc",
      "/termos",
      "/x",
    ]) {
      const a = backdropFor(path);
      expect(new Set(a.map((x) => x.slug)).size, path).toBe(3);
      for (const x of a) expect(existing.has(x.slug)).toBe(true);
      expect(backdropFor(path)).toEqual(a);
    }
  });

  it("páginas diferentes ganham fundos diferentes (na maioria)", () => {
    const paths = [
      "/blog",
      "/entrar",
      "/cadastro",
      "/termos",
      "/privacidade",
      "/conta",
      "/meus-mapas",
      "/comprar/x",
    ];
    const firsts = new Set(paths.map((p) => backdropFor(p)[0].slug));
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("o mapa alterna linhas e ilustração abstrata e cobre as 13 seções", () => {
    const arts = Array.from({ length: 13 }, (_, i) => reportArt(i));
    expect(arts[0].variant).toBe("linhas");
    expect(arts[1].variant).toBe("abstrata");
    expect(new Set(arts.map((a) => a.slug)).size).toBe(13);
    for (const a of arts) expect(existing.has(a.slug)).toBe(true);
  });
});
