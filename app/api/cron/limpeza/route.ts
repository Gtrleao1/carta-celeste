import { isAuthorizedCron, parseTtlDays } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

// Quantas contas apaga por execução (a rota roda todo dia; o resto fica para o dia seguinte).
const BATCH = 100;

/**
 * Limpeza diária (Vercel Cron, `vercel.json`): apaga contas criadas e **nunca
 * confirmadas**, sem login e sem pedidos, depois de `UNCONFIRMED_ACCOUNT_TTL_DAYS`
 * dias. Sem essa variável não faz nada: o prazo de guarda é decisão do negócio
 * (e da Política de Privacidade). Apagar a conta apaga em cascata o perfil de
 * nascimento que o formulário da home guardou. O log traz só contagens, nunca
 * e-mail nem id.
 */
export async function GET(request: Request) {
  if (
    !isAuthorizedCron(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ttl = parseTtlDays(process.env.UNCONFIRMED_ACCOUNT_TTL_DAYS);
  if (ttl === null) {
    return Response.json({ ok: true, skipped: "prazo_nao_definido" });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("expired_unconfirmed_users", {
    p_ttl_days: ttl,
    p_limit: BATCH,
  });
  if (error) {
    console.error("[limpeza] falha ao listar contas:", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }

  let deleted = 0;
  let failed = 0;
  for (const row of (data ?? []) as { id: string }[]) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(row.id);
    if (deleteError) failed++;
    else deleted++;
  }
  console.log(
    `[limpeza] contas nao confirmadas: apagadas=${deleted} falhas=${failed}`,
  );
  return Response.json({ ok: failed === 0, deleted, failed });
}
