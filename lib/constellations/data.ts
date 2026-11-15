/**
 * Constelações usadas como ilustração de fundo (site e mapa). São desenhos
 * ESTILIZADOS: as posições são aproximadas e simplificadas para ficarem
 * reconhecíveis numa caixa de 100 x 100, não para fins astronômicos (o cálculo
 * do mapa continua todo em `lib/astro`).
 *
 * Cada estrela é `[x, y, brilho]`, com `brilho` de 1 (fraca) a 4 (a mais
 * brilhante). `lines` liga estrelas pelo índice; `ribbon` é a sequência de
 * estrelas que a versão abstrata percorre com uma fita luminosa.
 */
export type Star = [x: number, y: number, brightness: 1 | 2 | 3 | 4];

export type Constellation = {
  slug: string;
  /** Nome em português do Brasil. */
  name: string;
  stars: Star[];
  lines: [number, number][];
  ribbon: number[];
};

export const CONSTELLATIONS: Constellation[] = [
  {
    slug: "cruzeiro-do-sul",
    name: "Cruzeiro do Sul",
    stars: [
      [50, 6, 3], // Gacrux
      [52, 94, 4], // Acrux
      [20, 50, 4], // Mimosa
      [80, 40, 3], // Delta
      [68, 64, 2], // Epsilon
    ],
    lines: [
      [0, 1],
      [2, 3],
    ],
    ribbon: [0, 1],
  },
  {
    slug: "orion",
    name: "Órion",
    stars: [
      [30, 16, 4], // Betelgeuse
      [70, 14, 3], // Bellatrix
      [50, 4, 2], // Meissa
      [60, 48, 3], // Alnitak
      [50, 50, 3], // Alnilam
      [40, 52, 3], // Mintaka
      [32, 92, 3], // Saiph
      [74, 88, 4], // Rigel
      [12, 34, 1],
      [8, 52, 1],
      [12, 70, 1],
    ],
    lines: [
      [0, 2],
      [2, 1],
      [0, 5],
      [1, 3],
      [5, 4],
      [4, 3],
      [5, 6],
      [3, 7],
      [8, 9],
      [9, 10],
    ],
    ribbon: [0, 5, 4, 3, 1],
  },
  {
    slug: "ursa-maior",
    name: "Ursa Maior",
    stars: [
      [80, 30, 3], // Dubhe
      [78, 54, 3], // Merak
      [56, 60, 3], // Phecda
      [54, 38, 2], // Megrez
      [36, 34, 3], // Alioth
      [20, 26, 3], // Mizar
      [6, 36, 3], // Alkaid
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    ribbon: [6, 5, 4, 3, 0, 1, 2],
  },
  {
    slug: "cassiopeia",
    name: "Cassiopeia",
    stars: [
      [8, 36, 3],
      [28, 70, 3],
      [50, 44, 3],
      [74, 68, 3],
      [94, 28, 2],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    ribbon: [0, 1, 2, 3, 4],
  },
  {
    slug: "escorpiao",
    name: "Escorpião",
    stars: [
      [24, 8, 2], // Graffias
      [32, 18, 3], // Dschubba
      [20, 24, 2], // Pi
      [40, 34, 2], // Sigma
      [42, 44, 4], // Antares
      [44, 54, 2], // Tau
      [48, 66, 3], // Epsilon
      [54, 78, 2], // Mu
      [64, 88, 2], // Zeta
      [78, 90, 2], // Eta
      [88, 82, 3], // Theta
      [92, 70, 2], // Iota
      [88, 60, 2], // Kappa
      [78, 58, 3], // Shaula
      [82, 66, 2], // Lesath
    ],
    lines: [
      [0, 1],
      [2, 1],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
    ],
    ribbon: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    slug: "leao",
    name: "Leão",
    stars: [
      [30, 80, 4], // Regulus
      [26, 64, 2],
      [30, 46, 3], // Algieba
      [38, 30, 2],
      [48, 20, 2],
      [60, 22, 2],
      [70, 40, 3], // Zosma
      [66, 60, 2],
      [94, 52, 3], // Denebola
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 6],
      [6, 8],
      [8, 7],
      [7, 6],
      [7, 0],
    ],
    ribbon: [0, 1, 2, 3, 4, 5],
  },
  {
    slug: "touro",
    name: "Touro",
    stars: [
      [54, 64, 4], // Aldebaran
      [30, 50, 2], // Gamma
      [42, 40, 2],
      [54, 30, 2],
      [40, 58, 2],
      [92, 10, 3], // Elnath
      [90, 52, 2],
      [14, 14, 1], // Plêiades
      [20, 10, 1],
      [18, 20, 1],
      [10, 20, 1],
      [24, 17, 1],
    ],
    lines: [
      [1, 2],
      [2, 3],
      [3, 5],
      [1, 4],
      [4, 0],
      [0, 6],
    ],
    ribbon: [5, 3, 2, 1, 4, 0, 6],
  },
  {
    slug: "gemeos",
    name: "Gêmeos",
    stars: [
      [34, 8, 3], // Castor
      [52, 12, 4], // Pollux
      [36, 34, 2],
      [54, 42, 2],
      [22, 56, 2],
      [44, 66, 2],
      [60, 88, 3], // Alhena
      [12, 68, 1],
    ],
    lines: [
      [0, 2],
      [2, 4],
      [4, 7],
      [1, 3],
      [3, 5],
      [5, 6],
      [2, 3],
    ],
    ribbon: [0, 2, 4, 7],
  },
  {
    slug: "sagitario",
    name: "Sagitário",
    stars: [
      [14, 54, 2], // Alnasl
      [34, 80, 3], // Kaus Australis
      [32, 60, 2], // Kaus Media
      [40, 40, 2], // Kaus Borealis
      [56, 36, 2], // Phi
      [66, 40, 3], // Nunki
      [78, 54, 2], // Tau
      [62, 76, 2], // Ascella
    ],
    lines: [
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 1],
      [1, 2],
      [4, 6],
    ],
    ribbon: [0, 2, 3, 4, 5, 6, 7, 1],
  },
  {
    slug: "libra",
    name: "Libra",
    stars: [
      [22, 62, 3],
      [58, 22, 3],
      [88, 46, 2],
      [58, 86, 2],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    ribbon: [0, 1, 2, 3, 0],
  },
  {
    slug: "virgem",
    name: "Virgem",
    stars: [
      [50, 90, 4], // Spica
      [46, 48, 2], // Porrima
      [10, 40, 2],
      [28, 50, 2],
      [62, 34, 2],
      [86, 28, 3], // Vindemiatrix
      [58, 66, 2],
    ],
    lines: [
      [2, 3],
      [3, 1],
      [1, 4],
      [4, 5],
      [1, 6],
      [6, 0],
    ],
    ribbon: [2, 3, 1, 6, 0],
  },
  {
    slug: "capricornio",
    name: "Capricórnio",
    stars: [
      [12, 24, 3],
      [30, 14, 2],
      [88, 44, 2],
      [92, 30, 3],
      [40, 70, 2],
      [66, 80, 2],
    ],
    lines: [
      [0, 1],
      [1, 3],
      [3, 2],
      [0, 4],
      [4, 5],
      [5, 2],
    ],
    ribbon: [0, 4, 5, 2, 3],
  },
  {
    slug: "aquario",
    name: "Aquário",
    stars: [
      [24, 32, 3],
      [50, 24, 3],
      [54, 44, 2],
      [66, 52, 2],
      [70, 38, 2],
      [56, 62, 1],
      [44, 70, 1],
      [34, 80, 1],
      [28, 92, 2],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 2],
      [2, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ],
    ribbon: [0, 1, 2, 5, 6, 7, 8],
  },
  {
    slug: "peixes",
    name: "Peixes",
    stars: [
      [54, 62, 3], // Alrescha
      [38, 70, 1],
      [24, 78, 1],
      [12, 74, 2],
      [10, 88, 2],
      [22, 92, 2],
      [62, 48, 1],
      [74, 36, 2],
      [86, 26, 2],
      [92, 12, 2],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 2],
      [0, 6],
      [6, 7],
      [7, 8],
      [8, 9],
    ],
    ribbon: [3, 2, 1, 0, 6, 7, 8, 9],
  },
  {
    slug: "aries",
    name: "Áries",
    stars: [
      [62, 36, 4], // Hamal
      [48, 44, 3],
      [38, 50, 2],
      [78, 22, 2],
    ],
    lines: [
      [2, 1],
      [1, 0],
      [0, 3],
    ],
    ribbon: [2, 1, 0, 3],
  },
  {
    slug: "cancer",
    name: "Câncer",
    stars: [
      [40, 42, 2],
      [46, 52, 2],
      [70, 76, 2],
      [22, 78, 2],
      [50, 22, 1],
    ],
    lines: [
      [3, 1],
      [1, 2],
      [1, 0],
      [0, 4],
    ],
    ribbon: [3, 1, 0, 4],
  },
];

export const CONSTELLATION_SLUGS = CONSTELLATIONS.map((c) => c.slug);

/** Cada constelação existe nas duas versões. */
export type ArtVariant = "linhas" | "abstrata";

/** Nome do arquivo (sem extensão) em `public/constellations/`. */
export const artFile = (slug: string, variant: ArtVariant) =>
  variant === "abstrata" ? `${slug}-abstrata` : slug;

/** Campo de estrelas (fundo fixo da página). */
export const STARFIELD_FILE = "estrelas";
