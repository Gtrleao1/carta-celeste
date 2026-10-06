const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Diferença para o UTC (em minutos) no fuso IANA, na data e hora locais dadas.
 * Mesmo método de `zonedToUtc` (lib/astro/core.ts), sem carregar o motor
 * astronômico no navegador. Há um teste comparando os dois.
 */
export function utcOffsetMinutes(
  birthDate: string,
  birthTime: string | null,
  timeZone: string,
): number {
  const [y, mo, d] = birthDate.split("-").map(Number);
  const [h, mi] = (birthTime ?? "12:00").split(":").map(Number);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
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
  const guess = wall - offsetAt(wall);
  return Math.round(offsetAt(wall - offsetAt(guess)) / 60000);
}

/** `-180` -> `UTC−3`; `330` -> `UTC+5:30`; `0` -> `UTC`. */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return "UTC";
  const sign = minutes < 0 ? "−" : "+"; // sinal de menos tipográfico (U+2212)
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/** `1995-07-14` -> `14 de julho de 1995`. */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

/**
 * Resumo legível para o cliente conferir antes de pagar:
 * "14 de julho de 1995, 15h30 (UTC−3), Campinas, SP".
 */
export function formatBirthSummary(p: {
  birthDate: string;
  birthTime: string | null;
  timezone: string;
  cityName: string;
}): string {
  const date = formatLongDate(p.birthDate);
  if (!p.birthTime) return `${date}, hora desconhecida, ${p.cityName}`;
  const [h, m] = p.birthTime.split(":");
  const offset = formatUtcOffset(
    utcOffsetMinutes(p.birthDate, p.birthTime, p.timezone),
  );
  return `${date}, ${h}h${m} (${offset}), ${p.cityName}`;
}
