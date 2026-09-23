import { z } from "zod";
import { PERSONA_IDS } from "@/lib/personas/catalog";
import { DOCUMENT_TYPE_IDS, OTHER_DOCUMENT_TYPE_ID } from "./documentTypes";

export const MIN_PARTIES = 2;
export const MAX_PARTIES = 6;
export const MAX_PARTY_NAME_CHARS = 200;
export const MAX_PARTY_ROLE_CHARS = 80;
export const MAX_PARTY_QUALIFICATION_CHARS = 600;
export const MAX_CUSTOM_DOCUMENT_TYPE_CHARS = 120;
export const MAX_CLAUSES_CHARS = 6000;

const partySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome da parte." })
    .max(MAX_PARTY_NAME_CHARS, { error: `Use no máximo ${MAX_PARTY_NAME_CHARS} caracteres.` }),
  role: z
    .string()
    .trim()
    .min(1, { error: "Informe o papel da parte (ex.: Contratante)." })
    .max(MAX_PARTY_ROLE_CHARS, { error: `Use no máximo ${MAX_PARTY_ROLE_CHARS} caracteres.` }),
  qualification: z
    .string()
    .trim()
    .max(MAX_PARTY_QUALIFICATION_CHARS, {
      error: `Use no máximo ${MAX_PARTY_QUALIFICATION_CHARS} caracteres.`,
    }),
});

export const minutaRequestSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPE_IDS, { error: "Selecione um tipo de documento válido." }),
    customDocumentType: z.string().trim().max(MAX_CUSTOM_DOCUMENT_TYPE_CHARS, {
      error: `Use no máximo ${MAX_CUSTOM_DOCUMENT_TYPE_CHARS} caracteres.`,
    }),
    parties: z
      .array(partySchema)
      .min(MIN_PARTIES, { error: `Informe pelo menos ${MIN_PARTIES} partes.` })
      .max(MAX_PARTIES, { error: `Informe no máximo ${MAX_PARTIES} partes.` }),
    clauses: z.string().trim().max(MAX_CLAUSES_CHARS, {
      error: `Use no máximo ${MAX_CLAUSES_CHARS} caracteres.`,
    }),
    persona: z.enum(PERSONA_IDS, { error: "Selecione uma personalidade válida." }),
  })
  .refine(
    (request) =>
      request.documentType !== OTHER_DOCUMENT_TYPE_ID || request.customDocumentType.length > 0,
    { error: "Descreva o tipo de documento.", path: ["customDocumentType"] },
  );

export type MinutaRequest = z.infer<typeof minutaRequestSchema>;
export type MinutaFormValues = z.input<typeof minutaRequestSchema>;
export type Party = MinutaRequest["parties"][number];

/** Maps each invalid field path (e.g. "parties.0.name") to its first error message. */
export function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fieldErrors[path] ??= issue.message;
  }
  return fieldErrors;
}
