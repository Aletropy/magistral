import type { EmbeddingModel } from "@/lib/llm/embeddings";
import { embedAll } from "./embedAll";
import { toEmbeddingText } from "./prepareSource";
import type { LibraryRepository } from "./repository";

/** Re-embeds every stored chunk with `embedding` and swaps the whole vector index in one transaction. */
export async function reindexLibrary(library: LibraryRepository, embedding: EmbeddingModel): Promise<number> {
  const chunks = library.allChunks();
  const embeddings = await embedAll(
    embedding,
    chunks.map((chunk) => toEmbeddingText(chunk.sourceTitle, chunk)),
    "document",
  );
  library.reindex(
    embedding,
    chunks.map((chunk, index) => ({ chunkId: chunk.id, embedding: embeddings[index] })),
  );
  return chunks.length;
}
