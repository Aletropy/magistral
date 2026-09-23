import { z } from "zod";
import { approvedClauseIdsSchema } from "@/lib/clauses/schema";
import { MAX_PERSONA_ID_CHARS } from "@/lib/personas/schema";
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

export const MAX_BASE_DOCUMENT_CHARS = 60_000;
export const MAX_BASE_DOCUMENT_NAME_CHARS = 200;

/** A reference document the minuta is modelled on: its text, extracted from the uploaded file. */
export const baseDocumentSchema = z.object({
  name: z.string().trim().max(MAX_BASE_DOCUMENT_NAME_CHARS),
  text: z
    .string()
    .trim()
    .min(1, { error: "O documento base está vazio." })
    .max(MAX_BASE_DOCUMENT_CHARS, {
      error: `O documento base passa de ${MAX_BASE_DOCUMENT_CHARS.toLocaleString("pt-BR")} caracteres. Envie um trecho menor.`,
    }),
});
export type BaseDocument = z.infer<typeof baseDocumentSchema>;

/**
 * Every field of a minuta request, without the cross-field rules. Wizard steps pick from it (zod can't
 * pick from a refined object, and object refinements are skipped while another field is invalid).
 */
export const minutaRequestFieldsSchema = z.object({
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
  persona: z
    .string({ error: "Selecione uma persona válida." })
    .trim()
    .min(1, { error: "Selecione uma persona." })
    .max(MAX_PERSONA_ID_CHARS, { error: "Selecione uma persona válida." }),
  /** Ground the minuta in the local legal library (RAG). */
  useLibrary: z.boolean(),
  /** Pre-approved clauses from the clause library, in the order they should appear. */
  approvedClauseIds: approvedClauseIdsSchema,
  /** A document to model the minuta on; absent in requests saved before it existed. */
  baseDocument: baseDocumentSchema.nullable().default(null),
});

const CUSTOM_TYPE_REQUIRED = { error: "Descreva o tipo de documento.", path: ["customDocumentType"] };

/** "Outro" needs a description of the document. */
export function hasDocumentTypeLabel(request: { documentType: string; customDocumentType: string }): boolean {
  return request.documentType !== OTHER_DOCUMENT_TYPE_ID || request.customDocumentType.trim().length > 0;
}

export const minutaRequestSchema = minutaRequestFieldsSchema.refine(hasDocumentTypeLabel, CUSTOM_TYPE_REQUIRED);

/** The document type fields on their own, with the "outro" rule, for the wizard's type step. */
export const documentTypeStepSchema = minutaRequestFieldsSchema
  .pick({ documentType: true, customDocumentType: true })
  .refine(hasDocumentTypeLabel, CUSTOM_TYPE_REQUIRED);

export type MinutaRequest = z.infer<typeof minutaRequestSchema>;
export type MinutaFormValues = z.input<typeof minutaRequestSchema>;
export type Party = MinutaRequest["parties"][number];
