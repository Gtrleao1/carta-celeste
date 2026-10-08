/** Quanto tempo sem atualização antes de considerar a geração parada (PRD: 3 min). */
export const STALE_AFTER_MS = 3 * 60 * 1000;
/** Pedido recém-pago ainda tem o job do webhook a caminho: dá um tempo antes de retomar. */
export const GRACE_AFTER_PAID_MS = 30 * 1000;

export type ResumeInput = {
  orderStatus: string;
  /** Momento do pagamento (ISO), se houver. */
  paidAt: string | null;
  /** Relatório do pedido, se já foi criado. */
  report: { updated_at: string; lock_until: string | null } | null;
  now: number;
};

/**
 * Um pedido pago precisa de um novo job quando a geração nunca começou (o job do
 * webhook falhou) ou parou no meio (função interrompida, sem trava ativa e sem
 * atualização há mais de 3 minutos). Retomar é seguro: o job é idempotente e usa trava.
 */
export function needsResume({
  orderStatus,
  paidAt,
  report,
  now,
}: ResumeInput): boolean {
  if (orderStatus !== "paid" && orderStatus !== "generating") return false;

  if (!report) {
    const paid = paidAt ? Date.parse(paidAt) : 0;
    return now - paid > GRACE_AFTER_PAID_MS;
  }

  if (report.lock_until && Date.parse(report.lock_until) > now) return false;
  return now - Date.parse(report.updated_at) > STALE_AFTER_MS;
}
