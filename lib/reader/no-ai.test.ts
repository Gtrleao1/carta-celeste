import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regra do produto: o mapa é escrito UMA vez (na geração) e guardado. Ler,
 * navegar e destacar a roda nunca podem chamar a API de redação. Este teste
 * falha se qualquer arquivo do leitor passar a importar a IA ou o disparo da
 * geração.
 */
const ROOTS = [
  "lib/reader",
  "components/report",
  "app/(site)/meus-mapas",
  "app/(site)/prototipo-leitor",
];

const FORBIDDEN =
  /@\/lib\/ai|@anthropic-ai|createAnthropicWriter|triggerReportGeneration|jobs\/trigger|generate-report|runGeneration/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("o leitor do mapa nunca chama a IA", () => {
  const all = ROOTS.flatMap((root) => files(join(process.cwd(), root)));

  it("encontra os arquivos do leitor", () => {
    expect(all.length).toBeGreaterThanOrEqual(5);
  });

  it.each(all.map((f) => [f.replace(process.cwd(), "")]))(
    "%s não importa a IA nem o disparo da geração",
    (file) => {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      expect(text).not.toMatch(FORBIDDEN);
    },
  );
});
