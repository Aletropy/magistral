import { beforeEach, describe, expect, it } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { createBatchRepository } from "@/lib/batch/repository";
import { createClauseRepository } from "@/lib/clauses/repository";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { createMinutaRepository } from "@/lib/minutas/repository";
import { createPersonaRepository } from "@/lib/personas/repository";
import { describePageContext, type PageContextSources } from "./describePageContext";
import { pageContextSchema, pageTitleContext, type PageContextInput } from "./pageContext";

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

let owner: string;
let other: string;
let sources: PageContextSources;

beforeEach(() => {
  const db = openDatabase(IN_MEMORY_DATABASE);
  owner = insertTestUser(db, "ana");
  other = insertTestUser(db, "bruno");
  sources = {
    minutas: createMinutaRepository(db),
    personas: createPersonaRepository(db),
    clauses: createClauseRepository(db),
    batches: createBatchRepository(db),
  };
});

const describe_ = (context: PageContextInput, ownerId = owner) =>
  describePageContext(pageContextSchema.parse(context), ownerId, sources);

describe("describePageContext", () => {
  it("names the open minuta with its id, only for its owner", () => {
    const id = sources.minutas.create({
      ownerId: owner,
      title: "ACORDO DE SIGILO",
      personaName: "Moderno",
      documentTypeLabel: "NDA",
      request: REQUEST,
      result: {
        markdown: "# ACORDO",
        forbiddenTermsFound: [],
        consultedSources: [],
        retrievalStrategy: null,
        referenceCheck: null,
        approvedClauseOrderKept: true,
        approvedClauses: [],
      },
    });
    expect(describe_({ kind: "minuta", id })).toContain(`“ACORDO DE SIGILO” aberta (id ${id}`);
    expect(describe_({ kind: "minuta", id }, other)).toBeNull();
    expect(describe_({ kind: "minuta", id: "inexistente" })).toBeNull();
  });

  it("describes shared items, batches of the owner, the wizard and other pages", () => {
    expect(describe_({ kind: "persona", id: "moderno" })).toContain("persona “Moderno / Startup”");
    const clause = sources.clauses.create({ title: "Foro", category: "", documentTypes: [], body: "Foro de Canoas." });
    expect(describe_({ kind: "clausula", id: clause.id })).toContain("“Foro”");
    const jobId = sources.batches.createJob(owner, "Cobranças", REQUEST, [{ label: "Linha 1", row: {} }]);
    expect(describe_({ kind: "lote", id: jobId })).toBe(
      `O usuário está vendo o lote “Cobranças” (id ${jobId}): 1 minuta; 0 prontas, 0 falhas.`,
    );
    expect(describe_({ kind: "lote", id: jobId }, other)).toBeNull();
    expect(describe_({ kind: "nova_minuta", detail: "Etapa atual: Partes." })).toBe(
      "O usuário está no passo a passo de nova minuta. Etapa atual: Partes.",
    );
    expect(describe_(pageTitleContext("Histórico · Magistral"))).toBe("O usuário está na página “Histórico” do Magistral.");
  });
});
