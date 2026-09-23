import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { TextChunk } from "./chunkLegalText";
import { createLibraryRepository, type LibraryRepository, type NewLibrarySource } from "./repository";
import { FAKE_EMBEDDING_ID, TEST_DIMENSIONS, axisVector } from "./testHelpers";

const MODEL = { id: FAKE_EMBEDDING_ID, dimensions: TEST_DIMENSIONS };

const SOURCE: NewLibrarySource = {
  title: "Lei Complementar nº 7/1973",
  kind: "lei",
  fileName: "lc-7-1973.pdf",
  folderPath: null,
  sha256: "abc",
  charCount: 300,
};

const CHUNKS: TextChunk[] = [
  { label: "Art. 1º", context: "TÍTULO I – DO IPTU", text: "O imposto predial incide sobre imóveis urbanos." },
  { label: "Art. 2º", context: "TÍTULO II – DO ISS", text: "O imposto sobre serviços incide sobre hospedagem." },
];

function count(db: DatabaseSync, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

describe("createLibraryRepository", () => {
  let db: DatabaseSync;
  let library: LibraryRepository;

  beforeEach(() => {
    db = openDatabase(IN_MEMORY_DATABASE);
    library = createLibraryRepository(db);
  });

  it("stores a source with its chunks and reports counts", () => {
    const source = library.addSource(SOURCE, CHUNKS, [axisVector(0), axisVector(1)], MODEL);

    expect(source).toMatchObject({ title: SOURCE.title, chunkCount: 2, charCount: 300 });
    expect(library.findBySha256("abc")?.id).toBe(source.id);
    expect(library.totalChars()).toBe(300);
    expect(library.allChunks().map((chunk) => chunk.label)).toEqual(["Art. 1º", "Art. 2º"]);
  });

  it("finds chunks by keyword, ignoring accents, and by vector similarity", () => {
    library.addSource(SOURCE, CHUNKS, [axisVector(0), axisVector(1)], MODEL);
    const [iptu, iss] = library.allChunks();

    expect(library.keywordSearch('"servicos"', 5)).toEqual([iss.id]);
    expect(library.vectorSearch(axisVector(0), 2)).toEqual([iptu.id, iss.id]);
  });

  it("returns chunks in the order of the requested ids", () => {
    library.addSource(SOURCE, CHUNKS, [axisVector(0), axisVector(1)], MODEL);
    const [first, second] = library.allChunks();
    expect(library.getChunks([second.id, first.id]).map((chunk) => chunk.id)).toEqual([second.id, first.id]);
  });

  it("deleting a source removes its chunks from the keyword and vector indexes", () => {
    const source = library.addSource(SOURCE, CHUNKS, [axisVector(0), axisVector(1)], MODEL);

    expect(library.deleteSource(source.id)).toBe(true);
    expect(count(db, "library_chunks")).toBe(0);
    expect(count(db, "library_chunk_vectors")).toBe(0);
    expect(library.keywordSearch('"imposto"', 5)).toEqual([]);
    expect(library.deleteSource(source.id)).toBe(false);
  });

  it("rolls back when embeddings don't match the chunks", () => {
    expect(() => library.addSource(SOURCE, CHUNKS, [axisVector(0)], MODEL)).toThrow();
    expect(library.listSources()).toEqual([]);
  });
});
