import { z } from "zod";
import { DOCUMENT_TYPE_IDS } from "@/lib/minuta/documentTypes";

export const MAX_CLAUSE_TITLE_CHARS = 120;
export const MAX_CLAUSE_CATEGORY_CHARS = 60;
export const MAX_CLAUSE_BODY_CHARS = 6000;
export const MAX_CLAUSE_ID_CHARS = 64;
/** Approved clauses one minuta can carry. */
export const MAX_APPROVED_CLAUSES = 30;

export const clauseInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Informe o título da cláusula." })
    .max(MAX_CLAUSE_TITLE_CHARS, { error: `Use no máximo ${MAX_CLAUSE_TITLE_CHARS} caracteres.` }),
  category: z.string().trim().max(MAX_CLAUSE_CATEGORY_CHARS, {
    error: `Use no máximo ${MAX_CLAUSE_CATEGORY_CHARS} caracteres.`,
  }),
  /** Document types the clause is offered for; empty means every type. */
  documentTypes: z.array(z.enum(DOCUMENT_TYPE_IDS)),
  body: z
    .string()
    .trim()
    .min(1, { error: "Escreva o texto da cláusula." })
    .max(MAX_CLAUSE_BODY_CHARS, { error: `Use no máximo ${MAX_CLAUSE_BODY_CHARS} caracteres.` }),
});

export type ClauseInput = z.infer<typeof clauseInputSchema>;
export type ClauseFormValues = z.input<typeof clauseInputSchema>;

export const EMPTY_CLAUSE: ClauseFormValues = { title: "", category: "", documentTypes: [], body: "" };

export const approvedClauseIdsSchema = z
  .array(z.string().trim().min(1).max(MAX_CLAUSE_ID_CHARS))
  .max(MAX_APPROVED_CLAUSES, { error: `Use no máximo ${MAX_APPROVED_CLAUSES} cláusulas aprovadas.` })
  .refine((ids) => new Set(ids).size === ids.length, { error: "Há cláusulas aprovadas repetidas." });
