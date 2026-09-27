import { beforeEach, describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { MinutaRequest } from "@/lib/minuta/schema";
import type { DraftResult } from "@/lib/minuta/types";
import { createMinutaRepository, type MinutaRepository } from "./repository";
import { titleFromMarkdown } from "./titleFromMarkdown";

const REQUEST: MinutaRequest = {
  documentType: "nda",
  customDocumentType: "",
  parties: [
    { name: "Acme", role: "Reveladora", qualification: "" },
    { name: "Beta", role: "Receptora", qualification: "" },
  ],
  clauses: "",
  persona: "moderno",
  useLibrary: false,
  approvedClauseIds: [],
  baseDocument: null,
};

const RESULT: DraftResult = {
  markdown: "# ACORDO DE CONFIDENCIALIDADE\n\n## 1. Objeto\n\nTexto.",
  forbiddenTermsFound: ["outrossim"],
  consultedSources: [{ ref: "F1", title: "Lei 7", label: "Art. 5º" }],
  retrievalStrategy: "full",
  approvedClauseOrderKept: true,
  approvedClauses: [{ title: "Foro", body: "Foro de Canoas." }],
};

describe("createMinutaRepository", () => {
  let minutas: MinutaRepository;
  let owner: string;
  let other: string;

  beforeEach(() => {
    const db = openDatabase(IN_MEMORY_DATABASE);
    owner = insertTestUser(db, "ana");
    other = insertTestUser(db, "bruno");
    minutas = createMinutaRepository(db);
  });

  function save(title = "ACORDO DE CONFIDENCIALIDADE") {
    return minutas.create({ ownerId: owner, title, personaName: "Moderno", documentTypeLabel: "NDA", request: REQUEST, result: RESULT });
  }

  it("saves a generation and reads back the request and the full result", () => {
    const id = save();
    expect(minutas.get(id, owner)).toMatchObject({ id, title: "ACORDO DE CONFIDENCIALIDADE", personaName: "Moderno", request: REQUEST, result: RESULT });
  });

  it("lists newest first without loading the text", () => {
    const first = save("Primeira");
    const second = save("Segunda");
    const list = minutas.list(owner);
    expect(list.map((item) => item.id).sort()).toEqual([first, second].sort());
    expect(list[0]).not.toHaveProperty("result");
  });

  it("replaces the text after a review and deletes", () => {
    const id = save();
    expect(minutas.updateMarkdown(id, owner, "# REVISADA")).toBe(true);
    expect(minutas.get(id, owner)?.result.markdown).toBe("# REVISADA");
    expect(minutas.get(id, owner)?.result.consultedSources).toEqual(RESULT.consultedSources);
    expect(minutas.updateMarkdown("missing", owner, "x")).toBe(false);
    expect(minutas.delete(id, owner)).toBe(true);
    expect(minutas.get(id, owner)).toBeNull();
  });

  it("searches the owner's minutas by text and persona, a page at a time", () => {
    const first = save("Contrato de Locação");
    save("Acordo de Confidencialidade");
    minutas.create({ ownerId: owner, title: "Multa de 50% ao mês", personaName: "Agressivo", documentTypeLabel: "Outro", request: REQUEST, result: RESULT });

    expect(minutas.search(owner, { query: "LOCAÇÃO", personaName: "", limit: 10, offset: 0 })).toMatchObject({
      total: 1,
      items: [{ id: first }],
    });
    expect(minutas.search(owner, { query: "50%", personaName: "", limit: 10, offset: 0 }).total).toBe(1);
    expect(minutas.search(owner, { query: "", personaName: "Agressivo", limit: 10, offset: 0 }).total).toBe(1);
    const page = minutas.search(owner, { query: "", personaName: "", limit: 2, offset: 2 });
    expect(page).toMatchObject({ total: 3 });
    expect(page.items).toHaveLength(1);
    expect(minutas.search(other, { query: "", personaName: "", limit: 10, offset: 0 }).total).toBe(0);
    expect(minutas.personaNames(owner)).toEqual(["Agressivo", "Moderno"]);
  });

  it("keeps each user's minutas private", () => {
    const id = save();
    expect(minutas.list(other)).toEqual([]);
    expect(minutas.get(id, other)).toBeNull();
    expect(minutas.updateMarkdown(id, other, "# ALTERADA")).toBe(false);
    expect(minutas.delete(id, other)).toBe(false);
    expect(minutas.get(id, owner)?.result.markdown).toBe(RESULT.markdown);
  });
});

describe("titleFromMarkdown", () => {
  it("uses the first heading, or the fallback", () => {
    expect(titleFromMarkdown("# CONTRATO DE **LOCAÇÃO**\n\nTexto.", "Contrato")).toBe("CONTRATO DE LOCAÇÃO");
    expect(titleFromMarkdown("Sem título.", "Contrato de Locação")).toBe("Contrato de Locação");
  });
});
