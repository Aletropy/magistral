import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { DraftResult } from "@/lib/http/api";
import type { MinutaRequest } from "@/lib/minuta/schema";
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

  beforeEach(() => {
    minutas = createMinutaRepository(openDatabase(IN_MEMORY_DATABASE));
  });

  function save(title = "ACORDO DE CONFIDENCIALIDADE") {
    return minutas.create({ title, personaName: "Moderno", documentTypeLabel: "NDA", request: REQUEST, result: RESULT });
  }

  it("saves a generation and reads back the request and the full result", () => {
    const id = save();
    expect(minutas.get(id)).toMatchObject({ id, title: "ACORDO DE CONFIDENCIALIDADE", personaName: "Moderno", request: REQUEST, result: RESULT });
  });

  it("lists newest first without loading the text", () => {
    const first = save("Primeira");
    const second = save("Segunda");
    const list = minutas.list();
    expect(list.map((item) => item.id).sort()).toEqual([first, second].sort());
    expect(list[0]).not.toHaveProperty("result");
  });

  it("replaces the text after a review and deletes", () => {
    const id = save();
    expect(minutas.updateMarkdown(id, "# REVISADA")).toBe(true);
    expect(minutas.get(id)?.result.markdown).toBe("# REVISADA");
    expect(minutas.get(id)?.result.consultedSources).toEqual(RESULT.consultedSources);
    expect(minutas.updateMarkdown("missing", "x")).toBe(false);
    expect(minutas.delete(id)).toBe(true);
    expect(minutas.get(id)).toBeNull();
  });
});

describe("titleFromMarkdown", () => {
  it("uses the first heading, or the fallback", () => {
    expect(titleFromMarkdown("# CONTRATO DE **LOCAÇÃO**\n\nTexto.", "Contrato")).toBe("CONTRATO DE LOCAÇÃO");
    expect(titleFromMarkdown("Sem título.", "Contrato de Locação")).toBe("Contrato de Locação");
  });
});
