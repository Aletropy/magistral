import { EMBED_BATCH_SIZE, type EmbeddingModel } from "@/lib/llm/embeddings";
import type { EmbeddingTask } from "./types";

/** Lets long library work be cancelled and report how far it got. */
export interface LibraryWorkOptions {
  /** Checked between embedding batches (and between files); aborting rejects with the signal's reason. */
  signal?: AbortSignal;
  /** Texts embedded so far out of the total. */
  onProgress?: (done: number, total: number) => void;
}

/** Embeds any number of texts in sequential batches, preserving order. */
export async function embedAll(
  embedding: EmbeddingModel,
  texts: string[],
  task: EmbeddingTask,
  options: LibraryWorkOptions = {},
  batchSize: number = EMBED_BATCH_SIZE,
): Promise<number[][]> {
  const { signal, onProgress } = options;
  const embeddings: number[][] = [];
  for (let start = 0; start < texts.length; start += batchSize) {
    signal?.throwIfAborted();
    const { embeddings: batch } = await embedding.embed(texts.slice(start, start + batchSize), task);
    embeddings.push(...batch);
    onProgress?.(embeddings.length, texts.length);
  }
  return embeddings;
}
