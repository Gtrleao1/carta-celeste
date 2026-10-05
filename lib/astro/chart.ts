import {
  angles,
  eclLon,
  houseCusps,
  houseOf,
  meanNode,
  norm,
  zonedToUtc,
} from "./core";
import {
  ASPECTS,
  MODERN_RULERS,
  PLANETS,
  SIGN_ELEMENT,
  SIGN_MODALITY,
  SIGNS,
  TRADITIONAL_RULERS,
  type AspectKind,
  type Element,
  type Modality,
  type PlanetId,
  type PlanetName,
  type SignName,
} from "./constants";

export type HouseSystem = "placidus" | "equal" | "whole";

export type ChartInput = {
  /** Data de nascimento, `AAAA-MM-DD`. */
  birthDate: string;
  /** Hora local `HH:mm`, ou `null` quando a hora é desconhecida. */
  birthTime: string | null;
  /** Fuso IANA, ex.: `America/Sao_Paulo`. */
  timezone: string;
  latitude: number;
  longitude: number;
  houseSystem: HouseSystem;
};

export type Position = {
  /** Longitude eclíptica, 0 a 360. */
  longitude: number;
  sign: SignName;
  sign_index: number;
  /** Grau dentro do signo, 0 a 30. */
  degree: number;
};

export type PlanetPosition = Position & {
  id: PlanetId;
  name: PlanetName;
  /** `null` quando a hora é desconhecida. */
  house: number | null;
  retrograde: boolean;
};

export type HouseCusp = Position & {
  house: number;
  ruler: PlanetName;
  traditional_ruler: PlanetName;
};

export type HouseRuler = {
  house: number;
  sign: SignName;
  ruler: PlanetName;
  traditional_ruler: PlanetName;
  /** Onde o regente moderno está no mapa. */
  ruler_sign: SignName;
  ruler_house: number | null;
  traditional_ruler_sign: SignName;
  traditional_ruler_house: number | null;
};

export type ChartAspect = {
  planet_a: PlanetId;
  planet_b: PlanetId;
  type: AspectKind["id"];
  name: string;
  tone: AspectKind["tone"];
  /** Diferença, em graus, para o ângulo exato do aspecto. */
  orb: number;
};

export type ChartData = {
  input: {
    birth_date: string;
    birth_time: string | null;
    timezone: string;
    utc_offset_minutes: number;
    latitude: number;
    longitude: number;
    /** Sistema de casas efetivamente usado (`null` sem hora de nascimento). */
    house_system: HouseSystem | null;
    house_system_requested: HouseSystem;
    time_unknown: boolean;
  };
  /** Instante UTC usado no cálculo (ISO 8601). */
  utc: string;
  time_unknown: boolean;
  /** Motivo, quando o sistema pedido não pôde ser usado. */
  house_fallback_reason: string | null;
  ascendant: Position | null;
  midheaven: Position | null;
  cusps: HouseCusp[] | null;
  planets: PlanetPosition[];
  aspects: ChartAspect[];
  house_rulers: HouseRuler[] | null;
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
};

const position = (longitude: number): Position => {
  const lon = norm(longitude);
  const sign_index = Math.min(11, Math.floor(lon / 30));
  return {
    longitude: lon,
    sign: SIGNS[sign_index],
    sign_index,
    degree: lon - sign_index * 30,
  };
};

const signedDiff = (from: number, to: number) => norm(to - from + 180) - 180;

function parseInput(input: ChartInput) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate);
  if (!date) throw new Error(`Data de nascimento inválida: ${input.birthDate}`);
  const [y, mo, d] = [+date[1], +date[2], +date[3]];
  let h = 12,
    mi = 0;
  if (input.birthTime !== null) {
    const time = /^(\d{2}):(\d{2})$/.exec(input.birthTime);
    if (!time)
      throw new Error(`Hora de nascimento inválida: ${input.birthTime}`);
    [h, mi] = [+time[1], +time[2]];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59)
    throw new Error("Data ou hora de nascimento fora do intervalo válido.");
  if (
    Math.abs(input.latitude) > 90 ||
    Math.abs(input.longitude) > 180 ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  )
    throw new Error("Coordenadas fora do intervalo válido.");
  return { y, mo, d, h, mi };
}

export function computeChart(input: ChartInput): ChartData {
  const { y, mo, d, h, mi } = parseInput(input);
  const timeUnknown = input.birthTime === null;
  const { date, offsetMin } = zonedToUtc(y, mo, d, h, mi, input.timezone);

  // Casas e ângulos: só com hora conhecida.
  let ascendant: Position | null = null;
  let midheaven: Position | null = null;
  let cuspLons: number[] | null = null;
  let houseSystem: HouseSystem | null = null;
  let fallbackReason: string | null = null;

  if (!timeUnknown) {
    const ang = angles(date, input.latitude, input.longitude);
    ascendant = position(ang.asc);
    midheaven = position(ang.mc);
    houseSystem = input.houseSystem;
    cuspLons = houseCusps(houseSystem, ang, input.latitude);
    if (!cuspLons) {
      houseSystem = "whole";
      fallbackReason = `Placidus não é definido em latitudes iguais ou acima de 66° (latitude ${input.latitude}); usadas casas inteiras (whole).`;
      cuspLons = houseCusps("whole", ang, input.latitude)!;
    }
  }

  const planets: PlanetPosition[] = [
    ...PLANETS.map((p) => {
      const lon = eclLon(p.key, date);
      // Sol e Lua nunca são marcados como retrógrados.
      const retrograde =
        p.id === "sun" || p.id === "moon"
          ? false
          : signedDiff(
              eclLon(p.key, new Date(date.getTime() - 12 * 3600_000)),
              eclLon(p.key, new Date(date.getTime() + 12 * 3600_000)),
            ) < 0;
      return {
        id: p.id as PlanetId,
        name: p.name as PlanetName,
        lon,
        retrograde,
      };
    }),
    // O nodo médio sempre regride; não é marcado como retrógrado.
    {
      id: "north_node" as PlanetId,
      name: "Nodo Norte" as PlanetName,
      lon: meanNode(date),
      retrograde: false,
    },
  ].map(({ id, name, lon, retrograde }) => ({
    id,
    name,
    ...position(lon),
    house: cuspLons ? houseOf(lon, cuspLons) : null,
    retrograde,
  }));

  const cusps: HouseCusp[] | null = cuspLons
    ? cuspLons.map((lon, i) => {
        const pos = position(lon);
        return {
          house: i + 1,
          ...pos,
          ruler: MODERN_RULERS[pos.sign_index],
          traditional_ruler: TRADITIONAL_RULERS[pos.sign_index],
        };
      })
    : null;

  const byName = new Map(planets.map((p) => [p.name, p]));
  const house_rulers: HouseRuler[] | null = cusps
    ? cusps.map((c) => {
        const modern = byName.get(c.ruler)!;
        const traditional = byName.get(c.traditional_ruler)!;
        return {
          house: c.house,
          sign: c.sign,
          ruler: c.ruler,
          traditional_ruler: c.traditional_ruler,
          ruler_sign: modern.sign,
          ruler_house: modern.house,
          traditional_ruler_sign: traditional.sign,
          traditional_ruler_house: traditional.house,
        };
      })
    : null;

  const aspects = computeAspects(planets);

  // Elementos e modalidades: contagem dos 10 planetas (sem o nodo).
  const elements: Record<Element, number> = {
    fogo: 0,
    terra: 0,
    ar: 0,
    agua: 0,
  };
  const modalities: Record<Modality, number> = {
    cardinal: 0,
    fixo: 0,
    mutavel: 0,
  };
  for (const p of planets) {
    if (p.id === "north_node") continue;
    elements[SIGN_ELEMENT[p.sign_index]]++;
    modalities[SIGN_MODALITY[p.sign_index]]++;
  }

  return {
    input: {
      birth_date: input.birthDate,
      birth_time: input.birthTime,
      timezone: input.timezone,
      utc_offset_minutes: offsetMin,
      latitude: input.latitude,
      longitude: input.longitude,
      house_system: houseSystem,
      house_system_requested: input.houseSystem,
      time_unknown: timeUnknown,
    },
    utc: date.toISOString(),
    time_unknown: timeUnknown,
    house_fallback_reason: fallbackReason,
    ascendant,
    midheaven,
    cusps,
    planets,
    aspects,
    house_rulers,
    elements,
    modalities,
  };
}

/** Aspectos maiores entre os 10 planetas, ordenados pelo menor orbe. */
export function computeAspects(planets: PlanetPosition[]): ChartAspect[] {
  const bodies = planets.filter((p) => p.id !== "north_node");
  const out: ChartAspect[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const sep = Math.abs(
        signedDiff(bodies[i].longitude, bodies[j].longitude),
      );
      for (const kind of ASPECTS) {
        const orb = Math.abs(sep - kind.angle);
        if (orb <= kind.orb) {
          out.push({
            planet_a: bodies[i].id,
            planet_b: bodies[j].id,
            type: kind.id,
            name: kind.name,
            tone: kind.tone,
            orb,
          });
          break;
        }
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}
