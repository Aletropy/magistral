import type { GoogleGenAI } from "@google/genai";
import type { EmbeddingTask } from "@/lib/rag/types";
import type { EmbedFunction } from "../embeddings";
import { MinutaGenerationError } from "../errors";
import type { TokenUsage } from "../types";
import { EMBEDDING_DIMENSIONS, GEMINI_EMBEDDING_MODEL } from "./config";

const TASK_TYPES: Record<EmbeddingTask, string> = {
  document: "RETRIEVAL_DOCUMENT",
  query: "RETRIEVAL_QUERY",
};

/**
 * Embeds up to one batch of texts. The embed endpoint reports no token usage, so the tokens are
 * counted with a parallel countTokens call to keep the cost audit exact.
 */
export function createGeminiEmbedder(client: GoogleGenAI): EmbedFunction {
  return async (texts, task) => {
    // One Content per text: a plain string[] would be merged into a single multi-part content (one vector).
    const contents = texts.map((text) => ({ role: "user", parts: [{ text }] }));
    const [response, count] = await Promise.all([
      client.models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents,
        config: { taskType: TASK_TYPES[task], outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
      client.models.countTokens({ model: GEMINI_EMBEDDING_MODEL, contents }),
    ]);

    const usage: TokenUsage = { inputTokens: count.totalTokens ?? 0, outputTokens: 0, thinkingTokens: 0 };
    const embeddings = (response.embeddings ?? []).map((embedding) => embedding.values ?? []);
    if (embeddings.length !== texts.length || embeddings.some((values) => values.length !== EMBEDDING_DIMENSIONS)) {
      throw new MinutaGenerationError("invalid_output", usage);
    }
    return { embeddings, model: GEMINI_EMBEDDING_MODEL, usage };
  };
}
