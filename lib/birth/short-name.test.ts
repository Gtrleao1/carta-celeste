import { describe, expect, it } from "vitest";

import { shortName } from "./short-name";

describe("shortName (nome em uma linha no leitor)", () => {
  it("mantém o nome que cabe, arrumando os espaços", () => {
    expect(shortName("  Maria   de Fátima ")).toBe("Maria de Fátima");
    expect(shortName("Ana")).toBe("Ana");
  });

  it("nome longo fica com os dois primeiros nomes", () => {
    expect(shortName("Nome Sobrenome de Exemplo Silva")).toBe("Nome Sobrenome");
    expect(shortName("Maria Aparecida Souza Lima")).toBe("Maria Aparecida");
  });

  it("partícula não conta como segundo nome", () => {
    expect(shortName("Joana da Silva Oliveira Santos")).toBe("Joana da Silva");
  });

  it("se os dois primeiros não cabem, abrevia o segundo", () => {
    expect(shortName("Bartholomeu Maximiliano Costa")).toBe("Bartholomeu M.");
    expect(shortName("Alessandrina dos Albuquerques")).toBe("Alessandrina A.");
  });

  it("maiúsculas ocupam mais espaço", () => {
    expect(shortName("FERNANDA ALBUQUERQUE")).toBe("FERNANDA A.");
  });

  it("um nome só volta inteiro", () => {
    const long = "Abcdefghijklmnopqrstuvwxyz";
    expect(shortName(long)).toBe(long);
  });
});
