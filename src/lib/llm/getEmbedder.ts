import "server-only";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { withUsageAudit } from "@/lib/usage/withUsageAudit";
import { getGeminiClient } from "./gemini/client";
import { GEMINI_EMBEDDING_MODEL } from "./gemini/config";
import { createGeminiEmbedder, type Embedder } from "./gemini/embed";

/** Embeddings always come from Gemini: Anthropic offers no embeddings API. */
export function getEmbedder(): Embedder {
  const usage = getUsageRepository();
  return withUsageAudit<Parameters<Embedder>, Awaited<ReturnType<Embedder>>>(
    (texts, task) => createGeminiEmbedder(getGeminiClient())(texts, task),
    {
      operation: "embedding",
      provider: "gemini",
      configuredModel: GEMINI_EMBEDDING_MODEL,
      record: (call) => usage.record(call),
    },
  );
}
