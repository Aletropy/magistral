import type { EmbeddingModel } from "@/lib/llm/embeddings";
import type { LibraryWorkOptions } from "./embedAll";
import { LibraryIndexMismatchError } from "./errors";
import { prepareSource, prepareTextSource, sha256Of, type LibraryDocument, type LibraryText } from "./prepareSource";
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
  options: LibraryWorkOptions = {},
): Promise<IngestOutcome> {
  const existing = library.findBySha256(sha256Of(document.bytes));
  if (existing) return { status: "duplicate", existing };
  // Fail before spending time embedding a document that couldn't join the index.
  if (!library.isCompatible(embedding)) throw new LibraryIndexMismatchError();

  const { source, chunks, embeddings } = await prepareSource(embedding, document, options);
  return { status: "added", source: library.addSource(source, chunks, embeddings, embedding) };
}

/** Adds a plain-text document to the library, skipping text that is already there. */
export async function ingestText(
  library: LibraryRepository,
  embedding: EmbeddingModel,
  document: LibraryText,
  options: LibraryWorkOptions = {},
): Promise<IngestOutcome> {
  const sha256 = sha256Of(new TextEncoder().encode(document.text));
  const existing = library.findBySha256(sha256);
  if (existing) return { status: "duplicate", existing };
  if (!library.isCompatible(embedding)) throw new LibraryIndexMismatchError();

  const { source, chunks, embeddings } = await prepareTextSource(embedding, { ...document, folderPath: null, sha256 }, options);
  return { status: "added", source: library.addSource(source, chunks, embeddings, embedding) };
}
