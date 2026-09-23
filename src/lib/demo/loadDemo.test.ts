import { beforeEach, describe, expect, it } from "vitest";
import { createClauseRepository } from "@/lib/clauses/repository";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createLibraryRepository } from "@/lib/rag/repository";
import { fakeEmbedder } from "@/lib/rag/testHelpers";
import { DEMO_CLAUSES } from "./demoClauses";
import { DEMO_LIBRARY } from "./demoLibrary";
import { loadDemoClauses, loadDemoLibrary } from "./loadDemo";

describe("demo data", () => {
  let db: ReturnType<typeof openDatabase>;

  beforeEach(() => {
    db = openDatabase(IN_MEMORY_DATABASE);
  });

  it("loads the example clauses once, skipping titles that already exist", () => {
    const clauses = createClauseRepository(db);
    clauses.create({ ...DEMO_CLAUSES[0], body: "Minha versão do foro." });

    expect(loadDemoClauses(clauses)).toBe(DEMO_CLAUSES.length - 1);
    expect(loadDemoClauses(clauses)).toBe(0);
    expect(clauses.list().find((clause) => clause.title === "Foro")?.body).toBe("Minha versão do foro.");
  });

  it("indexes the example norms by article once", async () => {
    const library = createLibraryRepository(db);
    const embedding = fakeEmbedder();

    expect(await loadDemoLibrary(library, embedding)).toBe(DEMO_LIBRARY.length);
    expect(await loadDemoLibrary(library, embedding)).toBe(0);
    expect(library.allChunks().some((chunk) => chunk.label === "Art. 2º" && chunk.text.includes("cessionário"))).toBe(true);
  });
});
