import type { ClauseRepository } from "@/lib/clauses/repository";
import type { EmbeddingModel } from "@/lib/llm/embeddings";
import type { LibraryWorkOptions } from "@/lib/rag/embedAll";
import { ingestText } from "@/lib/rag/ingest";
import type { LibraryRepository } from "@/lib/rag/repository";
import { normalizeForMatch } from "@/lib/text/normalizeForMatch";
import { DEMO_CLAUSES } from "./demoClauses";
import { DEMO_LIBRARY } from "./demoLibrary";

/** Adds the example clauses whose titles aren't taken yet; returns how many were added. */
export function loadDemoClauses(clauses: ClauseRepository): number {
  const taken = new Set(clauses.list().map((clause) => normalizeForMatch(clause.title)));
  const missing = DEMO_CLAUSES.filter((clause) => !taken.has(normalizeForMatch(clause.title)));
  missing.forEach((clause) => clauses.create(clause));
  return missing.length;
}

/** Indexes the example norms that aren't in the library yet; returns how many were added. */
export async function loadDemoLibrary(
  library: LibraryRepository,
  embedding: EmbeddingModel,
  options: LibraryWorkOptions = {},
): Promise<number> {
  let added = 0;
  for (const [index, document] of DEMO_LIBRARY.entries()) {
    options.signal?.throwIfAborted();
    const outcome = await ingestText(library, embedding, document, { signal: options.signal });
    if (outcome.status === "added") added++;
    options.onProgress?.(index + 1, DEMO_LIBRARY.length);
  }
  return added;
}
