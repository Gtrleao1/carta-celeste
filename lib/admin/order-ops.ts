/**
 * Ações do admin sobre pedidos e mapas, uma a uma ou em lote: reenviar o aviso
 * "mapa pronto" ao comprador, excluir e reprocessar. Lógica pura, com as
 * dependências injetadas (como `payOrder`), para testar sem banco nem e-mail.
 * As Server Actions (`app/admin/pedidos-actions.ts`) ligam as dependências reais.
 */

import { createHash } from "node:crypto";

export type BulkIntent = "resend" | "delete" | "reprocess";

/** Teto de pedidos por ação em lote (a lista mostra no máximo 100 por página). */
export const MAX_BULK = 100;

/** Palavra que o admin digita para confirmar uma exclusão. */
export const DELETE_CONFIRMATION = "EXCLUIR";

export type OrderLite = {
  id: string;
  status: string;
  amount_cents: number;
  product_name: string | null;
  created_at: string | null;
  paid_at: string | null;
};

export type ResendResult =
  "enviado" | "sem_conta" | "sem_chave" | "limite" | "erro";

export type AuditEntry = {
  action:
    "excluir_pedido" | "editar_secao" | "reenviar_mapa" | "reprocessar_pedido";
  order: OrderLite;
  detail?: string;
};

export type BulkDeps = {
  loadOrders(ids: string[]): Promise<OrderLite[]>;
  resend(order: OrderLite): Promise<ResendResult>;
  remove(order: OrderLite): Promise<boolean>;
  reprocess(order: OrderLite): Promise<boolean>;
  audit(entry: AuditEntry): Promise<void>;
};

export type Outcome = {
  id: string;
  result: "ok" | "skipped" | "failed";
  /** Chave de `REASON_LABEL` quando não deu certo. */
  reason?: string;
};

export const REASON_LABEL: Record<string, string> = {
  nao_encontrado: "pedido não encontrado",
  nao_pronto: "o mapa ainda não está pronto",
  em_geracao: "o mapa está sendo gerado agora",
  estado_invalido:
    "só pedidos pagos, em geração ou com falha podem ser reprocessados",
  sem_conta: "a conta do comprador foi excluída",
  sem_chave: "o envio de e-mail não está configurado (RESEND_API_KEY)",
  limite: "já foi reenviado várias vezes na última hora",
  erro: "o envio falhou",
  falhou: "não foi possível concluir",
};

const REPROCESSABLE = new Set(["paid", "generating", "failed"]);

/** Por que um pedido não pode receber esta ação (ou `null` se pode). */
export function ineligibleReason(
  intent: BulkIntent,
  status: string,
): string | null {
  switch (intent) {
    case "resend":
      return status === "ready" ? null : "nao_pronto";
    case "delete":
      // Em geração há um job escrevendo no mapa: excluir agora geraria erro e lixo.
      return status === "generating" ? "em_geracao" : null;
    case "reprocess":
      return REPROCESSABLE.has(status) ? null : "estado_invalido";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids marcados na tela: só UUIDs, sem repetição, no máximo `MAX_BULK`. */
export function parseIds(
  values: FormDataEntryValue[],
): { ids: string[] } | { error: string } {
  const ids = [
    ...new Set(
      values
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => UUID.test(v)),
    ),
  ];
  if (ids.length === 0) return { error: "Marque pelo menos um pedido." };
  if (ids.length > MAX_BULK) {
    return { error: `Marque no máximo ${MAX_BULK} pedidos por vez.` };
  }
  return { ids };
}

/** A confirmação digitada vale se for a palavra pedida (sem diferenciar maiúsculas). */
export const isDeleteConfirmed = (typed: unknown) =>
  typeof typed === "string" &&
  typed.trim().toUpperCase() === DELETE_CONFIRMATION;

const short = (id: string) => id.slice(0, 8);

/** Executa a ação em cada pedido, sem parar no primeiro que falhar. */
export async function runBulk(
  intent: BulkIntent,
  ids: string[],
  deps: BulkDeps,
): Promise<Outcome[]> {
  const found = new Map((await deps.loadOrders(ids)).map((o) => [o.id, o]));
  const outcomes: Outcome[] = [];

  for (const id of ids) {
    const order = found.get(id);
    if (!order) {
      outcomes.push({ id, result: "skipped", reason: "nao_encontrado" });
      continue;
    }
    const blocked = ineligibleReason(intent, order.status);
    if (blocked) {
      outcomes.push({ id, result: "skipped", reason: blocked });
      continue;
    }

    try {
      if (intent === "resend") {
        const r = await deps.resend(order);
        if (r === "enviado") {
          await deps.audit({ action: "reenviar_mapa", order });
          outcomes.push({ id, result: "ok" });
        } else {
          outcomes.push({
            id,
            result: r === "erro" ? "failed" : "skipped",
            reason: r,
          });
        }
      } else if (intent === "delete") {
        // O histórico é gravado DEPOIS de excluir (não registra exclusão que não
        // aconteceu), com os dados do pedido lidos antes (valor, status, datas).
        if (await deps.remove(order)) {
          await deps.audit({ action: "excluir_pedido", order });
          outcomes.push({ id, result: "ok" });
        } else {
          outcomes.push({ id, result: "failed", reason: "falhou" });
        }
      } else {
        if (await deps.reprocess(order)) {
          await deps.audit({ action: "reprocessar_pedido", order });
          outcomes.push({ id, result: "ok" });
        } else {
          outcomes.push({ id, result: "failed", reason: "falhou" });
        }
      }
    } catch {
      outcomes.push({ id, result: "failed", reason: "falhou" });
    }
  }
  return outcomes;
}

const DONE_WORD: Record<BulkIntent, [string, string]> = {
  resend: ["reenviado", "reenviados"],
  delete: ["excluído", "excluídos"],
  reprocess: ["reprocessado", "reprocessados"],
};

/** Resumo em português para mostrar ao admin depois da ação. */
export function summarize(intent: BulkIntent, outcomes: Outcome[]): string {
  const ok = outcomes.filter((o) => o.result === "ok").length;
  const [one, many] = DONE_WORD[intent];
  const parts = [
    ok === 0
      ? `Nenhum pedido foi ${one}.`
      : `${ok} pedido${ok > 1 ? "s" : ""} ${ok > 1 ? many : one}.`,
  ];
  const problems = outcomes.filter((o) => o.result !== "ok");
  if (problems.length > 0) {
    parts.push(
      "Não concluídos: " +
        problems
          .slice(0, 10)
          .map((o) => `${short(o.id)} (${REASON_LABEL[o.reason ?? "falhou"]})`)
          .join("; ") +
        (problems.length > 10 ? `; e mais ${problems.length - 10}.` : "."),
    );
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Edição do texto de uma parte do mapa
// ---------------------------------------------------------------------------

/**
 * "Versão" de uma parte (16 caracteres do SHA-256 do título e do texto). A tela
 * de edição leva a versão que carregou; ao salvar, se a parte mudou nesse
 * intervalo, a gravação é recusada em vez de sobrescrever a mudança de outra pessoa.
 */
export function sectionVersion(s: { title: string; content: string }): string {
  return createHash("sha256")
    .update(`${s.title}\n${s.content}`)
    .digest("hex")
    .slice(0, 16);
}

export const MAX_SECTION_CHARS = 30_000;
export const MAX_TITLE_CHARS = 120;

/**
 * Valida o texto editado de uma parte. O texto é Markdown mínimo (renderizado
 * por `MiniMarkdown`, que nunca gera HTML cru), então basta limitar tamanho e
 * tirar caracteres de controle.
 */
export function validateSectionEdit(input: {
  title: unknown;
  content: unknown;
}):
  | { ok: true; title: string; content: string }
  | { ok: false; errors: { title?: string; content?: string } } {
  const clean = (v: unknown) =>
    typeof v === "string"
      ? v
          .replace(/\r\n?/g, "\n")
          .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      : "";
  const title = clean(input.title).trim();
  const content = clean(input.content).trim();
  const errors: { title?: string; content?: string } = {};
  if (title.length < 1) errors.title = "Informe o título da parte.";
  else if (title.length > MAX_TITLE_CHARS) {
    errors.title = `O título pode ter no máximo ${MAX_TITLE_CHARS} caracteres.`;
  }
  if (content.length < 20) errors.content = "O texto está curto demais.";
  else if (content.length > MAX_SECTION_CHARS) {
    errors.content = `O texto pode ter no máximo ${MAX_SECTION_CHARS} caracteres.`;
  }
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, title, content };
}
