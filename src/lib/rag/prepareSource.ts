import { createHash } from "node:crypto";
import path from "node:path";
import { DocumentExtractionError } from "@/lib/documents/errors";
import { extractText } from "@/lib/documents/extractText";
import { MAX_LIBRARY_DOCUMENT_CHARS } from "@/lib/documents/formats";
import type { EmbeddingModel } from "@/lib/llm/embeddings";
import { normalizeForMatch } from "@/lib/text/normalizeForMatch";
import { chunkLegalText, type TextChunk } from "./chunkLegalText";
import { embedAll } from "./embedAll";
import type { NewLibrarySource } from "./repository";
import type { LibrarySourceKind } from "./types";

export interface LibraryDocument {
  fileName: string;
  bytes: Uint8Array;
  kind: LibrarySourceKind;
  /** Relative path inside the library folder, or null for uploads. */
  folderPath: string | null;
}

export interface PreparedSource {
  source: NewLibrarySource;
  chunks: TextChunk[];
  embeddings: number[][];
}

const FILE_NAME_SEPARATORS = /[_-]+/g;

export function sha256Of(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function titleFromFileName(fileName: string): string {
  return path.parse(fileName).name.replace(FILE_NAME_SEPARATORS, " ").trim();
}

/** Guesses the kind from a file name, e.g. "decreto-123.pdf"; anything unrecognised is "outro". */
export function inferKindFromFileName(fileName: string): LibrarySourceKind {
  const name = normalizeForMatch(fileName);
  if (name.includes("decreto")) return "decreto";
  if (name.includes("parecer")) return "parecer";
  if (/(^|[^a-z])(lei|lc)([^a-z]|$)/.test(name)) return "lei";
  return "outro";
}

/** The text each chunk is embedded with: source title and headings improve retrieval of short articles. */
export function toEmbeddingText(title: string, chunk: TextChunk): string {
  return [title, chunk.context, chunk.label, chunk.text].filter(Boolean).join("\n");
}

/** Extracts, chunks and embeds a document; nothing is written until the caller stores the result. */
export async function prepareSource(embedding: EmbeddingModel, document: LibraryDocument): Promise<PreparedSource> {
  const text = await extractText({ name: document.fileName, bytes: document.bytes });
  if (text.length > MAX_LIBRARY_DOCUMENT_CHARS) throw new DocumentExtractionError("too_long");

  const title = titleFromFileName(document.fileName);
  const chunks = chunkLegalText(text);
  const embeddings = await embedAll(
    embedding,
    chunks.map((chunk) => toEmbeddingText(title, chunk)),
    "document",
  );

  return {
    source: {
      title,
      kind: document.kind,
      fileName: path.basename(document.fileName),
      folderPath: document.folderPath,
      sha256: sha256Of(document.bytes),
      charCount: text.length,
    },
    chunks,
    embeddings,
  };
}
