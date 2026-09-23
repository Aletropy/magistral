import { describe, expect, it } from "vitest";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";
import {
  MAX_BASE_DOCUMENT_CHARS,
  MAX_CLAUSES_CHARS,
  documentTypeStepSchema,
  minutaRequestSchema,
  type MinutaFormValues,
} from "./schema";

const VALID_REQUEST: MinutaFormValues = {
  documentType: "nda",
  customDocumentType: "",
  parties: [
    { name: "Acme Ltda.", role: "Contratante", qualification: "CNPJ 00.000.000/0001-00" },
    { name: "Maria Silva", role: "Contratada", qualification: "" },
  ],
  clauses: "Multa de 10% por quebra de sigilo.",
  persona: "moderno",
  useLibrary: false,
  approvedClauseIds: [],
};

function fieldErrorsFor(input: unknown): Record<string, string> {
  const result = minutaRequestSchema.safeParse(input);
  if (result.success) throw new Error("expected validation to fail");
  return collectFieldErrors(result.error);
}

describe("minutaRequestSchema", () => {
  it("accepts a valid request and trims text", () => {
    const result = minutaRequestSchema.parse({
      ...VALID_REQUEST,
      parties: [{ ...VALID_REQUEST.parties[0], name: "  Acme Ltda.  " }, VALID_REQUEST.parties[1]],
    });
    expect(result.parties[0].name).toBe("Acme Ltda.");
  });

  it("requires at least two parties", () => {
    const errors = fieldErrorsFor({ ...VALID_REQUEST, parties: [VALID_REQUEST.parties[0]] });
    expect(errors).toHaveProperty("parties");
  });

  it("requires each party to have a name", () => {
    const errors = fieldErrorsFor({
      ...VALID_REQUEST,
      parties: [VALID_REQUEST.parties[0], { ...VALID_REQUEST.parties[1], name: "   " }],
    });
    expect(errors).toHaveProperty(["parties.1.name"]);
  });

  it("requires a persona", () => {
    const errors = fieldErrorsFor({ ...VALID_REQUEST, persona: "  " });
    expect(errors).toHaveProperty("persona");
  });

  it("rejects clauses over the length limit", () => {
    const errors = fieldErrorsFor({ ...VALID_REQUEST, clauses: "a".repeat(MAX_CLAUSES_CHARS + 1) });
    expect(errors).toHaveProperty("clauses");
  });

  it("requires a description when the document type is 'outro'", () => {
    const errors = fieldErrorsFor({ ...VALID_REQUEST, documentType: "outro" });
    expect(errors).toHaveProperty("customDocumentType");
    expect(
      minutaRequestSchema.safeParse({
        ...VALID_REQUEST,
        documentType: "outro",
        customDocumentType: "Termo de Cessão de Direitos",
      }).success,
    ).toBe(true);
  });

  it("defaults the base document to null, so requests saved before it existed still parse", () => {
    expect(minutaRequestSchema.parse(VALID_REQUEST).baseDocument).toBeNull();
  });

  it("accepts a base document within the limit and rejects a longer one", () => {
    const baseDocument = { name: "modelo.docx", text: "  CLÁUSULA PRIMEIRA — DO OBJETO  " };
    expect(minutaRequestSchema.parse({ ...VALID_REQUEST, baseDocument }).baseDocument).toEqual({
      name: "modelo.docx",
      text: "CLÁUSULA PRIMEIRA — DO OBJETO",
    });
    const tooLong = { name: "x.docx", text: "a".repeat(MAX_BASE_DOCUMENT_CHARS + 1) };
    expect(fieldErrorsFor({ ...VALID_REQUEST, baseDocument: tooLong })).toHaveProperty(["baseDocument.text"]);
  });

  it("checks the custom document type in the wizard step even while other fields are still empty", () => {
    const result = documentTypeStepSchema.safeParse({ documentType: "outro", customDocumentType: "  " });
    expect(result.success).toBe(false);
    expect(collectFieldErrors(result.error!)).toHaveProperty("customDocumentType");
  });
});
