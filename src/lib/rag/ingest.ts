import type { EmbeddingModel } from "@/lib/llm/embeddings";
import { LibraryIndexMismatchError } from "./errors";
import { prepareSource, sha256Of, type LibraryDocument } from "./prepareSource";
import type { LibraryRepository } from "./repository";
import type { LibrarySource } from "./types";

export type IngestOutcome =
  | { status: "added"; source: LibrarySource }
  | { status: "duplicate"; existing: LibrarySource };

/** Adds one uploaded document to the library, skipping content that is already there. */
export async function ingestDocument(
  library: LibraryRepository,
  embedding: EmbeddingModel,
  document: LibraryDocument,
): Promise<IngestOutcome> {
  const existing = library.findBySha256(sha256Of(document.bytes));
  if (existing) return { status: "duplicate", existing };
  // Fail before spending time embedding a document that couldn't join the index.
  if (!library.isCompatible(embedding)) throw new LibraryIndexMismatchError();

  const { source, chunks, embeddings } = await prepareSource(embedding, document);
  return { status: "added", source: library.addSource(source, chunks, embeddings, embedding) };
}
