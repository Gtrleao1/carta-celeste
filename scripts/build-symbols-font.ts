/**
 * Gera app/fonts/noto-sans-symbols-astro.woff2: o Noto Sans Symbols (SIL OFL)
 * reduzido aos glifos que a roda do mapa usa (signos, planetas, nodo, ℞).
 * O arquivo completo tem ~148 KB; o subconjunto, poucos KB.
 *
 * Uso: npx tsx scripts/build-symbols-font.ts <caminho-do-Noto-Sans-Symbols.woff2|ttf>
 * (a fonte original sai do Google Fonts; o next build também a baixa para .next/static/media)
 */
import subsetFont from "subset-font";
import { readFileSync, writeFileSync } from "node:fs";

const GLYPHS =
  "♈♉♊♋♌♍♎♏♐♑♒♓" + // signos
  "☉☽☿♀♂♃♄♅♆♇☊" + // Sol, Lua, planetas, Nodo Norte
  "℞" + // retrógrado
  "︎"; // seletor de variação de texto

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Informe o caminho da fonte de origem.");
  const subset = await subsetFont(readFileSync(input), GLYPHS, {
    targetFormat: "woff2",
  });
  const out = "app/fonts/noto-sans-symbols-astro.woff2";
  writeFileSync(out, subset);
  console.log(`${out}: ${subset.length} bytes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
