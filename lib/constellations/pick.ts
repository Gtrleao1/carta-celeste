import { CONSTELLATION_SLUGS, type ArtVariant } from "./data";

export type ArtChoice = { slug: string; variant: ArtVariant };

/** Três constelações por página: uma por faixa (alta, média e baixa). */
export type Backdrop = [ArtChoice, ArtChoice, ArtChoice];

const HOME: Backdrop = [
  { slug: "cruzeiro-do-sul", variant: "abstrata" },
  { slug: "orion", variant: "linhas" },
  { slug: "leao", variant: "abstrata" },
];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Escolhe as constelações de fundo de uma página. A home tem as suas; as demais
 * recebem três distintas, sempre as mesmas para o mesmo endereço (sem sorteio:
 * a página estática e o navegador concordam).
 */
export function backdropFor(pathname: string): Backdrop {
  if (pathname === "/") return HOME;
  const n = CONSTELLATION_SLUGS.length;
  const h = hash(pathname);
  const pick = (offset: number, bit: number): ArtChoice => ({
    slug: CONSTELLATION_SLUGS[(h + offset) % n],
    // Algumas com a ilustração abstrata, outras só com as linhas.
    variant: (h >>> bit) & 1 ? "abstrata" : "linhas",
  });
  // Passos 5 e 11 (primos com 16) garantem constelações diferentes.
  return [pick(0, 3), pick(5, 5), pick(11, 7)];
}

/** Constelação do mapa por posição da seção (o texto do mapa tem ~13 partes). */
export function reportArt(index: number): ArtChoice {
  const slug = CONSTELLATION_SLUGS[index % CONSTELLATION_SLUGS.length];
  // Alterna: as pares mostram só as linhas, as ímpares a ilustração abstrata.
  return { slug, variant: index % 2 === 0 ? "linhas" : "abstrata" };
}
