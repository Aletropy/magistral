export const LIBRARY_SOURCE_KINDS = ["lei", "decreto", "parecer", "outro"] as const;
export type LibrarySourceKind = (typeof LIBRARY_SOURCE_KINDS)[number];

export const LIBRARY_SOURCE_KIND_LABELS: Record<LibrarySourceKind, string> = {
  lei: "Lei",
  decreto: "Decreto",
  parecer: "Parecer",
  outro: "Outro",
};

export interface LibrarySource {
  id: number;
  title: string;
  kind: LibrarySourceKind;
  fileName: string;
  /** Path relative to the library folder, for files that came from folder sync; null for uploads. */
  folderPath: string | null;
  sha256: string;
  charCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface LibraryChunk {
  id: number;
  sourceId: number;
  sourceTitle: string;
  position: number;
  label: string;
  context: string;
  text: string;
}

export type EmbeddingTask = "document" | "query";
