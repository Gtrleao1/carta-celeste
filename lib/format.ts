/** `1995-07-14` -> `14/07/1995` (sem passar por Date, para não deslocar o dia por fuso). */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** `4900` -> `R$ 49,00`. */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** `15:30:00` -> `15h30`. */
export function formatTimeBR(time: string): string {
  const [h, m] = time.split(":");
  return `${h}h${m}`;
}
