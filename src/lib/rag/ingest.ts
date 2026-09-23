import type { Embedder } from "@/lib/llm/gemini/embed";
import { prepareSource, sha256Of, type LibraryDocument } from "./prepareSource";
import type { LibraryRepository } from "./repository";
import type { LibrarySource } from "./types";

export type IngestOutcome =
  | { status: "added"; source: LibrarySource }
  | { status: "duplicate"; existing: LibrarySource };

/** Adds one uploaded document to the library, skipping content that is already there. */
export async function ingestDocument(
  library: LibraryRepository,
  embed: Embedder,
  document: LibraryDocument,
): Promise<IngestOutcome> {
  const existing = library.findBySha256(sha256Of(document.bytes));
  if (existing) return { status: "duplicate", existing };

  const { source, chunks, embeddings } = await prepareSource(embed, document);
  return { status: "added", source: library.addSource(source, chunks, embeddings) };
}
