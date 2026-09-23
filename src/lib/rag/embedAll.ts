import { EMBED_BATCH_SIZE } from "@/lib/llm/gemini/config";
import type { Embedder } from "@/lib/llm/gemini/embed";
import type { EmbeddingTask } from "./types";

/** Embeds any number of texts in sequential batches, preserving order. */
export async function embedAll(
  embed: Embedder,
  texts: string[],
  task: EmbeddingTask,
  batchSize: number = EMBED_BATCH_SIZE,
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let start = 0; start < texts.length; start += batchSize) {
    const { embeddings: batch } = await embed(texts.slice(start, start + batchSize), task);
    embeddings.push(...batch);
  }
  return embeddings;
}
