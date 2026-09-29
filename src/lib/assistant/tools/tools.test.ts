import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertTestUser } from "@/lib/auth/testHelpers";
import { createClauseRepository, type ClauseRepository } from "@/lib/clauses/repository";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { draftSuggestionResultSchema } from "@/lib/minuta/draftSuggestion";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { createMinutaRepository, type MinutaRepository } from "@/lib/minutas/repository";
import { createPersonaRepository, type PersonaRepository } from "@/lib/personas/repository";
import { createTaskRepository, type TaskRepository } from "@/lib/tasks/repository";
import { createCitationRegistry } from "../citations";
import type { AssistantTool, ToolContext } from "../tool";
import { createAdjustPersonaTool } from "./adjustPersona";
import { createCreateClauseTool } from "./createClause";
import { applyEdits, createEditMinutaTool } from "./editMinuta";
import { createGenerateMinutaTool } from "./generateMinuta";
import { createListClausesTool } from "./listClauses";
import { openPageTool } from "./openPage";
import { createPrepareMinutaTool } from "./prepareMinuta";
import { createReadMinutaTool } from "./readMinuta";
import { createSearchHistoryTool } from "./searchHistory";

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

const MARKDOWN = "# ACORDO\n\n## Multa\n\nA multa é de 20% do valor.\n\n## Foro\n\nFica eleito o foro de Canoas.";

let owner: string;
let other: string;
let minutas: MinutaRepository;
let personas: PersonaRepository;
let clauses: ClauseRepository;
let tasks: TaskRepository;

beforeEach(() => {
  const db = openDatabase(IN_MEMORY_DATABASE);
  owner = insertTestUser(db, "ana");
  other = insertTestUser(db, "bruno");
  minutas = createMinutaRepository(db);
  personas = createPersonaRepository(db);
  clauses = createClauseRepository(db);
  tasks = createTaskRepository(db);
});

function context(ownerId = owner): ToolContext {
  return { ownerId, conversationId: "c1", signal: new AbortController().signal, citations: createCitationRegistry() };
}

function saveMinuta(ownerId = owner): string {
  return minutas.create({
    ownerId,
    title: "ACORDO",
    personaName: "Moderno",
    documentTypeLabel: "NDA",
    request: REQUEST,
    result: {
      markdown: MARKDOWN,
      forbiddenTermsFound: [],
      consultedSources: [],
      retrievalStrategy: null,
      approvedClauseOrderKept: true,
      approvedClauses: [],
    },
  });
}

function read(tool: AssistantTool, input: unknown, ctx = context()) {
  if (tool.kind !== "read") throw new Error("not a read tool");
  return tool.run(tool.input.parse(input), ctx);
}

function action(tool: AssistantTool) {
  if (tool.kind !== "action") throw new Error("not an action tool");
  return {
    propose: (input: unknown, ctx = context()) => tool.propose(tool.input.parse(input), ctx),
    execute: (input: unknown, state: unknown, ctx = context()) => tool.execute(tool.input.parse(input), state, ctx),
  };
}

const catalog = () => ({
  clauseIds: new Set(clauses.list().map((clause) => clause.id)),
  personaIds: new Set(personas.list().map((persona) => persona.id)),
});

const MINUTA_INPUT = {
  tipoDocumento: "locacao",
  partes: [
    { nome: "João", papel: "Locador" },
    { nome: "Maria", papel: "Locatária" },
  ],
  condicoes: ["Aluguel de R$ 2.000", "Prazo de 30 meses"],
  personaId: "moderno",
  usarBiblioteca: false,
  pontosARevisar: ["Confirmar o índice de reajuste"],
};

describe("reading tools", () => {
  it("never show another user's minutas", async () => {
    const mine = saveMinuta();
    const theirs = saveMinuta(other);
    const readMinuta = createReadMinutaTool({ minutas });

    await expect(read(readMinuta, { id: mine })).resolves.toMatchObject({ summary: "Li a minuta “ACORDO”", card: { type: "link" } });
    await expect(read(readMinuta, { id: theirs })).rejects.toMatchObject({ status: 404 });
    const history = await read(createSearchHistoryTool({ minutas }), {});
    expect(history.output).toContain(mine);
    expect(history.output).not.toContain(theirs);
  });

  it("lists only the clauses offered for a document type", async () => {
    clauses.create({ title: "Garantia locatícia", category: "Garantia", documentTypes: ["locacao"], body: "Fiança." });
    clauses.create({ title: "Sigilo", category: "", documentTypes: ["nda"], body: "Sigilo." });
    const { output } = await read(createListClausesTool({ clauses }), { tipoDocumento: "locacao" });
    expect(output).toContain("Garantia locatícia");
    expect(output).not.toContain("Sigilo");
  });

  it("links to a page, asking for the id of item pages", async () => {
    await expect(read(openPageTool, { pagina: "historico" })).resolves.toMatchObject({ card: { type: "link", href: "/historico" } });
    await expect(read(openPageTool, { pagina: "minuta" })).rejects.toMatchObject({ status: 422 });
  });

  it("prepares the wizard as a finished suggestion the owner can open", async () => {
    const outcome = await read(createPrepareMinutaTool({ tasks, catalog }), MINUTA_INPUT);

    expect(outcome.card).toMatchObject({ type: "link", href: expect.stringMatching(/^\/minutas\/nova\?rascunho=/) });
    const taskId = decodeURIComponent((outcome.card as { href: string }).href.split("=")[1]);
    const task = tasks.get(taskId, owner);
    expect(task).toMatchObject({ kind: "minuta.extract", status: "succeeded" });
    const result = draftSuggestionResultSchema.parse(task!.result);
    expect(result.draft).toMatchObject({ documentType: "locacao", persona: "moderno", clauses: "- Aluguel de R$ 2.000\n- Prazo de 30 meses" });
    expect(result.reviewNotes).toEqual(["Confirmar o índice de reajuste"]);
    expect(tasks.get(taskId, other)).toBeNull();
  });
});

describe("action tools", () => {
  it("generate a minuta only on execute, with the checked request", async () => {
    const enqueueDraft = vi.fn(async () => "task-9");
    const tool = action(
      createGenerateMinutaTool({ catalog, checkRequest: () => ({ personaName: "Moderno", clauseTitles: [] }), enqueueDraft }),
    );

    const proposal = await tool.propose(MINUTA_INPUT);
    expect(proposal).toMatchObject({ summary: "Gerar Contrato de Locação", card: { type: "fields" } });
    expect(enqueueDraft).not.toHaveBeenCalled();
    await expect(tool.propose({ ...MINUTA_INPUT, personaId: "" })).rejects.toMatchObject({ status: 422 });

    const outcome = await tool.execute(MINUTA_INPUT, null);
    expect(enqueueDraft).toHaveBeenCalledWith(owner, expect.objectContaining({ documentType: "locacao", persona: "moderno" }));
    expect(outcome.card).toEqual({ type: "link", href: "/minutas/nova?tarefa=task-9", label: "Acompanhar a geração" });
  });

  it("edit a minuta with exact excerpts, refusing when it changed after the proposal", async () => {
    const id = saveMinuta();
    const tool = action(createEditMinutaTool({ minutas }));
    const input = { id, resumo: "Reduz a multa", alteracoes: [{ trecho: "20%", novoTexto: "10%" }] };

    const proposal = await tool.propose(input);
    expect(proposal.card).toMatchObject({ type: "redline", original: MARKDOWN, revised: MARKDOWN.replace("20%", "10%") });
    expect(minutas.get(id, owner)!.result.markdown).toBe(MARKDOWN);

    await tool.execute(input, proposal.state);
    expect(minutas.get(id, owner)!.result.markdown).toContain("10% do valor");
    await expect(tool.execute(input, proposal.state)).rejects.toMatchObject({ status: 409 });
    await expect(tool.propose(input, context(other))).rejects.toMatchObject({ status: 404 });
  });

  it("apply only excerpts found exactly once", () => {
    expect(() => applyEdits("a b a", [{ trecho: "a", novoTexto: "c" }])).toThrow(/mais de uma vez/);
    expect(() => applyEdits("a b", [{ trecho: "z", novoTexto: "c" }])).toThrow(/não foi encontrado/);
    expect(applyEdits("preço $1", [{ trecho: "$1", novoTexto: "$$2" }])).toBe("preço $$2");
  });

  it("create a clause after checking it like the clause form", async () => {
    const tool = action(createCreateClauseTool({ clauses }));
    const input = { titulo: "Multa moratória", tiposDocumento: ["locacao"], texto: "Multa de 2% ao mês." };

    await expect(tool.propose({ ...input, texto: " " })).rejects.toMatchObject({ status: 422 });
    await expect(tool.propose(input)).resolves.toMatchObject({ summary: "Criar a cláusula “Multa moratória”" });
    expect(clauses.list()).toHaveLength(0);
    const outcome = await tool.execute(input, null);
    expect(clauses.list()[0]).toMatchObject({ title: "Multa moratória", documentTypes: ["locacao"] });
    expect(outcome.card).toMatchObject({ type: "link" });
  });

  it("adjust a persona, showing only what changes", async () => {
    const tool = action(createAdjustPersonaTool({ personas }));
    const before = personas.get("moderno")!;

    await expect(tool.propose({ personaId: "moderno", formalidade: before.styleSliders.formality })).rejects.toMatchObject({ status: 422 });
    const proposal = await tool.propose({ personaId: "moderno", formalidade: 5, termosProibidos: ["outrossim"] });
    expect(proposal.card).toMatchObject({
      type: "fields",
      rows: [
        { label: "Termos proibidos", value: expect.stringContaining("outrossim") },
        { label: "Formalidade", value: `${before.styleSliders.formality} → 5` },
      ],
    });

    await tool.execute({ personaId: "moderno", formalidade: 5, termosProibidos: ["outrossim"] }, proposal.state);
    expect(personas.get("moderno")).toMatchObject({ negativeConstraints: ["outrossim"], styleSliders: { formality: 5 } });
    await expect(tool.execute({ personaId: "moderno", extensao: 1 }, proposal.state)).rejects.toMatchObject({ status: 409 });
  });
});
