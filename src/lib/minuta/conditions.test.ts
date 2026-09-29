import { describe, expect, it } from "vitest";
import { applyPresetRoles, buildClausesFromConditions, conditionsFromClauses } from "./conditions";

describe("buildClausesFromConditions", () => {
  it("writes one line per answered question, in the preset's order, then the free text", () => {
    const clauses = buildClausesFromConditions("locacao", {
      answers: { prazo: "30 meses", aluguel: " R$ 2.500,00 até o dia 5 ", garantia: "  " },
      extra: "Proibido animais.",
    });
    expect(clauses).toBe("- Aluguel e vencimento: R$ 2.500,00 até o dia 5\n- Prazo da locação: 30 meses\nProibido animais.");
  });

  it("ignores answers to another type's questions and returns nothing when empty", () => {
    expect(buildClausesFromConditions("nda", { answers: { aluguel: "R$ 1" }, extra: "" })).toBe("");
    expect(conditionsFromClauses("- Foro: Canoas")).toEqual({ answers: {}, extra: "- Foro: Canoas" });
  });
});

describe("applyPresetRoles", () => {
  it("replaces default roles with the new type's, keeping roles the user typed", () => {
    const parties = [
      { name: "Ana", role: "Locador", qualification: "" },
      { name: "Beta", role: "Fiadora", qualification: "" },
      { name: "", role: "", qualification: "" },
    ];
    expect(applyPresetRoles(parties, "locacao", "prestacao-servicos").map((party) => party.role)).toEqual([
      "Contratante",
      "Fiadora",
      "",
    ]);
  });
});
