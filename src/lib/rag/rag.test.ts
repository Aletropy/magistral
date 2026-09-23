import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { reciprocalRankFusion, toFtsQuery } from "./hybridSearch";
import { ingestDocument } from "./ingest";
import { inferKindFromFileName, titleFromFileName } from "./prepareSource";
import { createLibraryRepository, type LibraryRepository } from "./repository";
import { selectLibraryContext } from "./selectContext";
import { syncLibraryFolder } from "./syncFolder";
import { LibraryIndexMismatchError } from "./errors";
import { reindexLibrary } from "./reindexLibrary";
import { IPTU_LAW, ISS_LAW, docxFromMarkdown, fakeEmbedder } from "./testHelpers";

describe("reciprocalRankFusion", () => {
  it("ranks ids found high in several lists above ids found in one", () => {
    expect(reciprocalRankFusion([[1, 2, 3], [3, 1, 4]])).toEqual([1, 3, 2, 4]);
  });
});

describe("toFtsQuery", () => {
  it("quotes distinct, accent-free terms and drops stopwords and short words", () => {
    expect(toFtsQuery("Contrato de locação: multa por atraso na locação")).toBe('"locacao" OR "multa" OR "atraso"');
  });

  it("neutralises FTS syntax and returns null when nothing is left", () => {
    expect(toFtsQuery('art* OR "x" NEAR(a)')).toBe('"art" OR "near"');
    expect(toFtsQuery("de a o")).toBeNull();
  });
});

describe("file name helpers", () => {
  it("derives a title and guesses the kind", () => {
    expect(titleFromFileName("lei_complementar-7-1973.pdf")).toBe("lei complementar 7 1973");
    expect(inferKindFromFileName("Decretos/Decreto-12.345.pdf")).toBe("decreto");
    expect(inferKindFromFileName("parecer_PGM_12.docx")).toBe("parecer");
    expect(inferKindFromFileName("lc-7-1973.pdf")).toBe("lei");
    expect(inferKindFromFileName("planilha.pdf")).toBe("outro");
  });
});

describe("library ingestion and retrieval", () => {
  let library: LibraryRepository;

  beforeEach(() => {
    library = createLibraryRepository(openDatabase(IN_MEMORY_DATABASE));
  });

  it("chunks and embeds an upload once, then reports the same content as a duplicate", async () => {
    const embed = fakeEmbedder();
    const bytes = await docxFromMarkdown(IPTU_LAW);

    const first = await ingestDocument(library, embed, { fileName: "lc-7.docx", bytes, kind: "lei", folderPath: null });
    const second = await ingestDocument(library, embed, { fileName: "copia.docx", bytes, kind: "lei", folderPath: null });

    expect(first).toMatchObject({ status: "added", source: { title: "lc 7", chunkCount: 3 } });
    expect(second).toMatchObject({ status: "duplicate", existing: { title: "lc 7" } });
    expect(embed.embed).toHaveBeenCalledTimes(1);
  });

  it("puts a small library in the prompt whole, one reference per source", async () => {
    const embed = fakeEmbedder();
    await ingestDocument(library, embed, { fileName: "iptu.docx", bytes: await docxFromMarkdown(IPTU_LAW), kind: "lei", folderPath: null });
    await ingestDocument(library, embed, { fileName: "iss.docx", bytes: await docxFromMarkdown(ISS_LAW), kind: "lei", folderPath: null });

    const context = await selectLibraryContext(library, embed, "hospedagem");

    expect(context.strategy).toBe("full");
    expect(context.sources.map((source) => [source.ref, source.title])).toEqual([
      ["F1", "iptu"],
      ["F2", "iss"],
    ]);
    expect(context.sources[1].text).toContain("TÍTULO I – DO IMPOSTO SOBRE SERVIÇOS\nArt. 1º");
  });

  it("switches to hybrid search above the size threshold and ranks the matching articles first", async () => {
    const embed = fakeEmbedder();
    await ingestDocument(library, embed, { fileName: "iptu.docx", bytes: await docxFromMarkdown(IPTU_LAW), kind: "lei", folderPath: null });
    await ingestDocument(library, embed, { fileName: "iss.docx", bytes: await docxFromMarkdown(ISS_LAW), kind: "lei", folderPath: null });

    const context = await selectLibraryContext(library, embed, "ISS sobre hospedagem", 1);

    expect(context.strategy).toBe("search");
    expect(context.sources.slice(0, 2).every((source) => source.title === "iss" && source.label.startsWith("Art."))).toBe(true);
    expect(embed.embed).toHaveBeenLastCalledWith(["ISS sobre hospedagem"], "query");
  });

  it("returns no sources for an empty library", async () => {
    expect(await selectLibraryContext(library, fakeEmbedder(), "qualquer")).toEqual({ strategy: "search", sources: [] });
  });
});

describe("syncLibraryFolder", () => {
  let root: string;
  let library: LibraryRepository;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "magistral-biblioteca-"));
    library = createLibraryRepository(openDatabase(IN_MEMORY_DATABASE));
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it("adds new files, skips unchanged ones, re-indexes changed ones and removes deleted ones", async () => {
    const embed = fakeEmbedder();
    await writeFile(path.join(root, "lei-iptu.docx"), await docxFromMarkdown(IPTU_LAW));
    await writeFile(path.join(root, "notas.txt"), "ignorado");
    await writeFile(path.join(root, "vazio.docx"), await docxFromMarkdown("# OI"));

    const first = await syncLibraryFolder(library, embed, root);
    expect(first).toMatchObject({ added: ["lei-iptu.docx"], failed: [{ path: "vazio.docx" }] });
    expect(library.listSources()[0]).toMatchObject({ kind: "lei", folderPath: "lei-iptu.docx" });

    expect(await syncLibraryFolder(library, embed, root)).toMatchObject({ added: [], unchanged: 1 });

    await writeFile(path.join(root, "lei-iptu.docx"), await docxFromMarkdown(ISS_LAW));
    const third = await syncLibraryFolder(library, embed, root);
    expect(third.updated).toEqual(["lei-iptu.docx"]);
    expect(library.listSources()).toHaveLength(1);
    expect(library.allChunks().some((chunk) => chunk.text.includes("hospedagem"))).toBe(true);

    await unlink(path.join(root, "lei-iptu.docx"));
    expect((await syncLibraryFolder(library, embed, root)).removed).toEqual(["lei-iptu.docx"]);
    expect(library.listSources()).toEqual([]);
  });

  it("leaves uploaded sources alone and reports folder copies of them as duplicates", async () => {
    const bytes = await docxFromMarkdown(IPTU_LAW);
    await ingestDocument(library, fakeEmbedder(), { fileName: "upload.docx", bytes, kind: "lei", folderPath: null });
    await writeFile(path.join(root, "copia.docx"), bytes);

    const report = await syncLibraryFolder(library, fakeEmbedder(), root);

    expect(report.duplicates).toEqual(["copia.docx"]);
    expect(library.listSources().map((source) => source.fileName)).toEqual(["upload.docx"]);
  });
});

describe("embedding model changes", () => {
  let library: LibraryRepository;

  beforeEach(async () => {
    library = createLibraryRepository(openDatabase(IN_MEMORY_DATABASE));
    const bytes = await docxFromMarkdown(ISS_LAW);
    await ingestDocument(library, fakeEmbedder("modelo-antigo"), { fileName: "iss.docx", bytes, kind: "lei", folderPath: null });
  });

  it("records which model built the index", () => {
    expect(library.indexInfo()).toMatchObject({ model: "modelo-antigo", dimensions: 768 });
  });

  it("refuses to mix vectors from another model, and to search with it", async () => {
    const other = fakeEmbedder("modelo-novo", 384);
    const bytes = await docxFromMarkdown(IPTU_LAW);

    await expect(
      ingestDocument(library, other, { fileName: "iptu.docx", bytes, kind: "lei", folderPath: null }),
    ).rejects.toBeInstanceOf(LibraryIndexMismatchError);
    expect(other.embed).not.toHaveBeenCalled();
    await expect(selectLibraryContext(library, other, "hospedagem", 1)).rejects.toBeInstanceOf(LibraryIndexMismatchError);
  });

  it("reindexes every chunk with the new model, resizing the vector table, and then searches with it", async () => {
    const other = fakeEmbedder("modelo-novo", 384);

    expect(await reindexLibrary(library, other)).toBe(library.allChunks().length);
    expect(library.indexInfo()).toMatchObject({ model: "modelo-novo", dimensions: 384 });

    const context = await selectLibraryContext(library, other, "hospedagem", 1);
    expect(context.sources[0].text).toContain("hospedagem");
  });

  it("adopts the new model once the library is empty again", async () => {
    library.deleteSource(library.listSources()[0].id);
    const other = fakeEmbedder("modelo-novo", 384);
    const bytes = await docxFromMarkdown(IPTU_LAW);

    await ingestDocument(library, other, { fileName: "iptu.docx", bytes, kind: "lei", folderPath: null });
    expect(library.indexInfo()).toMatchObject({ model: "modelo-novo", dimensions: 384 });
  });
});
