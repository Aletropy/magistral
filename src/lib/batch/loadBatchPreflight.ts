import "server-only";
import { getOpenRouterModels } from "@/lib/llm/openrouter/client";
import { FREE_MODELS_DAILY_REQUEST_LIMIT, isFreeModelList } from "@/lib/llm/openrouter/config";
import { activeLlmProvider } from "@/lib/llm/providerRegistry";
import { LLM_CONCURRENCY } from "@/lib/queue/slotPool";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";

/** Used when there is no history to average: free models usually take about a minute per minuta. */
const DEFAULT_SECONDS_PER_MINUTA = 60;
const LATENCY_WINDOW_DAYS = 30;
const MS_PER_SECOND = 1000;

/** What the batch creator tells the user before they start: the likely duration and the quota left today. */
export interface BatchPreflight {
  secondsPerMinuta: number;
  concurrency: number;
  /** Null when the provider has no known daily cap (paid models, Gemini, Anthropic). */
  dailyRequestLimit: number | null;
  requestsUsedToday: number;
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function loadBatchPreflight(now: Date = new Date()): BatchPreflight {
  const usage = getUsageRepository();
  const average = usage.averageLatencyMs(["minuta", "batch"], LATENCY_WINDOW_DAYS);
  const provider = activeLlmProvider();
  const capped = provider === "openrouter" && isFreeModelList(getOpenRouterModels());
  return {
    secondsPerMinuta: average === null ? DEFAULT_SECONDS_PER_MINUTA : Math.round(average / MS_PER_SECOND),
    concurrency: LLM_CONCURRENCY,
    dailyRequestLimit: capped ? FREE_MODELS_DAILY_REQUEST_LIMIT : null,
    requestsUsedToday: capped ? usage.countCallsSince(provider, startOfUtcDay(now)) : 0,
  };
}
