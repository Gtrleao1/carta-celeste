/**
 * Gera o mapa de EXEMPLO FICTÍCIO (08/12/2020, 18h30, Campinas) com a IA de
 * verdade, sem pedido nem conta: o armazenamento é em memória e só o produto
 * (as 13 partes e as instruções) é lido do banco. Escreve o texto em
 * `docs/referencia/exemplo-ficticio.md`. Gasta créditos da Anthropic (~US$ 0,50).
 *
 * Uso: npm run build:example-report
 */
import { writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { createAnthropicWriter } from "@/lib/ai/anthropic";
import type { ChartData, ChartInput } from "@/lib/astro";
import {
  runGeneration,
  type OrderRow,
  type ProductRow,
  type ReportRow,
  type ReportStore,
} from "@/lib/reports/generate";
import type { SectionConfig, SectionState } from "@/lib/reports/types";

const INPUT: ChartInput = {
  birthDate: "2020-12-08",
  birthTime: "18:30",
  timezone: "America/Sao_Paulo",
  latitude: -22.91,
  longitude: -47.06,
  houseSystem: "placidus",
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltam as chaves do Supabase.");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: products } = await admin
    .from("products")
    .select("id, name, ai_instructions, report_sections, active")
    .eq("active", true);
  const row = products?.find((p) =>
    (p.report_sections as SectionConfig[]).some((s) => s.key === "introducao"),
  );
  if (!row) throw new Error("Produto Mapa Astral Completo não encontrado.");
  const product: ProductRow = {
    id: row.id,
    name: row.name,
    ai_instructions: row.ai_instructions ?? "",
    sections: row.report_sections as SectionConfig[],
  };

  const order: OrderRow = {
    id: "exemplo",
    status: "paid",
    user_id: null,
    product_id: product.id,
    birth_profile_id: null,
  };
  let status = "paid";
  let chart: ChartData | null = null;
  let sections: SectionState[] = [];
  const mem = () =>
    ({ id: "r", chart_data: chart, sections }) as unknown as ReportRow;

  const store: ReportStore = {
    getOrder: async () => ({ ...order, status }),
    beginGeneration: async () => {
      if (status === "paid") {
        status = "generating";
        return "started";
      }
      return status === "generating" ? "resumed" : "skip";
    },
    getProduct: async () => product,
    getOrCreateReport: async (_o, initial) => {
      if (!sections.length) sections = initial;
      return mem();
    },
    getReport: async () => mem(),
    acquireLock: async () => true,
    releaseLock: async () => {},
    getChartInput: async () => INPUT,
    saveChart: async (_id, c) => {
      chart = c;
    },
    applySection: async (_id, k, patch) => {
      sections = sections.map((s) =>
        s.key === k
          ? {
              ...s,
              content: patch.content ?? s.content,
              status: patch.status,
              attempts: patch.attempts,
              error: patch.error,
            }
          : s,
      );
    },
    markReady: async () => {
      status = "ready";
      return true;
    },
    markFailed: async (_o, _r, message) => {
      status = "failed";
      console.error("falhou:", message);
    },
  };

  const writer = createAnthropicWriter();
  const notify = {
    paymentConfirmed: async () => {},
    reportReady: async () => {},
  };
  let rounds = 0;
  let res;
  do {
    rounds++;
    res = await runGeneration(order.id, { store, writer, notify });
    console.log(`rodada ${rounds}: ${res.state} (${res.done}/${res.total})`);
    if (res.state === "more") status = "paid"; // a rodada seguinte retoma
  } while (res.state === "more" && rounds < 20);

  if (res.state !== "ready") throw new Error(`Estado final: ${res.state}`);
  writeFileSync(
    "docs/referencia/exemplo-ficticio.md",
    sections.map((s) => `## ${s.title}\n\n${s.content}\n`).join("\n"),
    "utf8",
  );
  console.log("texto salvo em docs/referencia/exemplo-ficticio.md");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
