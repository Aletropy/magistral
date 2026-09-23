import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DocumentExtractionError } from "@/lib/documents/errors";
import { detectDocumentFormat } from "@/lib/documents/formats";
import { DOCUMENT_EXTRACTION_ERRORS } from "@/lib/documents/messages";
import type { EmbeddingModel } from "@/lib/llm/embeddings";
import type { LibraryWorkOptions } from "./embedAll";
import { LibraryIndexMismatchError } from "./errors";
import { inferKindFromFileName, prepareSource, sha256Of } from "./prepareSource";
import type { LibraryRepository } from "./repository";

export interface FolderSyncReport {
  added: string[];
  updated: string[];
  removed: string[];
  unchanged: number;
  /** Files whose content is already in the library under another name. */
  duplicates: string[];
  failed: { path: string; message: string }[];
}

/** Supported files under `root`, as POSIX-style paths relative to it. */
async function listDocuments(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && detectDocumentFormat(entry.name))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .sort();
}

/**
 * Mirrors the library folder into the database: new files are added, changed files re-indexed and
 * deleted files removed. Uploaded sources are left alone. LLM failures abort the sync; files already
 * processed stay indexed.
 */
export async function syncLibraryFolder(
  library: LibraryRepository,
  embedding: EmbeddingModel,
  root: string,
  options: LibraryWorkOptions = {},
): Promise<FolderSyncReport> {
  const { signal, onProgress } = options;
  await mkdir(root, { recursive: true });
  if (!library.isCompatible(embedding)) throw new LibraryIndexMismatchError();
  const report: FolderSyncReport = { added: [], updated: [], removed: [], unchanged: 0, duplicates: [], failed: [] };
  const files = await listDocuments(root);
  const folderSources = new Map(
    library
      .listSources()
      .filter((source) => source.folderPath !== null)
      .map((source) => [source.folderPath!, source]),
  );

  for (const [index, relativePath] of files.entries()) {
    signal?.throwIfAborted();
    onProgress?.(index, files.length);
    const bytes = new Uint8Array(await readFile(path.join(root, relativePath)));
    const sha256 = sha256Of(bytes);
    const previous = folderSources.get(relativePath);
    if (previous?.sha256 === sha256) {
      report.unchanged++;
      continue;
    }
    const sameContent = library.findBySha256(sha256);
    if (sameContent) {
      report.duplicates.push(relativePath);
      continue;
    }

    try {
      const document = {
        fileName: path.posix.basename(relativePath),
        bytes,
        kind: previous?.kind ?? inferKindFromFileName(relativePath),
        folderPath: relativePath,
      };
      const prepared = await prepareSource(embedding, document, { signal });
      library.addSource(prepared.source, prepared.chunks, prepared.embeddings, embedding, previous?.id);
      (previous ? report.updated : report.added).push(relativePath);
    } catch (error) {
      if (!(error instanceof DocumentExtractionError)) throw error;
      report.failed.push({ path: relativePath, message: DOCUMENT_EXTRACTION_ERRORS[error.reason].message });
    }
  }

  const present = new Set(files);
  for (const [folderPath, source] of folderSources) {
    if (present.has(folderPath)) continue;
    library.deleteSource(source.id);
    report.removed.push(folderPath);
  }
  return report;
}
