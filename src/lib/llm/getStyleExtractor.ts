import "server-only";
import type { StyleExtractor } from "@/lib/style/extractor";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { getGeminiClient } from "./gemini/client";
import { STYLE_EXTRACTION_MODEL } from "./gemini/config";
import { createGeminiStyleExtractor } from "./gemini/extractStyle";
import { getOpenRouterClient, getOpenRouterModels } from "./openrouter/client";
import { createOpenRouterStyleExtractor } from "./openrouter/extractStyle";
import { LLM_PROVIDER_ENV_VAR, resolveLlmProvider, type LlmProvider } from "./providers";

/**
 * Style Capture needs structured JSON output: it runs on OpenRouter when that is the drafting provider,
 * and on Gemini otherwise (Anthropic drafting keeps using Gemini for this step).
 */
function styleProvider(): Extract<LlmProvider, "openrouter" | "gemini"> {
  return resolveLlmProvider(process.env[LLM_PROVIDER_ENV_VAR]) === "openrouter" ? "openrouter" : "gemini";
}

export function getStyleExtractor(): StyleExtractor {
  const usage = getUsageRepository();
  const provider = styleProvider();
  const extract: StyleExtractor =
    provider === "openrouter"
      ? (text) => createOpenRouterStyleExtractor(getOpenRouterClient(), getOpenRouterModels())(text)
      : (text) => createGeminiStyleExtractor(getGeminiClient())(text);

  return withUsageAudit(extract, {
    operation: "style_capture",
    provider,
    configuredModel: provider === "openrouter" ? getOpenRouterModels()[0] : STYLE_EXTRACTION_MODEL,
    record: (call) => usage.record(call),
  });
}
