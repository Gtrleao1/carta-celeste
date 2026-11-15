/**
 * Gera os SVGs das constelações em `public/constellations/`.
 * Uso: `npm run build:constellations` (depois de mudar `lib/constellations/`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { allArtFiles } from "../lib/constellations/svg";

const dir = join(process.cwd(), "public", "constellations");
mkdirSync(dir, { recursive: true });

const files = allArtFiles();
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(dir, name), svg + "\n", "utf8");
}
console.log(`${Object.keys(files).length} arquivos em ${dir}`);
