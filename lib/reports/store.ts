import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChartData, ChartInput, HouseSystem } from "@/lib/astro";

import type {
  OrderRow,
  ProductRow,
  ReportRow,
  ReportStore,
  SectionPatch,
} from "./generate";
import type { SectionConfig, SectionState } from "./types";

const must = <T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T => {
  if (result.error || result.data === null) {
    throw new Error(`${what}: ${result.error?.message ?? "sem dados"}`);
  }
  return result.data;
};

/** Implementação do armazenamento do relatório no Supabase (service role). */
export function createSupabaseStore(admin: SupabaseClient): ReportStore {
  return {
    async getOrder(orderId) {
      const { data } = await admin
        .from("orders")
        .select("id, status, user_id, product_id, birth_profile_id")
        .eq("id", orderId)
        .maybeSingle();
      return (data as OrderRow | null) ?? null;
    },

    async beginGeneration(orderId) {
      const { data: started, error } = await admin
        .from("orders")
        .update({ status: "generating" })
        .eq("id", orderId)
        .eq("status", "paid")
        .select("id");
      if (error) throw new Error(`Erro ao iniciar a geração: ${error.message}`);
      if (started?.length) return "started";

      const { data } = await admin
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      return data?.status === "generating" ? "resumed" : "skip";
    },

    async getProduct(productId) {
      const { data } = await admin
        .from("products")
        .select("id, name, ai_instructions, report_sections")
        .eq("id", productId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        ai_instructions: data.ai_instructions ?? "",
        sections: (data.report_sections ?? []) as SectionConfig[],
      } satisfies ProductRow;
    },

    async getOrCreateReport(order, sections) {
      const select = "id, chart_data, sections";
      const existing = await admin
        .from("reports")
        .select(select)
        .eq("order_id", order.id)
        .maybeSingle();
      if (existing.data) return existing.data as unknown as ReportRow;

      // order_id é único: se outro job criou no meio tempo, ignora e relê.
      await admin
        .from("reports")
        .upsert(
          { order_id: order.id, user_id: order.user_id, sections },
          { onConflict: "order_id", ignoreDuplicates: true },
        );
      return must(
        await admin
          .from("reports")
          .select(select)
          .eq("order_id", order.id)
          .single(),
        "Erro ao ler o relatório",
      ) as unknown as ReportRow;
    },

    async getReport(reportId) {
      return must(
        await admin
          .from("reports")
          .select("id, chart_data, sections")
          .eq("id", reportId)
          .single(),
        "Erro ao ler o relatório",
      ) as unknown as ReportRow;
    },

    async acquireLock(reportId, leaseMs) {
      const nowIso = new Date().toISOString();
      const { data, error } = await admin
        .from("reports")
        .update({ lock_until: new Date(Date.now() + leaseMs).toISOString() })
        .eq("id", reportId)
        .or(`lock_until.is.null,lock_until.lt.${nowIso}`)
        .select("id");
      if (error) throw new Error(`Erro na trava: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },

    async releaseLock(reportId) {
      await admin
        .from("reports")
        .update({ lock_until: null })
        .eq("id", reportId);
    },

    async getChartInput(order) {
      if (!order.birth_profile_id) return null;
      const { data: bp } = await admin
        .from("birth_profiles")
        .select(
          "birth_date, birth_time, time_unknown, timezone, latitude, longitude",
        )
        .eq("id", order.birth_profile_id)
        .maybeSingle();
      if (!bp) return null;

      const { data: setting } = await admin
        .from("settings")
        .select("value")
        .eq("key", "default_house_system")
        .maybeSingle();
      const houseSystem: HouseSystem = ["placidus", "equal", "whole"].includes(
        setting?.value as string,
      )
        ? (setting!.value as HouseSystem)
        : "placidus";

      return {
        birthDate: bp.birth_date,
        // O banco guarda HH:MM:SS; o cálculo espera HH:MM.
        birthTime:
          bp.time_unknown || !bp.birth_time
            ? null
            : String(bp.birth_time).slice(0, 5),
        timezone: bp.timezone,
        latitude: bp.latitude,
        longitude: bp.longitude,
        houseSystem,
      } satisfies ChartInput;
    },

    async saveChart(reportId, chart: ChartData) {
      const { error } = await admin
        .from("reports")
        .update({
          chart_data: chart,
          house_system: chart.input.house_system,
        })
        .eq("id", reportId);
      if (error) throw new Error(`Erro ao salvar o mapa: ${error.message}`);
    },

    async applySection(reportId, key, patch: SectionPatch) {
      const { error } = await admin.rpc("report_apply_section", {
        p_report_id: reportId,
        p_key: key,
        p_content: patch.content ?? null,
        p_status: patch.status,
        p_attempts: patch.attempts,
        p_error: patch.error ?? null,
        p_input_tokens: patch.inputTokens ?? 0,
        p_output_tokens: patch.outputTokens ?? 0,
      });
      if (error) throw new Error(`Erro ao salvar a seção: ${error.message}`);
    },

    async markReady(orderId, reportId) {
      const { data, error } = await admin
        .from("orders")
        .update({ status: "ready" })
        .eq("id", orderId)
        .eq("status", "generating")
        .select("id");
      if (error) throw new Error(`Erro ao concluir o pedido: ${error.message}`);
      await admin.from("reports").update({ error: null }).eq("id", reportId);
      return (data?.length ?? 0) > 0;
    },

    async markFailed(orderId, reportId, message) {
      await admin
        .from("orders")
        .update({ status: "failed" })
        .eq("id", orderId)
        .eq("status", "generating");
      if (reportId) {
        await admin
          .from("reports")
          .update({ error: message })
          .eq("id", reportId);
      }
      // Alerta para o admin: o painel (Etapa 7) lista pedidos `failed`.
      console.error(`[relatório] pedido ${orderId} falhou: ${message}`);
    },
  };
}

export type { SectionState };
