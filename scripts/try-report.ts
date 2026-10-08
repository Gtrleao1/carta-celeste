/**
 * Gera de verdade o relatório de um pedido pago (chama a API da Anthropic) e mede
 * tempo, tokens e custo aproximado. Não envia e-mails.
 *
 * Atenção: gasta créditos da Anthropic e REINICIA o relatório do pedido
 * (apaga o relatório atual e volta o pedido para "paid"). Use só com pedidos de teste.
 *
 * Uso: npm run try:report -- <orderId> [arquivo-de-saida.md]
 */
import { writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { createAnthropicWriter } from "@/lib/ai/anthropic";
import { runGeneration } from "@/lib/reports/generate";
import { createSupabaseStore } from "@/lib/reports/store";

// Preços aproximados do Sonnet 5.5, em dólares por milhão de tokens.
const USD_PER_MTOK_IN = 2;
const USD_PER_MTOK_OUT = 10;

async function main() {
  const [orderId, outFile] = process.argv.slice(2);
  if (!orderId) throw new Error("Informe o id do pedido.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Faltam as chaves do Supabase no .env.local.");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: order } = await admin
    .from("orders")
    .select("id, status, amount_cents")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status === "pending" || order.status === "refunded") {
    throw new Error(`Pedido '${order.status}': só roda com pedido pago.`);
  }

  await admin.from("reports").delete().eq("order_id", orderId);
  await admin.from("orders").update({ status: "paid" }).eq("id", orderId);

  const store = createSupabaseStore(admin);
  const writer = createAnthropicWriter();
  const notify = {
    paymentConfirmed: async () => {},
    reportReady: async () => {},
  };

  const started = Date.now();
  let rounds = 0;
  let result;
  do {
    rounds++;
    result = await runGeneration(orderId, { store, writer, notify });
    console.log(
      `rodada ${rounds}: ${result.state} (${result.done}/${result.total}) em ${((Date.now() - started) / 1000).toFixed(1)} s`,
    );
  } while (result.state === "more" && rounds < 20);

  const { data: report } = await admin
    .from("reports")
    .select("sections, input_tokens, output_tokens")
    .eq("order_id", orderId)
    .single();
  const sections = (report?.sections ?? []) as {
    title: string;
    content: string;
    status: string;
  }[];
  const words = sections.map(
    (s) => s.content.split(/\s+/).filter(Boolean).length,
  );
  const cost =
    ((report?.input_tokens ?? 0) / 1e6) * USD_PER_MTOK_IN +
    ((report?.output_tokens ?? 0) / 1e6) * USD_PER_MTOK_OUT;

  console.log(`\nestado final: ${result.state}`);
  console.log(`tempo total: ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(
    `tokens: ${report?.input_tokens} entrada / ${report?.output_tokens} saída (~US$ ${cost.toFixed(3)})`,
  );
  console.log(
    `palavras por seção: ${words.join(", ")} (total ${words.reduce((a, b) => a + b, 0)})`,
  );

  if (outFile) {
    writeFileSync(
      outFile,
      sections.map((s) => `## ${s.title}\n\n${s.content}\n`).join("\n"),
      "utf8",
    );
    console.log(`texto salvo em ${outFile}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
