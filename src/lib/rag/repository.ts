import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { withTransaction } from "@/lib/db/transaction";
import type { TextChunk } from "./chunkLegalText";
import { LibraryIndexMismatchError } from "./errors";
import { LIBRARY_SOURCE_KINDS, type LibraryChunk, type LibrarySource, type LibrarySourceKind } from "./types";

const sourceRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  kind: z.enum(LIBRARY_SOURCE_KINDS),
  file_name: z.string(),
  folder_path: z.string().nullable(),
  sha256: z.string(),
  char_count: z.number(),
  chunk_count: z.number(),
  created_at: z.string(),
});

const chunkRowSchema = z.object({
  id: z.number(),
  source_id: z.number(),
  source_title: z.string(),
  position: z.number(),
  label: z.string(),
  context: z.string(),
  text: z.string(),
});

const idRowSchema = z.object({ id: z.number() });
const metaRowSchema = z.object({ key: z.string(), value: z.string() });
const countRowSchema = z.object({ count: z.number() });

const META_MODEL = "embedding_model";
const META_DIMENSIONS = "embedding_dimensions";

export interface NewLibrarySource {
  title: string;
  kind: LibrarySourceKind;
  fileName: string;
  folderPath: string | null;
  sha256: string;
  charCount: number;
}

/** The embedding model an index was built with; nulls while the library is empty. */
export interface LibraryIndexInfo {
  model: string | null;
  dimensions: number | null;
  chunkCount: number;
}

/** Identifies the embedding model vectors came from. */
export interface EmbeddingIdentity {
  id: string;
  dimensions: number;
}

export interface LibraryRepository {
  indexInfo(): LibraryIndexInfo;
  /** Whether new vectors from `model` can join the index (always true for an empty library). */
  isCompatible(model: EmbeddingIdentity): boolean;
  /** Replaces every vector with ones from `model` (same chunk ids), resizing the vector table if needed. */
  reindex(model: EmbeddingIdentity, vectors: { chunkId: number; embedding: number[] }[]): void;
  listSources(): LibrarySource[];
  findBySha256(sha256: string): LibrarySource | null;
  /**
   * Stores a source with its chunks and their embeddings (same order) in one transaction, optionally
   * deleting the source it replaces. Throws LibraryIndexMismatchError when `model` differs from the one
   * the rest of the index was built with.
   */
  addSource(
    source: NewLibrarySource,
    chunks: TextChunk[],
    embeddings: number[][],
    model: EmbeddingIdentity,
    replacesSourceId?: number,
  ): LibrarySource;
  /** Returns false when no source has this id. */
  deleteSource(id: number): boolean;
  totalChars(): number;
  /** Every chunk, grouped by source and in document order. */
  allChunks(): LibraryChunk[];
  getChunks(ids: number[]): LibraryChunk[];
  /** Chunk ids ranked by BM25 for an FTS5 MATCH expression. */
  keywordSearch(matchExpression: string, limit: number): number[];
  /** Chunk ids ranked by cosine distance to the query embedding. */
  vectorSearch(embedding: number[], limit: number): number[];
}

const SOURCE_COLUMNS = `
  s.*, (SELECT COUNT(*) FROM library_chunks c WHERE c.source_id = s.id) AS chunk_count`;
const CHUNK_COLUMNS = "c.*, s.title AS source_title";

function toSource(row: unknown): LibrarySource {
  const parsed = sourceRowSchema.parse(row);
  return {
    id: parsed.id,
    title: parsed.title,
    kind: parsed.kind,
    fileName: parsed.file_name,
    folderPath: parsed.folder_path,
    sha256: parsed.sha256,
    charCount: parsed.char_count,
    chunkCount: parsed.chunk_count,
    createdAt: parsed.created_at,
  };
}

function toChunk(row: unknown): LibraryChunk {
  const parsed = chunkRowSchema.parse(row);
  return {
    id: parsed.id,
    sourceId: parsed.source_id,
    sourceTitle: parsed.source_title,
    position: parsed.position,
    label: parsed.label,
    context: parsed.context,
    text: parsed.text,
  };
}

export function createLibraryRepository(db: DatabaseSync): LibraryRepository {
  const selectSources = db.prepare(`SELECT ${SOURCE_COLUMNS} FROM library_sources s ORDER BY s.title COLLATE NOCASE`);
  const selectSourceById = db.prepare(`SELECT ${SOURCE_COLUMNS} FROM library_sources s WHERE s.id = ?`);
  const selectSourceBySha = db.prepare(`SELECT ${SOURCE_COLUMNS} FROM library_sources s WHERE s.sha256 = ?`);
  const insertSource = db.prepare(
    `INSERT INTO library_sources (title, kind, file_name, folder_path, sha256, char_count)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
  );
  const insertChunk = db.prepare(
    "INSERT INTO library_chunks (source_id, position, label, context, text) VALUES (?, ?, ?, ?, ?) RETURNING id",
  );
  const insertVector = db.prepare("INSERT INTO library_chunk_vectors (rowid, embedding) VALUES (?, ?)");
  const selectMeta = db.prepare("SELECT key, value FROM library_meta");
  const upsertMeta = db.prepare(
    "INSERT INTO library_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
  );
  const countChunks = db.prepare("SELECT COUNT(*) AS count FROM library_chunks");
  const selectChunkExists = db.prepare("SELECT 1 FROM library_chunks WHERE id = ?");

  function indexInfo(): LibraryIndexInfo {
    const meta = new Map(selectMeta.all().map((row) => {
      const { key, value } = metaRowSchema.parse(row);
      return [key, value] as const;
    }));
    const dimensions = meta.get(META_DIMENSIONS);
    return {
      model: meta.get(META_MODEL) ?? null,
      dimensions: dimensions ? Number(dimensions) : null,
      chunkCount: countRowSchema.parse(countChunks.get()).count,
    };
  }

  /** Points the index at `model`, recreating the (then empty) vector table when its size changes. */
  function adoptModel(model: EmbeddingIdentity, current: LibraryIndexInfo): void {
    if (current.dimensions !== model.dimensions) {
      db.exec("DROP TABLE library_chunk_vectors");
      db.exec(
        `CREATE VIRTUAL TABLE library_chunk_vectors USING vec0(embedding float[${model.dimensions}] distance_metric=cosine)`,
      );
    }
    upsertMeta.run(META_MODEL, model.id);
    upsertMeta.run(META_DIMENSIONS, String(model.dimensions));
  }

  function isCompatible(model: EmbeddingIdentity): boolean {
    const info = indexInfo();
    return info.chunkCount === 0 || info.model === model.id;
  }
  const deleteSourceById = db.prepare("DELETE FROM library_sources WHERE id = ?");
  const selectTotalChars = db.prepare("SELECT COALESCE(SUM(char_count), 0) AS total FROM library_sources");
  const selectAllChunks = db.prepare(
    `SELECT ${CHUNK_COLUMNS} FROM library_chunks c JOIN library_sources s ON s.id = c.source_id
     ORDER BY s.title COLLATE NOCASE, c.source_id, c.position`,
  );
  const selectKeyword = db.prepare(
    "SELECT rowid AS id FROM library_chunks_fts WHERE library_chunks_fts MATCH ? ORDER BY bm25(library_chunks_fts) LIMIT ?",
  );
  const selectNearest = db.prepare(
    "SELECT rowid AS id FROM library_chunk_vectors WHERE embedding MATCH ? AND k = ? ORDER BY distance",
  );

  function toIds(rows: unknown[]): number[] {
    return rows.map((row) => idRowSchema.parse(row).id);
  }

  return {
    indexInfo,
    isCompatible,

    reindex(model, vectors) {
      withTransaction(db, () => {
        db.exec("DELETE FROM library_chunk_vectors");
        adoptModel(model, indexInfo());
        for (const { chunkId, embedding } of vectors) {
          // A source deleted while the embeddings were computed must not come back as orphan vectors.
          if (selectChunkExists.get(chunkId)) insertVector.run(BigInt(chunkId), new Float32Array(embedding));
        }
      });
    },

    listSources: () => selectSources.all().map(toSource),

    findBySha256(sha256) {
      const row = selectSourceBySha.get(sha256);
      return row ? toSource(row) : null;
    },

    addSource(source, chunks, embeddings, model, replacesSourceId) {
      if (chunks.length !== embeddings.length) {
        throw new Error(`Got ${embeddings.length} embeddings for ${chunks.length} chunks.`);
      }
      const id = withTransaction(db, () => {
        if (replacesSourceId !== undefined) deleteSourceById.run(replacesSourceId);
        const info = indexInfo();
        if (info.chunkCount === 0) adoptModel(model, info);
        else if (info.model !== model.id) throw new LibraryIndexMismatchError();
        const { id: sourceId } = idRowSchema.parse(
          insertSource.get(source.title, source.kind, source.fileName, source.folderPath, source.sha256, source.charCount),
        );
        chunks.forEach((chunk, position) => {
          const { id: chunkId } = idRowSchema.parse(
            insertChunk.get(sourceId, position, chunk.label, chunk.context, chunk.text),
          );
          // vec0 requires integer rowids passed as BigInt.
          insertVector.run(BigInt(chunkId), new Float32Array(embeddings[position]));
        });
        return sourceId;
      });
      return toSource(selectSourceById.get(id));
    },

    deleteSource: (id) => withTransaction(db, () => deleteSourceById.run(id).changes > 0),

    totalChars: () => z.object({ total: z.number() }).parse(selectTotalChars.get()).total,

    allChunks: () => selectAllChunks.all().map(toChunk),

    getChunks(ids) {
      if (ids.length === 0) return [];
      const placeholders = ids.map(() => "?").join(", ");
      const rows = db
        .prepare(
          `SELECT ${CHUNK_COLUMNS} FROM library_chunks c JOIN library_sources s ON s.id = c.source_id
           WHERE c.id IN (${placeholders})`,
        )
        .all(...ids)
        .map(toChunk);
      const byId = new Map(rows.map((chunk) => [chunk.id, chunk]));
      return ids.flatMap((id) => byId.get(id) ?? []);
    },

    keywordSearch: (matchExpression, limit) => toIds(selectKeyword.all(matchExpression, limit)),

    vectorSearch: (embedding, limit) => toIds(selectNearest.all(new Float32Array(embedding), limit)),
  };
}
