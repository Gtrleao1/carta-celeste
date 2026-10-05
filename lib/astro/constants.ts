export const SIGNS = [
  "Áries",
  "Touro",
  "Gêmeos",
  "Câncer",
  "Leão",
  "Virgem",
  "Libra",
  "Escorpião",
  "Sagitário",
  "Capricórnio",
  "Aquário",
  "Peixes",
] as const;
export type SignName = (typeof SIGNS)[number];

export const ELEMENTS = ["fogo", "terra", "ar", "agua"] as const;
export type Element = (typeof ELEMENTS)[number];

export const MODALITIES = ["cardinal", "fixo", "mutavel"] as const;
export type Modality = (typeof MODALITIES)[number];

// Índice do signo (0 = Áries) -> elemento e modalidade.
export const SIGN_ELEMENT: Element[] = SIGNS.map((_, i) => ELEMENTS[i % 4]);
export const SIGN_MODALITY: Modality[] = SIGNS.map((_, i) => MODALITIES[i % 3]);

// Corpos calculados, em ordem de exibição. `key` é a chave do Astronomy.Body
// (exceto o Nodo Norte, que usa a fórmula do nodo médio).
export const PLANETS = [
  { id: "sun", name: "Sol", key: "Sun" },
  { id: "moon", name: "Lua", key: "Moon" },
  { id: "mercury", name: "Mercúrio", key: "Mercury" },
  { id: "venus", name: "Vênus", key: "Venus" },
  { id: "mars", name: "Marte", key: "Mars" },
  { id: "jupiter", name: "Júpiter", key: "Jupiter" },
  { id: "saturn", name: "Saturno", key: "Saturn" },
  { id: "uranus", name: "Urano", key: "Uranus" },
  { id: "neptune", name: "Netuno", key: "Neptune" },
  { id: "pluto", name: "Plutão", key: "Pluto" },
] as const;
export type PlanetId = (typeof PLANETS)[number]["id"] | "north_node";
export type PlanetName = (typeof PLANETS)[number]["name"] | "Nodo Norte";

// Regentes por índice de signo (0 = Áries).
export const MODERN_RULERS: PlanetName[] = [
  "Marte",
  "Vênus",
  "Mercúrio",
  "Lua",
  "Sol",
  "Mercúrio",
  "Vênus",
  "Plutão",
  "Júpiter",
  "Saturno",
  "Urano",
  "Netuno",
];
export const TRADITIONAL_RULERS: PlanetName[] = [
  "Marte",
  "Vênus",
  "Mercúrio",
  "Lua",
  "Sol",
  "Mercúrio",
  "Vênus",
  "Marte",
  "Júpiter",
  "Saturno",
  "Saturno",
  "Júpiter",
];

export type AspectKind = {
  id: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  name: string;
  angle: number;
  orb: number;
  tone: "harmonic" | "tense" | "neutral";
};

// Aspectos maiores e orbes máximos do PRD.
export const ASPECTS: AspectKind[] = [
  { id: "conjunction", name: "Conjunção", angle: 0, orb: 8, tone: "neutral" },
  { id: "sextile", name: "Sextil", angle: 60, orb: 5, tone: "harmonic" },
  { id: "square", name: "Quadratura", angle: 90, orb: 7, tone: "tense" },
  { id: "trine", name: "Trígono", angle: 120, orb: 7, tone: "harmonic" },
  { id: "opposition", name: "Oposição", angle: 180, orb: 8, tone: "tense" },
];
