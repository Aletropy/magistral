import { describe, expect, it } from "vitest";
import type { MinutaFormValues } from "./schema";
import { WIZARD_STEPS, firstInvalidStep, stepIndex, validateStep } from "./wizardSteps";

const BLANK: MinutaFormValues = {
  documentType: "outro",
  customDocumentType: "",
  parties: [
    { name: "", role: "Contratante", qualification: "" },
    { name: "", role: "Contratada", qualification: "" },
  ],
  clauses: "",
  persona: "moderno",
  useLibrary: false,
  approvedClauseIds: [],
  baseDocument: null,
};

const step = (id: (typeof WIZARD_STEPS)[number]["id"]) => WIZARD_STEPS[stepIndex(id)];

describe("wizard steps", () => {
  it("validates only the fields of each step", () => {
    expect(validateStep(step("inicio"), BLANK)).toEqual({});
    expect(validateStep(step("tipo"), BLANK)).toHaveProperty("customDocumentType");
    expect(Object.keys(validateStep(step("partes"), BLANK))).toEqual(["parties.0.name", "parties.1.name"]);
    expect(validateStep(step("persona"), BLANK)).toEqual({});
  });

  it("points the review at the first step that still has an error", () => {
    expect(firstInvalidStep(BLANK)?.id).toBe("tipo");
    const typed = { ...BLANK, customDocumentType: "Termo de Cessão" };
    expect(firstInvalidStep(typed)?.id).toBe("partes");
    const complete = {
      ...typed,
      parties: [
        { name: "Ana", role: "Cedente", qualification: "" },
        { name: "Beta Ltda.", role: "Cessionária", qualification: "" },
      ],
    };
    expect(firstInvalidStep(complete)).toBeNull();
    expect(validateStep(step("revisao"), complete)).toEqual({});
  });

  it("has a guide for every step", () => {
    expect(WIZARD_STEPS.every((wizardStep) => wizardStep.guide.length > 0)).toBe(true);
  });
});
