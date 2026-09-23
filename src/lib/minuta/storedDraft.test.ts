import { describe, expect, it } from "vitest";
import type { MinutaFormValues } from "./schema";
import { parseStoredDraft, serializeDraft } from "./storedDraft";

const VALUES: MinutaFormValues = {
  documentType: "nda",
  customDocumentType: "",
  parties: [{ name: "", role: "Contratante", qualification: "" }],
  clauses: "Multa de 10%.",
  persona: "moderno",
  useLibrary: false,
  approvedClauseIds: [],
};

describe("stored minuta drafts", () => {
  it("round-trips a half-filled form, filling the missing base document", () => {
    const draft = parseStoredDraft(serializeDraft(VALUES, new Date("2026-09-23T12:00:00Z")));
    expect(draft).toEqual({ savedAt: "2026-09-23T12:00:00.000Z", values: { ...VALUES, baseDocument: null } });
  });

  it("ignores missing, corrupt or outdated drafts", () => {
    expect(parseStoredDraft(null)).toBeNull();
    expect(parseStoredDraft("{not json")).toBeNull();
    expect(parseStoredDraft(JSON.stringify({ savedAt: "x", values: { documentType: "carta" } }))).toBeNull();
  });
});
