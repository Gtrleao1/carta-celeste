import { computeChart, type ChartData, type ChartInput } from "@/lib/astro";
import { WriteError, type SectionWriter } from "@/lib/ai/types";

import { summarizeChart } from "./chart-summary";
import {
  MIN_WORDS,
  buildSectionPrompt,
  buildSystemPrompt,
  countWords,
  timeUnknownExplanation,
} from "./prompt";
import {
  MAX_ATTEMPTS,
  initialSections,
  type SectionConfig,
  type SectionState,
  type SectionStatus,
} from "./types";

export type OrderRow = {
  id: string;
  status: string;
  user_id: string | null;
  product_id: string;
  birth_profile_id: string | null;
};

export type ProductRow = {
  id: string;
  name: string;
  ai_instructions: string;
  sections: SectionConfig[];
};

export type ReportRow = {
  id: string;
  chart_data: ChartData | null;
  sections: SectionState[];
};

export type SectionPatch = {
  content?: string;
  status: SectionStatus;
  attempts: number;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
};

/** Acesso ao banco, injetado para o orquestrador poder ser testado sem rede. */
export interface ReportStore {
  getOrder(orderId: string): Promise<OrderRow | null>;
  /** paid -> generating (atômico). "resumed" se já estava gerando; "skip" nos demais estados. */
  beginGeneration(orderId: string): Promise<"started" | "resumed" | "skip">;
  getProduct(productId: string): Promise<ProductRow | null>;
  getOrCreateReport(
    order: OrderRow,
    sections: SectionState[],
  ): Promise<ReportRow>;
  getReport(reportId: string): Promise<ReportRow>;
  acquireLock(reportId: string, leaseMs: number): Promise<boolean>;
  releaseLock(reportId: string): Promise<void>;
  /** Dados de nascimento + sistema de casas, prontos para o cálculo. Nulo se o perfil sumiu. */
  getChartInput(order: OrderRow): Promise<ChartInput | null>;
  saveChart(reportId: string, chart: ChartData): Promise<void>;
  applySection(
    reportId: string,
    key: string,
    patch: SectionPatch,
  ): Promise<void>;
  /** generating -> ready (atômico). Falso se outro job já fez. */
  markReady(orderId: string, reportId: string): Promise<boolean>;
  markFailed(
    orderId: string,
    reportId: string | null,
    message: string,
  ): Promise<void>;
}

export interface Notifier {
  paymentConfirmed(order: OrderRow): Promise<void>;
  reportReady(order: OrderRow): Promise<void>;
}

export type GenerationOptions = {
  /** Não inicia novas seções depois deste tempo (ms desde o começo). */
  softBudgetMs: number;
  /** Nenhuma chamada passa deste tempo (ms desde o começo). */
  hardBudgetMs: number;
  leaseMs: number;
  concurrency: number;
  maxAttempts: number;
  maxTokens: number;
};

// A função da Vercel tem limite de 60 s; paramos de iniciar seções aos 25 s e
// nenhuma chamada passa dos 55 s. O que faltar continua no próximo job.
export const DEFAULT_OPTIONS: GenerationOptions = {
  softBudgetMs: 25_000,
  hardBudgetMs: 55_000,
  leaseMs: 75_000,
  concurrency: 3,
  maxAttempts: MAX_ATTEMPTS,
  maxTokens: 2500,
};

export type GenerationResult = {
  state: "ready" | "more" | "locked" | "failed" | "ignored";
  done: number;
  total: number;
  reason?: string;
};

export type GenerationDeps = {
  store: ReportStore;
  writer: SectionWriter;
  notify: Notifier;
  now?: () => number;
  log?: (message: string) => void;
  options?: Partial<GenerationOptions>;
};

const noop = async () => {};

/** Tira cercas de código que a IA às vezes coloca em volta de todo o texto. */
export function cleanText(text: string): string {
  const fenced = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i.exec(text.trim());
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Gera o relatório de um pedido pago, uma seção por vez, sem passar do tempo
 * da função. É idempotente e retomável: seções prontas nunca são refeitas, e
 * chamar de novo continua da próxima pendente.
 */
export async function runGeneration(
  orderId: string,
  deps: GenerationDeps,
): Promise<GenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...deps.options };
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const { store, writer } = deps;
  const t0 = now();

  const order = await store.getOrder(orderId);
  if (!order)
    return {
      state: "ignored",
      done: 0,
      total: 0,
      reason: "pedido_nao_encontrado",
    };
  if (order.status === "ready") return { state: "ready", done: 0, total: 0 };

  const begun = await store.beginGeneration(orderId);
  if (begun === "skip") {
    return {
      state: "ignored",
      done: 0,
      total: 0,
      reason: `status_${order.status}`,
    };
  }
  if (begun === "started") {
    // E-mail de "pagamento confirmado": só na primeira vez (a transição é atômica).
    await deps.notify.paymentConfirmed(order).catch(noop);
  }

  const product = await store.getProduct(order.product_id);
  if (!product || product.sections.length === 0) {
    await store.markFailed(orderId, null, "produto_sem_secoes");
    return { state: "failed", done: 0, total: 0, reason: "produto_sem_secoes" };
  }

  const report = await store.getOrCreateReport(
    order,
    initialSections(product.sections),
  );

  if (!(await store.acquireLock(report.id, opts.leaseMs))) {
    return {
      state: "locked",
      done: report.sections.filter((s) => s.status === "done").length,
      total: report.sections.length,
    };
  }

  try {
    // 1) Cálculo do mapa (uma vez). A IA nunca calcula posições.
    let chart = report.chart_data;
    if (!chart) {
      const input = await store.getChartInput(order);
      if (!input) {
        await store.markFailed(
          orderId,
          report.id,
          "perfil_de_nascimento_ausente",
        );
        return {
          state: "failed",
          done: 0,
          total: report.sections.length,
          reason: "perfil_de_nascimento_ausente",
        };
      }
      chart = computeChart(input);
      await store.saveChart(report.id, chart);
      log(`mapa calculado (${chart.planets.length} corpos)`);
    }

    const system = buildSystemPrompt(product.ai_instructions);
    const summary = summarizeChart(chart);
    const configByKey = new Map(product.sections.map((s) => [s.key, s]));
    const allTitles = report.sections.map((s) => s.title);
    const hardEnd = t0 + opts.hardBudgetMs;

    const generateOne = async (state: SectionState) => {
      const config = configByKey.get(state.key);
      if (!config) {
        await store.applySection(report.id, state.key, {
          status: "failed",
          attempts: opts.maxAttempts,
          error: "configuracao_ausente",
        });
        return;
      }

      // Sem hora de nascimento, seções de casas viram uma explicação (sem IA).
      if (config.needs_houses && chart.time_unknown) {
        await store.applySection(report.id, state.key, {
          content: timeUnknownExplanation(state.title),
          status: "done",
          attempts: state.attempts,
          error: "",
        });
        return;
      }

      try {
        const result = await writer.write({
          system,
          prompt: buildSectionPrompt({
            section: config,
            allTitles,
            chartSummary: summary,
          }),
          maxTokens: opts.maxTokens,
          timeoutMs: Math.max(5_000, hardEnd - now() - 1_000),
        });
        const text = cleanText(result.text);
        if (countWords(text) < MIN_WORDS) throw new WriteError("texto_cortado");

        await store.applySection(report.id, state.key, {
          content: text,
          status: "done",
          attempts: state.attempts,
          error: "",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
        log(`seção "${state.key}" pronta (${countWords(text)} palavras)`);
      } catch (e) {
        const kind = e instanceof WriteError ? e.kind : "desconhecido";
        const attempts = state.attempts + 1;
        await store.applySection(report.id, state.key, {
          status: attempts >= opts.maxAttempts ? "failed" : "pending",
          attempts,
          error: kind,
        });
        log(
          `seção "${state.key}" falhou (${kind}), tentativa ${attempts}/${opts.maxAttempts}`,
        );
      }
    };

    // 2) Seções pendentes, em lotes paralelos, enquanto houver tempo.
    let current = report.sections;
    while (now() - t0 < opts.softBudgetMs) {
      const queue = current.filter(
        (s) => s.status !== "done" && s.attempts < opts.maxAttempts,
      );
      if (queue.length === 0) break;

      const worker = async () => {
        while (queue.length > 0 && now() - t0 < opts.softBudgetMs) {
          await generateOne(queue.shift()!);
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(opts.concurrency, queue.length) },
          worker,
        ),
      );
      current = (await store.getReport(report.id)).sections;
    }

    // 3) Situação final deste passo.
    const fresh = (await store.getReport(report.id)).sections;
    const done = fresh.filter((s) => s.status === "done").length;
    const exhausted = fresh.find(
      (s) => s.status !== "done" && s.attempts >= opts.maxAttempts,
    );

    if (exhausted) {
      const message = `secao_${exhausted.key}_falhou_${exhausted.error ?? "desconhecido"}`;
      await store.markFailed(orderId, report.id, message);
      return { state: "failed", done, total: fresh.length, reason: message };
    }

    if (done === fresh.length) {
      if (await store.markReady(orderId, report.id)) {
        await deps.notify.reportReady(order).catch(noop);
      }
      return { state: "ready", done, total: fresh.length };
    }

    return { state: "more", done, total: fresh.length };
  } finally {
    await store.releaseLock(report.id).catch(noop);
  }
}
