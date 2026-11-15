import { timingSafeEqual } from "node:crypto";

/**
 * Tarefas agendadas (Vercel Cron). A Vercel chama a rota com
 * `Authorization: Bearer <CRON_SECRET>` quando a variável existe no projeto.
 * Sem segredo configurado a rota recusa tudo (falha fechado): rota de limpeza
 * aberta seria um risco.
 */
export function isAuthorizedCron(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < 16 || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

/** Prazo em dias da variável de ambiente; `null` quando ausente ou fora de 1-365. */
export function parseTtlDays(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,3}$/.test(raw.trim())) return null;
  const days = Number(raw);
  return days >= 1 && days <= 365 ? days : null;
}
