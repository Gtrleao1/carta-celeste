/** Palavras de ligação, que não contam como nome. */
const PARTICLES = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "di",
  "du",
  "del",
  "della",
  "van",
  "von",
]);

/**
 * Quanto cabe em uma linha do menu do leitor (12rem em `text-lg`, medido no
 * navegador), contando cada maiúscula como 1,35 letra.
 */
export const MENU_NAME_SIZE = 22;

const lower = (s: string) => s.toLocaleLowerCase("pt-BR");

const size = (s: string) =>
  [...s].reduce((total, c) => total + (c === lower(c) ? 1 : 1.35), 0);

/**
 * Nome para uma linha só: o completo, se couber; senão, até o segundo nome;
 * se ainda for longo, o primeiro e a inicial do segundo. Um nome sozinho e
 * comprido volta inteiro (a tela corta com reticências).
 */
export function shortName(fullName: string, max = MENU_NAME_SIZE): string {
  const words = fullName.trim().split(/\s+/);
  const full = words.join(" ");
  if (size(full) <= max) return full;

  const second = words.findIndex((w, i) => i > 0 && !PARTICLES.has(lower(w)));
  if (second < 0) return words[0];

  const two = words.slice(0, second + 1).join(" ");
  if (size(two) <= max) return two;

  const initial = [...words[second]][0].toLocaleUpperCase("pt-BR");
  return `${words[0]} ${initial}.`;
}
