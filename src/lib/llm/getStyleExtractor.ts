import "server-only";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { getGeminiClient } from "./gemini/client";
import { STYLE_EXTRACTION_MODEL } from "./gemini/config";
import { createGeminiStyleExtractor, type StyleExtractor } from "./gemini/extractStyle";

/** Style Capture always runs on Gemini, whatever LLM_PROVIDER picks for drafting. */
export function getStyleExtractor(): StyleExtractor {
  const usage = getUsageRepository();
  return withUsageAudit((documentText: string) => createGeminiStyleExtractor(getGeminiClient())(documentText), {
    operation: "style_capture",
    provider: "gemini",
    configuredModel: STYLE_EXTRACTION_MODEL,
    record: (call) => usage.record(call),
  });
}
