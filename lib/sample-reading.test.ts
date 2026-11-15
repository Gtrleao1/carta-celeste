import { describe, expect, it } from "vitest";

import { parseMarkdown } from "./markdown";
import { SAMPLE_READING } from "./sample-reading";

describe("trecho de exemplo da home (Folheie)", () => {
  const blocks = parseMarkdown(SAMPLE_READING.markdown);
  const words = SAMPLE_READING.markdown.split(/\s+/).filter(Boolean).length;

  it("tem tamanho de um trecho (não é um mapa inteiro nem uma frase)", () => {
    expect(words).toBeGreaterThan(200);
    expect(words).toBeLessThan(450);
  });

  it("tem subtítulos e parágrafos, e termina em parágrafo (o desvanecer corta bem)", () => {
    expect(blocks.some((b) => b.type === "h3")).toBe(true);
    expect(blocks.filter((b) => b.type === "p").length).toBeGreaterThanOrEqual(
      4,
    );
    expect(blocks.at(-1)?.type).toBe("p");
  });

  it("é de um caso fictício e não traz dado pessoal", () => {
    const all = `${SAMPLE_READING.birth} ${SAMPLE_READING.markdown}`;
    expect(all).not.toMatch(/@|https?:\/\/|\d{3}\.\d{3}\.\d{3}/);
    expect(SAMPLE_READING.birth).toContain("1995");
  });

  it("usa o vocabulário do cliente (mapa astral), nunca 'relatório'", () => {
    expect(SAMPLE_READING.markdown.toLowerCase()).not.toContain("relatório");
    expect(SAMPLE_READING.markdown).toContain("mapa astral");
  });
});
