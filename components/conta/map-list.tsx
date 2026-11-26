import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatBirthSummary } from "@/lib/birth/summary";
import { arrangeMaps } from "@/lib/orders/view";

export type MapOrder = {
  id: string;
  status: string;
  created_at: string;
  product: { name: string } | null;
  /** De quem é o mapa; `null` se o cadastro da pessoa foi apagado. */
  birth: {
    name: string;
    birth_date: string;
    birth_time: string | null;
    time_unknown: boolean;
    city_name: string;
    timezone: string;
  } | null;
};

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
});

/** Para onde cada pedido leva: o mapa astral, se pronto; senão, o acompanhamento. */
const hrefFor = (o: MapOrder) =>
  o.status === "ready" ? `/meus-mapas/${o.id}` : `/pedido/${o.id}/retorno`;

function MapCard({
  order,
  featured = false,
}: {
  order: MapOrder;
  featured?: boolean;
}) {
  const { birth } = order;
  const product = order.product?.name ?? "Mapa astral";
  const ready = order.status === "ready";
  const cta = ready
    ? featured
      ? "Ler meu mapa"
      : "Ler o mapa"
    : order.status === "pending"
      ? "Ver pagamento"
      : "Acompanhar";

  return (
    <li
      className={
        "bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border " +
        (featured ? "border-primary/60 p-6" : "border-border p-4")
      }
    >
      <div className="grid min-w-0 gap-1">
        <h2
          className={`font-heading font-semibold break-words ${featured ? "text-3xl" : "text-2xl"}`}
        >
          {birth?.name ?? product}
        </h2>
        {birth && <p className="text-sm">{product}</p>}
        <p className="text-muted-foreground text-sm">
          {birth
            ? formatBirthSummary({
                birthDate: birth.birth_date,
                birthTime: birth.time_unknown
                  ? null
                  : (birth.birth_time?.slice(0, 5) ?? null),
                timezone: birth.timezone,
                cityName: birth.city_name,
              })
            : "Os dados de nascimento deste pedido foram apagados."}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <StatusBadge status={order.status} audience="customer" />
          <span className="text-muted-foreground text-xs">
            Pedido em {date.format(new Date(order.created_at))}
          </span>
        </div>
      </div>
      {order.status !== "cancelled" && order.status !== "refunded" && (
        <Link
          href={hrefFor(order)}
          className={
            buttonVariants({
              size: "lg",
              variant: ready ? "default" : "outline",
            }) +
            (featured
              ? " h-12 w-full text-base sm:w-auto sm:px-6"
              : " h-11 text-base")
          }
        >
          {cta}
        </Link>
      )}
    </li>
  );
}

/** Lista de mapas da pessoa, com o nome de quem é cada um. */
export function MapList({ orders }: { orders: MapOrder[] }) {
  const { featured, rest } = arrangeMaps(orders);
  return (
    <ul className="grid gap-3">
      {featured && <MapCard order={featured} featured />}
      {rest.map((o) => (
        <MapCard key={o.id} order={o} />
      ))}
    </ul>
  );
}
