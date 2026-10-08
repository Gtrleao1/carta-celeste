import {
  ADMIN_STATUS_LABEL,
  CUSTOMER_STATUS_LABEL,
  isOrderStatus,
} from "@/lib/orders/labels";

const TONE: Record<string, string> = {
  ready: "bg-earth/15 text-earth",
  paid: "bg-air/15 text-air",
  generating: "bg-air/15 text-air",
  failed: "bg-destructive/15 text-destructive",
  pending: "bg-muted text-muted-foreground",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

/** Etiqueta do status do pedido; texto sempre presente (não depende só da cor). */
export function StatusBadge({
  status,
  audience = "admin",
}: {
  status: string;
  audience?: "admin" | "customer";
}) {
  const labels =
    audience === "admin" ? ADMIN_STATUS_LABEL : CUSTOMER_STATUS_LABEL;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[status] ?? TONE.pending}`}
    >
      {isOrderStatus(status) ? labels[status] : status}
    </span>
  );
}
