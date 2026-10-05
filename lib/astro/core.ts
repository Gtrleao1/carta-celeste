// NÚCLEO VALIDADO — a matemática abaixo vem do PRD (seção "Motor de cálculo
// astrológico") e bate com o Personare ao minuto de grau. Não alterar sem que
// os testes de referência em chart.test.ts continuem passando (±1′ de arco).
import * as Astronomy from "astronomy-engine";

const D2R = Math.PI / 180,
  R2D = 180 / Math.PI;
export const norm = (a: number) => ((a % 360) + 360) % 360;

// hora local + fuso IANA -> UTC (trata horário de verão histórico)
export function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string,
) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const offsetAt = (ms: number) => {
    const p: Record<string, string> = {};
    for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
    return (
      Date.UTC(
        +p.year,
        +p.month - 1,
        +p.day,
        +p.hour % 24,
        +p.minute,
        +p.second,
      ) - ms
    );
  };
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wall - offsetAt(wall);
  guess = wall - offsetAt(guess);
  return {
    date: new Date(guess),
    offsetMin: Math.round(offsetAt(guess) / 60000),
  };
}

export function eclLon(body: keyof typeof Astronomy.Body, date: Date) {
  const t = Astronomy.MakeTime(date);
  return Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[body], t, true))
    .elon;
}

export function meanNode(date: Date) {
  const T = Astronomy.MakeTime(date).tt / 36525;
  return norm(
    125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000,
  );
}

function obliquity(date: Date) {
  const T = Astronomy.MakeTime(date).tt / 36525;
  return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
}

const raToLon = (ra: number, eps: number) =>
  norm(
    R2D *
      Math.atan2(Math.sin(ra * D2R), Math.cos(ra * D2R) * Math.cos(eps * D2R)),
  );

export function angles(date: Date, lat: number, lng: number) {
  const eps = obliquity(date);
  const ramc = norm(
    Astronomy.SiderealTime(Astronomy.MakeTime(date)) * 15 + lng,
  );
  const r = ramc * D2R,
    e = eps * D2R,
    f = lat * D2R;
  const mc = norm(R2D * Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)));
  const asc = norm(
    R2D *
      Math.atan2(
        Math.cos(r),
        -(Math.sin(r) * Math.cos(e) + Math.tan(f) * Math.sin(e)),
      ),
  );
  return { asc, mc, ramc, eps };
}

function placidus(ramc: number, eps: number, lat: number) {
  if (Math.abs(lat) >= 66) return null;
  const e = eps * D2R,
    f = lat * D2R;
  const cusp = (frac: number, below: boolean) => {
    let ra = ramc + (below ? 180 - 90 * frac : 90 * frac);
    for (let i = 0; i < 60; i++) {
      const dec = Math.atan(Math.tan(e) * Math.sin(ra * D2R));
      const dsa =
        R2D *
        Math.acos(Math.max(-1, Math.min(1, -Math.tan(f) * Math.tan(dec))));
      const next = below ? ramc + 180 - (180 - dsa) * frac : ramc + dsa * frac;
      if (Math.abs(next - ra) < 1e-7) {
        ra = next;
        break;
      }
      ra = next;
    }
    return raToLon(norm(ra), eps);
  };
  return [
    cusp(1 / 3, false),
    cusp(2 / 3, false),
    cusp(2 / 3, true),
    cusp(1 / 3, true),
  ];
}

export function houseCusps(
  system: "placidus" | "equal" | "whole",
  ang: ReturnType<typeof angles>,
  lat: number,
) {
  const { asc, mc, ramc, eps } = ang;
  if (system === "whole") {
    const s = Math.floor(asc / 30) * 30;
    return Array.from({ length: 12 }, (_, i) => norm(s + 30 * i));
  }
  if (system === "equal")
    return Array.from({ length: 12 }, (_, i) => norm(asc + 30 * i));
  const p = placidus(ramc, eps, lat);
  if (!p) return null; // chamador cai para 'whole'
  const [c11, c12, c2, c3] = p;
  return [
    asc,
    c2,
    c3,
    norm(mc + 180),
    norm(c11 + 180),
    norm(c12 + 180),
    norm(asc + 180),
    norm(c2 + 180),
    norm(c3 + 180),
    mc,
    c11,
    c12,
  ];
}

export function houseOf(lon: number, cusps: number[]) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i],
      b = cusps[(i + 1) % 12];
    if (norm(lon - a) < norm(b - a)) return i + 1;
  }
  return 1;
}
