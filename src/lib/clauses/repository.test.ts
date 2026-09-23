import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "@/lib/db/openDatabase";
import { createClauseRepository, type ClauseRepository } from "./repository";
import { approvedClauseIdsSchema, clauseInputSchema, type ClauseInput } from "./schema";
import { clauseAppliesTo } from "./types";

const FORO: ClauseInput = {
  title: "Foro",
  category: "Disposições finais",
  documentTypes: [],
  body: "Fica eleito o foro da Comarca de Porto Alegre.",
};
const MULTA: ClauseInput = {
  title: "Multa por atraso",
  category: "Penalidades",
  documentTypes: ["locacao", "prestacao-servicos"],
  body: "Multa de 2% sobre o valor em atraso.",
};

describe("createClauseRepository", () => {
  let clauses: ClauseRepository;

  beforeEach(() => {
    clauses = createClauseRepository(openDatabase(IN_MEMORY_DATABASE));
  });

  it("creates, lists by category and reads back clauses", () => {
    const foro = clauses.create(FORO);
    const multa = clauses.create(MULTA);

    expect(clauses.list().map((clause) => clause.title)).toEqual(["Foro", "Multa por atraso"]);
    expect(clauses.get(multa.id)).toMatchObject(MULTA);
    expect(clauses.getMany([multa.id, "missing", foro.id]).map((clause) => clause.id)).toEqual([multa.id, foro.id]);
  });

  it("updates and deletes", () => {
    const foro = clauses.create(FORO);

    expect(clauses.update(foro.id, { ...FORO, body: "Foro de Canoas." })?.body).toBe("Foro de Canoas.");
    expect(clauses.update("missing", FORO)).toBeNull();
    expect(clauses.delete(foro.id)).toBe(true);
    expect(clauses.delete(foro.id)).toBe(false);
  });
});

describe("clause rules", () => {
  it("offers a clause for its document types, all types when none are set, and always for 'outro'", () => {
    expect(clauseAppliesTo(MULTA, "locacao")).toBe(true);
    expect(clauseAppliesTo(MULTA, "nda")).toBe(false);
    expect(clauseAppliesTo(MULTA, "outro")).toBe(true);
    expect(clauseAppliesTo(FORO, "nda")).toBe(true);
  });

  it("validates clause input and approved clause ids", () => {
    expect(clauseInputSchema.safeParse({ ...FORO, body: "  " }).success).toBe(false);
    expect(clauseInputSchema.safeParse({ ...FORO, documentTypes: ["inexistente"] }).success).toBe(false);
    expect(approvedClauseIdsSchema.safeParse(["a", "a"]).success).toBe(false);
  });
});
