import type { EmbeddingModel } from "@/lib/llm/embeddings";
import { hybridSearch } from "./hybridSearch";
import type { LibraryRepository } from "./repository";
import type { LibraryChunk } from "./types";

/**
 * Libraries up to this size go into the prompt whole ("in-context RAG"): ~100k tokens, which fits every
 * supported model with room for the answer and gives perfect recall. Larger libraries use hybrid search.
 */
export const FULL_CONTEXT_MAX_CHARS = 400_000;
const FULL_TEXT_LABEL = "Texto integral";

export interface ContextSource {
  /** Stable reference within one prompt, e.g. "F1". */
  ref: string;
  title: string;
  label: string;
  context: string;
  text: string;
}

export interface LibraryContext {
  strategy: "full" | "search";
  sources: ContextSource[];
}

/** Rebuilds a source's full text from its chunks, re-inserting the headings where they change. */
function joinSourceText(chunks: LibraryChunk[]): string {
  let previousContext = "";
  return chunks
    .map((chunk) => {
      const heading = chunk.context && chunk.context !== previousContext ? `${chunk.context}\n` : "";
      previousContext = chunk.context;
      return `${heading}${chunk.text}`;
    })
    .join("\n\n");
}

function groupBySource(chunks: LibraryChunk[]): LibraryChunk[][] {
  const groups = new Map<number, LibraryChunk[]>();
  for (const chunk of chunks) groups.set(chunk.sourceId, [...(groups.get(chunk.sourceId) ?? []), chunk]);
  return [...groups.values()];
}

/** Picks the library text for a request: everything when it is small, the best-matching chunks otherwise. */
export async function selectLibraryContext(
  library: LibraryRepository,
  embedding: EmbeddingModel,
  query: string,
  fullContextMaxChars: number = FULL_CONTEXT_MAX_CHARS,
): Promise<LibraryContext> {
  const totalChars = library.totalChars();
  if (totalChars === 0) return { strategy: "search", sources: [] };

  if (totalChars <= fullContextMaxChars) {
    const sources = groupBySource(library.allChunks()).map((chunks, index) => ({
      ref: `F${index + 1}`,
      title: chunks[0].sourceTitle,
      label: FULL_TEXT_LABEL,
      context: "",
      text: joinSourceText(chunks),
    }));
    return { strategy: "full", sources };
  }

  const chunks = await hybridSearch(library, embedding, query);
  return {
    strategy: "search",
    sources: chunks.map((chunk, index) => ({
      ref: `F${index + 1}`,
      title: chunk.sourceTitle,
      label: chunk.label,
      context: chunk.context,
      text: chunk.text,
    })),
  };
}
